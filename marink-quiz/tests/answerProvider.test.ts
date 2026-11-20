import { describe, expect, it } from 'vitest';
import { parseThreeWayAnswer } from '../src/services/answerProvider';

describe('AI出力の検証（3択に限定）', () => {
  it('3種類の回答だけを受け付ける', () => {
    expect(parseThreeWayAnswer('はい')).toBe('yes');
    expect(parseThreeWayAnswer('いいえ。')).toBe('no');
    expect(parseThreeWayAnswer(' どちらともいえない ')).toBe('unknown');
  });

  it('それ以外の文章は受け付けない（不正な出力を null にする）', () => {
    expect(parseThreeWayAnswer('はい、そうです。カクレクマノミです')).toBeNull();
    expect(parseThreeWayAnswer('分かりません')).toBeNull();
    expect(parseThreeWayAnswer('')).toBeNull();
  });
});
