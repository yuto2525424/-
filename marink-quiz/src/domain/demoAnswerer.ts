import type { ColorKey, DietKey, Species, ThreeWayAnswer } from '../types';
import { matchesSpeciesName, normalizeText } from './normalize';
import { allSpecies } from './species';

/**
 * デモモード（AI未接続時）の回答エンジン。
 *
 * 方針：
 * - 回答は必ず「はい / いいえ / どちらともいえない」の3種類。
 * - 登録済みの生き物データにある項目だけを根拠に答える。データがない項目は「どちらともいえない」。
 * - 理解できない質問は、理解したふりをせず「未対応」として返す（質問回数は消費しない）。
 * - 生き物の名前や正解そのものを聞かれても明かさない（「拒否」として返す）。
 */

export type DemoOutcome =
  | { kind: 'answer'; answer: ThreeWayAnswer }
  | { kind: 'unsupported'; message: string }
  | { kind: 'refused'; message: string };

export const UNSUPPORTED_MESSAGE =
  'データが入っていないためわかりません。';
const REFUSED_MESSAGE = 'その質問には答えられません。生き物の特徴について質問してください。';
const NAME_IN_QUESTION_MESSAGE =
  '生き物の名前を含む質問には答えられません。名前は「生物名を回答」から予想してください。（この質問は質問回数に含まれません）';

/** 「〜ではないですか」などの否定の語尾 */
const NEGATION_SUFFIX = /(じゃないですか|ではないですか|ではありませんか|じゃありませんか|じゃない|ではない|でない|ないですか|ありませんか)$/;

/** 正解・ルール・AIへの指示などを聞く質問 */
const REFUSAL_PATTERN = /(正解|答え|解答|名前|学名|英名|和名|ルール|無視|指示|命令|プロンプト|システム|APIキー|api|ai)/i;

const SUBJECTIVE_PATTERN = /かわいい|可愛い|好き|きれい|綺麗|美味しい|おいしい|人気|怖い|こわい|かっこいい|格好いい|カッコいい/;

const DIET_TRIGGER = /食べ|食う|食料|食性|餌|エサ|えさ|捕食|食事|食い|草食/;
const DIET_PREY: Array<[RegExp, DietKey]> = [
  [/魚|さかな|小魚/, 'fish'],
  [/プランクトン|オキアミ/, 'plankton'],
  [/海藻|藻|海草|草食|植物/, 'plants'],
  [/クラゲ/, 'jellyfish'],
  [/貝/, 'shellfish'],
  [/エビ|カニ|甲殻/, 'crustacean'],
  [/イカ|タコ|頭足/, 'cephalopod'],
  [/ウニ|ヒトデ|ナマコ|棘皮/, 'echinoderm'],
  [/哺乳|アザラシ|クジラ|イルカ/, 'mammal'],
  [/サンゴ/, 'coral'],
  [/死骸|死んだ|腐肉|腐食|デトリタス|有機物/, 'detritus'],
];

const ENV_RULES: Array<[RegExp, keyof Species['env']]> = [
  [/サンゴ礁|サンゴ/, 'coralReef'],
  [/沿岸|海岸|浅瀬/, 'coastal'],
  [/外洋|沖合|沖/, 'openOcean'],
  [/日本|国内/, 'japanWaters'],
  [/熱帯|亜熱帯|暖かい|温かい|暖か/, 'tropical'],
];

/** 地域キーワード → 生息地域タグ（先頭から順に判定。より具体的な語を先に置く） */
const REGION_RULES: Array<[RegExp, string[]]> = [
  [/北極/, ['北極海']],
  [/南極/, ['南極海']],
  [/インド太平洋/, ['インド太平洋']],
  [/北太平洋/, ['北太平洋']],
  [/西太平洋/, ['西太平洋']],
  [/太平洋/, ['太平洋', '北太平洋', '西太平洋', 'インド太平洋']],
  [/インド洋/, ['インド洋', 'インド太平洋']],
  [/大西洋/, ['大西洋']],
  [/地中海/, ['地中海']],
];
const HABITAT_VERB = /住|生息|分布|いる|見られ|暮ら|棲|すむ|生き/;

const TAXON_RULES: Array<[RegExp, keyof Species['taxa']]> = [
  [/サメ|軟骨/, 'shark'],
  [/哺乳|ほ乳/, 'mammal'],
  [/爬虫|は虫|カメ/, 'reptile'],
  [/クラゲ|刺胞/, 'cnidarian'],
  [/ヒトデ|ウニ|ナマコ|棘皮/, 'echinoderm'],
  [/甲殻|エビ|カニ/, 'crustacean'],
  [/タコ/, 'octopus'],
  [/イカ/, 'squid'],
  [/頭足/, 'cephalopod'],
  [/二枚貝/, 'bivalve'],
  [/魚/, 'fish'],
];

