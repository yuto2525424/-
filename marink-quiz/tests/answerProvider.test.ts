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

import { demoAnswerProvider } from '../src/services/answerProvider';
import { findSpeciesById } from '../src/domain/species';

describe('データがない質問の扱い', () => {
  it('登録にない質問は、データがないと表示し、回答として数えない', async () => {
    const species = findSpeciesById('kakure-kumanomi')!;
    const outcome = await demoAnswerProvider.answer({ question: 'このあと雨は降りますか', species });
    expect(outcome.kind).toBe('unsupported');
    expect(outcome.kind === 'unsupported' && outcome.message).toBe('データが入っていないためわかりません。');
  });
});
