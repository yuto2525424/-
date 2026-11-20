import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../src/components/Card';
import { Header } from '../src/components/Header';
import { Screen } from '../src/components/Screen';
import { useApp } from '../src/state/AppProvider';
import { accuracyPercent, averageQuestionsInWins } from '../src/domain/progress';
import { DIFFICULTIES, DIFFICULTY_INFO, speciesByDifficulty } from '../src/domain/species';
import { colors } from '../src/theme/theme';


export default function StatsScreen() {
  const { stats, zukan } = useApp();
  const average = averageQuestionsInWins(stats);

  return (
    <Screen>
      <Header title="成績" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          <Metric label="総プレイ回数" value={`${stats.plays} 回`} />
          <Metric label="正解回数" value={`${stats.wins} 回`} />
          <Metric label="正答率" value={`${accuracyPercent(stats)} %`} />
          <Metric label="最少質問クリア" value={stats.bestQuestionCount === null ? '未記録' : `${stats.bestQuestionCount} 問`} />
          <Metric label="連続正解" value={`${stats.currentStreak} 回`} />
          <Metric label="最高連続正解" value={`${stats.bestStreak} 回`} />
        </View>

        <Card style={styles.wide}>
          <Text style={styles.section}>正解時の平均質問数</Text>
          <Text style={styles.big}>{average === null ? '—' : `${average} 問`}</Text>
        </Card>

        <Card style={styles.wide}>
          <Text style={styles.section}>難易度別の発見数</Text>
          {DIFFICULTIES.map((d) => {
            const pool = speciesByDifficulty(d);
            const found = pool.filter((s) => zukan[s.id]).length;
            return (
              <View key={d} style={styles.difficultyRow}>
                <Text style={styles.difficultyName}>{DIFFICULTY_INFO[d].label}</Text>
                <Text style={styles.difficultyValue}>
                  {found} / {pool.length} 種
                </Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', gap: 6, minHeight: 88 },
  metricLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  wide: { gap: 10 },
  section: { color: colors.aqua, fontSize: 15, fontWeight: '800' },
  big: { color: colors.text, fontSize: 28, fontWeight: '800' },
  difficultyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  difficultyName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  difficultyValue: { color: colors.foam, fontSize: 16 },
});
