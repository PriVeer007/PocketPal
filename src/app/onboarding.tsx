import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ActionButton, AppText, Surface, ui, useAccentForeground, usePalette } from '@/components/app-ui';
import { Spacing } from '@/constants/theme';
import { ScreenMotion } from '@/components/motion';
import { toMinorUnits } from '@/finance.mjs';
import type { BudgetingMode } from '@/store';
import { useFinance } from '@/store';

const currencies = [
  ['INR', '₹'],
  ['USD', '$'],
  ['EUR', '€'],
  ['GBP', '£'],
  ['CAD', 'C$'],
  ['AUD', 'A$'],
] as const;

const cycleOptions: { day: number | null; label: string }[] = [
  { day: 1, label: '1st' },
  { day: 5, label: '5th' },
  { day: 10, label: '10th' },
  { day: 15, label: '15th' },
  { day: 20, label: '20th' },
  { day: 25, label: '25th' },
  { day: null, label: 'None' },
];

export default function OnboardingScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { savePreferences } = useFinance();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [cycle, setCycle] = useState(1);
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('monthly_cycle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const rawAmount = amount.trim();
    const parsed = rawAmount ? Number(rawAmount.replace(/,/g, '')) : 0;
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (budgetingMode === 'monthly_cycle' && parsed <= 0) {
      setError('Enter a monthly allowance amount greater than zero.');
      return;
    }
    const minor = parsed === 0 ? 0 : toMinorUnits(parsed, currency);
    if (minor === null) {
      setError('Enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      await savePreferences({
        name: name.trim().slice(0, 32),
        currency,
        allowanceMinor: budgetingMode === 'monthly_cycle' ? minor : 0,
        cycleStartDay: cycle,
        budgetingMode,
        noCycleOpeningBalanceMinor: budgetingMode === 'no_cycle' ? minor : 0,
        onboarded: true,
      });
      router.replace('/');
    } catch {
      setError('Your setup could not be saved. Please try again.');
      setSaving(false);
    }
  };

  const activeSymbol = currencies.find(([code]) => code === currency)?.[1] ?? currency;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenMotion style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Mark */}
          <View style={[styles.brandMark, { backgroundColor: p.accent }]}>
            <AppText variant="headline" color={onAccent} size={22}>
              p
            </AppText>
          </View>

          <View style={{ gap: 4 }}>
            <AppText variant="eyebrow" color={p.accent}>
              POCKETPAL · STUDENT FINANCE
            </AppText>
            <AppText variant="display" size={32} style={{ lineHeight: 38 }}>
              Make your money work for student life.
            </AppText>
            <AppText variant="body" color={p.textSecondary}>
              A calm view of everyday expenses, without judgment, cloud tracking, or bank connections.
            </AppText>
          </View>

          {/* Name Input */}
          <View style={{ gap: 8 }}>
            <AppText variant="captionMedium">What Should We Call You?</AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={32}
              placeholder="Your first name (optional)"
              placeholderTextColor={p.textSecondary}
              returnKeyType="next"
              style={[
                ui.input,
                {
                  backgroundColor: p.backgroundElement,
                  color: p.text,
                  borderColor: p.border,
                },
              ]}
              accessibilityLabel="Your First Name"
            />
          </View>

          {/* Allowance Rhythm Surface */}
          <Surface style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="headline">Your Allowance Rhythm</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                {budgetingMode === 'no_cycle'
                  ? "Don't receive money on a fixed schedule? Choose None. Your balance will update whenever you record income or expenses."
                  : 'Enter what you receive for one monthly cycle. You can adjust this anytime in settings.'}
              </AppText>
            </View>

            {/* Currency Selector */}
            <View style={{ gap: 8 }}>
              <AppText variant="caption" color={p.textSecondary}>
                Currency
              </AppText>
              <View style={styles.currencyRow}>
                {currencies.map(([code, symbol]) => {
                  const active = currency === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => setCurrency(code)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: active ? p.accentSoft : p.background,
                          borderColor: active ? p.accent : p.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="captionMedium"
                        color={active ? p.accent : p.text}
                      >
                        {symbol} {code}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AppText variant="caption" color={p.textSecondary}>
              {budgetingMode === 'no_cycle' ? 'Optional Starting Balance' : 'Monthly Allowance'}
            </AppText>

            {/* Amount Input */}
            <View style={[styles.amountRow, { borderBottomColor: p.border }]}>
              <AppText variant="title" color={p.textSecondary} size={26}>
                {activeSymbol}
              </AppText>
              <TextInput
                value={amount}
                onChangeText={(value) => {
                  setAmount(value.replace(/[^0-9.]/g, ''));
                  setError('');
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={p.textSecondary}
                style={[styles.amountInput, { color: p.text }]}
                accessibilityLabel={budgetingMode === 'no_cycle' ? 'Optional Starting Balance' : 'Monthly Allowance Amount'}
              />
            </View>

            {/* Cycle Start Day */}
            <View style={{ gap: 8 }}>
              <AppText variant="caption" color={p.textSecondary}>
                Allowance Rhythm
              </AppText>
              <View style={styles.cycleRow}>
                {cycleOptions.map((option) => {
                  const active =
                    option.day === null
                      ? budgetingMode === 'no_cycle'
                      : budgetingMode === 'monthly_cycle' && cycle === option.day;
                  return (
                    <Pressable
                      key={option.day ?? 'none'}
                      onPress={() => {
                        if (option.day === null) {
                          setBudgetingMode('no_cycle');
                        } else {
                          setCycle(option.day);
                          setBudgetingMode('monthly_cycle');
                        }
                        setError('');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.cycleChip,
                        {
                          backgroundColor: active ? p.accent : p.backgroundSelected,
                        },
                      ]}
                    >
                      <AppText
                        variant="captionMedium"
                        color={active ? onAccent : p.text}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Surface>

          {error ? (
            <AppText variant="body" color={p.warning}>
              {error}
            </AppText>
          ) : null}

          <ActionButton
            label={saving ? 'Setting Up…' : 'Set Up My Space'}
            onPress={() => {
              void submit();
            }}
            disabled={saving}
          />

          <AppText variant="caption" color={p.textSecondary} style={{ textAlign: 'center' }}>
            All records remain exclusively on this device. No login or bank connection required.
          </AppText>
        </ScrollView>
        </ScreenMotion>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: Spacing.twenty,
    paddingTop: Spacing.sixteen,
    paddingBottom: Spacing.thirtyTwo,
    gap: Spacing.twenty,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  currencyChip: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 36,
    paddingHorizontal: Spacing.twelve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.eight,
    paddingBottom: Spacing.eight,
    borderBottomWidth: 1,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    padding: 0,
  },
  cycleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.eight,
  },
  cycleChip: {
    borderRadius: 16,
    minHeight: 40,
    paddingHorizontal: Spacing.sixteen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
