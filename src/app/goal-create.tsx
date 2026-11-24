import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppText, Screen, Surface, ui, usePalette } from '@/components/app-ui';
import { toMinorUnits } from '@/finance.mjs';
import { useFinance } from '@/store';

export default function CreateGoalScreen() {
  const p = usePalette();
  const { preferences, saveGoal } = useFinance();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      await saveGoal(trimmed.slice(0, 50), target);
      router.back();
    } catch {
      setError('Your goal could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      hasBottomNav={false}
      title="New savings goal"
      action={
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel goal creation"
          hitSlop={8}
          style={ui.textAction}
        >
          <AppText variant="bodyMedium" color={p.accent} weight="600">
            Cancel
          </AppText>
        </Pressable>
      }
    >
      <AppText variant="body" color={p.textSecondary}>
        A clear name makes a future milestone easier to keep in mind without stress.
      </AppText>

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
        <AppText variant="captionMedium">Target amount ({preferences.currency})</AppText>
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
          accessibilityLabel="Target savings amount"
        />
        <AppText variant="caption" color={p.textSecondary}>
          There is no deadline or required schedule. You contribute whenever you have room.
        </AppText>
      </Surface>

      {error ? (
        <AppText variant="body" color={p.warning}>
          {error}
        </AppText>
      ) : null}

      <ActionButton
        label={saving ? 'Saving…' : 'Create goal'}
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
