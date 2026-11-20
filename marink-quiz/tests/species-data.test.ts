import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { DIFFICULTIES, speciesByDifficulty } from '../src/domain/species';
import { normalizeText } from '../src/domain/normalize';

describe('海洋生物データベース', () => {
  it('50種が登録されている', () => {
    expect(SPECIES.length).toBe(50);
  });

  it('id と正式名が重複しない', () => {
    const ids = SPECIES.map((s) => s.id);
    const names = SPECIES.map((s) => normalizeText(s.nameJa));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('全難易度に出題対象が1種類以上ある', () => {
    for (const d of DIFFICULTIES) {
      expect(speciesByDifficulty(d).length).toBeGreaterThan(0);
    }
  });

  it('別名が他の生き物の名前と衝突しない（誤判定の防止）', () => {
    const owner = new Map<string, string>();
    for (const s of SPECIES) {
      for (const name of [s.nameJa, s.scientificName, s.nameEn, ...s.aliases]) {
        const key = normalizeText(name);
        const previous = owner.get(key);
        expect(previous === undefined || previous === s.id, `"${name}" が ${previous} と衝突`).toBe(true);
        owner.set(key, s.id);
      }
    }
  });

  it('数値範囲は min <= max で、単位が妥当', () => {
    for (const s of SPECIES) {
      if (s.depthM) expect(s.depthM.min).toBeLessThanOrEqual(s.depthM.max);
      if (s.sizeCm) expect(s.sizeCm.min).toBeLessThanOrEqual(s.sizeCm.max);
    }
  });

  it('分類の包含関係が矛盾しない', () => {
    for (const s of SPECIES) {
      const t = s.taxa;
      if (t.shark === true) expect(t.fish, `${s.nameJa}: サメは魚類`).toBe(true);
      if (t.octopus === true || t.squid === true) expect(t.cephalopod, `${s.nameJa}: タコ/イカは頭足類`).toBe(true);
      if (t.mammal === true) expect(s.features.airBreathing, `${s.nameJa}: 哺乳類は肺呼吸`).toBe(true);
      if (t.fish === true) expect(t.mammal, `${s.nameJa}: 魚類は哺乳類ではない`).not.toBe(true);
    }
  });

  it('各生き物に必須項目が揃っている', () => {
    for (const s of SPECIES) {
      expect(s.nameJa.length, s.id).toBeGreaterThan(0);
      expect(s.scientificName.length, s.id).toBeGreaterThan(0);
      expect(s.nameEn.length, s.id).toBeGreaterThan(0);
      expect(s.regions.length, s.id).toBeGreaterThan(0);
      expect(s.ecology.length, s.id).toBeGreaterThan(0);
      expect(s.trivia.length, s.id).toBeGreaterThan(0);
      expect(s.source.references.length, s.id).toBeGreaterThan(0);
    }
  });
});
