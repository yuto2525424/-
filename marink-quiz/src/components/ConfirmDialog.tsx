import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/theme';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * 端末（iOS / Web）に依存しない確認ダイアログ。
 * React Native の Alert は Web で動かないため、アプリ内で表示する。
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const ask = useCallback((next: ConfirmOptions) => setOptions(next), []);
  const close = useCallback(() => setOptions(null), []);

  const dialog: ReactNode = options ? (
    <ConfirmDialog
      {...options}
      onCancel={close}
      onConfirm={() => {
        const run = options.onConfirm;
        close();
        run();
      }}
    />
  ) : null;

  return { ask, dialog };
}

interface Props extends ConfirmOptions {
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'やめる', destructive, onCancel, onConfirm }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="閉じる">
        <Pressable style={styles.sheet} onPress={() => undefined} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} style={styles.flex} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.flex}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2, 10, 18, 0.7)', justifyContent: 'center', padding: 24 },
  sheet: {
    backgroundColor: colors.deep,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  message: { color: colors.foam, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
});
