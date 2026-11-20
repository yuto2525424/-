import type { Difficulty } from '../types';
import type { EndReason, GameState, GuessRecord, QuestionRecord } from '../domain/game';

/**
 * 判定サーバーとの通信。
 * サーバーが正解を保持し、アプリは状態の表示と送信だけを行う。
 * 接続先は EXPO_PUBLIC_JUDGE_URL（例：https://judge.example.com）で指定する。
 */

export const JUDGE_URL: string | undefined = process.env.EXPO_PUBLIC_JUDGE_URL || undefined;

export interface RemoteState {
  phase: GameState['phase'];
  questionsUsed: number;
  midMistakes: number;
  pending: boolean;
  notice: string | null;
  questions: QuestionRecord[];
  guesses: GuessRecord[];
  finished: boolean;
  endReason: EndReason | null;
  endedAt: number | null;
  revealedSpeciesId: string | null;
}

interface SessionResponse {
  sessionId: string;
  state: RemoteState;
}
interface StateResponse {
  state: RemoteState;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!JUDGE_URL) throw new Error('判定サーバーが設定されていません');
  const res = await fetch(`${JUDGE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 409 && res.status !== 502) {
    throw new Error(data.error ?? `通信エラー（${res.status}）`);
  }
  return data;
}

export const createRemoteSession = (difficulty: Difficulty) =>
  post<SessionResponse>('/api/sessions', { difficulty });

export const askRemote = (sessionId: string, question: string) =>
  post<StateResponse>(`/api/sessions/${sessionId}/questions`, { question });

export const guessRemote = (sessionId: string, text: string) =>
  post<StateResponse>(`/api/sessions/${sessionId}/guess`, { text });

export const giveUpRemote = (sessionId: string) =>
  post<StateResponse>(`/api/sessions/${sessionId}/giveup`, {});

/** サーバーの状態を、アプリのゲーム状態に反映する（正解は終了時だけ入る） */
export function applyRemote(current: GameState, remote: RemoteState): GameState {
  return {
    ...current,
    phase: remote.phase,
    questions: remote.questions,
    guesses: remote.guesses,
    midMistakes: remote.midMistakes,
    pending: remote.pending,
    notice: remote.notice,
    endReason: remote.endReason,
    endedAt: remote.endedAt,
    speciesId: remote.revealedSpeciesId ?? current.speciesId,
  };
}
