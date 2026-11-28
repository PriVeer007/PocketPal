import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ActionButton,
  AppText,
  CategoryMark,
  Screen,
  Surface,
  ui,
  useAccentForeground,
  usePalette,
} from '@/components/app-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CYCLE_BUDGET_TOP_UP_SOURCE, localDateKey, toMinorUnits, validateExpense } from '@/finance.mjs';
import { CATEGORIES, Category, Reflection, useFinance } from '@/store';
import { Spacing } from '@/constants/theme';

const reflections: readonly Reflection[] = ['Planned', 'Spontaneous', 'Needed', 'Just wanted it'] as const;

type EntryMode = 'expense' | 'income';
const INCOME_SOURCES = [CYCLE_BUDGET_TOP_UP_SOURCE, 'Scholarship', 'Part-time work', 'Freelance', 'Other'] as const;

export default function AddExpenseScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const insets = useSafeAreaInsets();
  const { preferences, addExpense, addIncome, logZeroSpendDay } = useFinance();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const submitLock = useRef(false);

  const [entryMode, setEntryMode] = useState<EntryMode>('expense');
  const [incomeSource, setIncomeSource] = useState<(typeof INCOME_SOURCES)[number]>('Allowance');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [note, setNote] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [dateOffset, setDateOffset] = useState<0 | 1 | 2>(0);
  const [isZeroLog, setIsZeroLog] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const numericAmount = Number(amount.replace(/,/g, ''));

    if (entryMode === 'income') {
      // Income flow
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setError('Enter an income amount greater than zero.');
        return;
      }
      if (submitLock.current) return;
      submitLock.current = true;
      setSaving(true);
      try {
        const minor = toMinorUnits(numericAmount, preferences.currency);
        if (!minor) {
          setError('Enter a valid amount.');
          return;
        }
        const incomeDate = new Date();
        if (dateOffset > 0) {
          incomeDate.setDate(incomeDate.getDate() - dateOffset);
        }
        await addIncome({
          amountMinor: minor,
          title: title.trim().slice(0, 80),
          source: incomeSource,
          occurredAt: incomeDate.toISOString(),
          note: note.trim().slice(0, 160) || null,
        });
        router.back();
      } catch {
        setError('Your entry could not be saved. Please try again.');
      } finally {
        submitLock.current = false;
        setSaving(false);
      }
      return;
    }

    // Zero-log for streak maintenance
    if (isZeroLog) {
      if (submitLock.current) return;
      submitLock.current = true;
      setSaving(true);
      try {
        const spendDate = new Date();
        if (dateOffset > 0) {
          spendDate.setDate(spendDate.getDate() - dateOffset);
        }
        await logZeroSpendDay(localDateKey(spendDate));
        router.back();
      } catch {
        setError('Could not log your zero-spend day.');
      } finally {
        submitLock.current = false;
        setSaving(false);
      }
      return;
    }

    // Regular expense flow
    const errors = validateExpense({
      amount: numericAmount,
      title,
      category,
      currency: preferences.currency,
    });

    if (Object.keys(errors).length > 0) {
      setError(errors.amount || errors.title || errors.category || errors.currency || 'Check your entry and try again.');
      return;
    }

    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      const minor = toMinorUnits(numericAmount, preferences.currency);
      if (!minor) {
        setError('Enter a valid amount.');
        return;
      }

      const spendDate = new Date();
      if (dateOffset > 0) {
        spendDate.setDate(spendDate.getDate() - dateOffset);
      }

      await addExpense({
        amountMinor: minor,
        title: title.trim().slice(0, 80),
        category,
        occurredAt: spendDate.toISOString(),
        reflection,
        note: note.trim().slice(0, 160) || null,
      });
      router.back();
    } catch {
      setError('Your entry could not be saved. Please try again.');
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const currencySymbol =
    new Intl.NumberFormat(undefined, { style: 'currency', currency: preferences.currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? preferences.currency;

  const handleToggleReflection = () => {
    const willShow = !showReflection;
    setShowReflection(willShow);
    if (willShow) {
      // Scroll to bottom when reflection opens so the button stays visible
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 120);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        scroll={false}
        hasBottomNav={false}
        title={entryMode === 'income' ? 'Add Income' : 'Add Spend'}
        action={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={8}
            style={ui.textAction}
          >
            <AppText variant="bodyMedium" weight="600" color={p.accent}>
              Cancel
            </AppText>
          </Pressable>
        }
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: Math.max(32, insets.bottom + 24),
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
          bounces
          showsVerticalScrollIndicator={false}
        >
          {/* Expense / Income Toggle */}
          <View style={styles.modeToggleContainer}>
            <View style={[styles.modeToggleRow, { backgroundColor: p.backgroundSelected }]}>
              {(['expense', 'income'] as const).map((mode) => {
                const active = entryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setEntryMode(mode);
                      setIsZeroLog(false);
                      setError('');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.modeToggleBtn,
                      {
                        backgroundColor: active ? p.accent : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="captionMedium"
                      color={active ? onAccent : p.text}
                    >
                      {mode === 'expense' ? 'Expense' : 'Income'}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <AppText variant="caption" color={p.textSecondary}>
              Logged on this device · {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </AppText>
          </View>

          {/* Quick Date Selector */}
          <View style={{ flexDirection: 'row', gap: Spacing.eight }}>
            {[
              { id: 0 as const, label: 'Today' },
              { id: 1 as const, label: 'Yesterday' },
              { id: 2 as const, label: '2 Days Ago' },
            ].map((opt) => {
              const active = dateOffset === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setDateOffset(opt.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    ui.chip,
                    styles.dateChip,
                    {
                      backgroundColor: active ? p.accent : p.backgroundSelected,
                    },
                  ]}
                >
                  <AppText variant="captionMedium" color={active ? onAccent : p.text}>
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Zero-Spend Day Log (for streak) */}
          {entryMode === 'expense' ? (
            <Pressable
              onPress={() => {
                setIsZeroLog(!isZeroLog);
                setError('');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isZeroLog }}
              style={[
                styles.zeroLogToggle,
                {
                  backgroundColor: isZeroLog ? p.accentSoft : p.backgroundElement,
                  borderColor: isZeroLog ? p.accent : p.border,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyMedium" weight="600" color={isZeroLog ? p.accent : p.text}>
                  Zero-Spend Day
                </AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  Log a zero-spend day to keep your streak alive without recording an expense.
                </AppText>
              </View>
              <View style={[styles.checkCircle, { borderColor: isZeroLog ? p.accent : p.border, backgroundColor: isZeroLog ? p.accent : 'transparent' }]}>
                {isZeroLog ? <AppText variant="caption" color={onAccent} size={11}>✓</AppText> : null}
              </View>
            </Pressable>
          ) : null}

          {!isZeroLog ? (
            <>
              {/* Amount Card */}
              <Surface style={{ alignItems: 'center', paddingVertical: Spacing.twenty, gap: Spacing.eight }}>
                <AppText variant="eyebrow" color={p.textSecondary}>
                  AMOUNT ({preferences.currency})
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.eight }}>
                  <AppText variant="display" color={p.textSecondary} size={32}>
                    {currencySymbol}
                  </AppText>
                  <TextInput
                    value={amount}
                    onChangeText={(value) => {
                      setAmount(value.replace(/[^0-9.]/g, ''));
                      setError('');
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={p.textSecondary}
                    style={[styles.amountInput, { color: p.text }]}
                    accessibilityLabel={entryMode === 'income' ? 'Income amount' : 'Spend amount'}
                  />
                </View>
              </Surface>

              {/* Title Input */}
              <View style={{ gap: 8 }}>
                <AppText variant="captionMedium">
                  {entryMode === 'income' ? 'Income Source' : 'What Was It For?'}
                </AppText>
                <TextInput
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    setError('');
                  }}
                  placeholder={entryMode === 'income' ? 'Allowance, freelance, scholarship…' : 'Coffee between lectures, textbooks, transit pass…'}
                  placeholderTextColor={p.textSecondary}
                  maxLength={80}
                  returnKeyType="done"
                  style={[
                    ui.input,
                    {
                      color: p.text,
                      borderColor: p.border,
                      backgroundColor: p.backgroundElement,
                    },
                  ]}
                  accessibilityLabel={entryMode === 'income' ? 'Income description' : 'Spend description'}
                />
              </View>

              {/* Category Chips */}
              <View style={{ gap: 8 }}>
                <AppText variant="captionMedium">
                  {entryMode === 'income' ? 'Source Type' : 'Category'}
                </AppText>
                <View style={[styles.categoryRow, entryMode === 'income' && styles.incomeSourceRow]}>
                  {(entryMode === 'income' ? INCOME_SOURCES : CATEGORIES).map((option) => {
                    const active = entryMode === 'income' ? incomeSource === option : category === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          if (entryMode === 'income') setIncomeSource(option as (typeof INCOME_SOURCES)[number]);
                          else setCategory(option as Category);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.categoryChip,
                          entryMode === 'expense' && styles.expenseCategoryChip,
                          entryMode === 'income' && styles.incomeSourceChip,
                          {
                            backgroundColor: active ? p.accentSoft : p.backgroundElement,
                            borderColor: active ? p.accent : p.border,
                          },
                        ]}
                      >
                        {entryMode === 'expense' ? <CategoryMark category={option} size={28} /> : null}
                        <AppText
                          variant="captionMedium"
                          weight={active ? '600' : '500'}
                          color={active ? p.accent : p.text}
                        >
                          {option === 'Part-time work' ? 'Part-Time Work' : option}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Behavioral Reflection (Collapsible) — expense only */}
              {entryMode === 'expense' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showReflection }}
                    accessibilityLabel="Toggle Optional Reflection"
                    onPress={handleToggleReflection}
                    style={styles.reflectionToggle}
                  >
                    <View style={{ gap: 2, flex: 1 }}>
                      <AppText variant="bodyMedium" weight="600">
                        Quick Check (Behavioural)
                      </AppText>
                      <AppText variant="caption" color={p.textSecondary}>
                        Was this purchase planned or spontaneous?
                      </AppText>
                    </View>
                    <AppText variant="title" color={p.accent}>
                      {showReflection ? '−' : '+'}
                    </AppText>
                  </Pressable>

                  {showReflection ? (
                    <Surface style={{ gap: 12 }}>
                      <AppText variant="captionMedium" color={p.textSecondary}>
                        Was This A Planned Expense?
                      </AppText>
                      <View style={styles.reflectionRow}>
                        {reflections.map((item) => {
                          const active = reflection === item;
                          return (
                            <Pressable
                              key={item}
                              onPress={() => setReflection(active ? null : item)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                              style={[
                                styles.reflectionChip,
                                {
                                  backgroundColor: active ? p.accent : p.background,
                                  borderColor: active ? p.accent : p.border,
                                },
                              ]}
                            >
                              <AppText
                                variant="captionMedium"
                                color={active ? onAccent : p.text}
                              >
                                {item === 'Just wanted it' ? 'Just Wanted It' : item}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </View>

                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="A note for future you (optional)"
                        placeholderTextColor={p.textSecondary}
                        maxLength={160}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollRef.current?.scrollToEnd({ animated: true });
                          }, 300);
                        }}
                        style={[
                          ui.input,
                          {
                            minHeight: 48,
                            color: p.text,
                            borderColor: p.border,
                            backgroundColor: p.backgroundElement,
                          },
                        ]}
                        accessibilityLabel="Optional Spend Note"
                      />
                    </Surface>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {error ? (
            <AppText variant="body" color={p.warning}>
              {error}
            </AppText>
          ) : null}

          <ActionButton
            label={
              saving
                ? 'Saving…'
                : isZeroLog
                ? 'Log Zero-Spend Day'
                : entryMode === 'income'
                ? 'Add Income'
                : 'Record Spend'
            }
            onPress={() => {
              void submit();
            }}
            disabled={saving}
          />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  categoryChip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.twelve,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.eight,
  },
  expenseCategoryChip: {
    paddingLeft: Spacing.four,
    paddingRight: Spacing.twelve,
  },
  incomeSourceRow: {
    justifyContent: 'center',
  },
  incomeSourceChip: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  reflectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reflectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  reflectionChip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.twelve,
    justifyContent: 'center',
  },
  dateChip: {
    flex: 1,
    borderRadius: 16,
  },
  modeToggleContainer: {
    alignItems: 'center',
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    gap: Spacing.two,
  },
  modeToggleBtn: {
    paddingHorizontal: Spacing.twenty,
    paddingVertical: Spacing.eight,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroLogToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.sixteen,
    gap: Spacing.twelve,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
