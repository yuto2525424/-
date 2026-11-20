import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { QuestionRecord } from '../domain/game';
import { ANSWER_LABEL } from '../types';
import { colors } from '../theme/theme';

/** 質問履歴。番号・質問・3択の回答を並べる */
export function QuestionLog({ records, emptyText = 'まだ質問していません' }: { records: QuestionRecord[]; emptyText?: string }) {
  if (records.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }
  return (
    <ScrollView accessibilityLabel="質問履歴">
      {records.map((r) => (
        <View key={r.index} style={styles.row}>
          <Text style={styles.index}>{r.index}</Text>
          <Text style={styles.question}>{r.question}</Text>
          <Text style={[styles.answer, answerColor(r.answer)]}>{ANSWER_LABEL[r.answer]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function answerColor(answer: QuestionRecord['answer']) {
  if (answer === 'yes') return { color: colors.success };
  if (answer === 'no') return { color: colors.danger };
  return { color: colors.warning };
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  index: { color: colors.textMuted, fontWeight: '700', width: 24, textAlign: 'center' },
  question: { color: colors.text, fontSize: 15, flex: 1 },
  answer: { fontSize: 14, fontWeight: '800' },
});
