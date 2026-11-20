import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAX_QUESTION_LENGTH } from '../domain/constants';
import {
  beginQuestion,
  createGame,
  giveUp as giveUpGame,
  isFinished,
  receiveFailure,
  receiveOutcome,
  submitGuess as submitGuessToGame,
  type EndReason,
  type GameState,
  type QuestionRecord,
} from '../domain/game';
import { applyResultToStats, applyResultToZukan, EMPTY_STATS, type Stats, type Zukan } from '../domain/progress';
import { findSpeciesById, pickSpecies } from '../domain/species';
import type { Difficulty } from '../types';
import { getAnswerProvider } from '../services/answerProvider';
import { applyRemote, askRemote, createRemoteSession, giveUpRemote, guessRemote, JUDGE_URL } from '../services/judgeClient';
import { configureFeedback, haptic, playSound, startBgm } from '../feedback/feedback';
import {
  DEFAULT_SETTINGS,
  loadSnapshot,
  resetAllProgress,
  saveGame,
  saveSettings,
  saveStats,
  saveZukan,
  type Settings,
} from '../storage/repository';

/** 直近に終了したゲームの結果（結果画面で使う） */
export interface LastResult {
  gameId: string;
  speciesId: string;
  won: boolean;
  questionCount: number;
  endReason: EndReason;
  questions: QuestionRecord[];
  guessCount: number;
  difficulty: Difficulty;
}

interface AppData {
  ready: boolean;
  zukan: Zukan;
  stats: Stats;
  settings: Settings;
  game: GameState | null;
  lastResult: LastResult | null;
}

