import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  AppScaffold,
  AppText,
  CategoryBreakdownList,
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
  categoryBreakdown,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  monthlySpendTrend,
  sumExpenses,
  weeklySpendTrend,
} from '@/finance.mjs';
import { useFinance } from '@/store';

type InsightTab = 'overview' | 'behaviour' | 'trends';
type Granularity = 'daily' | 'weekly' | 'monthly';
type RangeOption = 'cycle' | '7d' | '30d';

export default function InsightsScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { preferences, expenses } = useFinance();

  const [activeTab, setActiveTab] = useState<InsightTab>('overview');
  const [range, setRange] = useState<RangeOption>('cycle');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const now = useMemo(() => new Date(), []);

  const { from, to, label } = useMemo(() => {
    if (range === '7d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now, label: 'Past 7 days' };
    }
    if (range === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now, label: 'Past 30 days' };
    }
    const cycle = cycleStart(now, preferences.cycleStartDay);
    return { from: cycle, to: now, label: 'Current cycle' };
  }, [now, preferences.cycleStartDay, range]);

  const totalSpent = useMemo(() => sumExpenses(expenses, from, to), [expenses, from, to]);
  const daysCount = useMemo(() => {
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  }, [from, to]);
  const dailyAverage = Math.round(totalSpent / daysCount);

  // Spend trend based on selected granularity
  const trend = useMemo(() => {
    if (granularity === 'weekly') {
      return weeklySpendTrend(expenses, from, to);
    }
    if (granularity === 'monthly') {
      return monthlySpendTrend(expenses, from, to);
    }
    return dailySpendTrend(expenses, from, to);
  }, [expenses, from, to, granularity]);

  const breakdown = useMemo(() => categoryBreakdown(expenses, from, to), [expenses, from, to]);

  const inWindowExpenses = useMemo(() => {
    const startStr = from.toISOString();
    const endStr = to.toISOString();
    return expenses.filter((e) => e.occurredAt >= startStr && e.occurredAt <= endStr);
  }, [expenses, from, to]);

  // Mindfulness calculation
  const mindfulStats = useMemo(() => {
    let mindfulCount = 0;
    let totalReflections = 0;
    const counts: Record<string, number> = {};

    for (const exp of inWindowExpenses) {
      if (exp.reflection) {
        totalReflections += 1;
        counts[exp.reflection] = (counts[exp.reflection] ?? 0) + 1;
        if (exp.reflection === 'Planned' || exp.reflection === 'Needed') {
          mindfulCount += 1;
        }
      }
    }

    const percentage = totalReflections > 0 ? Math.round((mindfulCount / totalReflections) * 100) : 75;
    let style = 'Balanced';
    if (percentage >= 80) style = 'Mindful & Disciplined';
    else if (percentage < 50) style = 'Spontaneous Explorer';

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      style,
      percentage,
      totalReflections,
      top: entries[0],
      counts,
    };
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
    <AppScaffold>
      <Screen eyebrow="Patterns & habits" title="Insights">
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
              { id: 'cycle', label: 'This Cycle' },
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
            <Surface style={{ padding: 18, gap: 10 }}>
              <View style={[ui.row, { gap: 14 }]}>
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
                    name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
                    size={22}
                    tintColor={p.accent}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" color={p.textSecondary}>
                    Your Spending Style
                  </AppText>
                  <AppText variant="headline" weight="700">
                    {mindfulStats.style}
                  </AppText>
                  <AppText variant="caption" color={p.textSecondary}>
                    You’re spending mindfully {mindfulStats.percentage}% of the time.
                  </AppText>
                </View>
              </View>
            </Surface>

            {/* Card 2: Top Categories with Donut-style Circular Graphic */}
            <Surface style={{ padding: 18, gap: 16 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: 8 }]}>
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

              {breakdown.length > 0 ? (
                <View style={[ui.row, { gap: 20, alignItems: 'center' }]}>
                  {/* Circular Total Indicator (Donut style) */}
                  <View
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 55,
                      borderWidth: 10,
                      borderColor: p.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: p.backgroundElement,
                    }}
                  >
                    <AppText variant="captionMedium" weight="700" tabular size={13}>
                      {formatMoney(totalSpent, preferences.currency)}
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary} size={11} tabular>
                      ~{formatMoney(dailyAverage, preferences.currency)}/d
                    </AppText>
                  </View>

                  {/* Category percentage list */}
                  <View style={{ flex: 1, gap: 10 }}>
                    {breakdown.slice(0, 4).map((item) => (
                      <View key={item.category} style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View style={[ui.row, { gap: 8 }]}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: p.accent,
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
            <View style={{ gap: 10 }}>
              <SectionTitle title="Full breakdown" detail="All categories in this period" />
              <CategoryBreakdownList breakdown={breakdown} currency={preferences.currency} />
            </View>
          </>
        ) : null}

        {/* TAB 2: BEHAVIOUR */}
        {activeTab === 'behaviour' ? (
          <>
            <Surface style={{ padding: 18, gap: 12 }}>
              <AppText variant="headline">Mindful vs. Impulse Spending</AppText>
              <AppText variant="body" color={p.textSecondary}>
                Pennywise encourages noticing how purchases feel without guilt.
              </AppText>

              <ProgressBar value={mindfulStats.percentage / 100} height={10} color={p.accent} />

              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <AppText variant="captionMedium" color={p.accent}>
                  Mindful: {mindfulStats.percentage}%
                </AppText>
                <AppText variant="captionMedium" color={p.textSecondary}>
                  Impulse: {100 - mindfulStats.percentage}%
                </AppText>
              </View>
            </Surface>

            {/* Reflection distribution */}
            <View style={{ gap: 10 }}>
              <SectionTitle title="Observed Reflections" detail="Counts recorded across entries" />
              <Surface style={{ gap: 12 }}>
                {(['Planned', 'Needed', 'Spontaneous', 'Just wanted it'] as const).map((ref) => {
                  const count = mindfulStats.counts[ref] ?? 0;
                  const ratio = mindfulStats.totalReflections > 0 ? count / mindfulStats.totalReflections : 0;
                  return (
                    <View key={ref} style={{ gap: 6 }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <AppText variant="bodyMedium" weight="600">
                          {ref}
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
            <View style={{ gap: 10 }}>
              <SectionTitle
                title="Spending trend"
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
            <View style={{ gap: 10 }}>
              <SectionTitle
                title="Calendar & heat map"
                detail="Daily spend intensity: Red (high), Yellow (moderate), Green (low/zero)"
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
    gap: 8,
  },
  rangeChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
