import type { Rank } from './rankTypes';

/**
 * 評価ランク。質問回数が少ないほど高評価。
 * 1〜3問：S / 4〜5問：A / 6〜7問：B / 8〜10問：C
 * 0問（質問せず正解）もSとして扱う。
 */
export function rankForQuestionCount(questionCount: number): Rank {
  if (questionCount <= 3) return 'S';
  if (questionCount <= 5) return 'A';
  if (questionCount <= 7) return 'B';
  return 'C';
}
