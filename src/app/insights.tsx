import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  AppScaffold,
  AppText,
  CategoryBreakdownList,
  CategoryDonut,
  DailySpendTrendChart,
  ExpenseCalendarHeatmap,
  ProgressBar,
  Screen,
  SectionTitle,
  Surface,
  ui,
  useAccentForeground,
  usePalette,
} from '@/components/app-ui';
import {
  calculateSpendingProfile,
  calendarWeeklySpendTrend,
  categoryBreakdown,
  categoryColor,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  goalLedgerSummaryForPeriod,
  isNoCycleBudgetActive,
  localDateKey,
  monthlySpendTrend,
  reconcileGoalBalances,
  sumExpenses,
  sumIncome,
  weeklySpendTrend,
} from '@/finance.mjs';
import { useFinance } from '@/store';
import { Spacing } from '@/constants/theme';

type InsightTab = 'overview' | 'behaviour' | 'trends';
type Granularity = 'daily' | 'weekly' | 'monthly';
type RangeOption = 'cycle' | '7d' | '30d';
type DistributionView = 'spending' | 'savings';

export default function InsightsScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { ready, error, preferences, expenses, incomes, goals, goalTransactions } = useFinance();

  const [activeTab, setActiveTab] = useState<InsightTab>('overview');
  const [range, setRange] = useState<RangeOption>('cycle');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [distributionView, setDistributionView] = useState<DistributionView>('spending');

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const nextDay = new Date();
    nextDay.setHours(24, 0, 0, 0);
    const timeout = setTimeout(() => setNow(new Date()), nextDay.getTime() - Date.now() + 1);
    return () => clearTimeout(timeout);
  }, [now]);
  const isNoCycleView = isNoCycleBudgetActive(preferences, now);

  const { from, to, label } = useMemo(() => {
    if (range === '7d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now, label: 'Past 7 Days' };
    }
    if (range === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now, label: 'Past 30 Days' };
    }
    if (isNoCycleView) {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
        label: 'This Month',
      };
    }
    const cycle = cycleStart(now, preferences.cycleStartDay);
    return { from: cycle, to: now, label: 'Current Cycle' };
  }, [now, preferences.cycleStartDay, range, isNoCycleView]);

  const totalSpent = useMemo(() => sumExpenses(expenses, from, to), [expenses, from, to]);
  const totalIncome = useMemo(() => sumIncome(incomes, from, to), [incomes, from, to]);
  const daysCount = useMemo(() => {
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  }, [from, to]);
  const dailyAverage = Math.round(totalSpent / daysCount);

  // Spend trend based on selected granularity
  const trend = useMemo(() => {
    if (granularity === 'weekly') {
      return isNoCycleView
        ? calendarWeeklySpendTrend(expenses, from, to)
        : weeklySpendTrend(expenses, from, to);
    }
    if (granularity === 'monthly') {
      return monthlySpendTrend(expenses, from, to);
    }
    return dailySpendTrend(expenses, from, to);
  }, [expenses, from, to, granularity, isNoCycleView]);

  const breakdown = useMemo(() => categoryBreakdown(expenses, from, to), [expenses, from, to]);
  const savingsPeriod = useMemo(
    () => goalLedgerSummaryForPeriod(goalTransactions, from, to),
    [goalTransactions, from, to]
  );
  const goalBalances = useMemo(
    () => reconcileGoalBalances(goals, goalTransactions),
    [goals, goalTransactions]
  );
  const reservedSavings = useMemo(
    () => goals.reduce((total, goal) => total + Math.max(0, goalBalances[goal.id] ?? goal.savedMinor ?? 0), 0),
    [goals, goalBalances]
  );

  const inWindowExpenses = useMemo(() => {
    const startKey = localDateKey(from);
    const endKey = localDateKey(to);
    return expenses.filter((expense) => {
      try {
        const key = localDateKey(expense.occurredAt);
        return key >= startKey && key <= endKey;
      } catch {
        return false;
      }
    });
  }, [expenses, from, to]);

  const spendingProfile = useMemo(() => {
    if (!ready) return null;
    if (error) {
      return { status: 'error' as const, persona: null, secondaryPersona: null, mindfulPercentage: null, eligibleTransactionCount: 0 };
    }
    return calculateSpendingProfile({
      expenses,
      from,
      to,
      allowanceMinor: isNoCycleView ? 0 : preferences.allowanceMinor,
      savingsTransactions: goalTransactions,
      trend,
      currency: preferences.currency,
    });
  }, [ready, error, expenses, from, to, isNoCycleView, preferences.allowanceMinor, preferences.currency, goalTransactions, trend]);

  const mindfulStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalReflections = 0;
    for (const exp of inWindowExpenses) {
      if (exp.reflection) {
        totalReflections += 1;
        counts[exp.reflection] = (counts[exp.reflection] ?? 0) + 1;
      }
    }
    return { counts, totalReflections };
  }, [inWindowExpenses]);

  // Dynamic actionable insight
  const primaryInsight = useMemo(() => {
    if (!breakdown.length) return null;
    const top = breakdown[0];
    if (top.percentage > 50) {
      return `${top.category} took ${Math.round(top.percentage)}% of your spending. Consider setting a category limit to protect your daily room.`;
    }
    if (breakdown.length > 1) {
      return `Top categories are ${top.category} (${Math.round(top.percentage)}%) and ${breakdown[1].category} (${Math.round(breakdown[1].percentage)}%). Everyday essentials remain well-distributed.`;
    }
    return `Logged ${breakdown.length} active category in this period. Keep logging consistently to discover your spending baseline.`;
  }, [breakdown]);

  return (
    <AppScaffold showFloatingAdd={false}>
      <Screen eyebrow="Patterns & Habits" title="Insights">
        {/* Main Section Navigation: Overview | Behaviour | Trends */}
        <View style={styles.topTabsContainer}>
          {(
            [
              { id: 'overview' as const, label: 'Overview' },
              { id: 'behaviour' as const, label: 'Behaviour' },
              { id: 'trends' as const, label: 'Trends' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.topTabBtn,
                  {
                    backgroundColor: active ? p.accent : p.backgroundElement,
                    borderColor: active ? p.accent : p.border,
                  },
                ]}
              >
                <AppText
                  variant="captionMedium"
                  color={active ? onAccent : p.text}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Date Range Selector */}
        <View style={styles.rangeSelector}>
          {(
            [
              { id: 'cycle', label: isNoCycleView ? 'This Month' : 'This Cycle' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
            ] as const
          ).map((opt) => {
            const active = range === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setRange(opt.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: active ? p.accentSoft : 'transparent',
                    borderColor: active ? p.accent : p.border,
                  },
                ]}
              >
                <AppText
                  variant="captionMedium"
                  color={active ? p.accent : p.textSecondary}
                  size={12}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' ? (
          <>
            {/* Card 1: Your Spending Style */}
            <Surface style={{ gap: Spacing.eight }}>
              <View style={[ui.row, { gap: Spacing.twelve }]}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: p.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SymbolView
                    name={
                      spendingProfile?.status === 'ready'
                        ? { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }
                        : { ios: 'leaf.fill', android: 'eco', web: 'eco' }
                    }
                    size={22}
                    tintColor={p.accent}
                  />
                </View>
                <View style={{ flex: 1, gap: Spacing.two }}>
                  <AppText variant="caption" color={p.textSecondary}>
                    Your Spending Style
                  </AppText>
                  {!spendingProfile || spendingProfile.status === 'error' ? (
                    <>
                      <AppText variant="headline" weight="700">Profile Unavailable</AppText>
                      <AppText variant="caption" color={p.textSecondary}>
                        Saved data could not be calculated. Please try again.
                      </AppText>
                    </>
                  ) : spendingProfile.status === 'no-data' ? (
                    <>
                      <AppText variant="headline" weight="700">Your Spending Story Starts Here.</AppText>
                      <AppText variant="caption" color={p.textSecondary}>
                        Add a few expenses to discover your spending habits and personalised insights.
                      </AppText>
                    </>
                  ) : spendingProfile.status === 'insufficient-data' ? (
                    <>
                      <AppText variant="headline" weight="700">Building Your Spending Profile.</AppText>
                      <AppText variant="caption" color={p.textSecondary}>
                        {spendingProfile.eligibleTransactionCount} eligible expenses across {spendingProfile.distinctDayCount} days. Keep recording expenses across at least 3 distinct days.
                      </AppText>
                    </>
                  ) : (
                    <>
                      {spendingProfile.persona ? (
                        <>
                          <AppText variant="headline" weight="700">
                            {spendingProfile.persona.name}
                          </AppText>
                          <AppText variant="caption" color={p.textSecondary}>
                            {spendingProfile.persona.description}
                          </AppText>
                          <AppText variant="caption" color={p.textSecondary} style={{ marginTop: 4 }}>
                            {spendingProfile.persona.evidence}
                          </AppText>
                        </>
                      ) : null}
                      {spendingProfile.secondaryPersona ? (
                        <AppText variant="captionMedium" color={p.accent} style={{ marginTop: 4 }}>
                          Secondary: {spendingProfile.secondaryPersona.name}
                        </AppText>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            </Surface>

            <Surface style={{ gap: Spacing.twelve }}>
              <SectionTitle title="Savings" detail={label} />
              {savingsPeriod.transactionCount > 0 ? (
                <>
                  <View style={[ui.row, { justifyContent: 'space-between', gap: Spacing.twelve }]}>
                    <View style={{ flex: 1, gap: Spacing.two }}>
                      <AppText variant="caption" color={p.textSecondary}>Added Savings</AppText>
                      <AppText variant="headline" weight="700" tabular>
                        {formatMoney(savingsPeriod.additionsMinor, preferences.currency)}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: Spacing.two }}>
                      <AppText variant="caption" color={p.textSecondary}>Withdrawals</AppText>
                      <AppText variant="headline" weight="700" tabular>
                        {formatMoney(savingsPeriod.withdrawalsMinor, preferences.currency)}
                      </AppText>
                    </View>
                  </View>
                  <View style={[ui.row, { justifyContent: 'space-between', gap: Spacing.twelve }]}>
                    <AppText variant="bodyMedium" weight="600">Net Allocated</AppText>
                    <AppText variant="bodyMedium" weight="700" color={p.accent} tabular>
                      {formatMoney(savingsPeriod.netMinor, preferences.currency)}
                    </AppText>
                  </View>
                </>
              ) : (
                <AppText variant="body" color={p.textSecondary}>
                  No savings activity in this period.
                </AppText>
              )}
              <View style={[ui.row, { justifyContent: 'space-between', gap: Spacing.twelve }]}>
                <AppText variant="captionMedium" color={p.textSecondary}>Reserved Across Active Goals</AppText>
                <AppText variant="bodyMedium" weight="700" tabular>
                  {formatMoney(reservedSavings, preferences.currency)}
                </AppText>
              </View>
              {goals.length > 0 ? (
                <View style={{ gap: Spacing.eight }}>
                  {goals.map((goal) => (
                    <View key={goal.id} style={[ui.row, { justifyContent: 'space-between', gap: Spacing.twelve }]}>
                      <AppText variant="captionMedium" color={p.textSecondary}>{goal.name}</AppText>
                      <AppText variant="captionMedium" weight="600" tabular>
                        {formatMoney(goalBalances[goal.id] ?? goal.savedMinor, preferences.currency)}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Surface>

            <Surface style={{ gap: Spacing.eight }}>
              <SectionTitle title="Income Received" detail={label} />
              <AppText variant="headline" weight="700" tabular>
                {formatMoney(totalIncome, preferences.currency)}
              </AppText>
              <AppText variant="caption" color={p.textSecondary}>
                All income records dated in this reporting period.
              </AppText>
            </Surface>

            {/* Card 2: Top Categories with Donut-style Circular Graphic */}
            <Surface style={{ gap: Spacing.sixteen }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: Spacing.eight }]}>
                  <SymbolView
                    name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
                    size={18}
                    tintColor={p.accent}
                  />
                  <AppText variant="headline">Top Categories</AppText>
                </View>
                <AppText variant="caption" color={p.textSecondary}>
                  {label}
                </AppText>
              </View>

              <View style={[ui.row, { gap: Spacing.eight }]}>
                {([
                  { id: 'spending' as const, label: 'Spending By Category' },
                  { id: 'savings' as const, label: 'Financial Distribution' },
                ] as const).map((option) => {
                  const active = distributionView === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setDistributionView(option.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        ui.chip,
                        { backgroundColor: active ? p.accent : p.backgroundSelected },
                      ]}
                    >
                      <AppText variant="captionMedium" color={active ? onAccent : p.text}>
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {distributionView === 'spending' && breakdown.length > 0 ? (
                <View style={[ui.row, { gap: Spacing.sixteen, alignItems: 'center' }]}>
                  {/* Circular Total Indicator (Donut style) */}
                  <CategoryDonut segments={breakdown} size={110}>
                    <AppText variant="captionMedium" weight="700" tabular size={13}>
                      {formatMoney(totalSpent, preferences.currency)}
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary} size={11} tabular>
                      ~{formatMoney(dailyAverage, preferences.currency)}/d
                    </AppText>
                  </CategoryDonut>

                  {/* Category percentage list */}
                  <View style={{ flex: 1, gap: Spacing.eight }}>
                    {breakdown.map((item) => (
                      <View key={item.category} style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View style={[ui.row, { gap: Spacing.eight }]}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: categoryColor(item.category),
                            }}
                          />
                          <AppText variant="captionMedium" weight="600">
                            {item.category}
                          </AppText>
                        </View>
                        <AppText variant="captionMedium" color={p.textSecondary} tabular>
                          {Math.round(item.percentage)}%
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : distributionView === 'savings' ? (
                (() => {
                  const netSavingsMinor = Math.max(0, savingsPeriod.netMinor);
                  const distributionTotalMinor = totalSpent + netSavingsMinor;
                  const segments =
                    distributionTotalMinor > 0
                      ? [
                          {
                            category: 'Actual Expenditure',
                            percentage: (totalSpent / distributionTotalMinor) * 100,
                          },
                          ...(netSavingsMinor > 0
                            ? [{
                                category: 'Savings Allocation',
                                percentage: (netSavingsMinor / distributionTotalMinor) * 100,
                              }]
                            : []),
                        ]
                      : [];
                  return segments.length > 0 ? (
                    <View style={[ui.row, { gap: Spacing.sixteen, alignItems: 'center' }]}>
                      <CategoryDonut segments={segments} size={110}>
                        <AppText variant="captionMedium" weight="700" tabular size={13}>
                          {formatMoney(distributionTotalMinor, preferences.currency)}
                        </AppText>
                        <AppText variant="caption" color={p.textSecondary} size={11}>
                          Distribution
                        </AppText>
                      </CategoryDonut>
                      <View style={{ flex: 1, gap: Spacing.eight }}>
                        {segments.map((segment) => (
                          <View key={segment.category} style={[ui.row, { justifyContent: 'space-between', gap: Spacing.eight }]}>
                            <View style={[ui.row, { flex: 1, gap: Spacing.eight }]}>
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: categoryColor(segment.category),
                                }}
                              />
                              <AppText variant="captionMedium" weight="600">{segment.category}</AppText>
                            </View>
                            <AppText variant="captionMedium" color={p.textSecondary} tabular>
                              {Math.round(segment.percentage)}%
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <AppText variant="body" color={p.textSecondary}>
                      No expenditure or net savings allocation in this period.
                    </AppText>
                  );
                })()
              ) : (
                <AppText variant="body" color={p.textSecondary}>
                  No category spending logged in this window.
                </AppText>
              )}
            </Surface>

            {/* Card 3: Actionable Insight */}
            {primaryInsight ? (
              <Surface
                style={{
                  padding: 16,
                  gap: 8,
                  backgroundColor: p.accentSoft,
                  borderColor: p.accentSoft,
                }}
              >
                <View style={[ui.row, { gap: 8 }]}>
                  <SymbolView
                    name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }}
                    size={18}
                    tintColor={p.accent}
                  />
                  <AppText variant="captionMedium" color={p.accent} weight="700">
                    Insight
                  </AppText>
                </View>
                <AppText variant="body" color={p.text}>
                  {primaryInsight}
                </AppText>
              </Surface>
            ) : null}

            {/* Detailed Category Breakdown */}
            <View style={{ gap: Spacing.twelve }}>
              <SectionTitle title="Full Breakdown" detail="All categories in this period" />
              <CategoryBreakdownList breakdown={breakdown} currency={preferences.currency} />
            </View>
          </>
        ) : null}

        {/* TAB 2: BEHAVIOUR */}
        {activeTab === 'behaviour' ? (
          <>
            <Surface style={{ gap: Spacing.twelve }}>
              <AppText variant="headline">Mindful Vs. Impulse Spending</AppText>
              <AppText variant="body" color={p.textSecondary}>
                PocketPal encourages noticing how purchases feel without guilt.
              </AppText>
              {spendingProfile?.status === 'ready' && spendingProfile.mindfulPercentage !== null ? (
                <>
                  <ProgressBar value={spendingProfile.mindfulPercentage / 100} height={10} color={p.accent} />
                  <View style={{ width: '100%', gap: Spacing.four }}>
                    <View style={{ width: '100%', flexShrink: 1 }}>
                      <AppText variant="captionMedium" color={p.accent} style={{ flexShrink: 1 }}>
                        Mindful: {spendingProfile.mindfulPercentage}% of reflected expenses
                      </AppText>
                    </View>
                    <View style={{ width: '100%', flexShrink: 1 }}>
                      <AppText variant="captionMedium" color={p.textSecondary} style={{ flexShrink: 1 }}>
                        Impulse: {100 - spendingProfile.mindfulPercentage}% of reflected expenses
                      </AppText>
                    </View>
                  </View>
                </>
              ) : (
                <AppText variant="captionMedium" color={p.textSecondary}>
                  Reflection-based percentages are not available yet. At least 3 reflected expenses are needed.
                </AppText>
              )}
            </Surface>

            {/* Reflection distribution */}
            <View style={{ gap: Spacing.twelve }}>
              <SectionTitle title="Observed Reflections" detail="Counts recorded across entries" />
              <Surface style={{ gap: Spacing.twelve }}>
                {(['Planned', 'Needed', 'Spontaneous', 'Just wanted it'] as const).map((ref) => {
                  const count = mindfulStats.counts[ref] ?? 0;
                  const ratio = mindfulStats.totalReflections > 0 ? count / mindfulStats.totalReflections : 0;
                  return (
                    <View key={ref} style={{ gap: Spacing.eight }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <AppText variant="bodyMedium" weight="600">
                          {ref === 'Just wanted it' ? 'Just Wanted It' : ref}
                        </AppText>
                        <AppText variant="captionMedium" color={p.textSecondary} tabular>
                          {count} ({Math.round(ratio * 100)}%)
                        </AppText>
                      </View>
                      <ProgressBar value={ratio} height={6} />
                    </View>
                  );
                })}
              </Surface>
            </View>
          </>
        ) : null}

        {/* TAB 3: TRENDS */}
        {activeTab === 'trends' ? (
          <>
            {/* Spending Trend with Daily / Weekly / Monthly Switch */}
            <View style={{ gap: Spacing.twelve }}>
              <SectionTitle
                title="Spending Trend"
                detail="Interactive chart with date and amount inspection"
              />
              <DailySpendTrendChart
                trend={trend}
                currency={preferences.currency}
                height={150}
                granularity={granularity}
                onGranularityChange={setGranularity}
              />
            </View>

            {/* Calendar Heatmap with Red, Yellow, Green upon spending */}
            <View style={{ gap: Spacing.twelve }}>
              <SectionTitle
                title="Calendar & Heat Map"
                detail="Daily Spend Intensity: Red (High), Yellow (Moderate), Green (Low/Zero)"
              />
              <ExpenseCalendarHeatmap expenses={expenses} currency={preferences.currency} />
            </View>
          </>
        ) : null}
      </Screen>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  topTabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  topTabBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: Spacing.eight,
  },
  rangeChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.eight,
  },
});
