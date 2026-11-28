import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import {
  applyGoalBalanceChange,
  calculateBudgetSummary,
  calculateNoCycleSummary,
  cycleStart,
  generateBackupJSON,
  isNoCycleBudgetActive,
  normalizeTransactionDescription,
  nextCycleStart,
  reconcileGoalBalances,
  sumExpenses,
  validateBackupPayload,
} from '@/finance.mjs';

export type Category = 'Food' | 'Transport' | 'Study' | 'Social' | 'Shopping' | 'Other';
export type Reflection = 'Planned' | 'Spontaneous' | 'Needed' | 'Just wanted it';
export type BudgetingMode = 'monthly_cycle' | 'no_cycle';
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
  deletedAt: string | null;
};
export type GoalTransaction = {
  id: number;
  goalId: number;
  kind: 'deposit' | 'withdrawal';
  amountMinor: number;
  occurredAt: string;
  note: string | null;
  goalNameSnapshot?: string | null;
  operationType?: 'Added Savings' | 'Withdrawal' | 'Deleted Goal Withdrawal' | null;
};
export type ZeroSpendDay = {
  dateKey: string;
  createdAt: string;
};
export type PacingMode = 'adaptive' | 'fixed';
export type Preferences = {
  name: string;
  currency: string;
  allowanceMinor: number;
  cycleStartDay: number;
  budgetingMode: BudgetingMode;
  noCycleOpeningBalanceMinor: number;
  noCycleExpensesThroughId: number;
  noCycleIncomesThroughId: number;
  noCycleGoalTransactionsThroughId: number;
  monthlyEffectiveAt: string | null;
  themeMode: 'system' | 'light' | 'dark';
  pacingMode: PacingMode;
  onboarded: boolean;
};

export const CATEGORIES: readonly Category[] = ['Food', 'Transport', 'Study', 'Social', 'Shopping', 'Other'] as const;

