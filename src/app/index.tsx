import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppScaffold,
  AppText,
  CategoryMark,
  DailySpendTrendChart,
  ProgressBar,
  Screen,
  SectionTitle,
  StreakCard,
  Surface,
  ui,
  usePalette,
  useThemeMode,
} from '@/components/app-ui';
import {
  allowanceProgress,
  calculateDailyPace,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  monthlySpendTrend,
  nextCycleStart,
  remainingAllowance,
  sumExpenses,
  weeklySpendTrend,
} from '@/finance.mjs';
import { Expense, useFinance } from '@/store';

function ExpenseRow({ expense, currency }: { expense: Expense; currency: string }) {
  const p = usePalette();
  const date = new Date(expense.occurredAt);
  const time = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={[ui.row, { gap: 12 }]}>
      <CategoryMark category={expense.category} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyMedium" weight="600" numberOfLines={1}>
          {expense.title}
        </AppText>
        <AppText variant="caption" color={p.textSecondary}>
          {expense.category} · {time}
          {expense.reflection ? ` · ${expense.reflection.toLowerCase()}` : ''}
        </AppText>
      </View>
      <AppText variant="bodyMedium" weight="600" tabular>
        −{formatMoney(expense.amountMinor, currency)}
      </AppText>
    </View>
  );
}

const CATEGORIES_FOR_DASHBOARD = ['Food', 'Transport', 'Study', 'Social', 'Shopping', 'Other'] as const;

