import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';
import React, { PropsWithChildren, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ColorPalette, Colors, Fonts, ThemeMode, Typography } from '@/constants/theme';
import { calculateLoggingStreak, categoryColor, currencyDigits, formatMoney, monthCalendarData } from '@/finance.mjs';
import { Category, Expense, useFinance } from '@/store';
import { MotionBar, MotionPressable, MotionProgress, ScreenMotion } from '@/components/motion';

export function useThemeMode(): ThemeMode {
  const { preferences } = useFinance();
  const scheme = useColorScheme();
  return preferences.themeMode === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preferences.themeMode;
}

export function usePalette(): ColorPalette {
  const mode = useThemeMode();
  return Colors[mode];
}

export function useAccentForeground(): string {
  const mode = useThemeMode();
  return mode === 'dark' ? '#111613' : '#FFFFFF';
}

export type TextVariant = keyof typeof Typography;

export function AppText({
  children,
  variant = 'body',
  size,
  weight,
  color,
  style,
  numberOfLines,
  tabular = false,
}: PropsWithChildren<{
  variant?: TextVariant;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  tabular?: boolean;
}>) {
  const palette = usePalette();
  const baseStyle = Typography[variant];

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: Fonts.sans,
          color: color ?? palette.text,
          fontSize: size ?? baseStyle.fontSize,
          lineHeight: size ? Math.round(size * 1.35) : baseStyle.lineHeight,
          fontWeight: weight ?? baseStyle.fontWeight,
          letterSpacing: baseStyle.letterSpacing,
          ...(tabular ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : {}),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  title,
  eyebrow,
  action,
  scroll = true,
}: PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  scroll?: boolean;
}>) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(16, insets.bottom) + 84;

  const content = (
    <View style={styles.screenContent}>
      {title ? (
        <ScreenMotion delay={0} style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            {eyebrow ? (
              <AppText variant="eyebrow" color={p.accent} style={styles.eyebrow}>
                {eyebrow.toUpperCase()}
              </AppText>
            ) : null}
            <AppText variant="titleLarge" size={Platform.OS === 'web' ? 28 : 25}>
              {title}
            </AppText>
          </View>
          {action}
        </ScreenMotion>
      ) : null}
      <ScreenMotion delay={title ? 70 : 0}>
        {children}
      </ScreenMotion>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: p.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Surface({
  children,
  style,
  onPress,
  accessibilityLabel,
}: PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  accessibilityLabel?: string;
}>) {
  const p = usePalette();
  const view = (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: p.backgroundElement,
          borderColor: p.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return onPress ? (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={undefined}
    >
      {view}
    </MotionPressable>
  ) : (
    view
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  icon?: SymbolViewProps['name'];
}) {
  const p = usePalette();
  const mode = useThemeMode();
  const onAccent = useAccentForeground();

  let bg: string = p.accent;
  let fg: string = onAccent;

  if (variant === 'quiet') {
    bg = p.accentSoft;
    fg = p.accent;
  } else if (variant === 'danger') {
    bg = mode === 'dark' ? '#381D17' : '#F7E7E2';
    fg = p.warning;
  }

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {icon ? <SymbolView name={icon} size={16} tintColor={fg} /> : null}
      <AppText variant="bodyMedium" weight="600" color={fg}>
        {label}
      </AppText>
    </MotionPressable>
  );
}

export function SectionTitle({
  title,
  detail,
  onPress,
  actionLabel,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const p = usePalette();
  return (
    <View style={styles.sectionTitle}>
      <View style={{ gap: 2, flex: 1 }}>
        <AppText variant="headline">{title}</AppText>
        {detail ? (
          <AppText variant="caption" color={p.textSecondary}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onPress}
          hitSlop={8}
        >
          <AppText variant="captionMedium" color={p.accent}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  trackColor,
  height = 8,
}: {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const p = usePalette();
  const bounded = Math.min(100, Math.max(0, value * 100));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(bounded) }}
      style={[
        styles.progressTrack,
        {
          height,
          backgroundColor: trackColor ?? p.backgroundSelected,
        },
      ]}
    >
      <MotionProgress
        value={bounded / 100}
        style={[
          styles.progressFill,
          {
            width: '100%',
            backgroundColor: color ?? p.accent,
            transformOrigin: 'left',
          },
        ]}
      />
    </View>
  );
}

