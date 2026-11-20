/** アプリ全体で使う型定義。ゲームロジック・データ・UIの境界をここで定める。 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** AIの回答は必ずこの3種類のいずれか */
export type ThreeWayAnswer = 'yes' | 'no' | 'unknown';

export const ANSWER_LABEL: Record<ThreeWayAnswer, string> = {
  yes: 'はい',
  no: 'いいえ',
  unknown: 'どちらともいえない',
};

/** 数値範囲（代表値の下限・上限）。null は不明 */
export interface Range {
  min: number;
  max: number;
}

/** 分類。null は「確認できていない」を表す（推測で埋めない） */
export interface Taxa {
  fish: boolean | null;
  shark: boolean | null;
  mammal: boolean | null;
  reptile: boolean | null;
  cnidarian: boolean | null;
  octopus: boolean | null;
  squid: boolean | null;
  cephalopod: boolean | null;
  bivalve: boolean | null;
  echinoderm: boolean | null;
  crustacean: boolean | null;
}

export type ColorKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'white'
  | 'black'
  | 'blue'
  | 'green'
  | 'gray'
  | 'brown'
  | 'purple'
  | 'pink'
  | 'transparent';

export type DietKey =
  | 'fish'
  | 'plankton'
  | 'plants'
  | 'jellyfish'
  | 'shellfish'
  | 'crustacean'
  | 'cephalopod'
  | 'echinoderm'
  | 'mammal'
  | 'coral'
  | 'detritus';

export interface Species {
  id: string;
  /** 日本語名（正式名） */
  nameJa: string;
  /** 別名・表記ゆれ（判定時に正解として扱う） */
  aliases: string[];
  scientificName: string;
  nameEn: string;
  difficulty: Difficulty;
  /** 分類 */
  classification: {
    phylum: string;
    classJa: string;
    family: string;
  };
  taxa: Taxa;
  /** 生息地域。広域の場合は親の海域名も含める（例：太平洋 と 西太平洋） */
  regions: string[];
  /** 生息環境の説明 */
  habitat: string;
  /** 生息環境の判定用フラグ（null は不明） */
  env: {
    coralReef: boolean | null;
    coastal: boolean | null;
    openOcean: boolean | null;
    japanWaters: boolean | null;
    tropical: boolean | null;
  };
  /** 水深（m）の代表範囲。null は不明 */
  depthM: Range | null;
  /** 体長（cm）の代表範囲（傘径など一部は説明に明記）。null は不明 */
  sizeCm: Range | null;
  sizeNote?: string;
  /** 体色の代表値 */
  colors: ColorKey[];
  /** 体色が環境や状態で大きく変わるか */
  colorVaries: boolean;
  /** 食性（true=食べる、false=食べない、null=不明） */
  diet: Partial<Record<DietKey, boolean>>;
  dietSummary: string;
  /** 特徴・能力（判定用フラグ） */
  features: {
    venomous: boolean | null;
    spines: boolean | null;
    shell: boolean | null;
    airBreathing: boolean | null;
    anemoneSymbiont: boolean;
    symbiotic: boolean | null;
    maleCaresEggs: boolean | null;
  };
  /** 生態解説（図鑑・正解画面に表示） */
  ecology: string;
  /** 豆知識 */
  trivia: string;
  /** 特殊な能力（表示用） */
  specialAbility: string;
  /** 画像。未用意の間は null（プレースホルダー表示） */
  image: null;
  /** 出典と確認状況 */
  source: {
    references: string[];
    verified: boolean;
  };
}
