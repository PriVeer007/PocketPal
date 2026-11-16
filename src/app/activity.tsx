import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { formatMoney, localDateKey } from '@/finance.mjs';
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
  const { preferences, expenses, removeExpense } = useFinance();
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((item) => {
      const matchCat = filter === 'All' || item.category === filter;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.note ?? '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [expenses, filter, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Expense[]>>((acc, item) => {
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
              placeholder="Search your spends…"
              placeholderTextColor={p.textSecondary}
              style={[styles.searchInput, { color: p.text }]}
              accessibilityLabel="Search spends"
            />
          </View>
          {query || filter !== 'All' ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setFilter('All');
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

        {/* Category Filters */}
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

        {/* Results Count & Summary */}
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <AppText variant="caption" color={p.textSecondary}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} found
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
                  {dayItems.map((item, idx) => (
                    <View key={item.id} style={{ paddingVertical: 10, gap: 6 }}>
                      <View style={[ui.row, { gap: 12 }]}>
                        <CategoryMark category={item.category} size={36} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="bodyMedium" weight="600" numberOfLines={1}>
                            {item.title}
                          </AppText>
                          <AppText variant="caption" color={p.textSecondary}>
                            {item.category}
                            {item.reflection ? ` · ${item.reflection.toLowerCase()}` : ''}
                          </AppText>
                        </View>
                        <AppText variant="bodyMedium" weight="600" tabular>
                          −{formatMoney(item.amountMinor, preferences.currency)}
                        </AppText>
                      </View>

                      {item.note ? (
                        <AppText variant="caption" color={p.textSecondary} style={{ marginLeft: 48 }}>
                          {item.note}
                        </AppText>
                      ) : null}

                      <View style={[ui.row, { justifyContent: 'flex-end', gap: 14, paddingTop: 2 }]}>
                        <Pressable
                          onPress={() => router.push({ pathname: '/edit', params: { id: item.id.toString() } })}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${item.title}`}
                          hitSlop={8}
                        >
                          <AppText variant="captionMedium" color={p.accent}>
                            Edit
                          </AppText>
                        </Pressable>

                        <Pressable
                          onPress={() => confirmDelete(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${item.title}`}
                          hitSlop={8}
                        >
                          <AppText variant="caption" color={p.textSecondary}>
                            Remove
                          </AppText>
                        </Pressable>
                      </View>

                      {idx < dayItems.length - 1 ? (
                        <View style={[styles.divider, { backgroundColor: p.border }]} />
                      ) : null}
                    </View>
                  ))}
                </Surface>
              </View>
            );
          })
        ) : (
          <EmptyState
            title={expenses.length ? 'No matching spends' : 'Your activity starts here'}
            detail={
              expenses.length
                ? 'Try adjusting your search terms or selecting another category filter.'
                : 'Each small entry helps you see the shape of your month without guesswork.'
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginLeft: 48,
  },
});
