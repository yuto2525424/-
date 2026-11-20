import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Species } from '../types';
import { colors, radius } from '../theme/theme';

/**
 * 生き物の画像枠。画像が未登録（species.image が null）の間は、仮の表示としてこの枠を使う。
 * 画像を登録すれば Image に差し替えられるよう、Species.image の型を後から拡張する前提の境界。
 */
export function SpeciesPlaceholder({ species, size = 150 }: { species: Species; size?: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessibilityLabel={`${species.nameJa}のイラスト（準備中）`}>
      <LinearGradient colors={['#0E5A73', '#0A2A3F']} style={StyleSheet.absoluteFill} />
      <Text style={styles.glyph}>🐠</Text>
      <Text style={styles.caption}>画像準備中</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 48 },
  caption: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
