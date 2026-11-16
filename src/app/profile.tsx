import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import {
  ActionButton,
  AppScaffold,
  AppText,
  Screen,
  SectionTitle,
  Surface,
  ui,
  useAccentForeground,
  usePalette,
} from '@/components/app-ui';
import {
  currencyDigits,
  generateBackupJSON,
  generateExpensesCSV,
  toMinorUnits,
} from '@/finance.mjs';
import { CATEGORIES, Category, useFinance } from '@/store';

function formatMinorToInput(minor: number, currency: string) {
  const digits = currencyDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}

export default function ProfileScreen() {
  const p = usePalette();
  const onAccent = useAccentForeground();
  const { preferences, expenses, goals, budgets, savePreferences, saveBudget, resetAllData } = useFinance();

  const [name, setName] = useState(preferences.name);
  const [allowance, setAllowance] = useState(formatMinorToInput(preferences.allowanceMinor, preferences.currency));
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CATEGORIES.map((cat) => [cat, formatMinorToInput(budgets[cat] ?? 0, preferences.currency)])
    )
  );
  const [pendingPacingMode, setPendingPacingMode] = useState(preferences.pacingMode);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const exportCSV = async () => {
    try {
      const csv = generateExpensesCSV(expenses, preferences.currency);
      await Share.share({
        title: 'Pennywise Expenses Export',
        message: csv,
      });
      setNotice('Expense CSV ready to share.');
    } catch {
      setError('Could not export your spending CSV.');
    }
  };

  const exportJSON = async () => {
    try {
      const backup = generateBackupJSON(preferences, expenses, goals, budgets);
      await Share.share({
        title: 'Pennywise SQLite Backup',
        message: backup,
      });
      setNotice('Database backup ready to save.');
    } catch {
      setError('Could not generate backup file.');
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset all data?',
      'All local SQLite records (expenses, goals, and budgets) will be permanently cleared from this device.',
      [
        { text: 'Keep my data', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: () => {
            void resetAllData();
          },
        },
      ]
    );
  };

  const saveAllowance = async () => {
    const num = Number(allowance.replace(/,/g, ''));
    const minor = toMinorUnits(num, preferences.currency);
    if (!minor) {
      setError('Enter an allowance amount greater than zero.');
      return;
    }
    try {
      await savePreferences({ allowanceMinor: minor });
      setError('');
      setNotice('Monthly allowance updated.');
    } catch {
      setError('Could not update your allowance.');
    }
  };

  const saveName = async () => {
    if (name.trim().length > 32) {
      setError('Keep your name under 32 characters.');
      return;
    }
    try {
      await savePreferences({ name: name.trim() });
      setError('');
      setNotice('Profile name updated.');
    } catch {
      setError('Could not update your profile name.');
    }
  };

  const saveCategoryBudget = async (category: Category) => {
    const parsed = Number((budgetDrafts[category] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid category amount (0 to remove).');
      return;
    }
    try {
      const minor = toMinorUnits(parsed, preferences.currency) ?? 0;
      await saveBudget(category, minor);
      setError('');
      setNotice(`${category} budget updated.`);
    } catch {
      setError('Could not update category budget.');
    }
  };

  const changeCycleDay = async (day: number) => {
    try {
      await savePreferences({ cycleStartDay: day });
      setError('');
      setNotice(`Allowance cycle now starts on day ${day}.`);
    } catch {
      setError('Could not update cycle start day.');
    }
  };

  const changeAppearance = async (mode: 'system' | 'light' | 'dark') => {
    try {
      await savePreferences({ themeMode: mode });
      setError('');
      setNotice('Appearance updated.');
    } catch {
      setError('Could not update appearance.');
    }
  };

  const changePacingMode = async (mode: 'adaptive' | 'fixed') => {
    try {
      await savePreferences({ pacingMode: mode });
      setError('');
      setNotice(`Pacing set to ${mode === 'adaptive' ? 'Adaptive' : 'Fixed'}.`);
    } catch {
      setError('Could not update daily pacing mode.');
    }
  };

  return (
    <AppScaffold>
      <Screen eyebrow="Your setup" title="Profile & settings">
        {/* Profile Card */}
        <Surface style={{ padding: 18 }}>
          <View style={[ui.row, { gap: 14 }]}>
            <View
              style={[
                styles.avatarLarge,
                {
                  backgroundColor: p.accentSoft,
                  borderColor: p.border,
                },
              ]}
            >
              <AppText variant="headline" color={p.accent}>
                {(name ? name.slice(0, 1) : 'P').toUpperCase()}
              </AppText>
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="eyebrow" color={p.textSecondary}>
                STUDENT PROFILE
              </AppText>
              <View style={[ui.row, { gap: 8 }]}>
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setNotice('');
                  }}
                  maxLength={32}
                  placeholder="First name (optional)"
                  placeholderTextColor={p.textSecondary}
                  style={[styles.nameInput, { color: p.text, borderBottomColor: p.border }]}
                />
                <Pressable
                  onPress={() => {
                    void saveName();
                  }}
                  hitSlop={8}
                >
                  <AppText variant="captionMedium" color={p.accent}>
                    Save
                  </AppText>
                </Pressable>
              </View>
              <AppText variant="caption" color={p.textSecondary}>
                Local SQLite · Currency: {preferences.currency}
              </AppText>
            </View>
          </View>
        </Surface>

        {/* Feedback message */}
        {notice || error ? (
          <Surface
            style={{
              padding: 12,
              backgroundColor: error ? (p.warning + '22') : p.accentSoft,
              borderColor: error ? p.warning : p.accent,
            }}
          >
            <AppText variant="captionMedium" color={error ? p.warning : p.accent}>
              {error || notice}
            </AppText>
          </Surface>
        ) : null}

        {/* Allowance & Cycle */}
        <View style={{ gap: 12 }}>
          <SectionTitle title="Allowance cycle" detail="The amount you plan your everyday spending around" />
          <Surface style={{ gap: 12 }}>
            <AppText variant="eyebrow" color={p.textSecondary}>
              MONTHLY ALLOWANCE ({preferences.currency})
            </AppText>
            <View style={[ui.row, { gap: 10 }]}>
              <TextInput
                value={allowance}
                onChangeText={(v) => {
                  setAllowance(v.replace(/[^0-9.]/g, ''));
                  setNotice('');
                }}
                keyboardType="decimal-pad"
                style={[
                  styles.allowanceInput,
                  {
                    color: p.text,
                    backgroundColor: p.background,
                    borderColor: p.border,
                  },
                ]}
                accessibilityLabel="Monthly allowance"
              />
              <ActionButton
                label="Update"
                onPress={() => {
                  void saveAllowance();
                }}
              />
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              <AppText variant="caption" color={p.textSecondary}>
                Cycle reset day of each month
              </AppText>
              <View style={styles.cycleChips}>
                {[1, 5, 10, 15, 20, 25].map((day) => {
                  const active = preferences.cycleStartDay === day;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => {
                        void changeCycleDay(day);
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
                        {day}
                        {day === 1 ? 'st' : 'th'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Surface>
        </View>

        {/* Category Budgets */}
        <View style={{ gap: 12 }}>
          <SectionTitle
            title="Category budgets"
            detail="Optional guardrails for categories that matter to you"
          />
          <Surface style={{ gap: 16 }}>
            {CATEGORIES.map((cat) => (
              <View key={cat} style={{ gap: 6 }}>
                <AppText variant="bodyMedium" weight="600">
                  {cat}
                </AppText>
                <View style={[ui.row, { gap: 10 }]}>
                  <TextInput
                    value={budgetDrafts[cat] ?? '0'}
                    onChangeText={(v) =>
                      setBudgetDrafts((old) => ({
                        ...old,
                        [cat]: v.replace(/[^0-9.]/g, ''),
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={p.textSecondary}
                    style={[
                      styles.categoryBudgetInput,
                      {
                        color: p.text,
                        backgroundColor: p.background,
                        borderColor: p.border,
                      },
                    ]}
                    accessibilityLabel={`${cat} budget`}
                  />
                  <ActionButton
                    label={budgets[cat] ? 'Update' : 'Set limit'}
                    variant="quiet"
                    onPress={() => {
                      void saveCategoryBudget(cat);
                    }}
                  />
                </View>
              </View>
            ))}
          </Surface>
        </View>

        {/* Appearance Mode */}
        <View style={{ gap: 12 }}>
          <SectionTitle title="Appearance" detail="Follows system appearance by default" />
          <Surface style={styles.appearanceRow}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const active = preferences.themeMode === mode;
              const label = mode === 'system' ? 'Device' : mode[0].toUpperCase() + mode.slice(1);
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    void changeAppearance(mode);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.appearanceOption,
                    {
                      backgroundColor: active ? p.accent : 'transparent',
                    },
                  ]}
                >
                  <AppText
                    variant="captionMedium"
                    color={active ? onAccent : p.text}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </Surface>
        </View>

        {/* Daily Budget Pacing Mode */}
        <View style={{ gap: 12 }}>
          <SectionTitle
            title="Daily budget pacing"
            detail="Choose how unspent daily allowance is handled"
          />
          <Surface style={{ gap: 12 }}>
            <View style={styles.appearanceRow}>
              {(
                [
                  { id: 'adaptive' as const, label: 'Adaptive' },
                  { id: 'fixed' as const, label: 'Fixed' },
                ] as const
              ).map((opt) => {
                const active = pendingPacingMode === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setPendingPacingMode(opt.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.appearanceOption,
                      {
                        backgroundColor: active ? p.accent : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="captionMedium"
                      color={active ? onAccent : p.text}
                    >
                      {opt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Surface style={{ padding: 14, gap: 6, backgroundColor: p.accentSoft, borderColor: p.accentSoft }}>
              <AppText variant="captionMedium" color={p.accent}>
                {pendingPacingMode === 'adaptive' ? 'HOW ADAPTIVE WORKS' : 'HOW FIXED WORKS'}
              </AppText>
              <AppText variant="body" color={p.text}>
                {pendingPacingMode === 'adaptive'
                  ? "Didn't spend today? That money rolls over to tomorrow. Your daily budget grows when you save on zero-spend days."
                  : 'Your allowance is split equally across every day. The daily target stays the same regardless of how much you spend or save.'}
              </AppText>
              <AppText variant="caption" color={p.textSecondary}>
                {pendingPacingMode === 'adaptive'
                  ? 'Example: \u20B96,000 for 30 days = \u20B9200/day. Skip a day \u2192 tomorrow becomes \u20B9207.'
                  : 'Example: \u20B96,000 for 30 days = \u20B9200/day, every day, no matter what.'}
              </AppText>
            </Surface>

            {pendingPacingMode !== preferences.pacingMode ? (
              <ActionButton
                label="Apply"
                onPress={() => {
                  void changePacingMode(pendingPacingMode);
                }}
              />
            ) : null}
          </Surface>
        </View>

        {/* Currency Protection Info */}
        <Surface style={{ padding: 16, gap: 4 }}>
          <AppText variant="headline">Currency &amp; records</AppText>
          <AppText variant="body" color={p.textSecondary}>
            Active currency: {preferences.currency}. Currency is locked once configured to prevent historical transaction records from being silently reinterpreted with different exchange units.
          </AppText>
        </Surface>

        {/* About Section */}
        <View style={{ gap: 12 }}>
          <SectionTitle title="About Pennywise" detail="Created for mindful student finance" />
          <Surface style={{ padding: 18, gap: 12 }}>
            <View style={[ui.row, { gap: 10 }]}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: p.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="headline" color={onAccent} size={18}>
                  p
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headline">Pennywise</AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  Version 1.0.0 · Offline Edition
                </AppText>
              </View>
            </View>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />

            <View style={{ gap: 4 }}>
              <AppText variant="eyebrow" color={p.accent}>
                DEVELOPMENT TEAM
              </AppText>
              <AppText variant="title" weight="700">
                Built by Team DTI Players
              </AppText>
              <AppText variant="body" color={p.textSecondary}>
                Engineered with dedication to help college students navigate allowance cycles, build savings habits, and make everyday spending visible without judgment or cloud tracking.
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {['100% Offline SQLite', 'Zero Cloud Telemetry', 'No Bank Credentials', 'Open Architecture'].map((badge) => (
                <View
                  key={badge}
                  style={{
                    backgroundColor: p.accentSoft,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <AppText variant="captionMedium" color={p.accent} size={11}>
                    {badge}
                  </AppText>
                </View>
              ))}
            </View>
          </Surface>
        </View>

        {/* Data Portability & Backup */}
        <View style={{ gap: 12 }}>
          <SectionTitle
            title="Data & offline backup"
            detail="Export your records anytime or create portable backups"
          />
          <Surface style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="headline">Export spreadsheet (CSV)</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Open your spending history in Excel, Google Sheets, or Numbers.
              </AppText>
            </View>
            <ActionButton
              label="Share expenses as CSV"
              variant="quiet"
              onPress={() => {
                void exportCSV();
              }}
            />

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginVertical: 4 }} />

            <View style={{ gap: 4 }}>
              <AppText variant="headline">Full database backup (JSON)</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Save an offline snapshot of your preferences, spends, and goals.
              </AppText>
            </View>
            <ActionButton
              label="Export database backup"
              variant="quiet"
              onPress={() => {
                void exportJSON();
              }}
            />

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginVertical: 4 }} />

            <View style={{ gap: 4 }}>
              <AppText variant="headline">Reset all records</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Clear all SQLite data and start fresh for a new semester.
              </AppText>
            </View>
            <ActionButton label="Reset all data" variant="danger" onPress={handleResetAllData} />
          </Surface>
        </View>

        {/* Privacy & Storage Transparency */}
        <Surface style={{ padding: 16, gap: 4 }}>
          <AppText variant="headline">Private by design</AppText>
          <AppText variant="body" color={p.textSecondary}>
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} and {goals.length}{' '}
            {goals.length === 1 ? 'goal are' : 'goals are'} stored in SQLite directly on this device. Pennywise does not connect to banks, cloud services, or external trackers.
          </AppText>
        </Surface>
      </Screen>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  allowanceInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  cycleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cycleChip: {
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  categoryBudgetInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  appearanceOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
