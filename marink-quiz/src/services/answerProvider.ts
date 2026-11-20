import { answerDemoQuestion, type DemoOutcome } from '../domain/demoAnswerer';
import type { Species, ThreeWayAnswer } from '../types';
import { ANSWER_LABEL } from '../types';

/**
 * 回答プロバイダの差し替え口。
 * - demo：端末内のデータだけで答える（APIキー不要。AI未設定時の標準動作）
 * - ai  ：安全なバックエンド経由でAIに判定させる（未実装。サーバー側でセッションと正解を管理する設計）
 *
 * どちらも返す回答は必ず3種類のいずれかに限定する（parseThreeWayAnswer で検証）。
 */
export interface AnswerRequest {
  question: string;
  species: Species;
}

export interface AnswerProvider {
  readonly mode: 'demo' | 'ai';
  readonly label: string;
  answer(request: AnswerRequest): Promise<DemoOutcome>;
}

const DEMO_THINKING_MS = 350;

export const demoAnswerProvider: AnswerProvider = {
  mode: 'demo',
  label: 'デモモード（AI未接続）',
  async answer({ question, species }) {
    // 「考えている」間の自然な待ち時間。判定自体は同期で行う
    await new Promise((resolve) => setTimeout(resolve, DEMO_THINKING_MS));
    const outcome = answerDemoQuestion(question, species);
    // 登録データから判断できない質問は「わかりません」とは返さず、「どちらともいえない」で答える
    if (outcome.kind === 'unsupported') return { kind: 'answer', answer: 'unknown' };
    return outcome;
  },
};

export function getAnswerProvider(): AnswerProvider {
  return demoAnswerProvider;
}

/**
 * AIの出力を検証し、3種類の回答に限定する。
 * 句読点や空白の違いは許容するが、それ以外の文章は受け付けない（不正な出力は null）。
 */
export function parseThreeWayAnswer(raw: string): ThreeWayAnswer | null {
  const cleaned = raw.normalize('NFKC').replace(/[\s。．.！!]/g, '');
  if (cleaned === ANSWER_LABEL.yes) return 'yes';
  if (cleaned === ANSWER_LABEL.no) return 'no';
  if (cleaned === ANSWER_LABEL.unknown) return 'unknown';
  return null;
}
