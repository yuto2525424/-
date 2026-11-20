import { MAX_MID_GUESS_MISTAKES, MAX_QUESTIONS } from './constants';
import { isCorrectGuess } from './demoAnswerer';
import type { DemoOutcome } from './demoAnswerer';
import type { Difficulty, Species, ThreeWayAnswer } from '../types';

/**
 * ゲームの状態遷移（UIに依存しない純粋関数）。
 *
 * 管理の分離：
 * - 質問回数（questions）は「回答を得た質問」のみを数える。未対応・拒否された質問は数えない。
 * - 途中予想（mid guess）は、外すと予想ミス回数だけが増える（質問回数は減らない）。
 * - 10問使い切ると phase が 'final' になり、最後の1回の生物名回答だけが許される。
 * - 正解の生物 id は UI に渡さない。ゲームが終了したときだけ公開する（selectRevealedSpeciesId）。
 */

export type GamePhase = 'asking' | 'final' | 'won' | 'lost';
export type EndReason = 'correct' | 'finalWrong' | 'gaveUp';

export interface QuestionRecord {
  index: number;
  question: string;
  answer: ThreeWayAnswer;
}

export interface GuessRecord {
  text: string;
  correct: boolean;
  phase: 'mid' | 'final';
}

export interface GameState {
  id: string;
  difficulty: Difficulty;
  /** 正解の生き物 id（秘匿。UIへは直接渡さない） */
  speciesId: string;
  startedAt: number;
  phase: GamePhase;
  endReason: EndReason | null;
  endedAt: number | null;
  questions: QuestionRecord[];
  guesses: GuessRecord[];
  midMistakes: number;
  /** 回答待ち（二重送信防止） */
  pending: boolean;
  /** 直近の案内メッセージ（未対応、通信エラー、予想ミスなど） */
  notice: string | null;
  /** 判定サーバーを使う場合のセッションID（正解はサーバーが保持する） */
  remoteSessionId?: string;
}

export function createGame(params: {
  id: string;
  difficulty: Difficulty;
  speciesId: string;
  now: number;
}): GameState {
  return {
    id: params.id,
    difficulty: params.difficulty,
    speciesId: params.speciesId,
    startedAt: params.now,
    phase: 'asking',
    endReason: null,
    endedAt: null,
    questions: [],
    guesses: [],
    midMistakes: 0,
    pending: false,
    notice: null,
  };
}

export const isFinished = (state: GameState): boolean => state.phase === 'won' || state.phase === 'lost';

export function questionsRemaining(state: GameState): number {
  return Math.max(0, MAX_QUESTIONS - state.questions.length);
}

export function canAskQuestion(state: GameState): boolean {
  return state.phase === 'asking' && state.questions.length < MAX_QUESTIONS && !state.pending;
}

export function canGuessMidGame(state: GameState): boolean {
  return state.phase === 'asking' && state.midMistakes < MAX_MID_GUESS_MISTAKES && !state.pending;
}

export function canFinalGuess(state: GameState): boolean {
  return state.phase === 'final' && !state.pending;
}

/** 質問送信の開始。受け付けられない場合は状態を変えず、理由を notice に残す */
export function beginQuestion(state: GameState): GameState {
  if (!canAskQuestion(state)) {
    return { ...state, notice: state.pending ? '回答を受付中です。少しお待ちください。' : '質問できる回数がありません。' };
  }
  return { ...state, pending: true, notice: null };
}

/** 質問への判定結果を反映する */
export function receiveOutcome(state: GameState, question: string, outcome: DemoOutcome): GameState {
  if (!state.pending) return state;
  if (outcome.kind !== 'answer') {
    return { ...state, pending: false, notice: outcome.message };
  }
  const record: QuestionRecord = {
    index: state.questions.length + 1,
    question,
    answer: outcome.answer,
  };
  const questions = [...state.questions, record];
  const exhausted = questions.length >= MAX_QUESTIONS;
  return {
    ...state,
    questions,
    pending: false,
    phase: exhausted && state.phase === 'asking' ? 'final' : state.phase,
    notice: exhausted ? `質問は${MAX_QUESTIONS}回すべて使いました。最後に生き物の名前を回答してください。` : null,
  };
}

/** 通信エラーなどで判定できなかった場合。質問回数は消費しない */
export function receiveFailure(state: GameState, message: string): GameState {
  if (!state.pending) return state;
  return { ...state, pending: false, notice: message };
}

/** 生物名の回答。途中予想と最終回答で扱いを分ける */
export function submitGuess(state: GameState, input: string, species: Species, now: number): GameState {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ...state, notice: '生き物の名前を入力してください。' };
  if (state.pending) return state;

  if (state.phase === 'asking') {
    if (!canGuessMidGame(state)) {
      return { ...state, notice: '途中で予想できる回数を使い切りました。質問を使い切ったあと、最後の回答をしてください。' };
    }
    const correct = isCorrectGuess(trimmed, species);
    const guesses = [...state.guesses, { text: trimmed, correct, phase: 'mid' as const }];
    if (correct) {
      return finish(state, 'won', 'correct', guesses, now, null);
    }
    const midMistakes = state.midMistakes + 1;
    const left = MAX_MID_GUESS_MISTAKES - midMistakes;
    return {
      ...state,
      guesses,
      midMistakes,
      notice:
        left > 0
          ? `残念、違います。途中の予想はあと${left}回できます（質問は続けられます）。`
          : '残念、違います。途中の予想はこれで終わりです。質問を使い切ったあと、最後の回答をしてください。',
    };
  }

  if (state.phase === 'final') {
    const correct = isCorrectGuess(trimmed, species);
    const guesses = [...state.guesses, { text: trimmed, correct, phase: 'final' as const }];
    return correct
      ? finish(state, 'won', 'correct', guesses, now, null)
      : finish(state, 'lost', 'finalWrong', guesses, now, null);
  }

  return state;
}

/** 降参。ゲームは敗北として終了する */
export function giveUp(state: GameState, now: number): GameState {
  if (isFinished(state) || state.pending) return state;
  return finish(state, 'lost', 'gaveUp', state.guesses, now, null);
}

function finish(
  state: GameState,
  phase: 'won' | 'lost',
  endReason: EndReason,
  guesses: GuessRecord[],
  now: number,
  notice: string | null,
): GameState {
  return { ...state, phase, endReason, endedAt: now, guesses, notice, pending: false };
}

/** 終了したゲームだけ、正解の生き物 id を返す（進行中は null） */
export function selectRevealedSpeciesId(state: GameState): string | null {
  return isFinished(state) ? state.speciesId : null;
}
