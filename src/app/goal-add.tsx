import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppText, Screen, Surface, usePalette } from '@/components/app-ui';
import { formatMoney, toMinorUnits } from '@/finance.mjs';
import { useFinance } from '@/store';

export default function AddToGoalScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences, goals, addToGoal } = useFinance();
  const goal = goals.find((item) => item.id === Number(id));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!goal) {
    return (
      <Screen title="Goal not found">
        <AppText variant="body" color={p.textSecondary}>
          This savings goal may have been removed.
        </AppText>
        <ActionButton label="Back to goals" onPress={() => router.back()} />
      </Screen>
    );
  }

  const remainingToGoal = Math.max(0, goal.targetMinor - goal.savedMinor);

  const submit = async () => {
    const num = Number(amount.replace(/,/g, ''));
    const minor = toMinorUnits(num, preferences.currency);
    if (!minor) {
      setError('Enter a contribution amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await addToGoal(goal.id, minor);
      router.back();
    } catch {
      setError('Your contribution could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Add to goal"
      action={
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel adding savings"
          hitSlop={8}
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
          Currently saved: {formatMoney(goal.savedMinor, preferences.currency)} of{' '}
          {formatMoney(goal.targetMinor, preferences.currency)}
        </AppText>
      </View>

      <Surface style={{ gap: 12 }}>
        <AppText variant="captionMedium">Amount to add ({preferences.currency})</AppText>
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
          accessibilityLabel="Savings contribution amount"
        />
        <AppText variant="caption" color={p.textSecondary} tabular>
          {remainingToGoal > 0
            ? `${formatMoney(remainingToGoal, preferences.currency)} left to reach your target`
            : 'This goal has already reached its full target.'}
        </AppText>
      </Surface>

      {error ? (
        <AppText variant="body" color={p.warning}>
          {error}
        </AppText>
      ) : null}

      <ActionButton
        label={saving ? 'Updating…' : 'Record contribution'}
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
