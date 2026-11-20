import { SPECIES } from '../data/species';
import type { Difficulty, Species } from '../types';

export const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export const DIFFICULTY_INFO: Record<Difficulty, { label: string; tagline: string; description: string }> = {
  beginner: {
    label: '初級',
    tagline: '海の生き物博士への第一歩',
    description: 'カクレクマノミ、ジンベエザメ、ミズクラゲなど、知名度の高い生き物から出題します。',
  },
  intermediate: {
    label: '中級',
    tagline: '海洋生物マスター',
    description: 'ダイビング経験者や水族館好きが楽しめる、少し珍しい生き物から出題します。',
  },
  advanced: {
    label: '上級',
    tagline: '海洋生物研究者',
    description: '専門的な知識が必要となる、珍しい魚類や無脊椎動物などから出題します。',
  },
};

/** 種のデータ一覧（読み取り専用の参照として扱う） */
export function allSpecies(): readonly Species[] {
  return SPECIES;
}

export function findSpeciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}

export function speciesByDifficulty(difficulty: Difficulty): Species[] {
  return SPECIES.filter((s) => s.difficulty === difficulty);
}

/** 乱数を注入できる形で、難易度に合う生き物を1つ選ぶ */
export function pickSpecies(difficulty: Difficulty, random: () => number = Math.random): Species {
  const pool = speciesByDifficulty(difficulty);
  if (pool.length === 0) {
    throw new Error(`難易度 ${difficulty} に出題できる生き物がありません`);
  }
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}
