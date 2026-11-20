import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Text style={styles.text}>このページは見つかりませんでした。</Text>
      <Button label="ホームへ" onPress={() => router.replace('/')} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { color: '#EAF8FA', fontSize: 18, textAlign: 'center', marginTop: 120 },
  button: { marginHorizontal: 40, marginTop: 24 },
});
