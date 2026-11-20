import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AnswerBubble } from '../src/components/AnswerBubble';
import { Button } from '../src/components/Button';
import { MysteryCreature } from '../src/components/MysteryCreature';
import { ProgressDots } from '../src/components/ProgressDots';
import { Screen } from '../src/components/Screen';
import { GuessModal, HistoryModal } from '../src/components/GameModals';
import { useApp } from '../src/state/AppProvider';
import {
  canAskQuestion,
  canFinalGuess,
  canGuessMidGame,
  questionsRemaining,
} from '../src/domain/game';
import { MAX_QUESTIONS, MAX_QUESTION_LENGTH } from '../src/domain/constants';
import { DIFFICULTY_INFO } from '../src/domain/species';
import { colors, radius } from '../src/theme/theme';

export default function GameScreen() {
  const { game, lastResult, askQuestion, submitGuess, giveUp } = useApp();
  const [input, setInput] = useState('');
  const [guessOpen, setGuessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ゲームが終わったら結果画面へ。ゲームが無い場合はホームへ戻す
  useEffect(() => {
    if (game) return;
    if (lastResult) router.replace('/result');
    else router.replace('/');
  }, [game, lastResult]);

  const lastQuestion = useMemo(() => (game && game.questions.length > 0 ? game.questions[game.questions.length - 1] : null), [game]);

  if (!game) return <Screen />;

  const remaining = questionsRemaining(game);
  const finalPhase = game.phase === 'final';
  const askable = canAskQuestion(game);
  const trimmed = input.trim();
  const tense = finalPhase || remaining <= 3;
  const guessAllowed = canGuessMidGame(game) || canFinalGuess(game);

  const send = async () => {
    if (!askable || trimmed.length === 0) return;
    const answered = await askQuestion(input);
    if (answered) setInput('');
  };

  const confirmGiveUp = () => {
    Alert.alert('降参しますか？', 'このゲームは敗北として終了します。', [
      { text: '続ける', style: 'cancel' },
      { text: '降参する', style: 'destructive', onPress: giveUp },
    ]);
  };

  const confirmGuess = (text: string) => {
    const message = finalPhase ? 'これが最後の回答になります。この名前で決定しますか？' : 'この名前で回答しますか？';
    Alert.alert('回答の確認', `「${text.trim()}」\n\n${message}`, [
      { text: 'やめる', style: 'cancel' },
      {
        text: '回答する',
        onPress: () => {
          submitGuess(text);
          setGuessOpen(false);
        },
      },
    ]);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Text style={styles.difficulty} accessibilityLabel={`難易度 ${DIFFICULTY_INFO[game.difficulty].label}`}>
            {DIFFICULTY_INFO[game.difficulty].label}
          </Text>
          <Text
            style={[styles.remaining, tense && { color: colors.warning }]}
            accessibilityLiveRegion="polite"
          >
            {finalPhase ? '最後の回答' : `残り ${remaining} 回`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="降参する"
            onPress={confirmGiveUp}
            disabled={game.pending}
            style={({ pressed }) => [styles.giveUp, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.giveUpText}>降参</Text>
          </Pressable>
        </View>

        <View style={styles.progress}>
          <ProgressDots total={MAX_QUESTIONS} used={game.questions.length} />
        </View>

        <View style={styles.center}>
          <MysteryCreature remaining={remaining} finalPhase={finalPhase} />
          <AnswerBubble
            pending={game.pending}
            question={lastQuestion?.question ?? null}
            answer={lastQuestion?.answer ?? null}
          />
          {game.notice ? (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              {game.notice}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottom}>
          {finalPhase ? (
            <Text style={styles.finalNote}>質問は使い切りました。正体を名前で回答してください。（外すとゲームオーバーです）</Text>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="例：体は赤いですか？"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={MAX_QUESTION_LENGTH}
                editable={askable}
                returnKeyType="send"
                onSubmitEditing={send}
                accessibilityLabel="質問を入力"
                accessibilityHint="生き物について、はい・いいえで答えられる質問を入力します"
              />
              <Button
                label={game.pending ? '送信中' : '質問する'}
                onPress={send}
                disabled={!askable || trimmed.length === 0}
                style={styles.sendButton}
              />
            </View>
          )}

          <View style={styles.actions}>
            <Button
              label={finalPhase ? '最後の回答' : '生物名を回答'}
              variant={finalPhase ? 'danger' : 'secondary'}
              onPress={() => setGuessOpen(true)}
              disabled={!guessAllowed}
              hint="生き物の名前を予想します"
              style={styles.flexButton}
            />
            <Button label="質問履歴" variant="ghost" onPress={() => setHistoryOpen(true)} style={styles.flexButton} />
          </View>
        </View>

        <GuessModal
          visible={guessOpen}
          finalPhase={finalPhase}
          onClose={() => setGuessOpen(false)}
          onSubmit={confirmGuess}
        />
        <HistoryModal visible={historyOpen} records={game.questions} onClose={() => setHistoryOpen(false)} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingHorizontal: 16, paddingBottom: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, minHeight: 48 },
  difficulty: {
    color: colors.abyss,
    backgroundColor: colors.aqua,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    fontWeight: '800',
    fontSize: 14,
    overflow: 'hidden',
  },
  remaining: { color: colors.text, fontSize: 17, fontWeight: '800' },
  giveUp: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  giveUpText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  progress: { alignItems: 'center', paddingVertical: 4 },
  center: { flex: 1, justifyContent: 'center', gap: 16 },
  notice: { color: colors.warning, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  bottom: { gap: 12 },
  finalNote: { color: colors.warning, fontSize: 15, textAlign: 'center', lineHeight: 22, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  sendButton: { width: 104, flexShrink: 0 },
  actions: { flexDirection: 'row', gap: 10 },
  flexButton: { flex: 1 },
});
