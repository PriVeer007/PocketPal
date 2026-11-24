import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { ActionButton, AppText, Screen, Surface, ui, usePalette } from '@/components/app-ui';
import { generateBackupJSON, validateBackupPayload } from '@/finance.mjs';
import { useFinance } from '@/store';

export default function RestoreBackupScreen() {
  const p = usePalette();
  const { preferences, expenses, incomes, goalRecords, goalTransactions, budgets, zeroSpendDays, restoreBackup } = useFinance();
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState<null | {
    exportedAt: string | null;
    version: number;
    expenseCount: number;
    incomeCount: number;
    goalCount: number;
    goalTransactionCount: number;
    zeroSpendCount: number;
    budgetCount: number;
  }>(null);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);

  const currentSnapshot = useMemo(
    () => generateBackupJSON(preferences, expenses, goalRecords, budgets, zeroSpendDays, incomes, goalTransactions),
    [preferences, expenses, incomes, goalRecords, goalTransactions, budgets, zeroSpendDays]
  );

  const validateAndPreview = () => {
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      const info = validateBackupPayload(parsed);
      setPreview({
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
        version: info.version,
        expenseCount: info.expenseCount,
        incomeCount: info.incomeCount,
        goalCount: info.goalCount,
        goalTransactionCount: info.goalTransactionCount,
        zeroSpendCount: info.zeroSpendCount,
        budgetCount: Object.keys((parsed.budgets as Record<string, unknown>) ?? {}).length,
      });
      setError('');
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'This backup could not be validated.');
    }
  };

  const confirmRestore = () => {
    if (!preview) {
      setError('Validate the backup before restoring it.');
      return;
    }

    Alert.alert(
      'Replace local data?',
      `This will replace your existing local PocketPal data with the imported backup.\n\n` +
        `Created: ${preview.exportedAt ?? 'Unknown'}\n` +
        `Schema: ${preview.version}\n` +
        `Expenses: ${preview.expenseCount}\n` +
        `Incomes: ${preview.incomeCount}\n` +
        `Goals: ${preview.goalCount}\n` +
        `Savings ledger: ${preview.goalTransactionCount}\n` +
        `Budget entries: ${preview.budgetCount}\n` +
        `Zero-spend days: ${preview.zeroSpendCount}\n\n` +
        'A snapshot of the current database is available in memory for a safe rollback attempt if the import fails.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace data',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            setError('');
            try {
              await restoreBackup(jsonText);
              Alert.alert('Restore complete', 'Your backup was validated and applied successfully.');
              router.back();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'The backup could not be restored.');
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      hasBottomNav={false}
      title="Restore backup"
      action={
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel restore"
          hitSlop={8}
          style={ui.textAction}
        >
          <AppText variant="bodyMedium" color={p.accent} weight="600">
            Cancel
          </AppText>
        </Pressable>
      }
    >
      <Surface style={{ gap: 12 }}>
        <AppText variant="body" color={p.textSecondary}>
          Paste a PocketPal JSON backup below. The file is checked before any local records are replaced.
        </AppText>

        <TextInput
          value={jsonText}
          onChangeText={(value) => {
            setJsonText(value);
            setPreview(null);
            setError('');
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder='{"app": "PocketPal", ...}'
          placeholderTextColor={p.textSecondary}
          style={[ui.input, styles.input, { color: p.text, backgroundColor: p.backgroundElement, borderColor: p.border }]}
          accessibilityLabel="PocketPal backup JSON"
        />

        <ActionButton
          label="Validate backup"
          variant="quiet"
          onPress={validateAndPreview}
        />
      </Surface>

      {preview ? (
        <Surface style={{ gap: 8 }}>
          <AppText variant="headline">Backup preview</AppText>
          <AppText variant="caption" color={p.textSecondary}>Created: {preview.exportedAt ?? 'Unknown'}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Schema version: {preview.version}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Expenses: {preview.expenseCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Incomes: {preview.incomeCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Goals: {preview.goalCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Savings ledger entries: {preview.goalTransactionCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Budget entries: {preview.budgetCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Zero-spend days: {preview.zeroSpendCount}</AppText>
          <AppText variant="caption" color={p.textSecondary}>Current snapshot kept in memory: {currentSnapshot.length} chars</AppText>
        </Surface>
      ) : null}

      {error ? (
        <AppText variant="body" color={p.warning}>
          {error}
        </AppText>
      ) : null}

      <ActionButton
        label={restoring ? 'Restoring…' : 'Restore now'}
        onPress={confirmRestore}
        disabled={!preview || restoring}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 220,
    textAlignVertical: 'top',
    fontSize: 13,
  },
});
