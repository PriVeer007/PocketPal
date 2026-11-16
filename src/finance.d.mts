export function currencyDigits(currency?: string): number;
export function toMinorUnits(value: number, currency?: string): number | null;
export function formatMoney(minor: number, currency?: string): string;
export function localDateKey(value: string | Date | number): string;
export function cycleStart(value: string | Date | number, cycleStartDay?: number): Date;
export function nextCycleStart(value: string | Date | number, cycleStartDay?: number): Date;
export function remainingAllowance(allowanceMinor: number, spentMinor: number): number;
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
export function categoryBreakdown(
  expenses: Array<{ amountMinor: number; category: string; occurredAt: string }>,
  from: string | Date | number,
  to: string | Date | number
): Array<{ category: string; totalMinor: number; count: number; percentage: number }>;
export function calculateLoggingStreak(
  expenses: Array<{ occurredAt: string }>,
  referenceDate?: Date | string | number
): { currentStreak: number; longestStreak: number; loggedToday: boolean };
export function monthCalendarData(
  expenses: Array<{ id: number; amountMinor: number; title: string; category: string; occurredAt: string; reflection: string | null; note: string | null }>,
  year: number,
  month: number,
  referenceDate?: Date | string | number
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
  budgets: unknown
): string;
export function validateExpense(entry: { amount: number; title: string; category: string; currency: string }): Partial<Record<'amount' | 'title' | 'category' | 'currency', string>>;
