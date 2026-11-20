import { describe, expect, it } from 'vitest';
import { formatRange, formatColors } from '../src/domain/format';
import { findSpeciesById } from '../src/domain/species';

describe('表示用の整形', () => {
  it('数値範囲を単位付きで表示し、不明は「不明」', () => {
    expect(formatRange(null, 'm')).toBe('不明');
    expect(formatRange({ min: 0, max: 50 }, 'm')).toBe('0〜50 m');
    expect(formatRange({ min: 400, max: 1200 }, 'cm')).toBe('4〜12 m');
    expect(formatRange({ min: 7, max: 11 }, 'cm')).toBe('7〜11 cm');
  });

  it('体色の変化がある生き物は注記を付ける', () => {
    expect(formatColors(findSpeciesById('hirame')!)).toContain('変化');
    expect(formatColors(findSpeciesById('kakure-kumanomi')!)).toBe('オレンジ・白・黒');
  });
});
