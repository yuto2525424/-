import { EMPTY_STATS, type Stats, type Zukan } from '../domain/progress';
import { findSpeciesById } from '../domain/species';
import type { GameState } from '../domain/game';
import type { Difficulty } from '../types';
import { readJson, removeKey, writeJson } from './keyValue';

export interface Settings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  bgmEnabled: boolean;
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  bgmEnabled: true,
  difficulty: 'beginner',
};

const KEYS = {
  zukan: 'marink.zukan.v1',
  stats: 'marink.stats.v1',
  settings: 'marink.settings.v1',
  game: 'marink.game.v1',
} as const;

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as string[]).includes(value);
}

export interface Snapshot {
  zukan: Zukan;
  stats: Stats;
  settings: Settings;
  savedGame: GameState | null;
}

/** 保存データを読み込む。壊れた値は既定値に戻す */
export async function loadSnapshot(): Promise<Snapshot> {
  const [zukanRaw, statsRaw, settingsRaw, gameRaw] = await Promise.all([
    readJson<Zukan>(KEYS.zukan, {}),
    readJson<Partial<Stats>>(KEYS.stats, {}),
    readJson<Partial<Settings>>(KEYS.settings, {}),
    readJson<GameState | null>(KEYS.game, null),
  ]);

  const zukan: Zukan = {};
  if (zukanRaw && typeof zukanRaw === 'object') {
    for (const [id, entry] of Object.entries(zukanRaw)) {
      if (findSpeciesById(id) && entry && typeof entry.timesCorrect === 'number') {
        zukan[id] = entry;
      }
    }
  }

  const stats: Stats = { ...EMPTY_STATS, ...statsRaw };
  const settings: Settings = {
    soundEnabled: typeof settingsRaw.soundEnabled === 'boolean' ? settingsRaw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    hapticsEnabled: typeof settingsRaw.hapticsEnabled === 'boolean' ? settingsRaw.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
    bgmEnabled: typeof settingsRaw.bgmEnabled === 'boolean' ? settingsRaw.bgmEnabled : DEFAULT_SETTINGS.bgmEnabled,
    difficulty: isDifficulty(settingsRaw.difficulty) ? settingsRaw.difficulty : DEFAULT_SETTINGS.difficulty,
  };

  // 途中のゲームは、正しい形式で、かつ生き物が存在する場合だけ復元する
  const savedGame = isValidGame(gameRaw) ? { ...gameRaw, pending: false } : null;

  return { zukan, stats, settings, savedGame };
}

function isValidGame(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const game = value as Partial<GameState>;
  return (
    typeof game.id === 'string' &&
    isDifficulty(game.difficulty) &&
    typeof game.speciesId === 'string' &&
    findSpeciesById(game.speciesId) !== undefined &&
    (game.phase === 'asking' || game.phase === 'final') &&
    Array.isArray(game.questions) &&
    Array.isArray(game.guesses)
  );
}

export const saveZukan = (zukan: Zukan) => writeJson(KEYS.zukan, zukan);
export const saveStats = (stats: Stats) => writeJson(KEYS.stats, stats);
export const saveSettings = (settings: Settings) => writeJson(KEYS.settings, settings);
export const saveGame = (game: GameState | null) =>
  game ? writeJson(KEYS.game, game) : removeKey(KEYS.game);

export async function resetAllProgress(): Promise<void> {
  await Promise.all([removeKey(KEYS.zukan), removeKey(KEYS.stats), removeKey(KEYS.game)]);
}
