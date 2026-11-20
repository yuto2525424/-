import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, minTouch } from '../theme/theme';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, onBack, right }: HeaderProps) {
  const back = onBack ?? (() => router.back());
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="戻る"
        onPress={back}
        style={({ pressed }) => [styles.side, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: minTouch,
  },
  side: { minWidth: 84, minHeight: minTouch, justifyContent: 'center', alignItems: 'flex-start' },
  pressed: { opacity: 0.6 },
  backText: { color: colors.aqua, fontSize: 17, fontWeight: '600' },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
});
