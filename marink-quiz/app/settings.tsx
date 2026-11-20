import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useConfirm } from '../src/components/ConfirmDialog';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Header } from '../src/components/Header';
import { Screen } from '../src/components/Screen';
import { useApp } from '../src/state/AppProvider';
import { colors } from '../src/theme/theme';

export default function SettingsScreen() {
  const { settings, updateSettings, resetProgress, answerModeLabel } = useApp();
  const { ask, dialog } = useConfirm();

  const confirmReset = () => {
    ask({ title: '記録をすべて消しますか？', message: '図鑑・成績・途中のゲームが消えます。この操作は取り消せません。', confirmLabel: '消去する', destructive: true, onConfirm: () => { void resetProgress(); } });
  };

  return (
    <Screen>
      {dialog}
      <Header title="設定" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Toggle
            label="効果音"
            hint="正解・不正解・回答時の音"
            value={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <Toggle
            label="BGM（幻想的な音楽）"
            hint="ゲーム中に流れる環境音楽です"
            value={settings.bgmEnabled}
            onChange={(v) => updateSettings({ bgmEnabled: v })}
          />
          <Toggle
            label="触覚フィードバック"
            hint="回答や結果で振動します"
            value={settings.hapticsEnabled}
            onChange={(v) => updateSettings({ hapticsEnabled: v })}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>回答の仕組み</Text>
          <Text style={styles.item}>現在：{answerModeLabel}</Text>
          <Text style={styles.note}>
            AIサーバーに接続すると、より自由な質問に答えられるようになります（接続先はサーバー側の設定で行います。アプリにAPIキーは含みません）。
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>データ</Text>
          <Text style={styles.note}>図鑑・成績・途中のゲームは、この端末の中だけに保存されます。会員登録は不要です。</Text>
          <Button label="記録をすべて消す" variant="danger" onPress={confirmReset} />
        </Card>

        <Text style={styles.version}>MARINK ・ この海の生き物、な〜んだ？ ・ v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.note}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.surface, true: colors.teal }}
        thumbColor={colors.foam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { gap: 14 },
  section: { color: colors.aqua, fontSize: 15, fontWeight: '800' },
  item: { color: colors.text, fontSize: 15 },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
