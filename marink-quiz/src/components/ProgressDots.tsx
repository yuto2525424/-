import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';

/** 質問の進行状況を点で表示する（使った分は塗りつぶし） */
export function ProgressDots({ total, used }: { total: number; used: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`質問 ${used} / ${total} 回使用`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < used && styles.used]} />
      ))}
      <Text style={styles.count}>
        {used}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.aqua,
  },
  used: { backgroundColor: colors.aqua },
  count: { color: colors.textMuted, fontSize: 13, marginLeft: 6, fontWeight: '600' },
});
