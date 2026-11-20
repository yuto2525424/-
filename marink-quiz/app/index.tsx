import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { useApp } from '../src/state/AppProvider';
import { DIFFICULTY_INFO } from '../src/domain/species';
import { colors } from '../src/theme/theme';

export default function HomeScreen() {
  const { ready, game, settings, startGame, discardGame, answerModeLabel } = useApp();
  const difficultyLabel = useMemo(() => DIFFICULTY_INFO[settings.difficulty].label, [settings.difficulty]);

  const begin = () => {
    const launch = () => {
      startGame(settings.difficulty);
      router.push('/game');
    };
    if (game) {
      Alert.alert('途中のゲームがあります', '途中のゲームを破棄して、新しく始めますか？', [
        { text: 'やめる', style: 'cancel' },
        { text: '破棄して始める', style: 'destructive', onPress: () => { discardGame(); launch(); } },
      ]);
      return;
    }
    launch();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.brand}>MARINK</Text>
          <Text style={styles.tagline}>海の生き物を、もっと面白く。</Text>
          <Text style={styles.title}>この海の生き物、な〜んだ？</Text>
          <Text style={styles.subtitle}>10回の質問で、海の生き物を見破れ！</Text>
        </View>

        <View style={styles.menu}>
          {game ? (
            <Button label="続きから遊ぶ" onPress={() => router.push('/game')} hint="途中のゲームを再開します" />
          ) : null}
          <Button label="ゲームスタート" onPress={begin} disabled={!ready} hint={`現在の難易度（${difficultyLabel}）で始めます`} />
          <Button label="難易度選択" variant="secondary" onPress={() => router.push('/difficulty')} disabled={!ready} />
          <Button label="生き物図鑑" variant="secondary" onPress={() => router.push('/zukan')} />
          <Button label="遊び方" variant="secondary" onPress={() => router.push('/howto')} />
          <Button label="成績" variant="secondary" onPress={() => router.push('/stats')} />
          <Button label="設定" variant="ghost" onPress={() => router.push('/settings')} />
        </View>

        <Text style={styles.footer}>
          難易度：{difficultyLabel} ・ {answerModeLabel}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, gap: 28, flexGrow: 1 },
  hero: { alignItems: 'center', gap: 8, marginTop: 12 },
  brand: { color: colors.aqua, fontSize: 14, fontWeight: '800', letterSpacing: 4 },
  tagline: { color: colors.textMuted, fontSize: 13 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 10, lineHeight: 40 },
  subtitle: { color: colors.foam, fontSize: 16, textAlign: 'center' },
  menu: { gap: 12 },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 'auto' },
});
