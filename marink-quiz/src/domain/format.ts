import type { ColorKey, Range, Species } from '../types';

export const COLOR_LABEL: Record<ColorKey, string> = {
  red: '赤',
  orange: 'オレンジ',
  yellow: '黄',
  white: '白',
  black: '黒',
  blue: '青',
  green: '緑',
  gray: '灰色',
  brown: '茶色',
  purple: '紫',
  pink: 'ピンク',
  transparent: '透明',
};

export function formatColors(species: Species): string {
  const names = species.colors.map((c) => COLOR_LABEL[c]).join('・');
  if (names.length === 0) return '不明';
  return species.colorVaries ? `${names}（環境や状態によって変化）` : names;
}

/** 数値範囲を表示用の文字列にする。null は「不明」 */
export function formatRange(range: Range | null, unit: 'm' | 'cm'): string {
  if (!range) return '不明';
  if (unit === 'cm' && range.max >= 100) {
    const toM = (v: number) => (v / 100).toFixed(v % 100 === 0 ? 0 : 1).replace(/\.0$/, '');
    return `${toM(range.min)}〜${toM(range.max)} m`;
  }
  return `${range.min}〜${range.max} ${unit}`;
}

export function formatRegions(species: Species): string {
  // 広い海域名と細かい海域名が両方入るため、重複を除いて広い順に並べ直さず、そのまま列挙する
  return Array.from(new Set(species.regions)).join('・');
}

export function formatEnvironment(species: Species): string {
  return species.habitat;
}

export function formatClassification(species: Species): string {
  const { phylum, classJa, family } = species.classification;
  return `${phylum} ／ ${classJa} ／ ${family}`;
}

export function formatSource(species: Species): string {
  return species.source.verified ? '確認済み' : '要確認（公開前に専門家の確認が必要）';
}
