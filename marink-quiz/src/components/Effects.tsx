import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme/theme';

const BURST_COLORS = [colors.aqua, colors.foam, colors.success, colors.warning, '#B39DDB'];

/** 光の粒が中心から四方へ広がる演出。trigger が変わるたびに再生する */
export function Burst({ trigger, count = 28 }: { trigger: number; count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      p: new Animated.Value(0),
      angle: (Math.PI * 2 * i) / count + Math.random() * 0.4,
      distance: 110 + Math.random() * 140,
      size: 5 + Math.random() * 7,
      color: BURST_COLORS[i % BURST_COLORS.length],
      duration: 900 + Math.random() * 700,
    })),
  ).current;

  useEffect(() => {
    if (!trigger) return;
    particles.forEach((q) => q.p.setValue(0));
    Animated.parallel(
      particles.map((q) =>
        Animated.timing(q.p, { toValue: 1, duration: q.duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ),
    ).start();
  }, [trigger, particles]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {particles.map((q, i) => {
        const x = q.p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(q.angle) * q.distance] });
        const y = q.p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(q.angle) * q.distance] });
        const opacity = q.p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: q.size,
              height: q.size,
              borderRadius: q.size / 2,
              backgroundColor: q.color,
              opacity,
              transform: [{ translateX: x }, { translateY: y }],
            }}
          />
        );
      })}
    </View>
  );
}

/** 横に揺らす（不正解・予想ミスの手応え） */
export function Shake({ trigger, children }: { trigger: number; children: ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    Animated.sequence([
      Animated.timing(x, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(x, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(x, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [trigger, x]);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

/** 一瞬ふくらんで戻る（回答が届いた手応え） */
export function Pop({ trigger, children }: { trigger: number; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!trigger) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [trigger, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
