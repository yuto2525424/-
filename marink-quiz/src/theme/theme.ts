/**
 * MARINK のデザイントークン。ダークモードを基本とし、深い青〜青緑を基調にする。
 */
export const colors = {
  abyss: '#04121F',
  deep: '#0A2A3F',
  ocean: '#0E4A63',
  teal: '#14807A',
  aqua: '#5FD3E0',
  foam: '#D9F6F7',
  text: '#EAF8FA',
  textMuted: '#9CC6CF',
  line: 'rgba(95, 211, 224, 0.22)',
  surface: 'rgba(14, 74, 99, 0.45)',
  surfaceStrong: 'rgba(10, 42, 63, 0.92)',
  danger: '#F28B82',
  warning: '#F6C66B',
  success: '#7BE3B0',
  pressed: 'rgba(95, 211, 224, 0.18)',
} as const;

export const fonts = {
  // 日本語は iOS の標準フォント（ヒラギノ角ゴシック等）を使用し、ウェイトだけ指定する
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '600' as const },
  bold: { fontWeight: '800' as const },
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
/** 押しやすさの基準（Appleの推奨 44pt 以上） */
export const minTouch = 48;
