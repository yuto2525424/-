import { describe, expect, it } from 'vitest';
import {
  beginQuestion,
  createGame,
  giveUp,
  receiveFailure,
  receiveOutcome,
  selectRevealedSpeciesId,
  submitGuess,
  type GameState,
} from '../src/domain/game';
import { MAX_MID_GUESS_MISTAKES, MAX_QUESTIONS } from '../src/domain/constants';
import { findSpeciesById } from '../src/domain/species';
import type { DemoOutcome } from '../src/domain/demoAnswerer';

const target = findSpeciesById('kakure-kumanomi')!;
const wrongOne = findSpeciesById('jinbe-zame')!;

const newGame = (): GameState => createGame({ id: 'g1', difficulty: 'beginner', speciesId: target.id, now: 1000 });

function ask(state: GameState, question = 'サンゴ礁に住みますか？', outcome: DemoOutcome = { kind: 'answer', answer: 'unknown' }): GameState {
  const pending = beginQuestion(state);
  return receiveOutcome(pending, question, outcome);
}

describe('質問回数の管理', () => {
  it('回答を得た質問だけを数える', () => {
    let g = newGame();
    g = ask(g);
    expect(g.questions).toHaveLength(1);
    g = receiveOutcome(beginQuestion(g), '???', { kind: 'unsupported', message: 'x' });
    expect(g.questions).toHaveLength(1);
    expect(g.pending).toBe(false);
    expect(g.notice).toBe('x');
  });

  it('拒否・未対応の質問は回数を消費しない（通信エラーも同様）', () => {
    let g = newGame();
    g = receiveFailure(beginQuestion(g), '通信エラー');
    expect(g.questions).toHaveLength(0);
    expect(g.notice).toBe('通信エラー');
  });

  it('10回使い切ると最終回答フェーズになり、それ以上は質問できない', () => {
    let g = newGame();
    for (let i = 0; i < MAX_QUESTIONS; i++) g = ask(g);
    expect(g.questions).toHaveLength(MAX_QUESTIONS);
    expect(g.phase).toBe('final');
    const next = beginQuestion(g);
    expect(next.pending).toBe(false);
    expect(next.questions).toHaveLength(MAX_QUESTIONS);
  });

  it('回答待ちの間は二重送信できない', () => {
    const g = beginQuestion(newGame());
    const again = beginQuestion(g);
    expect(again.pending).toBe(true);
    expect(again.questions).toHaveLength(0);
    expect(again.notice).toContain('受付中');
  });
});

describe('生物名の回答', () => {
  it('途中で正解するとクリア（質問回数は使ったまま）', () => {
    let g = ask(newGame());
    g = submitGuess(g, 'カクレクマノミ', target, 2000);
    expect(g.phase).toBe('won');
    expect(g.endReason).toBe('correct');
    expect(g.questions).toHaveLength(1);
    expect(selectRevealedSpeciesId(g)).toBe(target.id);
  });

  it('途中の予想を外しても質問は続けられ、予想ミスは3回まで', () => {
    let g = newGame();
    for (let i = 1; i <= MAX_MID_GUESS_MISTAKES; i++) {
      g = submitGuess(g, wrongOne.nameJa, target, 2000);
      expect(g.phase).toBe('asking');
      expect(g.midMistakes).toBe(i);
    }
    expect(g.questions).toHaveLength(0);
    const locked = submitGuess(g, target.nameJa, target, 2000);
    expect(locked.phase).toBe('asking');
    expect(locked.notice).toContain('使い切');
  });

  it('予想ミスでは正解が見えない（終了するまで id を返さない）', () => {
    const g = submitGuess(newGame(), wrongOne.nameJa, target, 2000);
    expect(selectRevealedSpeciesId(g)).toBeNull();
  });

  it('最終回答で正解するとクリア、間違えるとゲームオーバー', () => {
    let won = newGame();
    for (let i = 0; i < MAX_QUESTIONS; i++) won = ask(won);
    expect(submitGuess(won, 'かくれくまのみ', target, 3000).phase).toBe('won');

    let lost = newGame();
    for (let i = 0; i < MAX_QUESTIONS; i++) lost = ask(lost);
    const after = submitGuess(lost, wrongOne.nameJa, target, 3000);
    expect(after.phase).toBe('lost');
    expect(after.endReason).toBe('finalWrong');
    expect(selectRevealedSpeciesId(after)).toBe(target.id);
  });

  it('空の入力は受け付けない', () => {
    const g = submitGuess(newGame(), '   ', target, 2000);
    expect(g.phase).toBe('asking');
    expect(g.guesses).toHaveLength(0);
  });
});

describe('降参', () => {
  it('降参すると敗北になり、正解を公開する', () => {
    const g = giveUp(ask(newGame()), 4000);
    expect(g.phase).toBe('lost');
    expect(g.endReason).toBe('gaveUp');
    expect(selectRevealedSpeciesId(g)).toBe(target.id);
  });

  it('終了後の操作は状態を変えない', () => {
    const won = submitGuess(newGame(), target.nameJa, target, 2000);
    expect(giveUp(won, 5000)).toBe(won);
  });
});