export interface AppContextValue extends AppData {
  answerModeLabel: string;
  startGame: (difficulty?: Difficulty) => void;
  discardGame: () => void;
  /** 質問を送る。回答として受け付けられた場合 true（未対応・通信エラーは false で、入力を残せる） */
  askQuestion: (text: string) => Promise<boolean>;
  submitGuess: (text: string) => void;
  giveUp: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: () => Promise<void>;
  clearLastResult: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const INITIAL: AppData = {
  ready: false,
  zukan: {},
  stats: EMPTY_STATS,
  settings: DEFAULT_SETTINGS,
  game: null,
  lastResult: null,
};

function newGameId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL);
  // 非同期の処理から常に最新の状態を読むための参照
  const latest = useRef<AppData>(INITIAL);
  const provider = useMemo(() => getAnswerProvider(), []);

  const update = useCallback((fn: (current: AppData) => AppData): AppData => {
    const next = fn(latest.current);
    latest.current = next;
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot().then((snapshot) => {
      if (cancelled) return;
      update((d) => ({
        ...d,
        ready: true,
        zukan: snapshot.zukan,
        stats: snapshot.stats,
        settings: snapshot.settings,
        game: snapshot.savedGame,
      }));
      configureFeedback(snapshot.settings);
    });
    return () => {
      cancelled = true;
    };
  }, [update]);

  const feedback = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'light' | 'success' | 'error') => {
    if (kind === 'tap' || kind === 'correct' || kind === 'wrong') {
      void playSound(kind);
    } else {
      void haptic(kind);
    }
  }, []);

  /** ゲーム状態を反映し、保存する。終了した場合は成績と図鑑も更新する */
  const commitGame = useCallback(
    (previous: GameState, next: GameState) => {
      const finishedNow = !isFinished(previous) && isFinished(next);
      update((d) => {
        if (!finishedNow) {
          return { ...d, game: next };
        }
        const result = {
          won: next.phase === 'won',
          questionCount: next.questions.length,
          speciesId: next.speciesId,
          endedAt: next.endedAt ?? Date.now(),
        };
        const stats = applyResultToStats(d.stats, result);
        const zukan = applyResultToZukan(d.zukan, result);
        void saveStats(stats);
        void saveZukan(zukan);
        return {
          ...d,
          game: null,
          stats,
          zukan,
          lastResult: {
            gameId: next.id,
            speciesId: next.speciesId,
            won: result.won,
            questionCount: result.questionCount,
            endReason: next.endReason ?? 'gaveUp',
            questions: next.questions,
            guessCount: next.guesses.length,
            difficulty: next.difficulty,
          },
        };
      });
      void saveGame(finishedNow ? null : next);
      if (finishedNow) {
        feedback(next.phase === 'won' ? 'correct' : 'wrong');
        feedback(next.phase === 'won' ? 'success' : 'error');
      }
    },
    [feedback, update],
  );

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
      if (JUDGE_URL) {
        const chosenRemote = difficulty ?? latest.current.settings.difficulty;
        const placeholder = createGame({ id: newGameId(), difficulty: chosenRemote, speciesId: '', now: Date.now() });
        update((d) => ({ ...d, game: { ...placeholder, pending: true, notice: '準備しています…' }, settings: { ...d.settings, difficulty: chosenRemote } }));
        void saveSettings({ ...latest.current.settings });
        void startBgm();
        createRemoteSession(chosenRemote)
          .then(({ sessionId, state }) => {
            const game = applyRemote({ ...placeholder, remoteSessionId: sessionId }, state);
            update((d) => ({ ...d, game }));
            void saveGame(game);
          })
          .catch(() => {
            update((d) => ({ ...d, game: { ...placeholder, pending: false, notice: '判定サーバーに接続できませんでした。通信状態を確認して、ホームから遊び直してください。' } }));
          });
        return;
      }
      const chosen = difficulty ?? latest.current.settings.difficulty;
      const species = pickSpecies(chosen);
      const game = createGame({ id: newGameId(), difficulty: chosen, speciesId: species.id, now: Date.now() });
      update((d) => ({ ...d, game, settings: { ...d.settings, difficulty: chosen } }));
      void saveGame(game);
      void saveSettings({ ...latest.current.settings });
      void startBgm();
    },
    [update],
  );

  const discardGame = useCallback(() => {
    update((d) => ({ ...d, game: null }));
    void saveGame(null);
  }, [update]);

  const askQuestion = useCallback(
    async (text: string): Promise<boolean> => {
      const current = latest.current.game;
      if (!current) return false;
      if (JUDGE_URL) {
        const q = text.trim();
        if (!current.remoteSessionId) {
          commitGame(current, { ...current, notice: 'セッションがありません。ホームから遊び直してください。' });
          return false;
        }
        if (q.length === 0 || q.length > MAX_QUESTION_LENGTH || current.pending) {
          if (!current.pending) commitGame(current, { ...current, notice: q.length === 0 ? '質問を入力してください。' : `質問は${MAX_QUESTION_LENGTH}文字以内で入力してください。` });
          return false;
        }
        commitGame(current, { ...current, pending: true, notice: null });
        try {
          const { state } = await askRemote(current.remoteSessionId, q);
          const now = latest.current.game;
          if (!now || now.id !== current.id) return false;
          const answered = state.questions.length > current.questions.length;
          commitGame(now, applyRemote(now, state));
          feedback(answered ? 'tap' : 'light');
          return answered;
        } catch {
          const now = latest.current.game;
          if (now && now.id === current.id) {
            commitGame(now, { ...now, pending: false, notice: '通信できませんでした。通信状態を確認して、もう一度お試しください。' });
            feedback('error');
          }
          return false;
        }
      }
      const question = text.trim();
      if (question.length === 0) {
        commitGame(current, { ...current, notice: '質問を入力してください。' });
        return false;
      }
      if (question.length > MAX_QUESTION_LENGTH) {
        commitGame(current, { ...current, notice: `質問は${MAX_QUESTION_LENGTH}文字以内で入力してください。` });
        return false;
      }
      const started = beginQuestion(current);
      if (!started.pending) {
        commitGame(current, started);
        return false;
      }
      commitGame(current, started);

      const species = findSpeciesById(current.speciesId);
      if (!species) {
        commitGame(started, receiveFailure(started, 'データが見つかりません。ゲームを作り直してください。'));
        return false;
      }
      try {
        const outcome = await provider.answer({ question, species });
        const now = latest.current.game;
        if (!now || now.id !== current.id) return false; // 途中で破棄された
        const next = receiveOutcome(now, question, outcome);
        commitGame(now, next);
        if (outcome.kind === 'answer') {
          feedback('tap');
          return true;
        }
        feedback('light');
        return false;
      } catch {
        const now = latest.current.game;
        if (!now || now.id !== current.id) return false;
        commitGame(now, receiveFailure(now, '通信できませんでした。通信状態を確認して、もう一度お試しください。'));
        feedback('error');
        return false;
      }
    },
    [commitGame, feedback, provider],
  );

  const submitGuess = useCallback(
    (text: string) => {
      const current = latest.current.game;
      if (!current) return;
      if (JUDGE_URL) {
        if (!current.remoteSessionId || current.pending) return;
        void guessRemote(current.remoteSessionId, text)
          .then(({ state }) => {
            const now = latest.current.game;
            if (!now || now.id !== current.id) return;
            const next = applyRemote(now, state);
            const wrongMid = next.phase === 'asking' && next.guesses.length > now.guesses.length;
            commitGame(now, next);
            if (wrongMid) feedback('wrong');
          })
          .catch(() => {
            const now = latest.current.game;
            if (now && now.id === current.id) commitGame(now, { ...now, notice: '通信できませんでした。もう一度お試しください。' });
          });
        return;
      }
      const species = findSpeciesById(current.speciesId);
      if (!species) return;
      const next = submitGuessToGame(current, text, species, Date.now());
      if (next === current) return;
      const wrongMid = next.phase === 'asking' && next.guesses.length > current.guesses.length;
      commitGame(current, next);
      if (wrongMid) feedback('wrong');
    },
    [commitGame, feedback],
  );

  const giveUp = useCallback(() => {
    const current = latest.current.game;
    if (!current) return;
    if (JUDGE_URL) {
      if (!current.remoteSessionId) return;
      void giveUpRemote(current.remoteSessionId)
        .then(({ state }) => {
          const now = latest.current.game;
          if (!now || now.id !== current.id) return;
          commitGame(now, applyRemote(now, state));
        })
        .catch(() => undefined);
      return;
    }
    commitGame(current, giveUpGame(current, Date.now()));
  }, [commitGame]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = update((d) => ({ ...d, settings: { ...d.settings, ...patch } })).settings;
      configureFeedback(next);
      void saveSettings(next);
    },
    [update],
  );

  const resetProgress = useCallback(async () => {
    await resetAllProgress();
    update((d) => ({ ...d, zukan: {}, stats: EMPTY_STATS, game: null, lastResult: null }));
  }, [update]);

  const clearLastResult = useCallback(() => {
    update((d) => ({ ...d, lastResult: null }));
  }, [update]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...data,
      answerModeLabel: JUDGE_URL ? 'AI判定（判定サーバー接続）' : provider.label,
      startGame,
      discardGame,
      askQuestion,
      submitGuess,
      giveUp,
      updateSettings,
      resetProgress,
      clearLastResult,
    }),
    [data, provider, startGame, discardGame, askQuestion, submitGuess, giveUp, updateSettings, resetProgress, clearLastResult],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp は AppProvider の内側で使用してください');
  return context;
}