export default function Dashboard() {
  const p = usePalette();
  const { preferences, expenses, budgets } = useFinance();
  const now = useMemo(() => new Date(), []);
  const mode = useThemeMode();
  const onDark = mode === 'dark';

  const { start, next } = useMemo(() => {
    const s = cycleStart(now, preferences.cycleStartDay);
    const n = nextCycleStart(now, preferences.cycleStartDay);
    return { start: s, next: n };
  }, [now, preferences.cycleStartDay]);

  const spent = useMemo(() => sumExpenses(expenses, start, now), [expenses, start, now]);
  const remaining = useMemo(
    () => remainingAllowance(preferences.allowanceMinor, spent),
    [preferences.allowanceMinor, spent]
  );
  const daysLeft = useMemo(
    () => Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 86400000)),
    [next, now]
  );
  const totalCycleDays = useMemo(
    () => Math.max(1, Math.round((next.getTime() - start.getTime()) / 86400000)),
    [next, start]
  );
  const daysElapsed = useMemo(
    () => Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000)),
    [now, start]
  );

  const dailyPacing = useMemo(
    () =>
      calculateDailyPace({
        allowanceMinor: preferences.allowanceMinor,
        spentMinor: spent,
        totalCycleDays,
        daysLeft,
        pacingMode: preferences.pacingMode,
      }),
    [preferences.allowanceMinor, spent, totalCycleDays, daysLeft, preferences.pacingMode]
  );

  const dailyPace = Math.round(spent / daysElapsed);

  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const cycleTrend = useMemo(() => {
    if (granularity === 'weekly') {
      return weeklySpendTrend(expenses, start, now);
    }
    if (granularity === 'monthly') {
      return monthlySpendTrend(expenses, start, now);
    }
    return dailySpendTrend(expenses, start, now);
  }, [expenses, start, now, granularity]);

  const recent = useMemo(() => expenses.slice(0, 3), [expenses]);
  const hasBudget = useMemo(() => Object.values(budgets).some((amount) => amount > 0), [budgets]);

  const heroBg = onDark ? '#19221D' : p.accent;
  const heroBorder = onDark ? '#283830' : p.accent;
  const heroFg = onDark ? '#E5ECE7' : '#FFFFFF';
  const heroSub = onDark ? '#8A9990' : '#DDEBE4';

  return (
    <AppScaffold>
      <Screen
        eyebrow="Allowance Cycle"
        title={preferences.name ? `Hello, ${preferences.name}.` : 'Hello.'}
        action={
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open settings and profile"
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: p.accentSoft,
                  borderColor: p.border,
                },
              ]}
            >
              <AppText variant="headline" color={p.accent}>
                {(preferences.name ? preferences.name.slice(0, 1) : 'P').toUpperCase()}
              </AppText>
            </View>
          </Pressable>
        }
      >
        {/* Main Allowance Hero Card */}
        <Surface style={[styles.heroCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <AppText variant="eyebrow" color={heroSub}>
              AVAILABLE THIS CYCLE
            </AppText>
            <AppText variant="caption" color={heroSub}>
              Resets {next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </AppText>
          </View>

          <AppText variant="display" color={heroFg} tabular>
            {formatMoney(remaining, preferences.currency)}
          </AppText>

          <ProgressBar
            value={allowanceProgress(spent, preferences.allowanceMinor)}
            color={onDark ? p.accent : '#FFFFFF'}
            trackColor={onDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)'}
          />

          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <AppText variant="captionMedium" color={heroSub} tabular>
              {formatMoney(spent, preferences.currency)} spent of {formatMoney(preferences.allowanceMinor, preferences.currency)}
            </AppText>
            <AppText variant="captionMedium" color={heroSub}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </AppText>
          </View>
        </Surface>

        {/* Pace & Room Metrics */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Surface
            style={{ flex: 1, padding: 16 }}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Adjust daily pacing in profile"
          >
            <AppText variant="caption" color={p.textSecondary}>
              {preferences.pacingMode === 'adaptive' ? 'Adaptive room' : 'Daily target'}
            </AppText>
            <AppText variant="title" weight="700" tabular>
              {formatMoney(dailyPacing.dailyRoomMinor, preferences.currency)}
            </AppText>
            <AppText variant="caption" color={p.textSecondary}>
              {preferences.pacingMode === 'adaptive' ? 'with zero-spend rollover' : 'steady benchmark'}
            </AppText>
          </Surface>

          <Surface style={{ flex: 1, padding: 16 }}>
            <AppText variant="caption" color={p.textSecondary}>
              Daily average
            </AppText>
            <AppText variant="title" weight="700" tabular>
              {formatMoney(dailyPace, preferences.currency)}
            </AppText>
            <AppText variant="caption" color={p.textSecondary}>
              spent this cycle
            </AppText>
          </Surface>
        </View>

        {/* Daily Logging Streak */}
        <StreakCard expenses={expenses} />

        {/* Spending Trend Graph */}
        <View style={{ gap: 10 }}>
          <SectionTitle
            title="Spending trend"
            detail="Daily spending recorded this cycle"
            actionLabel="Insights"
            onPress={() => router.push('/insights')}
          />
          <DailySpendTrendChart
            trend={cycleTrend}
            currency={preferences.currency}
            height={130}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />
        </View>

        {/* Category Guardrails */}
        <View style={{ gap: 12 }}>
          <SectionTitle
            title="Category budgets"
            detail="Limits to keep spending in perspective"
            actionLabel="Adjust"
            onPress={() => router.push('/profile')}
          />
          {hasBudget ? (
            CATEGORIES_FOR_DASHBOARD.map((category) => {
              const cap = budgets[category] ?? 0;
              if (!cap) return null;
              const value = expenses
                .filter(
                  (item) =>
                    item.category === category &&
                    item.occurredAt >= start.toISOString() &&
                    item.occurredAt <= now.toISOString()
                )
                .reduce((total, item) => total + item.amountMinor, 0);

              const progress = allowanceProgress(value, cap);
              const warning = progress >= 0.9;

              return (
                <Surface key={category} style={{ padding: 14 }}>
                  <View style={[ui.row, { gap: 12 }]}>
                    <CategoryMark category={category} size={36} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <AppText variant="bodyMedium" weight="600">
                          {category}
                        </AppText>
                        <AppText variant="captionMedium" color={warning ? p.warning : p.textSecondary} tabular>
                          {formatMoney(value, preferences.currency)} / {formatMoney(cap, preferences.currency)}
                        </AppText>
                      </View>
                      <ProgressBar value={progress} color={warning ? p.warning : p.accent} height={6} />
                    </View>
                  </View>
                </Surface>
              );
            })
          ) : (
            <Surface style={{ padding: 18, backgroundColor: p.accentSoft, borderColor: p.accentSoft, gap: 8 }}>
              <AppText variant="headline">Set your first category limit</AppText>
              <AppText variant="body" color={p.textSecondary}>
                Choose a category like Food or Social to set a boundary that leaves room to live.
              </AppText>
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Set category budgets"
                hitSlop={8}
              >
                <AppText variant="bodyMedium" weight="600" color={p.accent}>
                  Set a category budget →
                </AppText>
              </Pressable>
            </Surface>
          )}
        </View>

        {/* Recent Activity */}
        <View style={{ gap: 12 }}>
          <SectionTitle
            title="Recent activity"
            actionLabel={expenses.length ? 'See all' : undefined}
            onPress={() => router.push('/activity')}
          />
          {recent.length ? (
            <Surface style={{ padding: 16 }}>
              {recent.map((expense, idx) => (
                <View key={expense.id}>
                  <ExpenseRow expense={expense} currency={preferences.currency} />
                  {idx < recent.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: p.border }]} />
                  ) : null}
                </View>
              ))}
            </Surface>
          ) : (
            <Surface style={{ padding: 20, gap: 6 }}>
              <AppText variant="headline">No expenses logged yet</AppText>
              <AppText variant="body" color={p.textSecondary}>
                Tap the plus button below to log your first spend. It takes just a few seconds.
              </AppText>
            </Surface>
          )}
        </View>
      </Screen>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    padding: 22,
    borderRadius: 22,
    gap: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginLeft: 48,
  },
});
