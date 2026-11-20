import type { Rank } from './rankTypes';
import { rankForQuestionCount } from './rank';

/** 成績（端末内に保存する） */
export interface Stats {
  plays: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  /** 正解時の最少質問回数（未記録は null） */
  bestQuestionCount: number | null;
  /** 正解時の質問回数の合計（平均算出用） */
  totalQuestionsInWins: number;
}

export const EMPTY_STATS: Stats = {
  plays: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestQuestionCount: null,
  totalQuestionsInWins: 0,
};

export interface ZukanEntry {
  firstDiscoveredAt: number;
  timesCorrect: number;
}

/** 図鑑（生き物 id → 発見記録） */
export type Zukan = Record<string, ZukanEntry>;

export interface GameResult {
  won: boolean;
  questionCount: number;
  speciesId: string;
  endedAt: number;
}

export function applyResultToStats(stats: Stats, result: GameResult): Stats {
  const plays = stats.plays + 1;
  if (!result.won) {
    return { ...stats, plays, currentStreak: 0 };
  }
  const wins = stats.wins + 1;
  const currentStreak = stats.currentStreak + 1;
  return {
    plays,
    wins,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    bestQuestionCount:
      stats.bestQuestionCount === null
        ? result.questionCount
        : Math.min(stats.bestQuestionCount, result.questionCount),
    totalQuestionsInWins: stats.totalQuestionsInWins + result.questionCount,
  };
}

export function applyResultToZukan(zukan: Zukan, result: GameResult): Zukan {
  if (!result.won) return zukan;
  const current = zukan[result.speciesId];
  return {
    ...zukan,
    [result.speciesId]: {
      firstDiscoveredAt: current?.firstDiscoveredAt ?? result.endedAt,
      timesCorrect: (current?.timesCorrect ?? 0) + 1,
    },
  };
}

export function accuracyPercent(stats: Stats): number {
  if (stats.plays === 0) return 0;
  return Math.round((stats.wins / stats.plays) * 100);
}

export function averageQuestionsInWins(stats: Stats): number | null {
  if (stats.wins === 0) return null;
  return Math.round((stats.totalQuestionsInWins / stats.wins) * 10) / 10;
}

export function rankForResult(questionCount: number): Rank {
  return rankForQuestionCount(questionCount);
}
