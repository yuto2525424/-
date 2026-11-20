import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/theme';

/** 海中をイメージした背景。装飾は控えめに、泡だけをゆっくり上昇させる */
const BUBBLES = [
  { x: 0.08, size: 6, delay: 0 },
  { x: 0.22, size: 4, delay: 1400 },
  { x: 0.4, size: 8, delay: 700 },
  { x: 0.61, size: 5, delay: 2100 },
  { x: 0.78, size: 7, delay: 400 },
  { x: 0.92, size: 4, delay: 1800 },
];

function Bubble({ x, size, delay, height }: { x: number; size: number; delay: number; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
        delay,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, -20] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.5, 0.5, 0] });
  return (
    <Animated.View
      style={[
        styles.bubble,
        { left: `${x * 100}%`, width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateY }] },
      ]}
    />
  );
}

export function SeaBackground() {
  const { height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.abyss, colors.deep, colors.ocean]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {BUBBLES.map((b) => (
        <Bubble key={`${b.x}-${b.delay}`} x={b.x} size={b.size} delay={b.delay} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: colors.aqua,
  },
});
