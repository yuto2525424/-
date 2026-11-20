import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ANSWER_LABEL, type ThreeWayAnswer } from '../types';
import { colors, radius } from '../theme/theme';

interface Props {
  answer: ThreeWayAnswer | null;
  question: string | null;
  pending: boolean;
}

/** AIの回答（3択）を表示する。新しい回答が届くたびにふわっと現れる */
export function AnswerBubble({ answer, question, pending }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const key = `${question ?? ''}|${answer ?? ''}`;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [key, fade]);

  if (pending) {
    return (
      <View style={styles.box} accessibilityLiveRegion="polite">
        <Text style={styles.thinking}>考えています…</Text>
      </View>
    );
  }
  if (!answer || !question) {
    return (
      <View style={styles.box} accessibilityLiveRegion="polite">
        <Text style={styles.hint}>質問して、正体を絞り込みましょう</Text>
      </View>
    );
  }
  const color = answer === 'yes' ? colors.success : answer === 'no' ? colors.danger : colors.warning;
  return (
    <Animated.View style={[styles.box, { opacity: fade }]} accessibilityLiveRegion="polite">
      <Text style={styles.question} numberOfLines={2}>
        Q. {question}
      </Text>
      <Text style={[styles.answer, { color }]}>{ANSWER_LABEL[answer]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thinking: { color: colors.textMuted, fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  question: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  answer: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
});
