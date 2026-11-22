import React, { PropsWithChildren, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Motion = {
  durations: {
    press: 120,
    small: 180,
    card: 220,
    screen: 220,
  },
};

export function ScreenMotion({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  return <View style={style}>{children}</View>;
}

export function useAnimatedProgress(value: number) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(value);

  useEffect(() => {
    progress.value = reducedMotion
      ? value
      : withTiming(value, { duration: Motion.durations.card });
  }, [progress, reducedMotion, value]);

  return useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));
}

export function MotionProgress({
  value,
  style,
}: {
  value: number;
  style?: object;
}) {
  const animatedStyle = useAnimatedProgress(value);
  return <Animated.View style={[style, animatedStyle]} />;
}

export function MotionBar({
  height,
  style,
}: {
  height: number;
  style?: object | object[];
}) {
  const reducedMotion = useReducedMotion();
  const animatedHeight = useSharedValue(height);

  useEffect(() => {
    animatedHeight.value = reducedMotion
      ? height
      : withTiming(height, { duration: Motion.durations.card });
  }, [animatedHeight, height, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}

export function MotionPressable({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  style,
}: PropsWithChildren<{
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'tab';
  accessibilityLabel?: string;
  accessibilityState?: object;
  hitSlop?: number;
  style?: object | object[];
}>) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = () => {
    if (!disabled) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      scale.value = reducedMotion
        ? 1
        : withTiming(0.97, { duration: Motion.durations.press });
    }
    onPressIn?.();
  };

  const pressOut = () => {
    if (!disabled) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      scale.value = reducedMotion
        ? 1
        : withTiming(1, { duration: Motion.durations.press });
    }
    onPressOut?.();
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
