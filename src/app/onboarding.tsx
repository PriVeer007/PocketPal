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
import { ActionButton, AppText, Surface, useAccentForeground, usePalette } from '@/components/app-ui';
import { ScreenMotion } from '@/components/motion';
import { toMinorUnits } from '@/finance.mjs';
import { useFinance } from '@/store';

const currencies = [
  ['INR', '₹'],
  ['USD', '$'],
  ['EUR', '€'],
  ['GBP', '£'],
  ['CAD', 'C$'],
  ['AUD', 'A$'],
] as const;

export default function OnboardingScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { savePreferences } = useFinance();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [cycle, setCycle] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsed = Number(amount.replace(/,/g, ''));
    const minor = toMinorUnits(parsed, currency);
    if (!minor) {
      setError('Enter a monthly allowance amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await savePreferences({
        name: name.trim().slice(0, 32),
        currency,
        allowanceMinor: minor,
        cycleStartDay: cycle,
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
            <AppText variant="captionMedium">What should we call you?</AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={32}
              placeholder="Your first name (optional)"
              placeholderTextColor={p.textSecondary}
              returnKeyType="next"
              style={[
                styles.textInput,
                {
                  backgroundColor: p.backgroundElement,
                  color: p.text,
                  borderColor: p.border,
                },
              ]}
              accessibilityLabel="Your first name"
            />
          </View>

          {/* Allowance Rhythm Surface */}
          <Surface style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="headline">Your allowance rhythm</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Enter what you receive for one monthly cycle. You can adjust this anytime in settings.
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
                accessibilityLabel="Monthly allowance amount"
              />
            </View>

            {/* Cycle Start Day */}
            <View style={{ gap: 8 }}>
              <AppText variant="caption" color={p.textSecondary}>
                Cycle reset day of the month
              </AppText>
              <View style={styles.cycleRow}>
                {[1, 5, 10, 15, 20, 25].map((day) => {
                  const active = cycle === day;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setCycle(day)}
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
                        {day}
                        {day === 1 ? 'st' : 'th'}
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
            label={saving ? 'Setting up…' : 'Set up my space'}
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
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 18,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
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
    gap: 8,
  },
  cycleChip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
