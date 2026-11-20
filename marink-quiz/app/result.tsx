import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { QuestionLog } from '../src/components/QuestionLog';
import { Screen } from '../src/components/Screen';
import { SpeciesPlaceholder } from '../src/components/SpeciesPlaceholder';
import { useApp } from '../src/state/AppProvider';
import { findSpeciesById } from '../src/domain/species';
import { rankForQuestionCount } from '../src/domain/rank';
import { RANK_MESSAGE } from '../src/domain/rankTypes';
import { colors } from '../src/theme/theme';
import { formatClassification, formatRange, formatRegions, formatSource } from '../src/domain/format';
import { ANSWER_LABEL } from '../src/types';

export default function ResultScreen() {
  const { lastResult, startGame, clearLastResult } = useApp();
  const species = useMemo(() => (lastResult ? findSpeciesById(lastResult.speciesId) : undefined), [lastResult]);
  const reveal = useRef(new Animated.Value(0)).current;
  // 次の画面へ移動中は、結果データを消しても自動でホームへ戻らないようにする
  const leaving = useRef(false);

  useEffect(() => {
    if (!leaving.current && (!lastResult || !species)) router.replace('/');
  }, [lastResult, species]);

  useEffect(() => {
    reveal.setValue(0);
    Animated.spring(reveal, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [reveal, lastResult]);

  if (!lastResult || !species) return <Screen />;

  const won = lastResult.won;
  const rank = rankForQuestionCount(lastResult.questionCount);
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const go = (path: '/game' | '/zukan' | '/', prepare?: () => void) => {
    leaving.current = true;
    prepare?.();
    router.replace(path);
    clearLastResult();
  };
  const again = () => go('/game', () => startGame(lastResult.difficulty));
  const toZukan = () => go('/zukan');
  const toHome = () => go('/');

  const outcomeTitle = won ? 'せいかい！' : 'ざんねん…';
  const outcomeSub = won
    ? `${lastResult.questionCount}回の質問で見破りました`
    : lastResult.endReason === 'gaveUp'
      ? '降参しました。正解はこちらです'
      : lastResult.endReason === 'finalWrong'
        ? '最後の回答が違いました'
        : '正解はこちらです';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={[styles.hero, { opacity: reveal, transform: [{ scale }] }]}>
          <Text style={[styles.outcome, { color: won ? colors.success : colors.danger }]} accessibilityRole="header">
            {outcomeTitle}
          </Text>
          <Text style={styles.speciesName}>{species.nameJa}</Text>
          <Text style={styles.outcomeSub}>{outcomeSub}</Text>
        </Animated.View>

        <View style={styles.center}>
          <SpeciesPlaceholder species={species} size={160} />
        </View>

        {won ? (
          <Card style={styles.rankCard}>
            <Text style={styles.rankLabel}>評価ランク</Text>
            <Text style={styles.rank} accessibilityLabel={`評価ランク ${rank}`}>
              {rank}
            </Text>
            <Text style={styles.rankMessage}>{RANK_MESSAGE[rank]}</Text>
            <Text style={styles.stat}>使用した質問：{lastResult.questionCount} 回</Text>
          </Card>
        ) : null}

        <Card style={styles.infoCard}>
          <Info label="学名" value={species.scientificName} />
          <Info label="英名" value={species.nameEn} />
          <Info label="分類" value={formatClassification(species)} />
          <Info label="生息地域" value={formatRegions(species)} />
          <Info label="水深" value={formatRange(species.depthM, 'm')} />
          <Info label="体長" value={formatRange(species.sizeCm, 'cm')} />
          <Info label="出典・確認" value={formatSource(species)} />
        </Card>

        <Card>
          <Text style={styles.section}>生態解説</Text>
          <Text style={styles.body}>{species.ecology}</Text>
          <Text style={styles.section}>豆知識</Text>
          <Text style={styles.body}>{species.trivia}</Text>
        </Card>

        {!won ? (
          <Card>
            <Text style={styles.section}>あなたの質問履歴</Text>
            <QuestionLog records={lastResult.questions} emptyText="質問はしませんでした" />
            <Text style={styles.note}>
              最初の質問：{lastResult.questions[0] ? `「${lastResult.questions[0].question}」→${ANSWER_LABEL[lastResult.questions[0].answer]}` : 'なし'}
            </Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button label="もう一度遊ぶ" onPress={again} />
          {won ? <Button label="図鑑を見る" variant="secondary" onPress={toZukan} /> : null}
          <Button label="ホームへ" variant="ghost" onPress={toHome} />
        </View>
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
  content: { padding: 18, gap: 16, paddingBottom: 36, alignItems: 'stretch' },
  center: { alignItems: 'center' },
  hero: { alignItems: 'center', gap: 6, paddingTop: 8 },
  outcome: { fontSize: 34, fontWeight: '800' },
  speciesName: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  outcomeSub: { color: colors.foam, fontSize: 15, textAlign: 'center' },
  rankCard: { alignItems: 'center', gap: 4 },
  rankLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  rank: { color: colors.aqua, fontSize: 56, fontWeight: '800', lineHeight: 64 },
  rankMessage: { color: colors.text, fontSize: 15 },
  stat: { color: colors.foam, fontSize: 14, marginTop: 4 },
  infoCard: { gap: 10 },
  infoRow: { gap: 2 },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 15, lineHeight: 21 },
  section: { color: colors.aqua, fontSize: 15, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  body: { color: colors.text, fontSize: 15, lineHeight: 23 },
  note: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  actions: { gap: 12, marginTop: 4 },
});
