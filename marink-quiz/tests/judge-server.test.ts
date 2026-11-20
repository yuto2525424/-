import { describe, expect, it } from 'vitest';
import { handleRequest, SessionStore, type AppDeps } from '../server/app';
import { factsFor, judgeQuestion } from '../server/judge';
import { findSpeciesById } from '../src/domain/species';

function fakeClient(text: string, stop: string = 'end_turn') {
  const calls: unknown[] = [];
  return {
    calls,
    client: {
      messages: {
        create: async (params: unknown) => {
          calls.push(params);
          return { stop_reason: stop, content: [{ type: 'text', text }] };
        },
      },
    } as never,
  };
}

function deps(overrides: Partial<AppDeps> & { client: never }): AppDeps {
  let t = 0;
  return {
    now: () => (t += 1000),
    random: () => 0,
    sessionTtlMs: 60_000,
    aiBudgetAvailable: () => true,
    onAiCall: () => {},
    ...overrides,
  };
}

describe('判定（カタログ優先・AIは必要な時だけ）', () => {
  const species = findSpeciesById('kakure-kumanomi')!;

  it('登録済みの情報で答えられる質問はAIを呼ばない', async () => {
    const f = fakeClient('はい');
    const r = await judgeQuestion('サンゴ礁に住みますか', species, { client: f.client, aiBudgetAvailable: () => true, onAiCall: () => {} });
    expect(r).toEqual({ kind: 'answer', answer: 'yes', via: 'catalog' });
    expect(f.calls).toHaveLength(0);
  });

  it('登録にない自由な質問はAIで3択に判定する', async () => {
    const f = fakeClient('どちらともいえない');
    const r = await judgeQuestion('この生き物は夜に目が光りますか', species, { client: f.client, aiBudgetAvailable: () => true, onAiCall: () => {} });
    expect(r).toEqual({ kind: 'answer', answer: 'unknown', via: 'ai' });
    expect(f.calls).toHaveLength(1);
  });

  it('AIが3択以外を返したら採用せず「どちらともいえない」にする', async () => {
    const f = fakeClient('カクレクマノミです！');
    const r = await judgeQuestion('この生き物は夜に目が光りますか', species, { client: f.client, aiBudgetAvailable: () => true, onAiCall: () => {} });
    expect(r).toEqual({ kind: 'answer', answer: 'unknown', via: 'ai' });
  });

  it('AIの拒否（refusal）は拒否として返す', async () => {
    const f = fakeClient('', 'refusal');
    const r = await judgeQuestion('この生き物は夜に目が光りますか', species, { client: f.client, aiBudgetAvailable: () => true, onAiCall: () => {} });
    expect(r.kind).toBe('refused');
  });

  it('1日の上限に達したらAIを呼ばず失敗として返す', async () => {
    const f = fakeClient('はい');
    const r = await judgeQuestion('この生き物は夜に目が光りますか', species, { client: f.client, aiBudgetAvailable: () => false, onAiCall: () => {} });
    expect(r.kind).toBe('failed');
    expect(f.calls).toHaveLength(0);
  });

  it('正解の生き物の名前は、AIに渡す事実情報に含まれない', () => {
    const facts = factsFor(species);
    expect(facts).not.toContain('カクレクマノミ');
    expect(facts).not.toContain('クマノミ');
  });

  it('AIへの指示は質問文を「判定の対象」として扱う注意を含む', async () => {
    const f = fakeClient('はい');
    await judgeQuestion('この生き物は夜に目が光りますか', species, { client: f.client, aiBudgetAvailable: () => true, onAiCall: () => {} });
    const sent = JSON.stringify(f.calls[0]);
    expect(sent).toContain('判定の対象');
    expect(sent).toContain('"max_tokens":64');
  });
});

describe('セッションAPI（正解はサーバーに保持）', () => {
  it('セッションを作っても正解は返さない', async () => {
    const store = new SessionStore();
    const d = deps({ client: fakeClient('はい').client });
    const res = await handleRequest('POST', '/api/sessions', { difficulty: 'beginner' }, store, d);
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain('revealedSpeciesId":"');
    expect((res.body as { state: { revealedSpeciesId: unknown } }).state.revealedSpeciesId).toBeNull();
  });

  it('質問は10回まで、10回目の後は最終回答のみ', async () => {
    const store = new SessionStore();
    const d = deps({ client: fakeClient('はい').client });
    const { sessionId } = (await handleRequest('POST', '/api/sessions', { difficulty: 'beginner' }, store, d)).body as { sessionId: string };
    for (let i = 0; i < 10; i++) {
      await handleRequest('POST', `/api/sessions/${sessionId}/questions`, { question: 'サンゴ礁に住みますか' }, store, d);
    }
    const res = await handleRequest('POST', `/api/sessions/${sessionId}/questions`, { question: 'サンゴ礁に住みますか' }, store, d);
    expect(res.status).toBe(409);
  });

  it('正解すると終了し、そのときだけ正解のIDを返す', async () => {
    const store = new SessionStore();
    const d = deps({ client: fakeClient('はい').client });
    const { sessionId, state } = (await handleRequest('POST', '/api/sessions', { difficulty: 'beginner' }, store, d)).body as { sessionId: string; state: unknown };
    expect(state).toBeDefined();
    const session = store.get(sessionId, d)!;
    const res = await handleRequest('POST', `/api/sessions/${sessionId}/guess`, { text: session.species.nameJa }, store, d);
    expect((res.body as { state: { finished: boolean; revealedSpeciesId: string } }).state.finished).toBe(true);
    expect((res.body as { state: { revealedSpeciesId: string } }).state.revealedSpeciesId).toBe(session.species.id);
  });

  it('期限切れのセッションは使えない', async () => {
    const store = new SessionStore();
    const d = deps({ client: fakeClient('はい').client, sessionTtlMs: 1 });
    const { sessionId } = (await handleRequest('POST', '/api/sessions', { difficulty: 'beginner' }, store, d)).body as { sessionId: string };
    const res = await handleRequest('POST', `/api/sessions/${sessionId}/questions`, { question: 'サンゴ礁に住みますか' }, store, d);
    expect(res.status).toBe(404);
  });

  it('不正な入力は400で拒否する', async () => {
    const store = new SessionStore();
    const d = deps({ client: fakeClient('はい').client });
    expect((await handleRequest('POST', '/api/sessions', { difficulty: 'expert' }, store, d)).status).toBe(400);
    const { sessionId } = (await handleRequest('POST', '/api/sessions', { difficulty: 'beginner' }, store, d)).body as { sessionId: string };
    expect((await handleRequest('POST', `/api/sessions/${sessionId}/questions`, { question: '' }, store, d)).status).toBe(400);
  });
});
