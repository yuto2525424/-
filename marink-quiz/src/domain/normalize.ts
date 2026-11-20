/**
 * 回答文字列の正規化。
 * 全角・半角、カタカナ・ひらがな、空白や中黒、大文字・小文字の差を吸収して比較する。
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　・･\-ー－_()（）「」『』]/g, '')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 入力が生物名（正式名・別名・学名・英名）のどれかに一致するか */
export function matchesSpeciesName(
  input: string,
  candidates: { nameJa: string; aliases: string[]; scientificName: string; nameEn: string },
): boolean {
  const target = normalizeText(input);
  if (target.length === 0) return false;
  const names = [candidates.nameJa, ...candidates.aliases, candidates.scientificName, candidates.nameEn];
  return names.some((name) => normalizeText(name) === target);
}