/** 大きな分類群（軟体動物・脊椎動物・硬骨魚など）。登録済みの分類フラグから導く */
function evaluateGroup(text: string, species: Species): RuleResult {
  const t = species.taxa;
  const vertebrate = t.fish === true || t.mammal === true || t.reptile === true;
  const anyKnown = Object.values(t).some((v) => v === true);
  if (/無脊椎/.test(text)) {
    if (vertebrate) return 'no';
    return anyKnown ? 'yes' : 'unknown';
  }
  if (/脊椎/.test(text)) {
    if (vertebrate) return 'yes';
    return anyKnown ? 'no' : 'unknown';
  }
  if (/軟体/.test(text)) {
    if (t.bivalve === true || t.cephalopod === true || t.octopus === true || t.squid === true) return 'yes';
    return anyKnown ? 'no' : 'unknown';
  }
  if (/節足/.test(text)) {
    if (t.crustacean === true) return 'yes';
    return anyKnown ? 'no' : 'unknown';
  }
  if (/硬骨/.test(text)) {
    if (t.shark === true) return 'no';
    if (t.fish === true) return 'yes';
    return vertebrate ? 'no' : 'unknown';
  }
  if (/軟骨/.test(text)) {
    if (t.shark === true) return 'yes';
    if (t.fish === true) return 'no';
    return vertebrate ? 'no' : 'unknown';
  }
  if (/両生/.test(text)) {
    return anyKnown ? 'no' : 'unknown';
  }
  return 'unsupported';
}

const COLOR_RULES: Array<[RegExp, ColorKey]> = [
  [/赤|レッド/, 'red'],
  [/オレンジ|橙/, 'orange'],
  [/黄色|黄|イエロー/, 'yellow'],
  [/白|しろ|ホワイト/, 'white'],
  [/黒|くろ|ブラック/, 'black'],
  [/青|あお|ブルー/, 'blue'],
  [/緑|みどり|グリーン/, 'green'],
  [/灰|グレー|銀/, 'gray'],
  [/茶|褐色|ブラウン/, 'brown'],
  [/紫|むらさき/, 'purple'],
  [/ピンク|桃色/, 'pink'],
  [/透明|透き通/, 'transparent'],
];

interface Ctx {
  text: string;
  species: Species;
}

type RuleResult = ThreeWayAnswer | 'unsupported';

interface Rule {
  test: (text: string) => boolean;
  evaluate: (ctx: Ctx) => RuleResult;
  /** 主観的な質問は否定語があっても「どちらともいえない」 */
  subjective?: boolean;
}

function fromBoolean(value: boolean | null | undefined): ThreeWayAnswer {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function invert(answer: ThreeWayAnswer): ThreeWayAnswer {
  if (answer === 'yes') return 'no';
  if (answer === 'no') return 'yes';
  return 'unknown';
}

/** 「10m以上」「200cm以下」などの数値比較。範囲の代表値から判断し、境界付近は「どちらともいえない」 */
function evaluateNumeric(text: string, species: Species): RuleResult {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(cm|センチメートル|センチ|m|メートル)/i);
  if (!match) return 'unsupported';
  const value = Number.parseFloat(match[1]);
  const inCm = /cm|センチ/i.test(match[2]);
  const isDepth = /水深|深さ|深い|深く|深海/.test(text);
  const isSize = /体長|全長|甲長|大きい|大き|長い|長さ|サイズ|小さい|小さ|短い/.test(text);
  if (isDepth === isSize) return 'unsupported';

  let direction: 'gt' | 'lt';
  if (/以下|未満|以内|より小|より短|より浅|浅い/.test(text)) direction = 'lt';
  else if (/以上|超え|超す|より大|より長|より深/.test(text)) direction = 'gt';
  else return 'unsupported';

  if (isDepth) {
    const range = species.depthM;
    if (!range) return 'unknown';
    const meters = inCm ? value / 100 : value;
    return direction === 'gt'
      ? compareGreater(meters, range.min, range.max)
      : compareLess(meters, range.min, range.max);
  }
  const range = species.sizeCm;
  if (!range) return 'unknown';
  const centimeters = inCm ? value : value * 100;
  return direction === 'gt'
    ? compareGreater(centimeters, range.min, range.max)
    : compareLess(centimeters, range.min, range.max);
}

function compareGreater(value: number, min: number, max: number): ThreeWayAnswer {
  if (value < min) return 'yes';
  if (value >= max) return 'no';
  return 'unknown';
}

function compareLess(value: number, min: number, max: number): ThreeWayAnswer {
  if (value > max) return 'yes';
  if (value <= min) return 'no';
  return 'unknown';
}

