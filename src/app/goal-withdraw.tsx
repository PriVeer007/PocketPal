import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppText, Screen, Surface, ui, usePalette } from '@/components/app-ui';
import { formatMoney, reconcileGoalBalances, toMinorUnits } from '@/finance.mjs';
import { useFinance } from '@/store';

export default function WithdrawFromGoalScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences, goals, goalTransactions, withdrawFromGoal } = useFinance();
  const goal = goals.find((item) => item.id === Number(id));
  const goalBalances = reconcileGoalBalances(goals, goalTransactions);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);

  if (!goal) {
    return (
      <Screen title="Goal Not Found" hasBottomNav={false}>
        <AppText variant="body" color={p.textSecondary}>
          This savings goal may have been removed.
        </AppText>
        <ActionButton label="Back To Goals" onPress={() => router.back()} />
      </Screen>
    );
  }

  const savedMinor = goalBalances[goal.id] ?? goal.savedMinor;

  const submit = async () => {
    const num = Number(amount.replace(/,/g, ''));
    const minor = toMinorUnits(num, preferences.currency);
    if (!minor) {
      setError('Enter a withdrawal amount greater than zero.');
      return;
    }

    if (minor > savedMinor) {
      setError('You cannot withdraw more than the amount already saved for this goal.');
      return;
    }

    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      await withdrawFromGoal(goal.id, minor);
      router.back();
    } catch {
      setError('Your withdrawal could not be recorded. Please try again.');
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen
      hasBottomNav={false}
      title="Withdraw From Goal"
      action={
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel Goal Withdrawal"
          hitSlop={8}
          style={ui.textAction}
        >
          <AppText variant="bodyMedium" color={p.accent} weight="600">
            Cancel
          </AppText>
        </Pressable>
      }
    >
      <View style={{ gap: 4 }}>
        <AppText variant="title" weight="700">
          {goal.name}
        </AppText>
        <AppText variant="caption" color={p.textSecondary} tabular>
          Currently Saved: {formatMoney(savedMinor, preferences.currency)}
        </AppText>
      </View>

      <Surface style={{ gap: 12 }}>
        <AppText variant="captionMedium">Amount To Withdraw ({preferences.currency})</AppText>
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
          accessibilityLabel="Goal Withdrawal Amount"
        />
        <AppText variant="caption" color={p.textSecondary} tabular>
          Available To Withdraw: {formatMoney(savedMinor, preferences.currency)}
        </AppText>
      </Surface>

      {error ? (
        <AppText variant="body" color={p.warning}>
          {error}
        </AppText>
      ) : null}

      <ActionButton
        label={saving ? 'Withdrawing…' : 'Record Withdrawal'}
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
