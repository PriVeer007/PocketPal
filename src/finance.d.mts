export function currencyDigits(currency?: string): number;
export function toMinorUnits(value: number, currency?: string): number | null;
export function formatMoney(minor: number, currency?: string): string;
export function localDateKey(value: string | Date | number): string;
export function cycleStart(value: string | Date | number, cycleStartDay?: number): Date;
export function nextCycleStart(value: string | Date | number, cycleStartDay?: number): Date;
export function remainingAllowance(allowanceMinor: number, spentMinor: number): number;
export const CYCLE_BUDGET_TOP_UP_SOURCE: 'Allowance';
export function calculateBudgetSummary(params: {
  allowanceMinor?: number;
  incomes?: Array<{ id?: number; amountMinor: number; source: string; occurredAt: string }>;
  cycleStartDate?: string | Date | number;
  cycleThroughDate?: string | Date | number;
  expenseMinor?: number;
  savingsReservedMinor?: number;
  totalCycleDays?: number;
  daysLeft?: number;
  pacingMode?: 'adaptive' | 'fixed';
  zeroSpendDays?: Array<string | { dateKey: string }>;
}): {
  allowanceMinor: number;
  incomeTopUpMinor: number;
  adjustedCycleBudgetMinor: number;
  expenseMinor: number;
  savingsReservedMinor: number;
  availableMinor: number;
  remainingMinor: number;
  dailyRoomMinor: number;
  zeroSpendDays: number;
  mode: 'adaptive' | 'fixed';
};
export function sumExpenses(expenses: Array<{ amountMinor: number; occurredAt: string }>, from: string | Date | number, to: string | Date | number): number;
export function allowanceProgress(spentMinor: number, allowanceMinor: number): number;
export function calculateDailyPace(params: {
  allowanceMinor: number;
  spentMinor: number;
  totalCycleDays: number;
  daysLeft: number;
  pacingMode?: 'adaptive' | 'fixed';
}): { dailyRoomMinor: number; mode: 'adaptive' | 'fixed'; explanation: string };
export function dailySpendTrend(
  expenses: Array<{ amountMinor: number; occurredAt: string }>,
  from: string | Date | number,
  to: string | Date | number
): Array<{ dateKey: string; label: string; dayNumber: number; amountMinor: number }>;
export function weeklySpendTrend(
  expenses: Array<{ amountMinor: number; occurredAt: string }>,
  from: string | Date | number,
  to: string | Date | number
): Array<{ dateKey: string; label: string; dayNumber: number; amountMinor: number }>;
export function monthlySpendTrend(
  expenses: Array<{ amountMinor: number; occurredAt: string }>,
  from: string | Date | number,
  to: string | Date | number
): Array<{ dateKey: string; label: string; dayNumber: number; amountMinor: number }>;
export function goalLedgerSummary(goalTransactions?: Array<{ amountMinor?: number; kind?: 'deposit' | 'withdrawal' }>): {
  depositsMinor: number;
  withdrawalsMinor: number;
  netMinor: number;
  transactionCount: number;
};
export function goalLedgerSummaryForPeriod(
  goalTransactions?: Array<{ amountMinor?: number; kind?: 'deposit' | 'withdrawal'; occurredAt?: string }>,
  from?: string | Date | number,
  to?: string | Date | number
): {
  depositsMinor: number;
  withdrawalsMinor: number;
  netMinor: number;
  transactionCount: number;
  additionsMinor: number;
};
export function applyGoalBalanceChange(
  balanceMinor: number,
  kind: 'deposit' | 'withdrawal',
  amountMinor: number,
  targetMinor?: number
): number;
export function reconcileGoalBalances(goals?: Array<{ id?: number; savedMinor?: number }>, goalTransactions?: Array<{ goalId?: number; goal_id?: number; amountMinor?: number; amount?: number; kind?: 'deposit' | 'withdrawal' }>): Record<number, number>;
export type ActivityRecord = {
  key: string;
  recordId: number;
  type: 'expense' | 'income' | 'savingsAllocation' | 'savingsWithdrawal' | 'goalClosure';
  title: string;
  amountMinor: number;
  occurredAt: string;
  category?: string;
  reflection?: string | null;
  description?: string;
  goalId?: number;
  goalName?: string;
  note?: string | null;
};
export function buildActivityRecords(params?: {
  expenses?: Array<{ id: number; title: string; amountMinor: number; occurredAt: string; category: string; reflection: string | null; note: string | null }>;
  incomes?: Array<{ id: number; title: string; amountMinor: number; occurredAt: string; source: string; note: string | null }>;
  goals?: Array<{ id: number; name: string }>;
  goalTransactions?: Array<{ id: number; goalId?: number; goal_id?: number; kind: 'deposit' | 'withdrawal'; amountMinor: number; occurredAt: string; note: string | null; goalNameSnapshot?: string | null; goal_name_snapshot?: string | null; operationType?: 'Added Savings' | 'Withdrawal' | 'Deleted Goal Withdrawal' | null; operation_type?: 'Added Savings' | 'Withdrawal' | 'Deleted Goal Withdrawal' | null }>;
}): ActivityRecord[];
export function categoryColor(category: string): string;
export type SpendingProfileStatus = 'no-data' | 'insufficient-data' | 'ready' | 'error';
export type SpendingPersona = {
  id: string;
  name: string;
  description: string;
  evidence: string;
};
export type SpendingProfile = {
  status: SpendingProfileStatus;
  persona: SpendingPersona | null;
  secondaryPersona: SpendingPersona | null;
  mindfulPercentage: number | null;
  eligibleTransactionCount: number;
  distinctDayCount?: number;
};
export function calculateSpendingProfile(params: {
  expenses?: Array<{ amountMinor: number; category?: string; occurredAt: string; reflection?: string | null }>;
  from: string | Date | number;
  to: string | Date | number;
  allowanceMinor?: number;
  savingsTransactions?: Array<{ kind?: 'deposit' | 'withdrawal'; amountMinor?: number; occurredAt?: string }>;
  trend?: Array<{ amountMinor: number }>;
  currency?: string;
}): SpendingProfile;
export function categoryBreakdown(
  expenses: Array<{ amountMinor: number; category: string; occurredAt: string }>,
  from: string | Date | number,
  to: string | Date | number
): Array<{ category: string; totalMinor: number; count: number; percentage: number }>;
export function calculateLoggingStreak(
  expenses: Array<{ occurredAt: string }>,
  referenceDate?: Date | string | number,
  zeroSpendDates?: Array<string | { dateKey: string; createdAt?: string }>
): { currentStreak: number; longestStreak: number; loggedToday: boolean };
export function monthCalendarData(
  expenses: Array<{ id: number; amountMinor: number; title: string; category: string; occurredAt: string; reflection: string | null; note: string | null }>,
  year: number,
  month: number,
  referenceDate?: Date | string | number,
  zeroSpendDates?: Array<string | { dateKey: string; createdAt?: string }>
): {
  year: number;
  month: number;
  startOffset: number;
  days: Array<{
    dayNumber: number;
    dateKey: string;
    amountMinor: number;
    count: number;
    items: Array<{ id: number; amountMinor: number; title: string; category: string; occurredAt: string; reflection: string | null; note: string | null }>;
    isToday: boolean;
    isFuture: boolean;
    isZeroSpend: boolean;
  }>;
  totalSpentMinor: number;
  zeroSpendDays: number;
  activeSpendDays: number;
  maxDailyMinor: number;
};
export function generateExpensesCSV(
  expenses: Array<{ id: number; occurredAt: string; title: string; category: string; amountMinor: number; reflection: string | null; note: string | null }>,
  currency?: string
): string;
export function generateBackupJSON(
  preferences: unknown,
  expenses: unknown,
  goals: unknown,
  budgets: unknown,
  zeroSpendDays?: unknown,
  incomes?: unknown,
  goalTransactions?: unknown
): string;
export function validateBackupPayload(data: unknown): { version: number; expenseCount: number; incomeCount: number; goalCount: number; goalTransactionCount: number; zeroSpendCount: number };
export function validateExpense(entry: { amount: number; title: string; category: string; currency: string }): Partial<Record<'amount' | 'title' | 'category' | 'currency', string>>;
