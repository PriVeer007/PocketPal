import { useFocusEffect } from 'expo-router';
import React, { PropsWithChildren, useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Motion = {
  durations: {
    press: 120,
    small: 180,
    card: 320,
    screen: 280,
  },
  screen: {
    enterDistance: 14,
  },
};

export function useScreenEntrance(delay = 0) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(Motion.screen.enterDistance);

  useFocusEffect(
    useCallback(() => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);

      if (reducedMotion) {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
        opacity.value = 1;
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
        translateY.value = 0;
        return;
      }

      opacity.value = 0;
      translateY.value = Motion.screen.enterDistance;
      opacity.value = withDelay(delay, withTiming(1, { duration: Motion.durations.card }));
      translateY.value = withDelay(delay, withTiming(0, { duration: Motion.durations.card }));

      return () => {
        cancelAnimation(opacity);
        cancelAnimation(translateY);
      };
    }, [delay, opacity, reducedMotion, translateY])
  );

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

export function ScreenMotion({
  children,
  delay = 0,
  style,
}: PropsWithChildren<{ delay?: number; style?: object }>) {
  const animatedStyle = useScreenEntrance(delay);
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function useAnimatedProgress(value: number) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? value : 0);

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
  const animatedHeight = useSharedValue(reducedMotion ? height : 3);

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
        : withSpring(1, { damping: 16, stiffness: 320, mass: 0.6 });
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
