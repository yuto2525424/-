import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/state/AppProvider';
import { colors } from '../src/theme/theme';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.abyss },
        }}
      >
        {/* ゲーム中は誤って戻る操作をしないよう、スワイプで戻れないようにする */}
        <Stack.Screen name="game" options={{ gestureEnabled: false }} />
      </Stack>
    </AppProvider>
  );
}
