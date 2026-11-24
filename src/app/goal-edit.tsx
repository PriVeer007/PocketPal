import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppText, Screen, Surface, ui, usePalette } from '@/components/app-ui';
import { currencyDigits, formatMoney, reconcileGoalBalances, toMinorUnits } from '@/finance.mjs';
import { useFinance } from '@/store';

export default function EditGoalScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences, goals, goalTransactions, updateGoal } = useFinance();
  const goal = goals.find((item) => item.id === Number(id));
  const goalBalances = reconcileGoalBalances(goals, goalTransactions);
  const [name, setName] = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(() =>
    goal ? (goal.targetMinor / 10 ** currencyDigits(preferences.currency)).toString() : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!goal) {
    return (
      <Screen title="Goal not found" hasBottomNav={false}>
        <AppText variant="body" color={p.textSecondary}>
          This savings goal may have been removed.
        </AppText>
        <ActionButton label="Back to goals" onPress={() => router.back()} />
      </Screen>
    );
  }

  const savedMinor = goalBalances[goal.id] ?? goal.savedMinor;

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give your goal a short descriptive name.');
      return;
    }

    const num = Number(amount.replace(/,/g, ''));
    const target = toMinorUnits(num, preferences.currency);
    if (!target) {
      setError('Set a target amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await updateGoal(goal.id, trimmed.slice(0, 50), target);
      router.back();
    } catch {
      setError('Your goal could not be updated. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      hasBottomNav={false}
      title="Edit goal"
      action={
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel goal edit"
          hitSlop={8}
          style={ui.textAction}
        >
          <AppText variant="bodyMedium" color={p.accent} weight="600">
            Cancel
          </AppText>
        </Pressable>
      }
    >
      <View style={{ gap: 8 }}>
        <AppText variant="captionMedium">What are you saving for?</AppText>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError('');
          }}
          placeholder="New laptop, winter trip, security buffer…"
          placeholderTextColor={p.textSecondary}
          maxLength={50}
          style={[
            ui.input,
            {
              color: p.text,
              backgroundColor: p.backgroundElement,
              borderColor: p.border,
            },
          ]}
        />
      </View>

      <Surface style={{ gap: 12 }}>
        <AppText variant="captionMedium">Updated target amount ({preferences.currency})</AppText>
        <TextInput
          value={amount}
          onChangeText={(value) => {
            setAmount(value.replace(/[^0-9.]/g, ''));
            setError('');
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={p.textSecondary}
          style={[styles.amountInput, { color: p.text, borderBottomColor: p.border }]}
          accessibilityLabel="Updated target savings amount"
        />
        <AppText variant="caption" color={p.textSecondary} tabular>
          Current progress: {formatMoney(savedMinor, preferences.currency)} already saved
        </AppText>
      </Surface>

      {error ? (
        <AppText variant="body" color={p.warning}>
          {error}
        </AppText>
      ) : null}

      <ActionButton
        label={saving ? 'Updating…' : 'Save changes'}
        onPress={() => {
          void submit();
        }}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
});
