import { describe, expect, it } from 'vitest';
import { applyResultToStats, applyResultToZukan, EMPTY_STATS, averageQuestionsInWins } from '../src/domain/progress';
import { rankForQuestionCount } from '../src/domain/rank';

describe('評価ランク', () => {
  it('仕様どおりの境界で切り替わる', () => {
    expect(rankForQuestionCount(0)).toBe('S');
    expect(rankForQuestionCount(3)).toBe('S');
    expect(rankForQuestionCount(4)).toBe('A');
    expect(rankForQuestionCount(5)).toBe('A');
    expect(rankForQuestionCount(6)).toBe('B');
    expect(rankForQuestionCount(7)).toBe('B');
    expect(rankForQuestionCount(8)).toBe('C');
    expect(rankForQuestionCount(10)).toBe('C');
  });
});

describe('成績', () => {
  it('勝ち・負けと連続正解を記録する', () => {
    let s = EMPTY_STATS;
    s = applyResultToStats(s, { won: true, questionCount: 6, speciesId: 'a', endedAt: 1 });
    s = applyResultToStats(s, { won: true, questionCount: 3, speciesId: 'b', endedAt: 2 });
    expect(s.currentStreak).toBe(2);
    expect(s.bestStreak).toBe(2);
    expect(s.bestQuestionCount).toBe(3);
    s = applyResultToStats(s, { won: false, questionCount: 10, speciesId: 'c', endedAt: 3 });
    expect(s.plays).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
    expect(averageQuestionsInWins(s)).toBe(4.5);
  });

  it('負けたときは最少質問記録を更新しない', () => {
    const s = applyResultToStats(EMPTY_STATS, { won: false, questionCount: 1, speciesId: 'a', endedAt: 1 });
    expect(s.bestQuestionCount).toBeNull();
  });
});

describe('図鑑', () => {
  it('正解した生き物だけを登録する', () => {
    const lost = applyResultToZukan({}, { won: false, questionCount: 10, speciesId: 'a', endedAt: 1 });
    expect(lost).toEqual({});
    const won = applyResultToZukan(lost, { won: true, questionCount: 4, speciesId: 'a', endedAt: 5 });
    expect(won.a).toEqual({ firstDiscoveredAt: 5, timesCorrect: 1 });
    const again = applyResultToZukan(won, { won: true, questionCount: 2, speciesId: 'a', endedAt: 9 });
    expect(again.a).toEqual({ firstDiscoveredAt: 5, timesCorrect: 2 });
  });
});
