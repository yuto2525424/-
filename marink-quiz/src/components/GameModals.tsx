import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { QuestionRecord } from '../domain/game';
import { MAX_QUESTION_LENGTH } from '../domain/constants';
import { colors, radius } from '../theme/theme';
import { Button } from './Button';
import { QuestionLog } from './QuestionLog';

interface GuessModalProps {
  visible: boolean;
  finalPhase: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

/** 生物名の入力。送信前に確認ダイアログを挟み、誤操作を防ぐ */
export function GuessModal({ visible, finalPhase, onClose, onSubmit }: GuessModalProps) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{finalPhase ? '最後の回答' : '生き物の名前を予想'}</Text>
          <Text style={styles.note}>
            {finalPhase
              ? '正解すればクリア。外すとゲームオーバーです。'
              : '正解すればクリア。外しても質問は続けられます（予想ミスは3回まで）。'}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="生き物の名前（カタカナ・ひらがなどどちらでも可）"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            maxLength={MAX_QUESTION_LENGTH}
            returnKeyType="done"
            accessibilityLabel="生き物の名前を入力"
          />
          <View style={styles.row}>
            <Button label="やめる" variant="ghost" onPress={() => { setText(''); onClose(); }} style={styles.flex} />
            <Button
              label="回答する"
              onPress={() => {
                onSubmit(trimmed);
                setText('');
              }}
              disabled={trimmed.length === 0}
              style={styles.flex}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface HistoryModalProps {
  visible: boolean;
  records: QuestionRecord[];
  onClose: () => void;
}

/** 質問履歴（ゲーム中いつでも確認できる） */
export function HistoryModal({ visible, records, onClose }: HistoryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.historyScreen}>
        <View style={styles.historyHeader}>
          <Text style={styles.title}>質問履歴</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>閉じる</Text>
          </Pressable>
        </View>
        <View style={styles.historyBody}>
          <QuestionLog records={records} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2, 10, 18, 0.7)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: colors.deep,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 14,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  note: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  historyScreen: { flex: 1, backgroundColor: colors.abyss, paddingTop: 56, paddingHorizontal: 16 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  close: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { color: colors.aqua, fontSize: 17, fontWeight: '700' },
  historyBody: { flex: 1 },
});
