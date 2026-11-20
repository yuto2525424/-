import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useConfirm } from '../src/components/ConfirmDialog';
import { router } from 'expo-router';
import { Header } from '../src/components/Header';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { useApp } from '../src/state/AppProvider';
import { DIFFICULTIES, DIFFICULTY_INFO, speciesByDifficulty } from '../src/domain/species';
import type { Difficulty } from '../src/types';
import { colors } from '../src/theme/theme';

export default function DifficultyScreen() {
  const { zukan, game, startGame, discardGame } = useApp();
  const { ask, dialog } = useConfirm();

  const choose = (difficulty: Difficulty) => {
    const launch = () => {
      startGame(difficulty);
      router.replace('/game');
    };
    if (game) {
      ask({ title: '途中のゲームがあります', message: '途中のゲームを破棄して、この難易度で始めますか？', confirmLabel: '破棄して始める', destructive: true, onConfirm: () => { discardGame(); launch(); } });
      return;
    }
    launch();
  };

  return (
    <Screen>
      {dialog}
      <Header title="難易度選択" />
      <ScrollView contentContainerStyle={styles.list}>
        {DIFFICULTIES.map((d) => {
          const info = DIFFICULTY_INFO[d];
          const pool = speciesByDifficulty(d);
          const found = pool.filter((s) => zukan[s.id]).length;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${info.label}：${info.tagline}`}
              onPress={() => choose(d)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.badge}>{info.label}</Text>
                  <Text style={styles.tagline}>{info.tagline}</Text>
                </View>
                <Text style={styles.description}>{info.description}</Text>
                <Text style={styles.meta}>
                  出題対象 {pool.length} 種 ・ 発見 {found} 種
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  badge: {
    color: colors.abyss,
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: 14,
    overflow: 'hidden',
  },
  tagline: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  description: { color: colors.foam, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.textMuted, fontSize: 13 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
