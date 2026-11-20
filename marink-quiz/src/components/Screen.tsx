import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { SeaBackground } from './SeaBackground';
import { colors } from '../theme/theme';

/** すべての画面の土台。ノッチ・Dynamic Island を避けたセーフエリアと海中背景を提供する */
export function Screen({ children, style, edges }: { children?: ReactNode; style?: ViewStyle; edges?: Edge[] }) {
  return (
    <View style={styles.root}>
      <SeaBackground />
      <SafeAreaView style={[styles.safe, style]} edges={edges ?? ['top', 'left', 'right', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.abyss },
  safe: { flex: 1 },
});
