import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../src/components/Header';
import { Screen } from '../../src/components/Screen';
import { useApp } from '../../src/state/AppProvider';
import { allSpecies, DIFFICULTIES, DIFFICULTY_INFO, speciesByDifficulty } from '../../src/domain/species';
import type { Difficulty, Species } from '../../src/types';
import { colors, radius } from '../../src/theme/theme';

type Filter = Difficulty | 'all';

export default function ZukanScreen() {
  const { zukan } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const total = allSpecies().length;
  const discovered = Object.keys(zukan).length;
  const percent = total === 0 ? 0 : Math.round((discovered / total) * 100);

  const list = useMemo<Species[]>(() => (filter === 'all' ? [...allSpecies()] : speciesByDifficulty(filter)), [filter]);

  return (
    <Screen>
      <Header title="生き物図鑑" />
      <View style={styles.summary}>
        <Text style={styles.summaryMain}>
          発見 {discovered} / {total} 種（{percent}%）
        </Text>
        <View style={styles.bar} accessibilityLabel={`図鑑の達成率 ${percent}%`}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.breakdown}>
          {DIFFICULTIES.map((d) => {
            const pool = speciesByDifficulty(d);
            const found = pool.filter((s) => zukan[s.id]).length;
            return (
              <Text key={d} style={styles.breakdownText}>
                {DIFFICULTY_INFO[d].label} {found}/{pool.length}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.filters}>
        {(['all', ...DIFFICULTIES] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={f === 'all' ? 'すべて' : DIFFICULTY_INFO[f].label}
              onPress={() => setFilter(f)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f === 'all' ? 'すべて' : DIFFICULTY_INFO[f].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const found = Boolean(zukan[item.id]);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={found ? item.nameJa : `未発見の生き物（${DIFFICULTY_INFO[item.difficulty].label}）`}
              onPress={() => router.push(`/zukan/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.thumb, !found && styles.thumbLocked]}>
                <Text style={styles.thumbText}>{found ? '🐠' : '？'}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{found ? item.nameJa : '未発見'}</Text>
                <Text style={styles.rowSub}>
                  {found ? item.scientificName : `${DIFFICULTY_INFO[item.difficulty].label}の生き物`}
                </Text>
              </View>
              {found ? <Text style={styles.foundTag}>発見</Text> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  summaryMain: { color: colors.text, fontSize: 17, fontWeight: '800' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.aqua },
  breakdown: { flexDirection: 'row', gap: 14 },
  breakdownText: { color: colors.textMuted, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  chipTextActive: { color: colors.abyss },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLocked: { borderWidth: 1, borderColor: colors.line },
  thumbText: { fontSize: 22, color: colors.text },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 13 },
  foundTag: { color: colors.abyss, backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
});
