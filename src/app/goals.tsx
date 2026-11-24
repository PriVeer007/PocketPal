import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import {
  ActionButton,
  AppScaffold,
  AppText,
  EmptyState,
  ProgressBar,
  Screen,
  SectionTitle,
  Surface,
  ui,
  usePalette,
} from '@/components/app-ui';
import { allowanceProgress, formatMoney, reconcileGoalBalances } from '@/finance.mjs';
import { Goal, useFinance } from '@/store';
import { Spacing } from '@/constants/theme';

export default function GoalsScreen() {
  const p = usePalette();
  const { goals, goalTransactions, preferences, removeGoal } = useFinance();
  const goalBalances = reconcileGoalBalances(goals, goalTransactions);

  const totalSaved = goals.reduce((sum, g) => sum + (goalBalances[g.id] ?? g.savedMinor), 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetMinor, 0);
  const completedCount = goals.filter((g) => (goalBalances[g.id] ?? g.savedMinor) >= g.targetMinor).length;

  const confirmDelete = (goal: Goal) => {
    Alert.alert(
      'Remove this goal?',
      `“${goal.name}” will be closed. Any remaining savings will be returned to your available budget, and its history will be kept.`,
      [
        { text: 'Keep goal', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeGoal(goal.id);
          },
        },
      ]
    );
  };

  return (
    <AppScaffold>
      <Screen
        eyebrow="For something that matters to you"
        title="Savings goals"
        action={
          <Pressable
            onPress={() => router.push('/goal-create')}
            accessibilityRole="button"
            accessibilityLabel="Create a new savings goal"
            hitSlop={8}
            style={ui.textAction}
          >
            <AppText variant="bodyMedium" weight="600" color={p.accent}>
              + New goal
            </AppText>
          </Pressable>
        }
      >
        {goals.length ? (
          <>
            {/* Overview Banner */}
            <Surface style={{ padding: Spacing.twenty, backgroundColor: p.accentSoft, borderColor: p.accentSoft, gap: Spacing.eight }}>
              <AppText variant="eyebrow" color={p.accent}>
                SAVINGS PROGRESS
              </AppText>
              <AppText variant="title" weight="700" tabular>
                {formatMoney(totalSaved, preferences.currency)} saved
              </AppText>
              <AppText variant="caption" color={p.textSecondary}>
                across {goals.length} {goals.length === 1 ? 'goal' : 'goals'} · {completedCount} reached
                {totalTarget > 0 ? ` of ${formatMoney(totalTarget, preferences.currency)} total targets` : ''}
              </AppText>
            </Surface>

            <SectionTitle title="Your targets" detail="Small, steady contributions add up" />

            {goals.map((goal) => {
              const savedMinor = goalBalances[goal.id] ?? goal.savedMinor;
              const progress = allowanceProgress(savedMinor, goal.targetMinor);
              const isComplete = savedMinor >= goal.targetMinor;

              return (
                <Surface key={goal.id} style={{ gap: Spacing.twelve }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1, gap: Spacing.two }}>
                      <AppText variant="headline">{goal.name}</AppText>
                      <AppText variant="caption" color={p.textSecondary} tabular>
                        {formatMoney(savedMinor, preferences.currency)} of{' '}
                        {formatMoney(goal.targetMinor, preferences.currency)}
                      </AppText>
                    </View>
                    <AppText
                      variant="headline"
                      color={isComplete ? p.accent : p.text}
                      tabular
                    >
                      {Math.round(progress * 100)}%
                    </AppText>
                  </View>

                  <ProgressBar value={progress} color={isComplete ? p.accent : p.accent} height={8} />

                  <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.eight }]}>
                    <View style={[ui.row, { gap: Spacing.eight, flexWrap: 'wrap', flex: 1 }]}>
                      {isComplete ? (
                        <AppText variant="captionMedium" color={p.accent}>
                          Target reached. Nicely done!
                        </AppText>
                      ) : (
                        <ActionButton
                          label="Add savings"
                          variant="quiet"
                          onPress={() =>
                            router.push({
                              pathname: '/goal-add',
                              params: { id: goal.id.toString() },
                            })
                          }
                        />
                      )}

                      <ActionButton
                        label="Edit"
                        variant="quiet"
                        onPress={() =>
                          router.push({
                            pathname: '/goal-edit',
                            params: { id: goal.id.toString() },
                          })
                        }
                      />

                      {savedMinor > 0 ? (
                        <ActionButton
                          label="Withdraw"
                          variant="quiet"
                          onPress={() =>
                            router.push({
                              pathname: '/goal-withdraw',
                              params: { id: goal.id.toString() },
                            })
                          }
                        />
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() => confirmDelete(goal)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete goal ${goal.name}`}
                      hitSlop={8}
                      style={ui.textAction}
                    >
                      <AppText variant="caption" color={p.textSecondary}>
                        Delete
                      </AppText>
                    </Pressable>
                  </View>
                </Surface>
              );
            })}
          </>
        ) : (
          <EmptyState
            title="Give a future plan a name"
            detail="A trip home, a laptop, a buffer for exam season. Saving can be small, steady, and entirely at your own pace."
            cta="Create your first goal"
            onPress={() => router.push('/goal-create')}
          />
        )}
      </Screen>
    </AppScaffold>
  );
}
