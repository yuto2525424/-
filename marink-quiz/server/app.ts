import { randomUUID } from 'node:crypto';
import {
  beginQuestion,
  createGame,
  giveUp,
  isFinished,
  receiveFailure,
  receiveOutcome,
  selectRevealedSpeciesId,
  submitGuess,
  type GameState,
} from '../src/domain/game';
import { pickSpecies, DIFFICULTIES } from '../src/domain/species';
import type { Difficulty, Species } from '../src/types';
import { judgeQuestion, type JudgeDeps } from './judge';
import { MAX_QUESTION_LENGTH } from '../src/domain/constants';

/**
 * 判定サーバーの本体（HTTPに依存しない純粋な処理）。
 * 正解の生き物はサーバーのセッションにだけ保持し、ゲーム終了時にのみ返す。
 */

export interface Session {
  game: GameState;
  species: Species;
  lastActiveAt: number;
}

export interface AppDeps extends JudgeDeps {
  now: () => number;
  random: () => number;
  sessionTtlMs: number;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export class SessionStore {
  private sessions = new Map<string, Session>();

  create(difficulty: Difficulty, deps: AppDeps): { id: string; session: Session } {
    this.sweep(deps);
    const species = pickSpecies(difficulty, deps.random);
    const id = randomUUID();
    const game = createGame({ id, difficulty, speciesId: species.id, now: deps.now() });
    const session = { game, species, lastActiveAt: deps.now() };
    this.sessions.set(id, session);
    return { id, session };
  }

  get(id: string, deps: AppDeps): Session | undefined {
    this.sweep(deps);
    const session = this.sessions.get(id);
    if (session) session.lastActiveAt = deps.now();
    return session;
  }

  /** 一定時間使われなかったセッションを破棄する */
  private sweep(deps: AppDeps): void {
    for (const [id, s] of this.sessions) {
      if (deps.now() - s.lastActiveAt > deps.sessionTtlMs) this.sessions.delete(id);
    }
  }
}

const json = (status: number, body: unknown): ApiResponse => ({ status, body });

function publicState(game: GameState) {
  return {
    phase: game.phase,
    questionsUsed: game.questions.length,
    midMistakes: game.midMistakes,
    pending: game.pending,
    notice: game.notice,
    questions: game.questions,
    guesses: game.guesses.map((g) => ({ text: g.text, correct: g.correct, phase: g.phase })),
    finished: isFinished(game),
    endReason: game.endReason,
    endedAt: game.endedAt,
    // 正解は終了したときだけ返す
    revealedSpeciesId: selectRevealedSpeciesId(game),
  };
}

export async function handleRequest(
  method: string,
  path: string,
  body: unknown,
  store: SessionStore,
  deps: AppDeps,
): Promise<ApiResponse> {
  // セッション作成
  if (method === 'POST' && path === '/api/sessions') {
    const difficulty = (body as { difficulty?: unknown })?.difficulty;
    if (typeof difficulty !== 'string' || !(DIFFICULTIES as string[]).includes(difficulty)) {
      return json(400, { error: 'difficulty が不正です' });
    }
    const { id, session } = store.create(difficulty as Difficulty, deps);
    return json(201, { sessionId: id, state: publicState(session.game) });
  }

  const match = path.match(/^\/api\/sessions\/([^/]+)\/(questions|guess|giveup)$/);
  if (!match) return json(404, { error: 'not found' });
  const [, id, action] = match;
  if (method !== 'POST') return json(405, { error: 'method not allowed' });

  const session = store.get(id, deps);
  if (!session) return json(404, { error: 'セッションが見つかりません。新しく始めてください。' });

  if (action === 'giveup') {
    session.game = giveUp(session.game, deps.now());
    return json(200, { state: publicState(session.game) });
  }

  if (action === 'guess') {
    const text = (body as { text?: unknown })?.text;
    if (typeof text !== 'string') return json(400, { error: 'text が不正です' });
    session.game = submitGuess(session.game, text, session.species, deps.now());
    return json(200, { state: publicState(session.game) });
  }

  // questions
  const question = (body as { question?: unknown })?.question;
  if (typeof question !== 'string') return json(400, { error: 'question が不正です' });
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUESTION_LENGTH) {
    return json(400, { error: `質問は1〜${MAX_QUESTION_LENGTH}文字で入力してください` });
  }

  const started = beginQuestion(session.game);
  if (!started.pending) {
    session.game = started;
    return json(409, { state: publicState(session.game) });
  }
  session.game = started;

  try {
    const result = await judgeQuestion(trimmed, session.species, deps);
    if (result.kind === 'answer') {
      session.game = receiveOutcome(session.game, trimmed, { kind: 'answer', answer: result.answer });
      return json(200, { state: publicState(session.game), via: result.via });
    }
    if (result.kind === 'refused') {
      session.game = receiveOutcome(session.game, trimmed, { kind: 'refused', message: result.message });
      return json(200, { state: publicState(session.game), via: 'refused' });
    }
    session.game = receiveFailure(session.game, result.message);
    return json(200, { state: publicState(session.game), via: 'failed' });
  } catch {
    session.game = receiveFailure(session.game, '判定に失敗しました。もう一度お試しください。');
    return json(502, { state: publicState(session.game) });
  }
}