const categorySymbols: Record<Category, SymbolViewProps['name']> = {
  Food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  Transport: { ios: 'tram.fill', android: 'directions_railway', web: 'directions_railway' },
  Study: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' },
  Social: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  Shopping: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  Other: { ios: 'circle.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
};

export function CategoryMark({ category, size = 36 }: { category: string; size?: number }) {
  const glyph = category in categorySymbols ? categorySymbols[category as Category] : categorySymbols.Other;
  const color = categoryColor(category);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: `${color}22`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SymbolView name={glyph} size={Math.round(size * 0.48)} tintColor={color} />
    </View>
  );
}

const tabs = [
  { path: '/', label: 'Today', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { path: '/activity', label: 'Activity', icon: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' } },
  { path: '/insights', label: 'Insights', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' } },
  { path: '/goals', label: 'Goals', icon: { ios: 'target', android: 'track_changes', web: 'track_changes' } },
  { path: '/profile', label: 'You', icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' } },
] as const;

export function BottomNav() {
  const p = usePalette();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(10, insets.bottom);

  return (
    <View
      style={[
        styles.bottomNav,
        {
          bottom: bottomOffset,
          backgroundColor: p.backgroundElement,
          borderColor: p.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = tab.path === '/' ? path === '/' : path.startsWith(tab.path);
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!active) {
                router.replace(tab.path as never);
              }
            }}
            style={styles.tab}
            hitSlop={6}
          >
            <View
              style={[
                styles.tabIconBadge,
                active ? { backgroundColor: p.accentSoft } : { backgroundColor: 'transparent' },
              ]}
            >
              <SymbolView
                name={tab.icon}
                size={20}
                tintColor={active ? p.accent : p.textSecondary}
              />
            </View>
            <AppText
              variant="caption"
              weight={active ? '600' : '400'}
              color={active ? p.accent : p.textSecondary}
              size={11}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FloatingAdd() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(10, insets.bottom) + 72;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add new spend"
      onPress={() => router.push('/add')}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: bottomOffset,
          backgroundColor: p.accent,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor={onAccent} />
    </Pressable>
  );
}

export function AppScaffold({ children }: PropsWithChildren) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <FloatingAdd />
      <BottomNav />
    </View>
  );
}

export function EmptyState({
  title,
  detail,
  cta,
  onPress,
}: {
  title: string;
  detail: string;
  cta?: string;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <View style={[styles.emptyState, { borderColor: p.border, backgroundColor: p.backgroundElement }]}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: p.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <SymbolView
          name={{ ios: 'sparkle', android: 'auto_awesome', web: 'auto_awesome' }}
          size={20}
          tintColor={p.accent}
        />
      </View>
      <AppText variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="body" color={p.textSecondary} style={{ textAlign: 'center', maxWidth: 280 }}>
        {detail}
      </AppText>
      {cta && onPress ? (
        <View style={{ marginTop: 6 }}>
          <ActionButton label={cta} onPress={onPress} variant="quiet" />
        </View>
      ) : null}
    </View>
  );
}

function formatYTick(minor: number, currency: string) {
  const digits = currencyDigits(currency);
  const major = minor / 10 ** digits;
  if (major >= 1000) {
    return `${(major / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return Math.round(major).toString();
}

/**
 * Clean, accessible spending trend bar chart with Y-axis scale, peak/selected tooltips,
 * and optional Daily / Weekly / Monthly granularity tabs.
 */
export function DailySpendTrendChart({
  trend,
  currency,
  height = 150,
  granularity,
  onGranularityChange,
}: {
  trend: { dateKey: string; label: string; dayNumber: number; amountMinor: number }[];
  currency: string;
  height?: number;
  granularity?: 'daily' | 'weekly' | 'monthly';
  onGranularityChange?: (g: 'daily' | 'weekly' | 'monthly') => void;
}) {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const maxAmount = useMemo(() => {
    const highest = Math.max(...trend.map((t) => t.amountMinor), 0);
    return highest > 0 ? highest : 1000;
  }, [trend]);

  const peakDay = useMemo(() => {
    if (!trend.length) return null;
    return trend.reduce((prev, curr) => (curr.amountMinor > prev.amountMinor ? curr : prev), trend[0]);
  }, [trend]);

  const totalSpent = useMemo(() => trend.reduce((s, t) => s + t.amountMinor, 0), [trend]);

  const activeDay = useMemo(() => {
    if (selectedKey) {
      return trend.find((t) => t.dateKey === selectedKey) ?? peakDay;
    }
    return peakDay;
  }, [selectedKey, trend, peakDay]);

  if (!trend.length || totalSpent === 0) {
    return (
      <View
        style={[styles.chartContainer, { height: height + 20, borderColor: p.border, backgroundColor: p.backgroundElement }]}
        accessibilityRole="image"
        accessibilityLabel="Empty spending trend chart"
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20 }}>
          <AppText variant="captionMedium" color={p.textSecondary}>
            No spending recorded in this period
          </AppText>
          <AppText variant="caption" color={p.textSecondary} style={{ textAlign: 'center' }}>
            Spending bars will appear here as you log your expenses.
          </AppText>
        </View>
      </View>
    );
  }

  const yTicks = [
    { label: formatYTick(maxAmount, currency), minor: maxAmount },
    { label: formatYTick(maxAmount * 0.75, currency), minor: maxAmount * 0.75 },
    { label: formatYTick(maxAmount * 0.5, currency), minor: maxAmount * 0.5 },
    { label: formatYTick(maxAmount * 0.25, currency), minor: maxAmount * 0.25 },
    { label: '0', minor: 0 },
  ];

  const labelInterval = Math.max(1, Math.ceil(trend.length / 6));

  return (
    <View
      style={[styles.chartContainer, { borderColor: p.border, backgroundColor: p.backgroundElement }]}
      accessibilityRole="image"
      accessibilityLabel={`Spending chart for ${trend.length} bars, total ${formatMoney(totalSpent, currency)}`}
    >
      {/* Optional Granularity Tabs */}
      {onGranularityChange && granularity ? (
        <View style={styles.chartPeriodRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((g) => {
            const active = granularity === g;
            return (
              <Pressable
                key={g}
                onPress={() => onGranularityChange(g)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chartPeriodBtn,
                  {
                    backgroundColor: active ? p.accent : p.backgroundSelected,
                  },
                ]}
              >
                <AppText
                  variant="captionMedium"
                  color={active ? onAccent : p.textSecondary}
                  size={12}
                >
                  {g[0].toUpperCase() + g.slice(1)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Header with active selection/peak tooltip */}
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <AppText variant="eyebrow" color={p.textSecondary}>
          {granularity ? `${granularity.toUpperCase()} SPEND` : 'SPENDING PATTERN'}
        </AppText>
        {activeDay && activeDay.amountMinor > 0 ? (
          <View style={[styles.peakBadge, { backgroundColor: p.backgroundSelected, borderColor: p.border }]}>
            <AppText variant="captionMedium" color={p.accent} size={11} tabular>
              {activeDay === peakDay && !selectedKey ? 'Peak: ' : `${activeDay.label}: `}
              {formatMoney(activeDay.amountMinor, currency)}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Chart Canvas with Y-axis & Gridlines */}
      <View style={{ height, flexDirection: 'row', alignItems: 'stretch' }}>
        {/* Y-axis Ticks */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <View key={idx} style={styles.yTickContainer}>
              <AppText variant="caption" size={10} color={p.textSecondary} tabular>
                {tick.label}
              </AppText>
            </View>
          ))}
        </View>

        {/* Bars Container */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Horizontal grid lines */}
          <View style={StyleSheet.absoluteFill}>
            {yTicks.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.gridLine,
                  {
                    top: `${(idx / (yTicks.length - 1)) * 100}%`,
                    borderColor: p.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Bar Columns */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 22 }}>
            {trend.map((day, idx) => {
              const isSelected = selectedKey === day.dateKey;
              const isPeak = day.dateKey === peakDay?.dateKey;
              const barHeight = Math.max(3, Math.round((day.amountMinor / maxAmount) * (height - 40)));
              const isNonZero = day.amountMinor > 0;

              return (
                <Pressable
                  key={day.dateKey}
                  onPress={() => setSelectedKey(isSelected ? null : day.dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.label}: ${formatMoney(day.amountMinor, currency)}`}
                  style={styles.barColumn}
                >
                  <MotionBar
                    height={barHeight}
                    style={[
                      styles.bar,
                      {
                        backgroundColor: isSelected
                          ? p.accent
                          : isPeak
                          ? (p === Colors.dark ? '#52C29A' : p.accent)
                          : isNonZero
                          ? p.chartBar
                          : p.backgroundSelected,
                        opacity: isNonZero ? 1 : 0.4,
                      },
                    ]}
                  />

                  {/* X-axis Label */}
                  <View style={styles.barLabelContainer}>
                    {idx % labelInterval === 0 || idx === trend.length - 1 ? (
                      <AppText
                        variant="caption"
                        size={10}
                        color={isSelected ? p.accent : p.textSecondary}
                        weight={isSelected ? '700' : '400'}
                        numberOfLines={1}
                      >
                        {day.dayNumber}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Category breakdown list with visual proportional indicators.
 */
export function CategoryBreakdownList({
  breakdown,
  currency,
}: {
  breakdown: { category: string; totalMinor: number; count: number; percentage: number }[];
  currency: string;
}) {
  const p = usePalette();

  if (!breakdown.length) {
    return null;
  }

  return (
    <Surface style={{ gap: 14 }}>
      {breakdown.map((item) => (
        <View key={item.category} style={{ gap: 8 }}>
          <View style={[ui.row, { gap: 10 }]}>
            <CategoryMark category={item.category} size={34} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyMedium" weight="600">
                {item.category}
              </AppText>
              <AppText variant="caption" color={p.textSecondary}>
                {item.count} {item.count === 1 ? 'spend' : 'spends'} · {Math.round(item.percentage)}%
              </AppText>
            </View>
            <AppText variant="bodyMedium" weight="600" tabular>
              {formatMoney(item.totalMinor, currency)}
            </AppText>
          </View>
          <ProgressBar value={item.percentage / 100} height={6} color={categoryColor(item.category)} />
        </View>
      ))}
    </Surface>
  );
}

export function CategoryDonut({
  segments,
  size = 110,
  children,
}: PropsWithChildren<{
  segments: { category: string; percentage: number }[];
  size?: number;
}>) {
  const p = usePalette();
  const strokeWidth = Math.max(8, Math.round(size * 0.09));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const renderedSegments = segments.map((segment, index) => {
    const precedingPercentage = segments
      .slice(0, index)
      .reduce((total, previous) => total + Math.min(100, Math.max(0, previous.percentage)), 0);
    const segmentLength = circumference * Math.min(100, Math.max(0, segment.percentage)) / 100;
    return {
      ...segment,
      segmentLength,
      dashOffset: -(circumference * precedingPercentage / 100),
    };
  });

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="image"
      accessibilityLabel={`Spending category chart with ${segments.length} categories`}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={p.backgroundSelected}
          strokeWidth={strokeWidth}
        />
        {renderedSegments.map((segment) => (
            <Circle
              key={segment.category}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={categoryColor(segment.category)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.segmentLength} ${circumference - segment.segmentLength}`}
              strokeDashoffset={segment.dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        ))}
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: strokeWidth + 4 }}>
        {children}
      </View>
    </View>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCard({ expenses }: { expenses: Expense[] }) {
  const p = usePalette();
  const { zeroSpendDays } = useFinance();
  const streak = useMemo(() => calculateLoggingStreak(expenses, new Date(), zeroSpendDays), [expenses, zeroSpendDays]);

  return (
    <Surface style={{ padding: 16, borderColor: p.border }}>
      <View style={[ui.row, { gap: 12 }]}>
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
            name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
            size={22}
            tintColor={p.accent}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={[ui.row, { gap: 8 }]}>
            <AppText variant="headline">
              {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'} streak
            </AppText>
            {streak.loggedToday ? (
              <View
                style={{
                  backgroundColor: p.accentSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <AppText variant="captionMedium" color={p.accent} size={11}>
                  Logged today
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="caption" color={p.textSecondary}>
            {streak.currentStreak > 0
              ? `Best: ${streak.longestStreak} ${streak.longestStreak === 1 ? 'day' : 'days'}. Mindful daily tracking.`
              : 'Log your everyday spends to start your consistency streak.'}
          </AppText>
        </View>
      </View>
    </Surface>
  );
}

export function ExpenseCalendarHeatmap({
  expenses,
  currency,
}: {
  expenses: Expense[];
  currency: string;
}) {
  const p = usePalette();
  const now = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const { zeroSpendDays } = useFinance();

  const calData = useMemo(
    () => monthCalendarData(expenses, currentYear, currentMonth, now, zeroSpendDays),
    [expenses, currentYear, currentMonth, now, zeroSpendDays]
  );

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDateKey(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDateKey(null);
  };

  const monthTitle = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  const selectedDay = useMemo(() => {
    if (!selectedDateKey) return null;
    return calData.days.find((d) => d.dateKey === selectedDateKey) ?? null;
  }, [calData.days, selectedDateKey]);

  return (
    <Surface style={{ padding: 18, gap: 14 }}>
      {/* Month Navigator */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Pressable
          onPress={prevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={10}
          style={styles.calNavBtn}
        >
          <AppText variant="bodyMedium" weight="700" color={p.accent}>
            ‹
          </AppText>
        </Pressable>

        <AppText variant="headline">{monthTitle}</AppText>

        <Pressable
          onPress={nextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={10}
          style={styles.calNavBtn}
        >
          <AppText variant="bodyMedium" weight="700" color={p.accent}>
            ›
          </AppText>
        </Pressable>
      </View>

      {/* Summary strip: zero spend days vs active days */}
      <View style={[ui.row, { gap: 10 }]}>
        <View style={[styles.calPill, { backgroundColor: p.accentSoft }]}>
          <AppText variant="captionMedium" color={p.accent}>
            {calData.zeroSpendDays} {calData.zeroSpendDays === 1 ? 'zero-spend day' : 'zero-spend days'}
          </AppText>
        </View>
        <View style={[styles.calPill, { backgroundColor: p.backgroundSelected }]}>
          <AppText variant="captionMedium" color={p.textSecondary}>
            {calData.activeSpendDays} active {calData.activeSpendDays === 1 ? 'day' : 'days'}
          </AppText>
        </View>
        <View style={[styles.calPill, { backgroundColor: p.backgroundSelected, marginLeft: 'auto' }]}>
          <AppText variant="captionMedium" color={p.text} tabular>
            {formatMoney(calData.totalSpentMinor, currency)}
          </AppText>
        </View>
      </View>

      {/* Heatmap Color Legend */}
      <View style={[ui.row, { justifyContent: 'space-between', paddingHorizontal: 4, marginVertical: 2 }]}>
        <View style={[ui.row, { gap: 6 }]}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <AppText variant="caption" color={p.textSecondary} size={11}>
            Zero / Low
          </AppText>
        </View>
        <View style={[ui.row, { gap: 6 }]}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <AppText variant="caption" color={p.textSecondary} size={11}>
            Moderate
          </AppText>
        </View>
        <View style={[ui.row, { gap: 6 }]}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <AppText variant="caption" color={p.textSecondary} size={11}>
            High spend
          </AppText>
        </View>
      </View>

      {/* Day of Week Headers */}
      <View style={styles.calWeekRow}>
        {WEEKDAYS.map((w, idx) => (
          <View key={idx} style={styles.calHeaderCell}>
            <AppText variant="caption" color={p.textSecondary} size={11}>
              {w}
            </AppText>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calGrid}>
        {/* Leading empty offset cells */}
        {Array.from({ length: calData.startOffset }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.calCell} />
        ))}

        {/* Day Cells */}
        {calData.days.map((day) => {
          const isSelected = selectedDateKey === day.dateKey;
          const ratio = calData.maxDailyMinor > 0 ? day.amountMinor / calData.maxDailyMinor : 0;
          const isDark = p === Colors.dark;

          let cellBg = isDark ? '#1F2521' : p.backgroundSelected;
          let textColor = p.text;
          let cellBorder = 'transparent';

          if (day.isFuture) {
            cellBg = 'transparent';
            textColor = p.textSecondary;
          } else if (day.isZeroSpend) {
            // Zero-spend day: green tint indicating discipline & saved allowance
            cellBg = isDark ? '#143322' : '#E8F5E9';
            textColor = isDark ? '#4ADE80' : '#15803D';
            cellBorder = isDark ? '#1E4C32' : '#C8E6C9';
          } else if (ratio > 0.7) {
            // High spend day: Red
            cellBg = isDark ? '#451A1A' : '#FEE2E2';
            textColor = isDark ? '#FCA5A5' : '#DC2626';
            cellBorder = isDark ? '#7F1D1D' : '#FCA5A5';
          } else if (ratio > 0.35) {
            // Moderate spend day: Yellow / Amber
            cellBg = isDark ? '#3D2F0E' : '#FEF3C7';
            textColor = isDark ? '#FCD34D' : '#D97706';
            cellBorder = isDark ? '#78350F' : '#FDE68A';
          } else {
            // Low spend day: Green
            cellBg = isDark ? '#163824' : '#DCFCE7';
            textColor = isDark ? '#86EFAC' : '#16A34A';
            cellBorder = isDark ? '#225438' : '#BBF7D0';
          }

          return (
            <Pressable
              key={day.dateKey}
              disabled={day.isFuture}
              onPress={() => setSelectedDateKey(isSelected ? null : day.dateKey)}
              accessibilityRole="button"
              accessibilityLabel={`${day.dateKey}: ${day.amountMinor > 0 ? formatMoney(day.amountMinor, currency) : 'Zero spend'}`}
              style={[
                styles.calCell,
                {
                  backgroundColor: cellBg,
                  borderColor: isSelected
                    ? p.accent
                    : day.isToday
                    ? p.accent
                    : cellBorder,
                  borderWidth: isSelected ? 2 : day.isToday ? 1.5 : 1,
                  opacity: day.isFuture ? 0.3 : 1,
                },
              ]}
            >
              <View style={styles.calDayNumber}>
                <AppText
                  variant="caption"
                  size={11}
                  weight={day.isToday || isSelected ? '700' : '500'}
                  color={textColor}
                  style={{ textAlign: 'center' }}
                >
                  {day.dayNumber}
                </AppText>
              </View>
              {day.isZeroSpend ? (
                <View style={[styles.zeroDot, { backgroundColor: '#22C55E' }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Selected Day Breakdown Panel */}
      {selectedDay ? (
        <Surface
          style={{
            padding: 14,
            backgroundColor: selectedDay.isZeroSpend ? p.accentSoft : p.backgroundElement,
            borderColor: selectedDay.isZeroSpend ? p.accentSoft : p.border,
            gap: 10,
          }}
        >
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <AppText variant="captionMedium" color={selectedDay.isZeroSpend ? p.accent : p.text}>
              {new Date(selectedDay.dateKey + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </AppText>
            <AppText variant="captionMedium" color={selectedDay.isZeroSpend ? p.accent : p.text} tabular>
              {selectedDay.isZeroSpend ? 'Zero spend day' : formatMoney(selectedDay.amountMinor, currency)}
            </AppText>
          </View>

          {selectedDay.isZeroSpend ? (
            <AppText variant="caption" color={p.textSecondary}>
              Zero expenses logged on this day. Great discipline leaving room in your allowance!
            </AppText>
          ) : (
            <View style={{ gap: 8 }}>
              {selectedDay.items.map((item) => (
                <View key={item.id} style={[ui.row, { gap: 8 }]}>
                  <CategoryMark category={item.category} size={26} />
                  <AppText variant="captionMedium" style={{ flex: 1 }} numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" tabular>
                    {formatMoney(item.amountMinor, currency)}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Surface>
      ) : null}
    </Surface>
  );
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  column: { gap: 10 },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  screenContent: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 12,
  },
  eyebrow: {
    letterSpacing: 1.4,
  },
  surface: {
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    gap: 12,
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 50,
    minHeight: 50,
  },
  tabIconBadge: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 22,
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  emptyState: {
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  chartContainer: {
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 14,
    borderRadius: 4,
  },
  barLabelContainer: {
    height: 18,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calCell: {
    width: '12.8%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  calDayNumber: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartPeriodRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: 14,
    padding: 2,
    gap: 4,
    marginBottom: 8,
  },
  chartPeriodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  peakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  yAxisColumn: {
    width: 38,
    justifyContent: 'space-between',
    paddingBottom: 22,
    paddingRight: 6,
    alignItems: 'flex-end',
  },
  yTickContainer: {
    height: 14,
    justifyContent: 'center',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});
