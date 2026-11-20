import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '../src/components/Card';
import { Header } from '../src/components/Header';
import { Screen } from '../src/components/Screen';
import { MAX_MID_GUESS_MISTAKES, MAX_QUESTIONS } from '../src/domain/constants';
import { colors } from '../src/theme/theme';

const RULES = [
  `AIが海の生き物を1種類選びます。名前は伏せられています。`,
  `自由な文章で質問できます（最大${MAX_QUESTIONS}回）。`,
  `答えは「はい」「いいえ」「どちらともいえない」の3種類です。`,
  `途中でも「生物名を回答」から名前を予想できます。正解すればクリア。外しても質問は続けられます（予想ミスは${MAX_MID_GUESS_MISTAKES}回まで）。`,
  `${MAX_QUESTIONS}回の質問を使い切ると、最後に1回だけ名前を回答します。外すとゲームオーバーです。`,
  `質問回数が少ないほど高評価です。1〜3問：S、4〜5問：A、6〜7問：B、8〜10問：C。`,
];

const TIPS = [
  '「体は赤いですか？」「サンゴ礁に住みますか？」のように、1つの特徴を短く聞くと答えやすくなります。',
  '「何を食べますか？」のように幅の広い質問は答えられない場合があります。「魚を食べますか？」のように具体的に聞いてください。',
  '生き物の名前そのものを質問に入れると、答えられません（名前は「生物名を回答」から）。',
  '「どちらともいえない」は、データにない・個体や地域で差がある・境界の値、などのときに返されます。',
];

export default function HowToScreen() {
  return (
    <Screen>
      <Header title="遊び方" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.section}>ルール</Text>
          {RULES.map((line, i) => (
            <Text key={i} style={styles.item}>
              {i + 1}. {line}
            </Text>
          ))}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.section}>質問のコツ</Text>
          {TIPS.map((line, i) => (
            <Text key={i} style={styles.item}>
              ・{line}
            </Text>
          ))}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.section}>デモモードについて</Text>
          <Text style={styles.item}>
            AIのサーバーが未設定のときは、アプリに登録された生き物の情報だけで答えるデモモードで遊べます。登録にない特徴を聞かれた場合は、「どちらともいえない」と答えます。
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { gap: 10 },
  section: { color: colors.aqua, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  item: { color: colors.text, fontSize: 15, lineHeight: 23 },
});
