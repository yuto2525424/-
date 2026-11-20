export type Rank = 'S' | 'A' | 'B' | 'C';

export const RANK_MESSAGE: Record<Rank, string> = {
  S: '見事な推理です！',
  A: 'すばらしい推理です！',
  B: 'よい推理です！',
  C: '正解です！次はもっと少ない質問で！',
};
