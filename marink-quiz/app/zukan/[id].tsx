import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Header } from '../../src/components/Header';
import { Screen } from '../../src/components/Screen';
import { SpeciesPlaceholder } from '../../src/components/SpeciesPlaceholder';
import { useApp } from '../../src/state/AppProvider';
import { findSpeciesById, DIFFICULTY_INFO } from '../../src/domain/species';
import { formatClassification, formatColors, formatRange, formatRegions, formatSource } from '../../src/domain/format';
import { colors } from '../../src/theme/theme';

export default function ZukanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { zukan } = useApp();
  const species = useMemo(() => findSpeciesById(String(id)), [id]);

  if (!species) {
    return (
      <Screen>
        <Header title="図鑑" />
        <Text style={styles.empty}>この生き物は見つかりませんでした。</Text>
      </Screen>
    );
  }

  const found = Boolean(zukan[species.id]);
  if (!found) {
    return (
      <Screen>
        <Header title="未発見" />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.lockedCard}>
            <Text style={styles.lockedMark}>？</Text>
            <Text style={styles.lockedText}>{DIFFICULTY_INFO[species.difficulty].label}の生き物</Text>
            <Text style={styles.lockedHint}>ゲームでこの生き物を正解すると、図鑑に登録されます。</Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={species.nameJa} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.center}>
          <SpeciesPlaceholder species={species} size={170} />
          <Text style={styles.name}>{species.nameJa}</Text>
          <Text style={styles.sci}>{species.scientificName}</Text>
          <Text style={styles.meta}>
            {DIFFICULTY_INFO[species.difficulty].label} ・ 発見 {zukan[species.id].timesCorrect} 回
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <Info label="英名" value={species.nameEn} />
          <Info label="分類" value={formatClassification(species)} />
          <Info label="生息地域" value={formatRegions(species)} />
          <Info label="生息環境" value={species.habitat} />
          <Info label="水深" value={formatRange(species.depthM, 'm')} />
          <Info label="体長" value={`${formatRange(species.sizeCm, 'cm')}${species.sizeNote ? `（${species.sizeNote}）` : ''}`} />
          <Info label="体色" value={formatColors(species)} />
          <Info label="食性" value={species.dietSummary} />
          <Info label="特殊な能力" value={species.specialAbility} />
        </Card>

        <Card>
          <Text style={styles.section}>生態解説</Text>
          <Text style={styles.body}>{species.ecology}</Text>
          <Text style={styles.section}>豆知識</Text>
          <Text style={styles.body}>{species.trivia}</Text>
        </Card>

        <Card>
          <Text style={styles.section}>出典・確認状況</Text>
          {species.source.references.map((r) => (
            <Text key={r} style={styles.body}>
              ・{r}
            </Text>
          ))}
          <Text style={styles.note}>{formatSource(species)}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  center: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 8 },
  sci: { color: colors.aqua, fontSize: 15, fontStyle: 'italic' },
  meta: { color: colors.textMuted, fontSize: 13 },
  infoCard: { gap: 10 },
  infoRow: { gap: 2 },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 15, lineHeight: 21 },
  section: { color: colors.aqua, fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 6 },
  body: { color: colors.text, fontSize: 15, lineHeight: 23 },
  note: { color: colors.warning, fontSize: 13, marginTop: 8 },
  lockedCard: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  lockedMark: { color: colors.aqua, fontSize: 80, fontWeight: '800' },
  lockedText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  lockedHint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  empty: { color: colors.textMuted, padding: 24, textAlign: 'center' },
});
