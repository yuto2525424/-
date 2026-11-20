import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';

interface Props {
  /** 残り質問回数。少なくなるほど緊張感のある表示にする */
  remaining: number;
  finalPhase: boolean;
}

/** 正体不明の生き物を表す「？」。残りが少ないと光の色と鼓動が変わる */
export function MysteryCreature({ remaining, finalPhase }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const tense = finalPhase || remaining <= 3;
  const period = tense ? 900 : 2400;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [period, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, tense ? 1.08 : 1.03] });
  const glow = tense ? colors.warning : colors.aqua;

  return (
    <View style={styles.wrap} accessible accessibilityLabel="正体不明の生き物">
      <Animated.View style={[styles.halo, { borderColor: glow, transform: [{ scale }] }]}>
        <View style={[styles.core, { borderColor: glow }]}>
          <Text style={[styles.question, { color: glow }]}>？</Text>
        </View>
      </Animated.View>
      <Text style={[styles.caption, tense && { color: colors.warning }]}>
        {finalPhase ? '最後の回答のチャンス' : tense ? `残り ${remaining} 回。慎重に！` : '正体はまだ謎のまま…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 12 },
  halo: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(95, 211, 224, 0.06)',
  },
  core: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  question: { fontSize: 72, fontWeight: '800' },
  caption: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