async function getGoalLedgerBalance(db: SQLiteDatabase, goalId: number) {
  const result = await db.getFirstAsync<{ balance_minor: number }>(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_minor ELSE -amount_minor END), 0) AS balance_minor
     FROM goal_transactions WHERE goal_id = ?`,
    goalId
  );
  return Number(result?.balance_minor ?? 0);
}

const DEFAULT_PREFERENCES: Preferences = {
  name: '',
  currency: 'INR',
  allowanceMinor: 0,
  cycleStartDay: 1,
  budgetingMode: 'monthly_cycle',
  noCycleOpeningBalanceMinor: 0,
  noCycleExpensesThroughId: 0,
  noCycleIncomesThroughId: 0,
  noCycleGoalTransactionsThroughId: 0,
  monthlyEffectiveAt: null,
  themeMode: 'system',
  pacingMode: 'adaptive',
  onboarded: false,
};

type StoredBudgetPreferences = {
  allowance_minor: number;
  cycle_start_day: number;
  budgeting_mode: string;
  no_cycle_opening_balance_minor: number;
  no_cycle_expenses_through_id: number;
  no_cycle_incomes_through_id: number;
  no_cycle_goal_transactions_through_id: number;
  monthly_effective_at: string | null;
};

async function getTransactionIdCutoffs(db: SQLiteDatabase) {
  const [expense, income, goalTransaction] = await Promise.all([
    db.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) AS max_id FROM expenses'),
    db.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) AS max_id FROM incomes'),
    db.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) AS max_id FROM goal_transactions'),
  ]);
  return {
    expensesThroughId: Number(expense?.max_id ?? 0),
    incomesThroughId: Number(income?.max_id ?? 0),
    goalTransactionsThroughId: Number(goalTransaction?.max_id ?? 0),
  };
}

async function calculateStoredAvailableBalance(
  db: SQLiteDatabase,
  preferences: StoredBudgetPreferences,
  now: Date,
  noCycleActive: boolean
) {
  const [expenseRows, incomeRows, goals, goalTransactionRows] = await Promise.all([
    db.getAllAsync<{ id: number; amount_minor: number; occurred_at: string }>(
      'SELECT id, amount_minor, occurred_at FROM expenses'
    ),
    db.getAllAsync<{ id: number; amount_minor: number; source: string; occurred_at: string }>(
      'SELECT id, amount_minor, source, occurred_at FROM incomes'
    ),
    db.getAllAsync<{ id: number; deleted_at: string | null }>(
      'SELECT id, deleted_at FROM goals'
    ),
    db.getAllAsync<{
      id: number;
      goal_id: number;
      kind: 'deposit' | 'withdrawal';
      amount_minor: number;
      occurred_at: string;
    }>('SELECT id, goal_id, kind, amount_minor, occurred_at FROM goal_transactions'),
  ]);
  const expenses = expenseRows.map((row) => ({
    id: row.id,
    amountMinor: row.amount_minor,
    occurredAt: row.occurred_at,
  }));
  const incomes = incomeRows.map((row) => ({
    id: row.id,
    amountMinor: row.amount_minor,
    source: row.source,
    occurredAt: row.occurred_at,
  }));
  const goalTransactions = goalTransactionRows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    kind: row.kind,
    amountMinor: row.amount_minor,
    occurredAt: row.occurred_at,
  }));

  if (noCycleActive) {
    return calculateNoCycleSummary({
      openingBalanceMinor: preferences.no_cycle_opening_balance_minor,
      expensesThroughId: preferences.no_cycle_expenses_through_id,
      incomesThroughId: preferences.no_cycle_incomes_through_id,
      goalTransactionsThroughId: preferences.no_cycle_goal_transactions_through_id,
      expenses,
      incomes,
      goalTransactions,
    }).availableMinor;
  }

  const activeGoals = goals.filter((goal) => goal.deleted_at === null);
  const savedBalances = reconcileGoalBalances(activeGoals, goalTransactions);
  const savingsReservedMinor = Object.values(savedBalances).reduce(
    (total, amount) => total + Math.max(0, Number(amount) || 0),
    0
  );
  const start = cycleStart(now, Math.min(28, Math.max(1, preferences.cycle_start_day)));
  return calculateBudgetSummary({
    allowanceMinor: preferences.allowance_minor,
    incomes,
    cycleStartDate: start,
    cycleThroughDate: now,
    expenseMinor: sumExpenses(expenses, start, now),
    savingsReservedMinor,
  }).availableMinor;
}

async function adjustNoCycleOpeningBalance(
  db: SQLiteDatabase,
  transactionId: number,
  kind: 'expense' | 'income',
  amountDeltaMinor: number
) {
  const preferences = await db.getFirstAsync<{
    budgeting_mode: string;
    monthly_effective_at: string | null;
    no_cycle_opening_balance_minor: number;
    no_cycle_expenses_through_id: number;
    no_cycle_incomes_through_id: number;
  }>(`
    SELECT budgeting_mode, monthly_effective_at, no_cycle_opening_balance_minor,
      no_cycle_expenses_through_id, no_cycle_incomes_through_id
    FROM preferences WHERE id=1
  `);
  if (!preferences) return null;
  const now = Date.now();
  const noCycleActive =
    isNoCycleBudgetActive(
      { budgetingMode: preferences.budgeting_mode === 'no_cycle' ? 'no_cycle' : 'monthly_cycle', monthlyEffectiveAt: preferences.monthly_effective_at },
      new Date(now)
    );
  const throughId = kind === 'expense'
    ? preferences.no_cycle_expenses_through_id
    : preferences.no_cycle_incomes_through_id;
  if (!noCycleActive || transactionId > throughId) return null;

  const openingBalanceMinor = preferences.no_cycle_opening_balance_minor + amountDeltaMinor;
  await db.runAsync(
    'UPDATE preferences SET no_cycle_opening_balance_minor=? WHERE id=1',
    openingBalanceMinor
  );
  return openingBalanceMinor;
}

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

  const v4Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v4Result?.user_version ?? 0) < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS zero_spend_days (
          date_key TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (4, datetime('now'));
        PRAGMA user_version = 4;
      `);
    });
  }

  const v5Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v5Result?.user_version ?? 0) < 5) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goal_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_id INTEGER NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('deposit', 'withdrawal')),
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          occurred_at TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS goal_transactions_goal_idx ON goal_transactions(goal_id, occurred_at);
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (5, datetime('now'));
        PRAGMA user_version = 5;
      `);
    });
  }

  const v6Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v6Result?.user_version ?? 0) < 6) {
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync('ALTER TABLE goals ADD COLUMN deleted_at TEXT');
      } catch {
        // already present on newer databases
      }
      await db.execAsync(`
        UPDATE goals SET deleted_at = NULL WHERE deleted_at IS NULL;
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (6, datetime('now'));
        PRAGMA user_version = 6;
      `);
    });
  }

  const v7Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v7Result?.user_version ?? 0) < 7) {
    await db.withTransactionAsync(async () => {
      const goals = await db.getAllAsync<{
        id: number;
        saved_minor: number;
        target_minor: number;
        ledger_balance: number;
        transaction_count: number;
      }>(`
        SELECT
          g.id,
          g.saved_minor,
          g.target_minor,
          COALESCE(SUM(CASE WHEN t.kind = 'deposit' THEN t.amount_minor ELSE -t.amount_minor END), 0) AS ledger_balance,
          COUNT(t.id) AS transaction_count
        FROM goals g
        LEFT JOIN goal_transactions t ON t.goal_id = g.id
        GROUP BY g.id
      `);
      const reconciledAt = new Date().toISOString();
      for (const goal of goals) {
        const difference = goal.saved_minor - goal.ledger_balance;
        if (difference === 0) continue;
        if (!Number.isSafeInteger(goal.saved_minor) || goal.saved_minor < 0 || goal.saved_minor > goal.target_minor) {
          throw new Error('A saved goal balance is invalid; the database migration was not applied.');
        }
        await db.runAsync(
          'INSERT INTO goal_transactions (goal_id, kind, amount_minor, occurred_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          goal.id,
          difference > 0 ? 'deposit' : 'withdrawal',
          Math.abs(difference),
          reconciledAt,
          goal.transaction_count === 0
            ? 'Opening balance carried forward during ledger migration'
            : 'Balance reconciliation adjustment during ledger migration',
          reconciledAt
        );
      }
      const invalidGoal = await db.getFirstAsync<{ id: number }>(`
        SELECT g.id
        FROM goals g
        LEFT JOIN goal_transactions t ON t.goal_id = g.id
        GROUP BY g.id
        HAVING g.saved_minor != COALESCE(SUM(CASE WHEN t.kind = 'deposit' THEN t.amount_minor ELSE -t.amount_minor END), 0)
          OR g.saved_minor > g.target_minor
        LIMIT 1
      `);
      if (invalidGoal) {
        throw new Error('A savings ledger could not be reconciled; the database migration was not applied.');
      }
      await db.execAsync(`
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (7, datetime('now'));
        PRAGMA user_version = 7;
      `);
    });
  }

  const v8Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v8Result?.user_version ?? 0) < 8) {
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync('ALTER TABLE goal_transactions ADD COLUMN goal_name_snapshot TEXT');
      } catch {
        // already present on newer databases
      }
      try {
        await db.execAsync("ALTER TABLE goal_transactions ADD COLUMN operation_type TEXT CHECK(operation_type IN ('Added Savings','Withdrawal','Deleted Goal Withdrawal'))");
      } catch {
        // already present on newer databases
      }
      await db.execAsync(`
        UPDATE goal_transactions
        SET operation_type =
          CASE
            WHEN kind = 'deposit' THEN 'Added Savings'
            WHEN note LIKE 'Withdrawn from deleted %' THEN 'Deleted Goal Withdrawal'
            ELSE 'Withdrawal'
          END
        WHERE operation_type IS NULL;
        UPDATE goal_transactions
        SET goal_name_snapshot = (
          SELECT name FROM goals WHERE goals.id = goal_transactions.goal_id
        )
        WHERE goal_name_snapshot IS NULL;
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (8, datetime('now'));
        PRAGMA user_version = 8;
      `);
    });
  }

  const v9Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v9Result?.user_version ?? 0) < 9) {
    await db.withTransactionAsync(async () => {
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(preferences)');
      const names = new Set(columns.map((column) => column.name));
      if (!names.has('budgeting_mode')) {
        await db.execAsync("ALTER TABLE preferences ADD COLUMN budgeting_mode TEXT NOT NULL DEFAULT 'monthly_cycle' CHECK (budgeting_mode IN ('monthly_cycle','no_cycle'))");
      }
      if (!names.has('no_cycle_opening_balance_minor')) {
        await db.execAsync('ALTER TABLE preferences ADD COLUMN no_cycle_opening_balance_minor INTEGER NOT NULL DEFAULT 0');
      }
      if (!names.has('no_cycle_expenses_through_id')) {
        await db.execAsync('ALTER TABLE preferences ADD COLUMN no_cycle_expenses_through_id INTEGER NOT NULL DEFAULT 0');
      }
      if (!names.has('no_cycle_incomes_through_id')) {
        await db.execAsync('ALTER TABLE preferences ADD COLUMN no_cycle_incomes_through_id INTEGER NOT NULL DEFAULT 0');
      }
      if (!names.has('no_cycle_goal_transactions_through_id')) {
        await db.execAsync('ALTER TABLE preferences ADD COLUMN no_cycle_goal_transactions_through_id INTEGER NOT NULL DEFAULT 0');
      }
      if (!names.has('monthly_effective_at')) {
        await db.execAsync('ALTER TABLE preferences ADD COLUMN monthly_effective_at TEXT');
      }
      await db.execAsync(`
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (9, datetime('now'));
        PRAGMA user_version = 9;
      `);
    });
  }

  const v10Result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((v10Result?.user_version ?? 0) < 10) {
    await db.withTransactionAsync(async () => {
      const [expenseTitles, incomeTitles] = await Promise.all([
        db.getAllAsync<{ id: number; title: string | null }>('SELECT id, title FROM expenses'),
        db.getAllAsync<{ id: number; title: string | null }>('SELECT id, title FROM incomes'),
      ]);
      for (const expense of expenseTitles) {
        if (typeof expense.title !== 'string' || expense.title.trim().length === 0) {
          await db.runAsync('UPDATE expenses SET title=? WHERE id=?', 'Unspecified Expense', expense.id);
        }
      }
      for (const income of incomeTitles) {
        if (typeof income.title !== 'string' || income.title.trim().length === 0) {
          await db.runAsync('UPDATE incomes SET title=? WHERE id=?', 'Unspecified Income', income.id);
        }
      }
      await db.execAsync(`
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (10, datetime('now'));
        PRAGMA user_version = 10;
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
  goalRecords: Goal[];
  goalTransactions: GoalTransaction[];
  budgets: Record<string, number>;
  zeroSpendDays: string[];
  savePreferences: (p: Partial<Preferences>) => Promise<void>;
  addExpense: (e: ExpenseInput) => Promise<void>;
  updateExpense: (e: Expense) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
  addIncome: (e: IncomeInput) => Promise<void>;
  updateIncome: (e: Income) => Promise<void>;
  removeIncome: (id: number) => Promise<void>;
  saveGoal: (name: string, targetMinor: number) => Promise<void>;
  updateGoal: (id: number, name: string, targetMinor: number) => Promise<void>;
  addToGoal: (id: number, amountMinor: number) => Promise<void>;
  withdrawFromGoal: (id: number, amountMinor: number) => Promise<void>;
  removeGoal: (id: number) => Promise<void>;
  saveBudget: (category: string, amountMinor: number) => Promise<void>;
  logZeroSpendDay: (dateKey: string) => Promise<void>;
  removeZeroSpendDay: (dateKey: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  restoreBackup: (jsonString: string) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="pocketpal.db" onInit={migrateDatabase} useSuspense>
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
  const [goalRecords, setGoalRecords] = useState<Goal[]>([]);
  const [goalTransactions, setGoalTransactions] = useState<GoalTransaction[]>([]);
  const goalOperationLocks = useRef(new Set<number>());
  const incomeDeleteLocks = useRef(new Set<number>());
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [zeroSpendDays, setZeroSpendDays] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [pref, rows, incomeRows, goalRows, goalTxRows, budgetRows, zeroRows] = await Promise.all([
        db.getFirstAsync<{
          name: string;
          currency: string;
          allowance_minor: number;
          cycle_start_day: number;
          budgeting_mode: string;
          no_cycle_opening_balance_minor: number;
          no_cycle_expenses_through_id: number;
          no_cycle_incomes_through_id: number;
          no_cycle_goal_transactions_through_id: number;
          monthly_effective_at: string | null;
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
          deleted_at: string | null;
        }>('SELECT id, name, target_minor, saved_minor, created_at, deleted_at FROM goals ORDER BY created_at DESC, id DESC'),
        db.getAllAsync<{
          id: number;
          goal_id: number;
          kind: 'deposit' | 'withdrawal';
          amount_minor: number;
          occurred_at: string;
          note: string | null;
          goal_name_snapshot: string | null;
          operation_type: 'Added Savings' | 'Withdrawal' | 'Deleted Goal Withdrawal' | null;
        }>('SELECT id, goal_id, kind, amount_minor, occurred_at, note, goal_name_snapshot, operation_type FROM goal_transactions ORDER BY occurred_at DESC, id DESC'),
        db.getAllAsync<{ category: string; amount_minor: number }>('SELECT category, amount_minor FROM category_budgets'),
        db.getAllAsync<{ date_key: string; created_at: string }>('SELECT date_key, created_at FROM zero_spend_days ORDER BY date_key DESC'),
      ]);

      if (pref) {
        setPreferences({
          name: pref.name,
          currency: pref.currency,
          allowanceMinor: pref.allowance_minor,
          cycleStartDay: Math.min(28, Math.max(1, pref.cycle_start_day)),
          budgetingMode: pref.budgeting_mode === 'no_cycle' ? 'no_cycle' : 'monthly_cycle',
          noCycleOpeningBalanceMinor: pref.no_cycle_opening_balance_minor,
          noCycleExpensesThroughId: pref.no_cycle_expenses_through_id,
          noCycleIncomesThroughId: pref.no_cycle_incomes_through_id,
          noCycleGoalTransactionsThroughId: pref.no_cycle_goal_transactions_through_id,
          monthlyEffectiveAt: pref.monthly_effective_at,
          themeMode: pref.theme_mode,
          pacingMode: pref.pacing_mode === 'fixed' ? 'fixed' : 'adaptive',
          onboarded: Boolean(pref.onboarded),
        });
      }
      setExpenses(
        rows.map((r) => ({
          id: r.id,
          amountMinor: r.amount_minor,
          title: normalizeTransactionDescription(r.title, 'Unspecified Expense'),
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
          title: normalizeTransactionDescription(r.title, 'Unspecified Income'),
          source: r.source,
          occurredAt: r.occurred_at,
          note: r.note,
        }))
      );
      const loadedGoalTransactions = goalTxRows.map((r) => ({
        id: r.id,
        goalId: r.goal_id,
        kind: r.kind,
        amountMinor: r.amount_minor,
        occurredAt: r.occurred_at,
        note: r.note,
        goalNameSnapshot: r.goal_name_snapshot,
        operationType: r.operation_type,
      }));
      const loadedGoals = goalRows.map((r) => ({
          id: r.id,
          name: r.name,
          targetMinor: r.target_minor,
          savedMinor: r.saved_minor,
          createdAt: r.created_at,
          deletedAt: r.deleted_at,
        }));
      const ledgerBalances = reconcileGoalBalances(loadedGoals, loadedGoalTransactions);
      const reconciledGoals = loadedGoals.map((goal) => ({
        ...goal,
        savedMinor: ledgerBalances[goal.id] ?? 0,
      }));
      setGoalRecords(reconciledGoals);
      setGoals(reconciledGoals.filter((goal) => goal.deletedAt === null));
      setGoalTransactions(loadedGoalTransactions);
      setBudgets(Object.fromEntries(budgetRows.map((r) => [r.category, r.amount_minor])));
      setZeroSpendDays(zeroRows.map((r) => r.date_key).sort((a, b) => b.localeCompare(a)));
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
      const next: Preferences = {
        ...preferences,
        ...patch,
        cycleStartDay: patch.cycleStartDay !== undefined ? Math.min(28, Math.max(1, patch.cycleStartDay)) : preferences.cycleStartDay,
      };
      await db.withTransactionAsync(async () => {
        const stored = await db.getFirstAsync<StoredBudgetPreferences>(
          `SELECT allowance_minor, cycle_start_day, budgeting_mode,
            no_cycle_opening_balance_minor, no_cycle_expenses_through_id,
            no_cycle_incomes_through_id, no_cycle_goal_transactions_through_id,
            monthly_effective_at
          FROM preferences WHERE id=1`
        );
        if (!stored) throw new Error('Preferences could not be loaded.');

        const storedMode: BudgetingMode = stored.budgeting_mode === 'no_cycle' ? 'no_cycle' : 'monthly_cycle';
        const targetMode = patch.budgetingMode ?? storedMode;
        const now = new Date();
        const currentNoCycleActive =
          isNoCycleBudgetActive(
            { budgetingMode: storedMode, monthlyEffectiveAt: stored.monthly_effective_at },
            now
          );

        if (targetMode === 'no_cycle' && (storedMode !== 'no_cycle' || patch.noCycleOpeningBalanceMinor !== undefined)) {
          const openingBalanceMinor =
            patch.noCycleOpeningBalanceMinor !== undefined
              ? patch.noCycleOpeningBalanceMinor
              : await calculateStoredAvailableBalance(db, stored, now, currentNoCycleActive);
          if (!Number.isSafeInteger(openingBalanceMinor)) {
            throw new Error('The opening balance is outside the supported range.');
          }
          const cutoffs = await getTransactionIdCutoffs(db);
          next.noCycleOpeningBalanceMinor = openingBalanceMinor;
          next.noCycleExpensesThroughId = cutoffs.expensesThroughId;
          next.noCycleIncomesThroughId = cutoffs.incomesThroughId;
          next.noCycleGoalTransactionsThroughId = cutoffs.goalTransactionsThroughId;
          next.monthlyEffectiveAt = null;
        } else if (targetMode === 'monthly_cycle' && currentNoCycleActive && patch.budgetingMode === 'monthly_cycle') {
          next.monthlyEffectiveAt = nextCycleStart(now, next.cycleStartDay).toISOString();
        } else if (
          targetMode === 'monthly_cycle' &&
          next.monthlyEffectiveAt !== null &&
          Date.parse(next.monthlyEffectiveAt) > now.getTime() &&
          patch.cycleStartDay !== undefined
        ) {
          next.monthlyEffectiveAt = nextCycleStart(now, next.cycleStartDay).toISOString();
        }

        await db.runAsync(
          `UPDATE preferences SET name=?, currency=?, allowance_minor=?, cycle_start_day=?,
            budgeting_mode=?, no_cycle_opening_balance_minor=?, no_cycle_expenses_through_id=?,
            no_cycle_incomes_through_id=?, no_cycle_goal_transactions_through_id=?,
            monthly_effective_at=?, theme_mode=?, pacing_mode=?, onboarded=? WHERE id=1`,
          next.name,
          next.currency,
          next.allowanceMinor,
          next.cycleStartDay,
          next.budgetingMode,
          next.noCycleOpeningBalanceMinor,
          next.noCycleExpensesThroughId,
          next.noCycleIncomesThroughId,
          next.noCycleGoalTransactionsThroughId,
          next.monthlyEffectiveAt,
          next.themeMode,
          next.pacingMode,
          Number(next.onboarded)
        );
      });
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
        normalizeTransactionDescription(e.title, 'Unspecified Expense'),
        e.category,
        e.occurredAt,
        e.reflection,
        e.note,
        createdAt
      );
      setExpenses((current) =>
        [{
          ...e,
          title: normalizeTransactionDescription(e.title, 'Unspecified Expense'),
          id: result.lastInsertRowId,
        }, ...current].sort(
          (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id
        )
      );
    },
    [db]
  );

  const updateExpense = useCallback(
    async (e: Expense) => {
      let adjustedOpeningBalance: number | null = null;
      await db.withTransactionAsync(async () => {
        const previous = await db.getFirstAsync<{ amount_minor: number }>(
          'SELECT amount_minor FROM expenses WHERE id=?',
          e.id
        );
        if (!previous) throw new Error(`Expense record ${e.id} no longer exists.`);
        adjustedOpeningBalance = await adjustNoCycleOpeningBalance(
          db,
          e.id,
          'expense',
          previous.amount_minor - e.amountMinor
        );
        await db.runAsync(
          'UPDATE expenses SET amount_minor=?, title=?, category=?, occurred_at=?, reflection=?, note=? WHERE id=?',
          e.amountMinor,
          normalizeTransactionDescription(e.title, 'Unspecified Expense'),
          e.category,
          e.occurredAt,
          e.reflection,
          e.note,
          e.id
        );
      });
      const openingBalanceAdjustment = adjustedOpeningBalance;
      if (openingBalanceAdjustment !== null) {
        setPreferences((current) => ({ ...current, noCycleOpeningBalanceMinor: openingBalanceAdjustment }));
      }
      setExpenses((current) =>
        current
          .map((item) =>
            item.id === e.id
              ? { ...e, title: normalizeTransactionDescription(e.title, 'Unspecified Expense') }
              : item
          )
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)
      );
    },
    [db]
  );

  const removeExpense = useCallback(
    async (id: number) => {
      let adjustedOpeningBalance: number | null = null;
      await db.withTransactionAsync(async () => {
        const previous = await db.getFirstAsync<{ amount_minor: number }>(
          'SELECT amount_minor FROM expenses WHERE id=?',
          id
        );
        if (!previous) return;
        adjustedOpeningBalance = await adjustNoCycleOpeningBalance(db, id, 'expense', previous.amount_minor);
        await db.runAsync('DELETE FROM expenses WHERE id=?', id);
      });
      const openingBalanceAdjustment = adjustedOpeningBalance;
      if (openingBalanceAdjustment !== null) {
        setPreferences((current) => ({ ...current, noCycleOpeningBalanceMinor: openingBalanceAdjustment }));
      }
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
        normalizeTransactionDescription(e.title, 'Unspecified Income'),
        e.source,
        e.occurredAt,
        e.note,
        createdAt
      );
      setIncomes((current) =>
        [{ ...e, title: normalizeTransactionDescription(e.title, 'Unspecified Income'), id: result.lastInsertRowId }, ...current].sort(
          (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id
        )
      );
    },
    [db]
  );

  const removeIncome = useCallback(
    async (id: number) => {
      if (incomeDeleteLocks.current.has(id)) return;
      incomeDeleteLocks.current.add(id);
      try {
        let adjustedOpeningBalance: number | null = null;
        await db.withTransactionAsync(async () => {
          const previous = await db.getFirstAsync<{ amount_minor: number }>(
            'SELECT amount_minor FROM incomes WHERE id=?',
            id
          );
          if (!previous) return;
          adjustedOpeningBalance = await adjustNoCycleOpeningBalance(db, id, 'income', -previous.amount_minor);
          await db.runAsync('DELETE FROM incomes WHERE id=?', id);
        });
        const openingBalanceAdjustment = adjustedOpeningBalance;
        if (openingBalanceAdjustment !== null) {
          setPreferences((current) => ({ ...current, noCycleOpeningBalanceMinor: openingBalanceAdjustment }));
        }
        setIncomes((current) => current.filter((income) => income.id !== id));
      } finally {
        incomeDeleteLocks.current.delete(id);
      }
    },
    [db]
  );

  const updateIncome = useCallback(
    async (e: Income) => {
      let adjustedOpeningBalance: number | null = null;
      await db.withTransactionAsync(async () => {
        const previous = await db.getFirstAsync<{ amount_minor: number }>(
          'SELECT amount_minor FROM incomes WHERE id=?',
          e.id
        );
        if (!previous) throw new Error(`Income record ${e.id} no longer exists.`);
        adjustedOpeningBalance = await adjustNoCycleOpeningBalance(
          db,
          e.id,
          'income',
          e.amountMinor - previous.amount_minor
        );
        await db.runAsync(
          'UPDATE incomes SET amount_minor=?, title=?, source=?, occurred_at=?, note=? WHERE id=?',
          e.amountMinor,
          normalizeTransactionDescription(e.title, 'Unspecified Income'),
          e.source.trim(),
          e.occurredAt,
          e.note,
          e.id
        );
      });
      const openingBalanceAdjustment = adjustedOpeningBalance;
      if (openingBalanceAdjustment !== null) {
        setPreferences((current) => ({ ...current, noCycleOpeningBalanceMinor: openingBalanceAdjustment }));
      }
      setIncomes((current) =>
        current
          .map((income) =>
            income.id === e.id
              ? {
                  ...e,
                  title: normalizeTransactionDescription(e.title, 'Unspecified Income'),
                  source: e.source.trim(),
                }
              : income
          )
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)
      );
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
      const goal = { id: result.lastInsertRowId, name: name.trim(), targetMinor, savedMinor: 0, createdAt, deletedAt: null };
      setGoals((current) => [goal, ...current]);
      setGoalRecords((current) => [goal, ...current]);
    },
    [db]
  );

  const updateGoal = useCallback(
    async (id: number, name: string, targetMinor: number) => {
      let savedMinor = 0;
      await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<{ deleted_at: string | null }>(
          'SELECT deleted_at FROM goals WHERE id=?',
          id
        );
        if (!row || row.deleted_at !== null) {
          throw new Error('This goal no longer exists.');
        }
        savedMinor = await getGoalLedgerBalance(db, id);
        if (!Number.isSafeInteger(targetMinor) || targetMinor <= 0 || targetMinor < savedMinor) {
          throw new Error('The target cannot be lower than the amount already saved.');
        }
        await db.runAsync('UPDATE goals SET name=?, target_minor=?, saved_minor=? WHERE id=?', name.trim(), targetMinor, savedMinor, id);
      });
      const update = (goal: Goal) => goal.id === id ? { ...goal, name: name.trim(), targetMinor, savedMinor } : goal;
      setGoals((current) => current.map(update));
      setGoalRecords((current) => current.map(update));
    },
    [db]
  );

  const addToGoal = useCallback(
    async (id: number, amountMinor: number) => {
      if (goalOperationLocks.current.has(id)) {
        throw new Error('A savings update for this goal is already being processed.');
      }
      goalOperationLocks.current.add(id);
      try {
        const occurredAt = new Date().toISOString();
        let nextSaved = 0;
        let transactionId = 0;
        let transactionGoalName: string | null = null;
        await db.withTransactionAsync(async () => {
          const row = await db.getFirstAsync<{ id: number; name: string; target_minor: number; deleted_at: string | null }>(
            'SELECT id, name, target_minor, deleted_at FROM goals WHERE id = ?',
            id
          );
          if (!row || row.deleted_at !== null) {
            throw new Error('This goal no longer exists.');
          }
          transactionGoalName = row.name;

          const savedMinor = await getGoalLedgerBalance(db, id);
          nextSaved = applyGoalBalanceChange(savedMinor, 'deposit', amountMinor, row.target_minor);
          await db.runAsync('UPDATE goals SET saved_minor = ? WHERE id=?', nextSaved, id);
          const result = await db.runAsync(
            'INSERT INTO goal_transactions (goal_id, kind, amount_minor, occurred_at, note, created_at, goal_name_snapshot, operation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            'deposit',
            amountMinor,
            occurredAt,
            null,
            occurredAt,
            row.name ?? null,
            'Added Savings'
          );
          transactionId = Number(result.lastInsertRowId ?? 0);
        });

        setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, savedMinor: nextSaved } : goal));
        setGoalRecords((current) => current.map((goal) => goal.id === id ? { ...goal, savedMinor: nextSaved } : goal));
        if (transactionId > 0) {
          setGoalTransactions((current) => [
            { id: transactionId, goalId: id, kind: 'deposit', amountMinor, occurredAt, note: null, goalNameSnapshot: transactionGoalName, operationType: 'Added Savings' },
            ...current,
          ]);
        }
      } finally {
        goalOperationLocks.current.delete(id);
      }
    },
    [db]
  );

  const withdrawFromGoal = useCallback(
    async (id: number, amountMinor: number) => {
      if (goalOperationLocks.current.has(id)) {
        throw new Error('A savings update for this goal is already being processed.');
      }
      goalOperationLocks.current.add(id);
      try {
        const occurredAt = new Date().toISOString();
        let nextSaved = 0;
        let transactionId = 0;
        let transactionGoalName: string | null = null;
        await db.withTransactionAsync(async () => {
          const row = await db.getFirstAsync<{ id: number; name: string; deleted_at: string | null }>(
            'SELECT id, name, deleted_at FROM goals WHERE id = ?',
            id
          );
          if (!row || row.deleted_at !== null) {
            throw new Error('This goal no longer exists.');
          }
          transactionGoalName = row.name;

          const savedMinor = await getGoalLedgerBalance(db, id);
          nextSaved = applyGoalBalanceChange(savedMinor, 'withdrawal', amountMinor);
          await db.runAsync('UPDATE goals SET saved_minor = ? WHERE id=?', nextSaved, id);
          const result = await db.runAsync(
            'INSERT INTO goal_transactions (goal_id, kind, amount_minor, occurred_at, note, created_at, goal_name_snapshot, operation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            'withdrawal',
            amountMinor,
            occurredAt,
            null,
            occurredAt,
            row.name ?? null,
            'Withdrawal'
          );
          transactionId = Number(result.lastInsertRowId ?? 0);
        });

        setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, savedMinor: nextSaved } : goal));
        setGoalRecords((current) => current.map((goal) => goal.id === id ? { ...goal, savedMinor: nextSaved } : goal));
        if (transactionId > 0) {
          setGoalTransactions((current) => [
            { id: transactionId, goalId: id, kind: 'withdrawal', amountMinor, occurredAt, note: null, goalNameSnapshot: transactionGoalName, operationType: 'Withdrawal' },
            ...current,
          ]);
        }
      } finally {
        goalOperationLocks.current.delete(id);
      }
    },
    [db]
  );

  const removeGoal = useCallback(
    async (id: number) => {
      if (goalOperationLocks.current.has(id)) {
        throw new Error('A savings update for this goal is already being processed.');
      }
      goalOperationLocks.current.add(id);
      try {
        const deletedAt = new Date().toISOString();
        let closedGoal: Goal | null = null;
        let closureTransaction: GoalTransaction | null = null;
        await db.withTransactionAsync(async () => {
          const row = await db.getFirstAsync<{
            id: number;
            name: string;
            target_minor: number;
            created_at: string;
            deleted_at: string | null;
          }>('SELECT id, name, target_minor, created_at, deleted_at FROM goals WHERE id=?', id);
          if (!row || row.deleted_at !== null) {
            throw new Error('This goal has already been closed or no longer exists.');
          }

          const savedMinor = await getGoalLedgerBalance(db, id);
          if (savedMinor > 0) {
            const result = await db.runAsync(
              'INSERT INTO goal_transactions (goal_id, kind, amount_minor, occurred_at, note, created_at, goal_name_snapshot, operation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              id,
              'withdrawal',
              savedMinor,
              deletedAt,
              `Withdrawn from deleted ${row.name}`,
              deletedAt,
              row.name,
              'Deleted Goal Withdrawal'
            );
            closureTransaction = {
              id: Number(result.lastInsertRowId ?? 0),
              goalId: id,
              kind: 'withdrawal',
              amountMinor: savedMinor,
              occurredAt: deletedAt,
              note: `Withdrawn from deleted ${row.name}`,
              goalNameSnapshot: row.name,
              operationType: 'Deleted Goal Withdrawal',
            };
          }

          await db.runAsync('UPDATE goals SET saved_minor=0, deleted_at=? WHERE id=?', deletedAt, id);
          closedGoal = {
            id: row.id,
            name: row.name,
            targetMinor: row.target_minor,
            savedMinor: 0,
            createdAt: row.created_at,
            deletedAt,
          };
        });

        setGoals((current) => current.filter((goal) => goal.id !== id));
        if (closedGoal) {
          setGoalRecords((current) => current.map((goal) => goal.id === id ? closedGoal as Goal : goal));
        }
        if (closureTransaction) {
          setGoalTransactions((current) => [closureTransaction as GoalTransaction, ...current]);
        }
      } finally {
        goalOperationLocks.current.delete(id);
      }
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

  const logZeroSpendDay = useCallback(
    async (dateKey: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new Error('Invalid zero-spend day.');
      }
      const createdAt = new Date().toISOString();
      await db.runAsync('INSERT OR IGNORE INTO zero_spend_days (date_key, created_at) VALUES (?, ?)', dateKey, createdAt);
      setZeroSpendDays((current) => Array.from(new Set([...current, dateKey])).sort((a, b) => b.localeCompare(a)));
    },
    [db]
  );

  const removeZeroSpendDay = useCallback(
    async (dateKey: string) => {
      await db.runAsync('DELETE FROM zero_spend_days WHERE date_key = ?', dateKey);
      setZeroSpendDays((current) => current.filter((day) => day !== dateKey));
    },
    [db]
  );

  const resetAllData = useCallback(async () => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM expenses');
      await db.runAsync('DELETE FROM incomes');
      await db.runAsync('DELETE FROM goal_transactions');
      await db.runAsync('DELETE FROM goals');
      await db.runAsync('DELETE FROM category_budgets');
      await db.runAsync('DELETE FROM zero_spend_days');
      await db.runAsync(`UPDATE preferences SET name="", allowance_minor=0, cycle_start_day=1,
        budgeting_mode='monthly_cycle', no_cycle_opening_balance_minor=0,
        no_cycle_expenses_through_id=0, no_cycle_incomes_through_id=0,
        no_cycle_goal_transactions_through_id=0, monthly_effective_at=NULL,
        pacing_mode='adaptive', onboarded=0 WHERE id=1`);
    });
    await refresh();
  }, [db, refresh]);

  const restoreBackup = useCallback(
    async (jsonString: string) => {
      let data: unknown;
      try {
        data = JSON.parse(jsonString) as unknown;
      } catch {
        throw new Error('Invalid PocketPal backup file.');
      }

      const payload = data as {
        app?: string;
        version?: number;
        schemaVersion?: number;
        preferences?: Partial<Preferences>;
        expenses?: Expense[];
        incomes?: Income[];
        goals?: Goal[];
        goalTransactions?: GoalTransaction[];
        budgets?: Record<string, number>;
        zeroSpendDays?: string[];
      };
      validateBackupPayload(payload);

      const currentSnapshot = generateBackupJSON(
        preferences,
        expenses,
        goalRecords,
        budgets,
        zeroSpendDays,
        incomes,
        goalTransactions
      );
      const currentNoCycleActive =
        isNoCycleBudgetActive(preferences);
      const currentAvailableBalance = await calculateStoredAvailableBalance(
        db,
        {
          allowance_minor: preferences.allowanceMinor,
          cycle_start_day: preferences.cycleStartDay,
          budgeting_mode: preferences.budgetingMode,
          no_cycle_opening_balance_minor: preferences.noCycleOpeningBalanceMinor,
          no_cycle_expenses_through_id: preferences.noCycleExpensesThroughId,
          no_cycle_incomes_through_id: preferences.noCycleIncomesThroughId,
          no_cycle_goal_transactions_through_id: preferences.noCycleGoalTransactionsThroughId,
          monthly_effective_at: preferences.monthlyEffectiveAt,
        },
        new Date(),
        currentNoCycleActive
      );

      const applyPayload = async (source: typeof payload) => {
        await db.withTransactionAsync(async () => {
          if (source.preferences) {
            await db.runAsync(
              `UPDATE preferences SET name=?, currency=?, allowance_minor=?, cycle_start_day=?,
                budgeting_mode=?, no_cycle_opening_balance_minor=?, no_cycle_expenses_through_id=?,
                no_cycle_incomes_through_id=?, no_cycle_goal_transactions_through_id=?,
                monthly_effective_at=?, theme_mode=?, pacing_mode=?, onboarded=? WHERE id=1`,
              source.preferences.name || '',
              source.preferences.currency || 'INR',
              source.preferences.allowanceMinor || 0,
              source.preferences.cycleStartDay || 1,
              source.preferences.budgetingMode ?? preferences.budgetingMode,
              source.preferences.noCycleOpeningBalanceMinor ?? preferences.noCycleOpeningBalanceMinor,
              source.preferences.noCycleExpensesThroughId ?? preferences.noCycleExpensesThroughId,
              source.preferences.noCycleIncomesThroughId ?? preferences.noCycleIncomesThroughId,
              source.preferences.noCycleGoalTransactionsThroughId ?? preferences.noCycleGoalTransactionsThroughId,
              source.preferences.monthlyEffectiveAt !== undefined
                ? source.preferences.monthlyEffectiveAt
                : preferences.monthlyEffectiveAt,
              source.preferences.themeMode || 'system',
              source.preferences.pacingMode || 'adaptive',
              Number(source.preferences.onboarded) || 0
            );
          }
          if (Array.isArray(source.expenses)) {
            await db.runAsync('DELETE FROM expenses');
            for (const e of source.expenses) {
              await db.runAsync(
                'INSERT INTO expenses (id, amount_minor, title, category, occurred_at, reflection, note, created_at) VALUES (?,?,?,?,?,?,?,?)',
                e.id,
                e.amountMinor,
                normalizeTransactionDescription(e.title, 'Unspecified Expense'),
                e.category,
                e.occurredAt,
                e.reflection || null,
                e.note || null,
                e.occurredAt
              );
            }
          }
          if (Array.isArray(source.incomes)) {
            await db.runAsync('DELETE FROM incomes');
            for (const inc of source.incomes) {
              await db.runAsync(
                'INSERT INTO incomes (id, amount_minor, title, source, occurred_at, note, created_at) VALUES (?,?,?,?,?,?,?)',
                inc.id,
                inc.amountMinor,
                normalizeTransactionDescription(inc.title, 'Unspecified Income'),
                inc.source || 'Other',
                inc.occurredAt,
                inc.note || null,
                inc.occurredAt
              );
            }
          }
          if (Array.isArray(source.goals)) {
            await db.runAsync('DELETE FROM goals');
            for (const g of source.goals) {
              await db.runAsync(
                'INSERT INTO goals (id, name, target_minor, saved_minor, created_at, deleted_at) VALUES (?,?,?,?,?,?)',
                g.id,
                g.name,
                g.targetMinor,
                g.savedMinor,
                g.createdAt || new Date().toISOString(),
                g.deletedAt || null
              );
            }
          }
          if (Array.isArray(source.goalTransactions)) {
            await db.runAsync('DELETE FROM goal_transactions');
            for (const tx of source.goalTransactions) {
              if (!tx || !tx.goalId) continue;
              await db.runAsync(
                'INSERT INTO goal_transactions (id, goal_id, kind, amount_minor, occurred_at, note, created_at, goal_name_snapshot, operation_type) VALUES (?,?,?,?,?,?,?,?,?)',
                tx.id,
                tx.goalId,
                tx.kind === 'withdrawal' ? 'withdrawal' : 'deposit',
                tx.amountMinor,
                tx.occurredAt || new Date().toISOString(),
                tx.note || null,
                tx.occurredAt || new Date().toISOString(),
                tx.goalNameSnapshot || null,
                tx.operationType || (tx.kind === 'withdrawal' ? 'Withdrawal' : 'Added Savings')
              );
            }
          } else if (Array.isArray(source.goals)) {
            await db.runAsync('DELETE FROM goal_transactions');
            const importedAt = new Date().toISOString();
            for (const goal of source.goals) {
              if (goal.savedMinor <= 0) continue;
              await db.runAsync(
                'INSERT INTO goal_transactions (goal_id, kind, amount_minor, occurred_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                goal.id,
                'deposit',
                goal.savedMinor,
                importedAt,
                'Opening balance imported from a legacy backup',
                importedAt
              );
            }
          }
          if (source.budgets && typeof source.budgets === 'object') {
            await db.runAsync('DELETE FROM category_budgets');
            for (const [cat, amt] of Object.entries(source.budgets)) {
              await db.runAsync('INSERT INTO category_budgets (category, amount_minor) VALUES (?,?)', cat, amt);
            }
          }
          if (Array.isArray(source.zeroSpendDays)) {
            await db.runAsync('DELETE FROM zero_spend_days');
            for (const dateKey of source.zeroSpendDays) {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) continue;
              await db.runAsync('INSERT INTO zero_spend_days (date_key, created_at) VALUES (?, ?)', String(dateKey), new Date().toISOString());
            }
          }

          const targetMode = source.preferences?.budgetingMode ?? preferences.budgetingMode;
          if (
            targetMode === 'no_cycle' &&
            (!source.preferences ||
              source.preferences.noCycleOpeningBalanceMinor === undefined ||
              source.preferences.noCycleExpensesThroughId === undefined ||
              source.preferences.noCycleIncomesThroughId === undefined ||
              source.preferences.noCycleGoalTransactionsThroughId === undefined)
          ) {
            const cutoffs = await getTransactionIdCutoffs(db);
            await db.runAsync(
              `UPDATE preferences SET no_cycle_opening_balance_minor=?,
                no_cycle_expenses_through_id=?, no_cycle_incomes_through_id=?,
                no_cycle_goal_transactions_through_id=?, monthly_effective_at=NULL WHERE id=1`,
              currentAvailableBalance,
              cutoffs.expensesThroughId,
              cutoffs.incomesThroughId,
              cutoffs.goalTransactionsThroughId
            );
          }
        });
      };

      try {
        await applyPayload(payload);
        await refresh();
      } catch (error) {
        try {
          const previousPayload = JSON.parse(currentSnapshot) as typeof payload;
          await applyPayload(previousPayload);
          await refresh();
        } catch (rollbackError) {
          throw new Error(
            `The import failed, and rollback also failed${rollbackError instanceof Error ? `: ${rollbackError.message}` : '.'}`
          );
        }
        throw new Error(
          error instanceof Error
            ? `The import failed, and the previous local data was restored. Reason: ${error.message}`
            : 'The import failed, and the previous local data was restored.'
        );
      }
    },
    [budgets, db, expenses, goalRecords, incomes, preferences, goalTransactions, refresh, zeroSpendDays]
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
      goalRecords,
      goalTransactions,
      budgets,
      zeroSpendDays,
      savePreferences,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      updateIncome,
      removeIncome,
      saveGoal,
      updateGoal,
      addToGoal,
      withdrawFromGoal,
      removeGoal,
      saveBudget,
      logZeroSpendDay,
      removeZeroSpendDay,
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
      goalRecords,
      goalTransactions,
      budgets,
      zeroSpendDays,
      savePreferences,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      updateIncome,
      removeIncome,
      saveGoal,
      updateGoal,
      addToGoal,
      withdrawFromGoal,
      removeGoal,
      saveBudget,
      logZeroSpendDay,
      removeZeroSpendDay,
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
