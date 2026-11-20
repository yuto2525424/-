import { describe, expect, it } from 'vitest';
import { matchesSpeciesName, normalizeText } from '../src/domain/normalize';

describe('normalizeText', () => {
  it('カタカナ・ひらがな・空白・中黒の違いを吸収する', () => {
    expect(normalizeText('カクレクマノミ')).toBe(normalizeText('かくれくまのみ'));
    expect(normalizeText('ダイオウ イカ')).toBe(normalizeText('だいおういか'));
    expect(normalizeText('ノーチラス・ポンピリウス')).toBe(normalizeText('ノーチラスポンピリウス'));
  });

  it('全角・半角と大文字・小文字を区別しない', () => {
    expect(normalizeText('Ｓｈａｒｋ')).toBe(normalizeText('shark'));
  });
});

describe('matchesSpeciesName', () => {
  const candidate = {
    nameJa: 'カクレクマノミ',
    aliases: ['かくれくまのみ'],
    scientificName: 'Amphiprion ocellaris',
    nameEn: 'Ocellaris clownfish',
  };

  it('正式名・表記ゆれ・学名・英名で正解と判定する', () => {
    expect(matchesSpeciesName('カクレクマノミ', candidate)).toBe(true);
    expect(matchesSpeciesName('かくれくまのみ', candidate)).toBe(true);
    expect(matchesSpeciesName('amphiprion ocellaris', candidate)).toBe(true);
    expect(matchesSpeciesName('Ocellaris clownfish', candidate)).toBe(true);
  });

  it('部分一致や空入力は正解にしない', () => {
    expect(matchesSpeciesName('クマノミ', candidate)).toBe(false);
    expect(matchesSpeciesName('   ', candidate)).toBe(false);
    expect(matchesSpeciesName('カクレ', candidate)).toBe(false);
  });
});
