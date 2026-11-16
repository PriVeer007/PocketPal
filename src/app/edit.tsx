import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
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
  useAccentForeground,
  usePalette,
} from '@/components/app-ui';
import { currencyDigits, toMinorUnits, validateExpense } from '@/finance.mjs';
import { CATEGORIES, Category, Reflection, useFinance } from '@/store';

const reflections: readonly Reflection[] = ['Planned', 'Spontaneous', 'Needed', 'Just wanted it'] as const;

export default function EditExpenseScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences, expenses, updateExpense } = useFinance();

  const expense = expenses.find((e) => e.id === Number(id));

  const digits = currencyDigits(preferences.currency);
  const initialAmount = expense ? (expense.amountMinor / 10 ** digits).toFixed(digits) : '';

  const [amount, setAmount] = useState(initialAmount);
  const [title, setTitle] = useState(expense?.title ?? '');
  const [category, setCategory] = useState<Category>(expense?.category ?? 'Food');
  const [reflection, setReflection] = useState<Reflection | null>(expense?.reflection ?? null);
  const [note, setNote] = useState(expense?.note ?? '');
  const [showReflection, setShowReflection] = useState(Boolean(expense?.reflection || expense?.note));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!expense) {
    return (
      <Screen title="Spend not found">
        <AppText variant="body" color={p.textSecondary}>
          This expense may have been deleted.
        </AppText>
        <ActionButton label="Back to activity" onPress={() => router.back()} />
      </Screen>
    );
  }

  const submit = async () => {
    const numericAmount = Number(amount.replace(/,/g, ''));
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

    setSaving(true);
    try {
      const minor = toMinorUnits(numericAmount, preferences.currency);
      if (!minor) {
        setError('Enter a valid amount.');
        setSaving(false);
        return;
      }

      await updateExpense({
        id: expense.id,
        amountMinor: minor,
        title: title.trim().slice(0, 80),
        category,
        occurredAt: expense.occurredAt,
        reflection,
        note: note.trim().slice(0, 160) || null,
      });
      router.back();
    } catch {
      setError('Could not update your entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol =
    new Intl.NumberFormat(undefined, { style: 'currency', currency: preferences.currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? preferences.currency;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        scroll={false}
        title="Edit spend"
        action={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel edit"
            hitSlop={8}
          >
            <AppText variant="bodyMedium" weight="600" color={p.accent}>
              Cancel
            </AppText>
          </Pressable>
        }
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 36, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Amount Card */}
          <Surface style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
            <AppText variant="eyebrow" color={p.textSecondary}>
              AMOUNT ({preferences.currency})
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                accessibilityLabel="Spend amount"
              />
            </View>
          </Surface>

          {/* Title Input */}
          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">What was it for?</AppText>
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setError('');
              }}
              placeholder="Description"
              placeholderTextColor={p.textSecondary}
              maxLength={80}
              returnKeyType="done"
              style={[
                styles.textInput,
                {
                  color: p.text,
                  borderColor: p.border,
                  backgroundColor: p.backgroundElement,
                },
              ]}
              accessibilityLabel="Spend description"
            />
          </View>

          {/* Category Chips */}
          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">Category</AppText>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? p.accentSoft : p.backgroundElement,
                        borderColor: active ? p.accent : p.border,
                      },
                    ]}
                  >
                    <CategoryMark category={cat} size={28} />
                    <AppText
                      variant="captionMedium"
                      weight={active ? '600' : '500'}
                      color={active ? p.accent : p.text}
                    >
                      {cat}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Reflection */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showReflection }}
            onPress={() => setShowReflection((curr) => !curr)}
            style={styles.reflectionToggle}
          >
            <View style={{ gap: 2, flex: 1 }}>
              <AppText variant="bodyMedium" weight="600">
                Optional reflection
              </AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Notice what was behind this choice
              </AppText>
            </View>
            <AppText variant="title" color={p.accent}>
              {showReflection ? '−' : '+'}
            </AppText>
          </Pressable>

          {showReflection ? (
            <Surface style={{ gap: 12 }}>
              <AppText variant="caption" color={p.textSecondary}>
                This purchase felt…
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
                        {item}
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
                style={[
                  styles.textInput,
                  {
                    minHeight: 46,
                    color: p.text,
                    borderColor: p.border,
                    backgroundColor: p.backgroundElement,
                  },
                ]}
                accessibilityLabel="Optional spend note"
              />
            </Surface>
          ) : null}

          {error ? (
            <AppText variant="body" color={p.warning}>
              {error}
            </AppText>
          ) : null}

          <ActionButton
            label={saving ? 'Saving changes…' : 'Save changes'}
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
    minWidth: 140,
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  textInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 8,
  },
  reflectionChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
});
