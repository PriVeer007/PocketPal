import { router, useLocalSearchParams } from 'expo-router';
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
  Screen,
  Surface,
  ui,
  usePalette,
} from '@/components/app-ui';
import { currencyDigits, toMinorUnits } from '@/finance.mjs';
import { Income, useFinance } from '@/store';
import { Spacing } from '@/constants/theme';

const INCOME_SOURCES = ['Allowance', 'Scholarship', 'Part-time work', 'Freelance', 'Other'] as const;

function dateInputValue(occurredAt: string) {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateIncomeDate(dateValue: string, previousValue: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const previousDate = new Date(previousValue);
  if (Number.isNaN(previousDate.getTime())) return null;

  const updatedDate = new Date(previousDate);
  updatedDate.setFullYear(year, month - 1, day);
  if (
    updatedDate.getFullYear() !== year ||
    updatedDate.getMonth() !== month - 1 ||
    updatedDate.getDate() !== day
  ) {
    return null;
  }
  return updatedDate.toISOString();
}

export default function EditIncomeScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, incomes } = useFinance();
  const income = incomes.find((entry) => entry.id === Number(id));
  if (!ready) {
    return (
      <Screen title="Edit Income" hasBottomNav={false}>
        <AppText variant="body" color={p.textSecondary}>Loading income…</AppText>
      </Screen>
    );
  }
  if (!income) {
    return (
      <Screen title="Income Not Found" hasBottomNav={false}>
        <AppText variant="body" color={p.textSecondary}>
          This income may have already been deleted.
        </AppText>
        <ActionButton label="Back To Activity" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <IncomeEditForm key={income.id} income={income} />;
}

function IncomeEditForm({ income }: { income: Income }) {
  const p = usePalette();
  const { preferences, updateIncome } = useFinance();
  const submitLock = useRef(false);
  const digits = currencyDigits(preferences.currency);
  const [amount, setAmount] = useState((income.amountMinor / 10 ** digits).toFixed(digits));
  const [title, setTitle] = useState(income.title);
  const [source, setSource] = useState(income.source);
  const [occurredDate, setOccurredDate] = useState(dateInputValue(income.occurredAt));
  const [note, setNote] = useState(income.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (submitLock.current) return;
    const numericAmount = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an income amount greater than zero.');
      return;
    }
    if (!source.trim()) {
      setError('Choose an income source.');
      return;
    }
    const occurredAt = updateIncomeDate(occurredDate, income.occurredAt);
    if (!occurredAt) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    const amountMinor = toMinorUnits(numericAmount, preferences.currency);
    if (!amountMinor) {
      setError('Enter a valid income amount.');
      return;
    }

    submitLock.current = true;
    setSaving(true);
    try {
      await updateIncome({
        ...income,
        amountMinor,
        title: title.trim().slice(0, 80),
        source: source.trim().slice(0, 80),
        occurredAt,
        note: note.trim().slice(0, 160) || null,
      });
      router.back();
    } catch {
      setError('Could not update this income. It may have already been removed.');
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const currencySymbol =
    new Intl.NumberFormat(undefined, { style: 'currency', currency: preferences.currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? preferences.currency;

  const sourceOptions = [...new Set([...INCOME_SOURCES, source])];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        scroll={false}
        hasBottomNav={false}
        title="Edit Income"
        action={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel Edit"
            hitSlop={8}
            style={ui.textAction}
          >
            <AppText variant="bodyMedium" weight="600" color={p.accent}>Cancel</AppText>
          </Pressable>
        }
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Surface style={{ alignItems: 'center', paddingVertical: Spacing.twenty, gap: Spacing.eight }}>
            <AppText variant="eyebrow" color={p.textSecondary}>
              AMOUNT ({preferences.currency})
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.eight }}>
              <AppText variant="display" color={p.textSecondary} size={32}>{currencySymbol}</AppText>
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
                accessibilityLabel="Income Amount"
              />
            </View>
          </Surface>

          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">Description</AppText>
            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setError('');
              }}
              placeholder="Income description"
              placeholderTextColor={p.textSecondary}
              maxLength={80}
              returnKeyType="done"
              style={[ui.input, { color: p.text, borderColor: p.border, backgroundColor: p.backgroundElement }]}
              accessibilityLabel="Income Description"
            />
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">Source Type</AppText>
            <View style={styles.chipRow}>
              {sourceOptions.map((option) => {
                const active = source === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setSource(option);
                      setError('');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.sourceChip,
                      {
                        backgroundColor: active ? p.accentSoft : p.backgroundElement,
                        borderColor: active ? p.accent : p.border,
                      },
                    ]}
                  >
                    <AppText variant="captionMedium" color={active ? p.accent : p.text}>
                      {option === 'Part-time work' ? 'Part-Time Work' : option}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">Date</AppText>
            <TextInput
              value={occurredDate}
              onChangeText={(value) => {
                setOccurredDate(value);
                setError('');
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={p.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={[ui.input, { color: p.text, borderColor: p.border, backgroundColor: p.backgroundElement }]}
              accessibilityLabel="Income Date"
            />
            <AppText variant="caption" color={p.textSecondary}>Use YYYY-MM-DD</AppText>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">Note (Optional)</AppText>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note"
              placeholderTextColor={p.textSecondary}
              maxLength={160}
              multiline
              style={[
                ui.input,
                {
                  minHeight: 48,
                  color: p.text,
                  borderColor: p.border,
                  backgroundColor: p.backgroundElement,
                  textAlignVertical: 'top',
                },
              ]}
              accessibilityLabel="Income Note"
            />
          </View>

          {error ? <AppText variant="body" color={p.warning}>{error}</AppText> : null}
          <ActionButton
            label={saving ? 'Saving Changes…' : 'Save Changes'}
            onPress={() => void submit()}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  sourceChip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.twelve,
    justifyContent: 'center',
  },
});
