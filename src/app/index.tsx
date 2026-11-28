import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
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
  calculateBudgetSummary,
  calculateNoCycleSummary,
  buildActivityRecords,
  categoryColor,
  calendarWeeklySpendTrend,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  isNoCycleBudgetActive,
  monthlySpendTrend,
  nextCycleStart,
  reconcileGoalBalances,
  sumExpenses,
  weeklySpendTrend,
} from '@/finance.mjs';
import type { ActivityRecord } from '@/finance.mjs';
import { useFinance } from '@/store';
import { Spacing } from '@/constants/theme';

function formatSignedMoney(minor: number, currency: string) {
  return minor < 0
    ? `−${formatMoney(Math.abs(minor), currency)}`
    : formatMoney(minor, currency);
}

function ActivityRow({ record, currency }: { record: ActivityRecord; currency: string }) {
  const p = usePalette();
  const date = new Date(record.occurredAt);
  const time = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const isExpense = record.type === 'expense';
  const isIncome = record.type === 'income';
  const isAllocation = record.type === 'savingsAllocation';
  const isPositive = isIncome || record.type === 'savingsWithdrawal' || record.type === 'goalClosure';
  const title =
    isExpense || isIncome
      ? record.title
      : record.type === 'goalClosure'
      ? 'Goal Closed'
      : isAllocation
      ? 'Savings Allocation'
      : 'Savings Withdrawal';
  const incomeSource = record.description === 'Part-time work' ? 'Part-Time Work' : record.description;
  const detail = isExpense
    ? `${record.category} · ${time}`
    : isIncome
    ? `Income${incomeSource ? ` · ${incomeSource}` : ''} · ${time}`
    : `${record.goalName ?? 'Savings goal'} · ${time}`;

  return (
    <View style={[ui.row, { gap: Spacing.twelve }]}>
      {isExpense && record.category ? (
        <CategoryMark category={record.category} size={36} />
      ) : (
        <View style={[styles.activityIcon, { backgroundColor: isPositive ? p.accentSoft : p.backgroundSelected }]}>
          <SymbolView
            name={
              isIncome
                ? { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' }
                : isAllocation
                ? { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }
                : { ios: 'arrow.uturn.backward', android: 'north_west', web: 'north_west' }
            }
            size={18}
            tintColor={isPositive ? p.accent : isAllocation ? p.warning : p.textSecondary}
          />
        </View>
      )}
      <View style={{ flex: 1, gap: Spacing.two }}>
        <AppText variant="bodyMedium" weight="600" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={p.textSecondary}>
          {detail}
          {record.reflection ? ` · ${record.reflection.toLowerCase()}` : ''}
        </AppText>
      </View>
      <AppText variant="bodyMedium" weight="600" color={isPositive ? p.accent : isAllocation ? p.warning : p.text} tabular>
        {isExpense || isAllocation ? '−' : '+'}{formatMoney(record.amountMinor, currency)}
      </AppText>
    </View>
  );
}

const CATEGORIES_FOR_DASHBOARD = ['Food', 'Transport', 'Study', 'Social', 'Shopping', 'Other'] as const;

export default function Dashboard() {
  const p = usePalette();
  const { preferences, expenses, incomes, goals, goalRecords, goalTransactions, budgets, zeroSpendDays } = useFinance();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const nextDay = new Date();
    nextDay.setHours(24, 0, 0, 0);
    const timeout = setTimeout(() => setNow(new Date()), nextDay.getTime() - Date.now() + 1);
    return () => clearTimeout(timeout);
  }, [now]);
  const mode = useThemeMode();
  const onDark = mode === 'dark';
  const isNoCycleView = isNoCycleBudgetActive(preferences, now);
  const isMonthlyCycleScheduled =
    preferences.budgetingMode === 'monthly_cycle' &&
    isNoCycleView &&
    preferences.monthlyEffectiveAt !== null;
  const scheduledMonthlyDate =
    isMonthlyCycleScheduled && preferences.monthlyEffectiveAt
      ? new Date(preferences.monthlyEffectiveAt)
      : null;

  const { start, next } = useMemo(() => {
    const s = cycleStart(now, preferences.cycleStartDay);
    const n = nextCycleStart(now, preferences.cycleStartDay);
    return { start: s, next: n };
  }, [now, preferences.cycleStartDay]);

  const rollingStart = useMemo(() => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 29);
    return date;
  }, [now]);
  const displayStart = isNoCycleView ? rollingStart : start;
  const spent = useMemo(() => sumExpenses(expenses, displayStart, now), [expenses, displayStart, now]);
  const cycleSpent = useMemo(() => sumExpenses(expenses, start, now), [expenses, start, now]);
  const goalBalances = useMemo(() => reconcileGoalBalances(goals, goalTransactions), [goals, goalTransactions]);
  const savingsReservedMinor = useMemo(
    () => Object.values(goalBalances).reduce((total, amount) => total + Number(amount || 0), 0),
    [goalBalances]
  );
  const daysLeft = useMemo(
    () => Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 86400000)),
    [next, now]
  );
  const totalCycleDays = useMemo(
    () => Math.max(1, Math.round((next.getTime() - start.getTime()) / 86400000)),
    [next, start]
  );
  const budgetSummary = useMemo(
    () =>
      calculateBudgetSummary({
        allowanceMinor: preferences.allowanceMinor,
        incomes,
        cycleStartDate: start,
        cycleThroughDate: now,
        expenseMinor: cycleSpent,
        savingsReservedMinor,
        totalCycleDays,
        daysLeft,
        pacingMode: preferences.pacingMode,
        zeroSpendDays,
      }),
    [preferences.allowanceMinor, incomes, start, now, cycleSpent, savingsReservedMinor, totalCycleDays, daysLeft, preferences.pacingMode, zeroSpendDays]
  );
  const noCycleSummary = useMemo(
    () =>
      calculateNoCycleSummary({
        openingBalanceMinor: preferences.noCycleOpeningBalanceMinor,
        expensesThroughId: preferences.noCycleExpensesThroughId,
        incomesThroughId: preferences.noCycleIncomesThroughId,
        goalTransactionsThroughId: preferences.noCycleGoalTransactionsThroughId,
        expenses,
        incomes,
        goalTransactions,
      }),
    [
      preferences.noCycleOpeningBalanceMinor,
      preferences.noCycleExpensesThroughId,
      preferences.noCycleIncomesThroughId,
      preferences.noCycleGoalTransactionsThroughId,
      expenses,
      incomes,
      goalTransactions,
    ]
  );
  const remaining = isNoCycleView ? noCycleSummary.availableMinor : budgetSummary.availableMinor;
  const hasIncomeTopUp = budgetSummary.incomeTopUpMinor > 0;
  const updatedColor = onDark ? '#74D69E' : '#59CA89';
  const daysElapsed = useMemo(
    () => Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000)),
    [now, start]
  );

  const displayDailyRoom = isNoCycleView ? null : budgetSummary.dailyRoomMinor;

  const dailyPace = Math.round(spent / (isNoCycleView ? 30 : daysElapsed));

  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const cycleTrend = useMemo(() => {
    if (granularity === 'weekly') {
      return isNoCycleView
        ? calendarWeeklySpendTrend(expenses, displayStart, now)
        : weeklySpendTrend(expenses, displayStart, now);
    }
    if (granularity === 'monthly') {
      return monthlySpendTrend(expenses, displayStart, now);
    }
    return dailySpendTrend(expenses, displayStart, now);
  }, [expenses, displayStart, now, granularity, isNoCycleView]);

  const recent = useMemo(
    () => buildActivityRecords({ expenses, incomes, goals: goalRecords, goalTransactions }).slice(0, 3),
    [expenses, incomes, goalRecords, goalTransactions]
  );
  const hasBudget = useMemo(() => Object.values(budgets).some((amount) => amount > 0), [budgets]);

  const heroBg = onDark ? '#19221D' : p.accent;
  const heroBorder = onDark ? '#283830' : p.accent;
  const heroFg = onDark ? '#E5ECE7' : '#FFFFFF';
  const heroSub = onDark ? '#8A9990' : '#DDEBE4';

  return (
    <AppScaffold>
      <Screen
        eyebrow={isNoCycleView ? 'No Fixed Cycle' : 'Allowance Cycle'}
        title={preferences.name ? `Hello, ${preferences.name}!` : 'Hello!'}
        action={
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open Settings And Profile"
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
        {/* Main Balance Hero Card */}
        <Surface style={[styles.heroCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <AppText variant="eyebrow" color={heroSub}>
              {isNoCycleView ? 'CURRENT AVAILABLE BALANCE' : 'AVAILABLE THIS CYCLE'}
            </AppText>
            {!isNoCycleView ? (
              <AppText variant="caption" color={heroSub}>
                Resets {next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </AppText>
            ) : null}
          </View>

          <AppText variant="display" color={heroFg} tabular>
            {formatSignedMoney(remaining, preferences.currency)}
          </AppText>

          {!isNoCycleView ? (
            <>
              <ProgressBar
                value={allowanceProgress(cycleSpent, budgetSummary.adjustedCycleBudgetMinor)}
                color={onDark ? p.accent : '#FFFFFF'}
                trackColor={onDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)'}
              />

              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="captionMedium" color={heroSub} tabular>
                  {formatMoney(cycleSpent, preferences.currency)} spent of {formatMoney(budgetSummary.adjustedCycleBudgetMinor, preferences.currency)}
                </AppText>
                <AppText variant="captionMedium" color={heroSub}>
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </AppText>
              </View>

              {hasIncomeTopUp ? (
                <>
                  <View style={styles.heroDivider} />
                  <View style={styles.budgetBreakdown}>
                    <AppText
                      variant="caption"
                      color={heroSub}
                      style={styles.budgetBreakdownLabel}
                    >
                      Base {formatMoney(budgetSummary.allowanceMinor, preferences.currency)} + Extra{' '}
                      {formatMoney(budgetSummary.incomeTopUpMinor, preferences.currency)}
                    </AppText>
                    <View style={[styles.updatedBadge, { borderColor: updatedColor }]}>
                      <AppText variant="captionMedium" color={updatedColor}>
                        Updated
                      </AppText>
                    </View>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: heroSub, paddingTop: Spacing.eight, gap: Spacing.four }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="caption" color={heroSub}>Opening Balance</AppText>
                <AppText variant="captionMedium" color={heroFg} tabular>
                  {formatSignedMoney(noCycleSummary.openingBalanceMinor, preferences.currency)}
                </AppText>
              </View>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="caption" color={heroSub}>Total Income</AppText>
                <AppText variant="captionMedium" color={heroFg} tabular>
                  +{formatMoney(noCycleSummary.incomeMinor, preferences.currency)}
                </AppText>
              </View>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="caption" color={heroSub}>Total Expenses</AppText>
                <AppText variant="captionMedium" color={heroFg} tabular>
                  −{formatMoney(noCycleSummary.expenseMinor, preferences.currency)}
                </AppText>
              </View>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="caption" color={heroSub}>Savings Allocated</AppText>
                <AppText variant="captionMedium" color={heroFg} tabular>
                  −{formatMoney(noCycleSummary.savingsAllocatedMinor, preferences.currency)}
                </AppText>
              </View>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="caption" color={heroSub}>Savings Withdrawals</AppText>
                <AppText variant="captionMedium" color={heroFg} tabular>
                  +{formatMoney(noCycleSummary.savingsWithdrawnMinor, preferences.currency)}
                </AppText>
              </View>
            </View>
          )}
        </Surface>

        {scheduledMonthlyDate ? (
          <Surface style={{ gap: Spacing.four, backgroundColor: p.accentSoft }}>
            <AppText variant="bodyMedium" weight="700" color={p.accent}>
              Monthly Cycle Scheduled
            </AppText>
            <AppText variant="caption" color={p.textSecondary}>
              Your monthly cycle begins on{' '}
              {scheduledMonthlyDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
              {' '}Your current balance remains active until then.
            </AppText>
          </Surface>
        ) : null}

        {/* Pace & Room Metrics */}
        <View style={styles.metricRow}>
          <Surface
            style={styles.metricCard}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Adjust Daily Pacing In Profile"
          >
            <AppText variant="caption" color={p.textSecondary}>
              {isNoCycleView
                ? 'Adaptive Room'
                : preferences.pacingMode === 'adaptive' ? 'Adaptive Room' : 'Daily Target'}
            </AppText>
            <AppText variant="title" weight="700" tabular>
              {displayDailyRoom === null ? '—' : formatMoney(displayDailyRoom, preferences.currency)}
            </AppText>
            <AppText variant="caption" color={p.textSecondary}>
              {isNoCycleView
                ? 'Unavailable without a fixed cycle'
                : preferences.pacingMode === 'adaptive' ? 'with zero-spend rollover' : 'steady benchmark'}
            </AppText>
          </Surface>

          <Surface style={styles.metricCard}>
            <AppText variant="caption" color={p.textSecondary}>
              Daily Average
            </AppText>
            <AppText variant="title" weight="700" tabular>
              {formatMoney(dailyPace, preferences.currency)}
            </AppText>
            <AppText variant="caption" color={p.textSecondary}>
              {isNoCycleView ? 'past 30 days' : 'spent this cycle'}
            </AppText>
          </Surface>
        </View>

        {/* Daily Logging Streak */}
        <StreakCard expenses={expenses} />

        {/* Spending Trend Graph */}
        <View style={{ gap: Spacing.twelve }}>
          <SectionTitle
            title="Spending Trend"
            detail={isNoCycleView ? 'Daily spending over the past 30 days' : 'Daily spending recorded this cycle'}
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
        <View style={{ gap: Spacing.twelve }}>
          <SectionTitle
            title="Category Budgets"
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
                    item.occurredAt >= displayStart.toISOString() &&
                    item.occurredAt <= now.toISOString()
                )
                .reduce((total, item) => total + item.amountMinor, 0);

              const progress = allowanceProgress(value, cap);
              const warning = progress >= 0.9;

              return (
                <Surface key={category}>
                  <View style={[ui.row, { gap: Spacing.twelve }]}>
                    <CategoryMark category={category} size={36} />
                    <View style={{ flex: 1, gap: Spacing.eight }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <AppText variant="bodyMedium" weight="600">
                          {category}
                        </AppText>
                        <AppText variant="captionMedium" color={warning ? p.warning : p.textSecondary} tabular>
                          {formatMoney(value, preferences.currency)} / {formatMoney(cap, preferences.currency)}
                        </AppText>
                      </View>
                      <ProgressBar value={progress} color={categoryColor(category)} height={6} />
                    </View>
                  </View>
                </Surface>
              );
            })
          ) : (
            <Surface style={{ backgroundColor: p.accentSoft, borderColor: p.accentSoft, gap: Spacing.eight }}>
              <AppText variant="headline">Set Your First Category Limit</AppText>
              <AppText variant="body" color={p.textSecondary}>
                Choose a category like Food or Social to set a boundary that leaves room to live.
              </AppText>
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Set Category Budgets"
                hitSlop={8}
              >
                <AppText variant="bodyMedium" weight="600" color={p.accent}>
                  Set A Category Budget →
                </AppText>
              </Pressable>
            </Surface>
          )}
        </View>

        {/* Recent Activity */}
        <View style={{ gap: Spacing.twelve }}>
          <SectionTitle
            title="Recent Activity"
            actionLabel={recent.length ? 'See All' : undefined}
            onPress={() => router.push('/activity')}
          />
          {recent.length ? (
            <Surface>
              {recent.map((record, idx) => (
                <View key={record.key}>
                  <ActivityRow record={record} currency={preferences.currency} />
                  {idx < recent.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: p.border }]} />
                  ) : null}
                </View>
              ))}
            </Surface>
          ) : (
            <Surface style={{ gap: Spacing.eight }}>
              <AppText variant="headline">No Activity Recorded Yet</AppText>
              <AppText variant="body" color={p.textSecondary}>
                Your expenses, income, and savings updates will appear here.
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
    padding: Spacing.twenty,
    borderRadius: 18,
    gap: Spacing.sixteen,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  budgetBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  budgetBreakdownLabel: {
    flexShrink: 1,
  },
  updatedBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.eight,
    paddingVertical: Spacing.two,
    flexShrink: 0,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.twelve,
  },
  metricCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.twelve,
    marginLeft: 48,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