const RULES: Rule[] = [
  {
    subjective: true,
    test: (t) => SUBJECTIVE_PATTERN.test(t),
    evaluate: () => 'unknown',
  },
  {
    test: (t) => /\d/.test(t) && /cm|センチ|m|メートル/i.test(t),
    evaluate: ({ text, species }) => evaluateNumeric(text, species),
  },
  {
    test: (t) => /深海/.test(t),
    evaluate: ({ species }) => {
      const range = species.depthM;
      if (!range) return 'unknown';
      if (range.min >= 200) return 'yes';
      if (range.max < 200) return 'no';
      return 'unknown';
    },
  },
  {
    test: (t) => DIET_TRIGGER.test(t),
    evaluate: ({ text, species }) => {
      const prey = DIET_PREY.find(([re]) => re.test(text));
      if (!prey) return 'unsupported';
      return fromBoolean(species.diet[prey[1]]);
    },
  },
  {
    test: (t) => /(オス|雄).*(子育て|育児|育て|卵|保育|守)/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.maleCaresEggs),
  },
  {
    test: (t) => /イソギンチャク/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.anemoneSymbiont),
  },
  {
    test: (t) => /共生|共存/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.symbiotic),
  },
  {
    test: (t) => HABITAT_VERB.test(t) && REGION_RULES.some(([re]) => re.test(t)),
    evaluate: ({ text, species }) => {
      const hit = REGION_RULES.find(([re]) => re.test(text));
      if (!hit) return 'unsupported';
      // 登録のない海域は「いいえ」と断定せず、確認できていないものとして扱う
      return hit[1].some((tag) => species.regions.includes(tag)) ? 'yes' : 'unknown';
    },
  },
  {
    test: (t) => ENV_RULES.some(([re]) => re.test(t)),
    evaluate: ({ text, species }) => {
      const hit = ENV_RULES.find(([re]) => re.test(text));
      if (!hit) return 'unsupported';
      return fromBoolean(species.env[hit[1]]);
    },
  },
  {
    test: (t) => /軟体|節足|脊椎|硬骨|軟骨|両生/.test(t),
    evaluate: ({ text, species }) => evaluateGroup(text, species),
  },
  {
    test: (t) => TAXON_RULES.some(([re]) => re.test(t)) || /貝/.test(t),
    evaluate: ({ text, species }) => {
      if (/二枚貝/.test(text)) return fromBoolean(species.taxa.bivalve);
      if (/貝/.test(text)) {
        if (species.taxa.bivalve === true) return 'yes';
        // 巻貝・二枚貝の区別が必要な殻の生き物は、断定しない
        if (species.features.shell === true) return 'unknown';
        return species.features.shell === false ? 'no' : 'unknown';
      }
      const hit = TAXON_RULES.find(([re]) => re.test(text));
      if (!hit) return 'unsupported';
      return fromBoolean(species.taxa[hit[1]]);
    },
  },
  {
    test: (t) => COLOR_RULES.some(([re]) => re.test(t)),
    evaluate: ({ text, species }) => {
      const hit = COLOR_RULES.find(([re]) => re.test(text));
      if (!hit) return 'unsupported';
      const has = species.colors.includes(hit[1]);
      if (species.colorVaries) return has ? 'yes' : 'unknown';
      return has ? 'yes' : 'no';
    },
  },
  {
    test: (t) => /毒|刺す|刺し/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.venomous),
  },
  {
    test: (t) => /とげ|トゲ|棘/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.spines),
  },
  {
    test: (t) => /殻|甲羅|こうら/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.shell),
  },
  {
    test: (t) => /肺|空気|呼吸|息継ぎ|息をし/.test(t),
    evaluate: ({ species }) => fromBoolean(species.features.airBreathing),
  },
];

/** 質問文に登録済みの生き物名が含まれるか（名前の直接確認を防ぐ） */
function mentionsAnySpeciesName(question: string): boolean {
  const target = normalizeText(question);
  return allSpecies().some((s) => {
    const names = [s.nameJa, s.scientificName, s.nameEn, ...s.aliases];
    return names.some((name) => {
      const normalized = normalizeText(name);
      return normalized.length >= 2 && target.includes(normalized);
    });
  });
}

/** 質問を1つ判定する。species は判定対象（外部へ送らない） */
export function answerDemoQuestion(question: string, species: Species): DemoOutcome {
  const compact = question.normalize('NFKC').replace(/[\s　]/g, '').replace(/[?？!！。]+$/, '');
  if (compact.length === 0) return { kind: 'unsupported', message: UNSUPPORTED_MESSAGE };

  if (REFUSAL_PATTERN.test(compact)) return { kind: 'refused', message: REFUSED_MESSAGE };
  if (mentionsAnySpeciesName(compact)) return { kind: 'refused', message: NAME_IN_QUESTION_MESSAGE };

  let text = compact;
  let negated = false;
  const negation = text.match(NEGATION_SUFFIX);
  if (negation) {
    negated = true;
    text = text.slice(0, -negation[0].length);
  }
  text = text.replace(/(ですか|ますか|かね|か)$/, '');

  const rule = RULES.find((r) => r.test(text));
  if (!rule) return { kind: 'unsupported', message: UNSUPPORTED_MESSAGE };

  const result = rule.evaluate({ text, species });
  if (result === 'unsupported') return { kind: 'unsupported', message: UNSUPPORTED_MESSAGE };
  if (rule.subjective) return { kind: 'answer', answer: 'unknown' };
  return { kind: 'answer', answer: negated ? invert(result) : result };
}

/** 名前が正解かどうかを判定（表記ゆれ・学名・英名を含む） */
export function isCorrectGuess(input: string, species: Species): boolean {
  return matchesSpeciesName(input, species);
}
