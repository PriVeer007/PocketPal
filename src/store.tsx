import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

export type Category = 'Food' | 'Transport' | 'Study' | 'Social' | 'Shopping' | 'Other';
export type Reflection = 'Planned' | 'Spontaneous' | 'Needed' | 'Just wanted it';
export type Expense = {
  id: number;
  amountMinor: number;
  title: string;
  category: Category;
  occurredAt: string;
  reflection: Reflection | null;
  note: string | null;
};
export type Income = {
  id: number;
  amountMinor: number;
  title: string;
  source: string;
  occurredAt: string;
  note: string | null;
};
export type Goal = {
  id: number;
  name: string;
  targetMinor: number;
  savedMinor: number;
  createdAt: string;
};
export type PacingMode = 'adaptive' | 'fixed';
export type Preferences = {
  name: string;
  currency: string;
  allowanceMinor: number;
  cycleStartDay: number;
  themeMode: 'system' | 'light' | 'dark';
  pacingMode: PacingMode;
  onboarded: boolean;
};

export const CATEGORIES: readonly Category[] = ['Food', 'Transport', 'Study', 'Social', 'Shopping', 'Other'] as const;

const DEFAULT_PREFERENCES: Preferences = {
  name: '',
  currency: 'INR',
  allowanceMinor: 0,
  cycleStartDay: 1,
  themeMode: 'system',
  pacingMode: 'adaptive',
  onboarded: false,
};

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(
    'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);'
  );
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((result?.user_version ?? 0) < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS preferences (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          name TEXT NOT NULL DEFAULT '',
          currency TEXT NOT NULL DEFAULT 'INR',
          allowance_minor INTEGER NOT NULL DEFAULT 0 CHECK (allowance_minor >= 0),
          cycle_start_day INTEGER NOT NULL DEFAULT 1 CHECK (cycle_start_day BETWEEN 1 AND 28),
          theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('system','light','dark')),
          pacing_mode TEXT NOT NULL DEFAULT 'adaptive' CHECK (pacing_mode IN ('adaptive','fixed')),
          onboarded INTEGER NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO preferences (id) VALUES (1);

        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          reflection TEXT,
          note TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS expenses_occurred_idx ON expenses(occurred_at);

        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          target_minor INTEGER NOT NULL CHECK (target_minor > 0),
          saved_minor INTEGER NOT NULL DEFAULT 0 CHECK (saved_minor >= 0),
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS category_budgets (
          category TEXT PRIMARY KEY NOT NULL,
          amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0)
        );

        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
        PRAGMA user_version = 1;
      `);
    });
  }

  const v2Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v2Result?.user_version ?? 0) < 2) {
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync("ALTER TABLE preferences ADD COLUMN pacing_mode TEXT NOT NULL DEFAULT 'adaptive'");
      } catch {
        // column may already be created in new db
      }
      await db.execAsync("INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (2, datetime('now')); PRAGMA user_version = 2;");
    });
  }

  const v3Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v3Result?.user_version ?? 0) < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS incomes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          title TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'Other',
          occurred_at TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS incomes_occurred_idx ON incomes(occurred_at);
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (3, datetime('now'));
        PRAGMA user_version = 3;
      `);
    });
  }
}

export type ExpenseInput = Omit<Expense, 'id'>;
export type IncomeInput = Omit<Income, 'id'>;

type Store = {
  ready: boolean;
  error: string | null;
  retry: () => Promise<void>;
  preferences: Preferences;
  expenses: Expense[];
  incomes: Income[];
  goals: Goal[];
  budgets: Record<string, number>;
  savePreferences: (p: Partial<Preferences>) => Promise<void>;
  addExpense: (e: ExpenseInput) => Promise<void>;
  updateExpense: (e: Expense) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
  addIncome: (e: IncomeInput) => Promise<void>;
  removeIncome: (id: number) => Promise<void>;
  saveGoal: (name: string, targetMinor: number) => Promise<void>;
  updateGoal: (id: number, name: string, targetMinor: number) => Promise<void>;
  addToGoal: (id: number, amountMinor: number) => Promise<void>;
  removeGoal: (id: number) => Promise<void>;
  saveBudget: (category: string, amountMinor: number) => Promise<void>;
  resetAllData: () => Promise<void>;
  restoreBackup: (jsonString: string) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="pennywise.db" onInit={migrateDatabase} useSuspense>
      <FinanceProvider>{children}</FinanceProvider>
    </SQLiteProvider>
  );
}

function FinanceProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      const [pref, rows, incomeRows, goalRows, budgetRows] = await Promise.all([
        db.getFirstAsync<{
          name: string;
          currency: string;
          allowance_minor: number;
          cycle_start_day: number;
          theme_mode: 'system' | 'light' | 'dark';
          pacing_mode?: 'adaptive' | 'fixed';
          onboarded: number;
        }>('SELECT * FROM preferences WHERE id = 1'),
        db.getAllAsync<{
          id: number;
          amount_minor: number;
          title: string;
          category: Category;
          occurred_at: string;
          reflection: Reflection | null;
          note: string | null;
        }>('SELECT id, amount_minor, title, category, occurred_at, reflection, note FROM expenses ORDER BY occurred_at DESC, id DESC'),
        db.getAllAsync<{
          id: number;
          amount_minor: number;
          title: string;
          source: string;
          occurred_at: string;
          note: string | null;
        }>('SELECT id, amount_minor, title, source, occurred_at, note FROM incomes ORDER BY occurred_at DESC, id DESC'),
        db.getAllAsync<{
          id: number;
          name: string;
          target_minor: number;
          saved_minor: number;
          created_at: string;
        }>('SELECT id, name, target_minor, saved_minor, created_at FROM goals ORDER BY created_at DESC, id DESC'),
        db.getAllAsync<{ category: string; amount_minor: number }>('SELECT category, amount_minor FROM category_budgets'),
      ]);

      if (pref) {
        setPreferences({
          name: pref.name,
          currency: pref.currency,
          allowanceMinor: pref.allowance_minor,
          cycleStartDay: Math.min(28, Math.max(1, pref.cycle_start_day)),
          themeMode: pref.theme_mode,
          pacingMode: pref.pacing_mode === 'fixed' ? 'fixed' : 'adaptive',
          onboarded: Boolean(pref.onboarded),
        });
      }
      setExpenses(
        rows.map((r) => ({
          id: r.id,
          amountMinor: r.amount_minor,
          title: r.title,
          category: r.category,
          occurredAt: r.occurred_at,
          reflection: r.reflection,
          note: r.note,
        }))
      );
      setIncomes(
        incomeRows.map((r) => ({
          id: r.id,
          amountMinor: r.amount_minor,
          title: r.title,
          source: r.source,
          occurredAt: r.occurred_at,
          note: r.note,
        }))
      );
      setGoals(
        goalRows.map((r) => ({
          id: r.id,
          name: r.name,
          targetMinor: r.target_minor,
          savedMinor: r.saved_minor,
          createdAt: r.created_at,
        }))
      );
      setBudgets(Object.fromEntries(budgetRows.map((r) => [r.category, r.amount_minor])));
      setError(null);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saved data could not be loaded.');
      setReady(true);
    }
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating persisted database on mount
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : 'Database error');
      setReady(true);
    });
  }, [refresh]);

  const savePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const next = {
        ...preferences,
        ...patch,
        cycleStartDay: patch.cycleStartDay !== undefined ? Math.min(28, Math.max(1, patch.cycleStartDay)) : preferences.cycleStartDay,
      };
      await db.runAsync(
        'UPDATE preferences SET name=?, currency=?, allowance_minor=?, cycle_start_day=?, theme_mode=?, pacing_mode=?, onboarded=? WHERE id=1',
        next.name,
        next.currency,
        next.allowanceMinor,
        next.cycleStartDay,
        next.themeMode,
        next.pacingMode,
        Number(next.onboarded)
      );
      setPreferences(next);
    },
    [db, preferences]
  );

  const addExpense = useCallback(
    async (e: ExpenseInput) => {
      const createdAt = new Date().toISOString();
      const result = await db.runAsync(
        'INSERT INTO expenses (amount_minor, title, category, occurred_at, reflection, note, created_at) VALUES (?,?,?,?,?,?,?)',
        e.amountMinor,
        e.title.trim(),
        e.category,
        e.occurredAt,
        e.reflection,
        e.note,
        createdAt
      );
      setExpenses((current) =>
        [{ ...e, id: result.lastInsertRowId }, ...current].sort(
          (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id
        )
      );
    },
    [db]
  );

  const updateExpense = useCallback(
    async (e: Expense) => {
      await db.runAsync(
        'UPDATE expenses SET amount_minor=?, title=?, category=?, occurred_at=?, reflection=?, note=? WHERE id=?',
        e.amountMinor,
        e.title.trim(),
        e.category,
        e.occurredAt,
        e.reflection,
        e.note,
        e.id
      );
      setExpenses((current) =>
        current
          .map((item) => (item.id === e.id ? { ...e, title: e.title.trim() } : item))
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)
      );
    },
    [db]
  );

  const removeExpense = useCallback(
    async (id: number) => {
      await db.runAsync('DELETE FROM expenses WHERE id=?', id);
      setExpenses((current) => current.filter((expense) => expense.id !== id));
    },
    [db]
  );

  const addIncome = useCallback(
    async (e: IncomeInput) => {
      const createdAt = new Date().toISOString();
      const result = await db.runAsync(
        'INSERT INTO incomes (amount_minor, title, source, occurred_at, note, created_at) VALUES (?,?,?,?,?,?)',
        e.amountMinor,
        e.title.trim(),
        e.source,
        e.occurredAt,
        e.note,
        createdAt
      );
      setIncomes((current) =>
        [{ ...e, id: result.lastInsertRowId }, ...current].sort(
          (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id
        )
      );
    },
    [db]
  );

  const removeIncome = useCallback(
    async (id: number) => {
      await db.runAsync('DELETE FROM incomes WHERE id=?', id);
      setIncomes((current) => current.filter((income) => income.id !== id));
    },
    [db]
  );

  const saveGoal = useCallback(
    async (name: string, targetMinor: number) => {
      const createdAt = new Date().toISOString();
      const result = await db.runAsync(
        'INSERT INTO goals (name, target_minor, saved_minor, created_at) VALUES (?,?,?,?)',
        name.trim(),
        targetMinor,
        0,
        createdAt
      );
      setGoals((current) => [
        { id: result.lastInsertRowId, name: name.trim(), targetMinor, savedMinor: 0, createdAt },
        ...current,
      ]);
    },
    [db]
  );

  const updateGoal = useCallback(
    async (id: number, name: string, targetMinor: number) => {
      await db.runAsync('UPDATE goals SET name=?, target_minor=? WHERE id=?', name.trim(), targetMinor, id);
      setGoals((current) =>
        current.map((g) => (g.id === id ? { ...g, name: name.trim(), targetMinor } : g))
      );
    },
    [db]
  );

  const addToGoal = useCallback(
    async (id: number, amountMinor: number) => {
      await db.runAsync('UPDATE goals SET saved_minor = MIN(target_minor, saved_minor + ?) WHERE id=?', amountMinor, id);
      setGoals((current) =>
        current.map((goal) =>
          goal.id === id ? { ...goal, savedMinor: Math.min(goal.targetMinor, goal.savedMinor + amountMinor) } : goal
        )
      );
    },
    [db]
  );

  const removeGoal = useCallback(
    async (id: number) => {
      await db.runAsync('DELETE FROM goals WHERE id=?', id);
      setGoals((current) => current.filter((g) => g.id !== id));
    },
    [db]
  );

  const saveBudget = useCallback(
    async (category: string, amountMinor: number) => {
      await db.runAsync(
        'INSERT INTO category_budgets(category, amount_minor) VALUES(?,?) ON CONFLICT(category) DO UPDATE SET amount_minor=excluded.amount_minor',
        category,
        amountMinor
      );
      setBudgets((current) => ({ ...current, [category]: amountMinor }));
    },
    [db]
  );

  const resetAllData = useCallback(async () => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM expenses');
      await db.runAsync('DELETE FROM incomes');
      await db.runAsync('DELETE FROM goals');
      await db.runAsync('DELETE FROM category_budgets');
      await db.runAsync('UPDATE preferences SET name="", allowance_minor=0, cycle_start_day=1, pacing_mode="adaptive", onboarded=0 WHERE id=1');
    });
    await refresh();
  }, [db, refresh]);

  const restoreBackup = useCallback(
    async (jsonString: string) => {
      const data = JSON.parse(jsonString) as {
        app?: string;
        preferences?: Partial<Preferences>;
        expenses?: Expense[];
        goals?: Goal[];
        budgets?: Record<string, number>;
      };
      if (!data || data.app !== 'Pennywise') {
        throw new Error('Invalid Pennywise backup file.');
      }
      await db.withTransactionAsync(async () => {
        if (data.preferences) {
          await db.runAsync(
            'UPDATE preferences SET name=?, currency=?, allowance_minor=?, cycle_start_day=?, theme_mode=?, pacing_mode=?, onboarded=? WHERE id=1',
            data.preferences.name || '',
            data.preferences.currency || 'INR',
            data.preferences.allowanceMinor || 0,
            data.preferences.cycleStartDay || 1,
            data.preferences.themeMode || 'system',
            data.preferences.pacingMode || 'adaptive',
            Number(data.preferences.onboarded) || 0
          );
        }
        if (Array.isArray(data.expenses)) {
          await db.runAsync('DELETE FROM expenses');
          for (const e of data.expenses) {
            await db.runAsync(
              'INSERT INTO expenses (id, amount_minor, title, category, occurred_at, reflection, note, created_at) VALUES (?,?,?,?,?,?,?,?)',
              e.id,
              e.amountMinor,
              e.title,
              e.category,
              e.occurredAt,
              e.reflection || null,
              e.note || null,
              e.occurredAt
            );
          }
        }
        if (Array.isArray((data as { incomes?: Income[] }).incomes)) {
          await db.runAsync('DELETE FROM incomes');
          for (const inc of (data as { incomes: Income[] }).incomes) {
            await db.runAsync(
              'INSERT INTO incomes (id, amount_minor, title, source, occurred_at, note, created_at) VALUES (?,?,?,?,?,?,?)',
              inc.id,
              inc.amountMinor,
              inc.title,
              inc.source || 'Other',
              inc.occurredAt,
              inc.note || null,
              inc.occurredAt
            );
          }
        }
        if (Array.isArray(data.goals)) {
          await db.runAsync('DELETE FROM goals');
          for (const g of data.goals) {
            await db.runAsync(
              'INSERT INTO goals (id, name, target_minor, saved_minor, created_at) VALUES (?,?,?,?,?)',
              g.id,
              g.name,
              g.targetMinor,
              g.savedMinor,
              g.createdAt || new Date().toISOString()
            );
          }
        }
        if (data.budgets && typeof data.budgets === 'object') {
          await db.runAsync('DELETE FROM category_budgets');
          for (const [cat, amt] of Object.entries(data.budgets)) {
            await db.runAsync('INSERT INTO category_budgets (category, amount_minor) VALUES (?,?)', cat, amt);
          }
        }
      });
      await refresh();
    },
    [db, refresh]
  );

  const value = useMemo(
    () => ({
      ready,
      error,
      retry: refresh,
      preferences,
      expenses,
      incomes,
      goals,
      budgets,
      savePreferences,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      removeIncome,
      saveGoal,
      updateGoal,
      addToGoal,
      removeGoal,
      saveBudget,
      resetAllData,
      restoreBackup,
    }),
    [
      ready,
      error,
      refresh,
      preferences,
      expenses,
      incomes,
      goals,
      budgets,
      savePreferences,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      removeIncome,
      saveGoal,
      updateGoal,
      addToGoal,
      removeGoal,
      saveBudget,
      resetAllData,
      restoreBackup,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useFinance() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useFinance must be used inside DatabaseProvider');
  return context;
}
