import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  AppScaffold,
  AppText,
  CategoryMark,
  EmptyState,
  Screen,
  Surface,
  ui,
  useAccentForeground,
  usePalette,
} from '@/components/app-ui';
import { buildActivityRecords, formatMoney, localDateKey } from '@/finance.mjs';
import type { ActivityRecord } from '@/finance.mjs';
import { CATEGORIES, Category, Expense, useFinance } from '@/store';

function formatDayHeader(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function ActivityScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { preferences, expenses, incomes, goalRecords, goalTransactions, removeExpense } = useFinance();
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'savings'>('all');
  const [query, setQuery] = useState('');

  const records = useMemo(
    () => buildActivityRecords({ expenses, incomes, goals: goalRecords, goalTransactions }),
    [expenses, incomes, goalRecords, goalTransactions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((item) => {
      const isSavings = item.type === 'savingsAllocation' || item.type === 'savingsWithdrawal' || item.type === 'goalClosure';
      const matchType =
        typeFilter === 'all' ||
        item.type === typeFilter ||
        (typeFilter === 'savings' && isSavings);
      const matchCat = filter === 'All' || (item.type === 'expense' && item.category === filter);
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        (item.goalName ?? '').toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.note ?? '').toLowerCase().includes(q);
      return matchType && matchCat && matchQuery;
    });
  }, [records, filter, typeFilter, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ActivityRecord[]>>((acc, item) => {
      const key = localDateKey(item.occurredAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const sortedDays = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  }, [grouped]);

  const confirmDelete = (item: Expense) => {
    Alert.alert(
      'Remove this spend?',
      `“${item.title}” (${formatMoney(item.amountMinor, preferences.currency)}) will be permanently deleted from this device.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeExpense(item.id);
          },
        },
      ]
    );
  };

  return (
    <AppScaffold>
      <Screen eyebrow="Your records" title="Activity">
        {/* Search Bar */}
        <View style={[ui.row, { gap: 10 }]}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: p.backgroundElement,
                borderColor: p.border,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={17}
              tintColor={p.textSecondary}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search all activity…"
              placeholderTextColor={p.textSecondary}
              style={[styles.searchInput, { color: p.text }]}
              accessibilityLabel="Search all activity"
            />
          </View>
          {query || filter !== 'All' || typeFilter !== 'all' ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setFilter('All');
                setTypeFilter('all');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search and category filter"
              hitSlop={8}
            >
              <AppText variant="captionMedium" color={p.accent}>
                Reset
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {([
            { id: 'all' as const, label: 'All activity' },
            { id: 'expense' as const, label: 'Expenses' },
            { id: 'income' as const, label: 'Income' },
            { id: 'savings' as const, label: 'Savings' },
          ] as const).map((option) => {
            const active = typeFilter === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setTypeFilter(option.id);
                  if (option.id === 'income' || option.id === 'savings') setFilter('All');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.filterChip, { backgroundColor: active ? p.accent : p.backgroundSelected }]}
              >
                <AppText variant="captionMedium" color={active ? onAccent : p.text}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Expense category filters */}
        {typeFilter === 'all' || typeFilter === 'expense' ? (
          <View style={styles.filterRow}>
            {(['All', ...CATEGORIES] as const).map((cat) => {
            const active = filter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setFilter(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? p.accent : p.backgroundSelected,
                  },
                ]}
              >
                <AppText
                  variant="captionMedium"
                  color={active ? onAccent : p.text}
                >
                  {cat}
                </AppText>
              </Pressable>
            );
          })}
          </View>
        ) : null}

        {/* Results Count & Summary */}
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <AppText variant="caption" color={p.textSecondary}>
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'} found
          </AppText>
          <AppText variant="caption" color={p.textSecondary}>
            Newest first
          </AppText>
        </View>

        {/* Grouped Activity List */}
        {sortedDays.length ? (
          sortedDays.map((dayKey) => {
            const dayItems = grouped[dayKey];
            return (
              <View key={dayKey} style={{ gap: 10 }}>
                <AppText variant="captionMedium" color={p.textSecondary}>
                  {formatDayHeader(dayItems[0].occurredAt)}
                </AppText>
                <Surface style={{ padding: 16, gap: 0 }}>
                  {dayItems.map((item, idx) => {
                    const isExpense = item.type === 'expense';
                    const isIncome = item.type === 'income';
                    const isAllocation = item.type === 'savingsAllocation';
                    const isPositive = isIncome || item.type === 'savingsWithdrawal' || item.type === 'goalClosure';
                    const iconName: SymbolViewProps['name'] = isIncome
                      ? { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' }
                      : isAllocation
                      ? { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }
                      : { ios: 'arrow.uturn.backward', android: 'north_west', web: 'north_west' };
                    const typeLabel = isExpense
                      ? item.category ?? 'Expense'
                      : isIncome
                      ? `Income${item.description ? ` · ${item.description}` : ''}`
                      : isAllocation
                      ? 'Savings allocation'
                      : item.type === 'goalClosure'
                      ? 'Goal closure · returned savings'
                      : 'Savings withdrawal';
                    const prefix = isExpense || isAllocation ? '−' : '+';
                    const amountColor = isPositive ? p.accent : isAllocation ? p.warning : p.text;
                    const expense = isExpense ? expenses.find((entry) => entry.id === item.recordId) : undefined;

                    return (
                    <View key={item.key} style={{ paddingVertical: 10, gap: 6 }}>
                      <View style={[ui.row, { gap: 12 }]}>
                        {isExpense && item.category ? (
                          <CategoryMark category={item.category} size={36} />
                        ) : (
                          <View style={[styles.activityIcon, { backgroundColor: isPositive ? p.accentSoft : p.backgroundSelected }]}>
                            <SymbolView
                              name={iconName}
                              size={18}
                              tintColor={isPositive ? p.accent : isAllocation ? p.warning : p.textSecondary}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="bodyMedium" weight="600" numberOfLines={1}>
                            {item.title}
                          </AppText>
                          <AppText variant="caption" color={p.textSecondary}>
                            {typeLabel}
                            {item.goalName ? ` · ${item.goalName}` : ''}
                            {item.reflection ? ` · ${item.reflection.toLowerCase()}` : ''}
                          </AppText>
                        </View>
                        <AppText variant="bodyMedium" weight="600" color={amountColor} tabular>
                          {prefix}{formatMoney(item.amountMinor, preferences.currency)}
                        </AppText>
                      </View>

                      {item.note ? (
                        <AppText variant="caption" color={p.textSecondary} style={{ marginLeft: 48 }}>
                          {item.note}
                        </AppText>
                      ) : null}

                      {expense ? (
                        <View style={[ui.row, { justifyContent: 'flex-end', gap: 14, paddingTop: 2 }]}>
                          <Pressable
                            onPress={() => router.push({ pathname: '/edit', params: { id: expense.id.toString() } })}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${item.title}`}
                            hitSlop={8}
                          >
                            <AppText variant="captionMedium" color={p.accent}>Edit</AppText>
                          </Pressable>
                          <Pressable
                            onPress={() => confirmDelete(expense)}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${item.title}`}
                            hitSlop={8}
                          >
                            <AppText variant="caption" color={p.textSecondary}>Remove</AppText>
                          </Pressable>
                        </View>
                      ) : null}

                      {idx < dayItems.length - 1 ? (
                        <View style={[styles.divider, { backgroundColor: p.border }]} />
                      ) : null}
                    </View>
                    );
                  })}
                </Surface>
              </View>
            );
          })
        ) : (
          <EmptyState
            title={records.length ? 'No matching activity' : 'Your activity starts here'}
            detail={
              records.length
                ? 'Try adjusting your search terms or selecting another category filter.'
                : 'Expenses, income, and savings updates will appear here as you record them.'
            }
          />
        )}
      </Screen>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginLeft: 48,
  },
});
