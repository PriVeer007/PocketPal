import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { Suspense, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { ActionButton, AppText, Screen, Surface, usePalette } from '@/components/app-ui';
import { Colors } from '@/constants/theme';
import { DatabaseProvider, useFinance } from '@/store';

// Prevent splash screen from auto hiding before data is hydrated
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DatabaseProvider>
        <RootNavigator />
      </DatabaseProvider>
    </Suspense>
  );
}

function LoadingFallback() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? Colors.dark.background : Colors.light.background;
  const accent = dark ? Colors.dark.accent : Colors.light.accent;

  return (
    <View style={[styles.center, { backgroundColor: bg }]}>
      <ActivityIndicator color={accent} size="large" />
      <StatusBar style={dark ? 'light' : 'dark'} />
    </View>
  );
}

function RootNavigator() {
  const { ready, error, retry, preferences } = useFinance();
  const segments = useSegments();
  const systemScheme = useColorScheme();
  const dark = preferences.themeMode === 'system' ? systemScheme === 'dark' : preferences.themeMode === 'dark';
  const palette = usePalette();

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined);
      void SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
    }
  }, [ready, palette.background]);

  const navigationTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.background,
        card: palette.backgroundElement,
        text: palette.text,
        border: palette.border,
        primary: palette.accent,
        notification: palette.warning,
      },
    };
  }, [dark, palette]);

  if (!ready) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <Screen title="Your data needs a moment">
        <Surface style={{ gap: 14 }}>
          <AppText size={14} color={palette.textSecondary}>
            {error}
          </AppText>
          <ActionButton
            label="Try again"
            onPress={() => {
              void retry().catch(() => undefined);
            }}
          />
        </Surface>
      </Screen>
    );
  }

  const currentRoute = segments[0] as string | undefined;

  if (!preferences.onboarded && currentRoute !== 'onboarding') {
    return <Redirect href="/onboarding" />;
  }
  if (preferences.onboarded && currentRoute === 'onboarding') {
    return <Redirect href="/" />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="edit"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="goal-create"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="goal-add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
