import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowanceProgress,
  calculateDailyPace,
  calculateLoggingStreak,
  categoryBreakdown,
  currencyDigits,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  generateBackupJSON,
  generateExpensesCSV,
  localDateKey,
  monthCalendarData,
  monthlySpendTrend,
  nextCycleStart,
  remainingAllowance,
  sumExpenses,
  toMinorUnits,
  validateExpense,
  weeklySpendTrend,
} from './finance.mjs';

test('converts currency to integer minor units without floating point drift', () => {
  assert.equal(toMinorUnits(12.34), 1234);
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
  assert.equal(toMinorUnits(-1), null);
  assert.equal(toMinorUnits(Number.NaN), null);
});

test('formats currency and remains usable for unsupported locale data', () => {
  assert.match(formatMoney(125050, 'INR'), /1,250/);
  assert.equal(formatMoney(0, 'INR').includes('0'), true);
});

test('respects currencies with zero, two, and three fractional digits', () => {
  assert.equal(currencyDigits('JPY'), 0);
  assert.equal(currencyDigits('INR'), 2);
  assert.equal(currencyDigits('BHD'), 3);
  assert.equal(toMinorUnits(100, 'JPY'), 100);
  assert.equal(toMinorUnits(1.234, 'BHD'), 1234);
});

test('calculates allowance progress and remaining without exceeding bounds', () => {
  assert.equal(remainingAllowance(10000, 2500), 7500);
  assert.equal(remainingAllowance(10000, 12000), 0);
  assert.equal(allowanceProgress(5000, 10000), 0.5);
  assert.equal(allowanceProgress(12000, 10000), 1);
  assert.equal(allowanceProgress(10, 0), 0);
});

test('uses local dates for allowance cycle boundaries and avoids month rollover', () => {
  const date = new Date(2026, 10, 8, 16, 30);
  assert.equal(localDateKey(date), '2026-11-08');
  assert.equal(cycleStart(date, 5).getDate(), 5);
  assert.equal(cycleStart(new Date(2026, 10, 2), 5).getMonth(), 9);
  assert.equal(nextCycleStart(new Date(2026, 10, 2), 5).getMonth(), 10);
  assert.throws(() => localDateKey('not-a-date'), RangeError);
  assert.throws(() => cycleStart(date, 31), RangeError);
});

test('sums expense days in local calendar time, including the boundaries', () => {
  const expenses = [
    { amountMinor: 450, occurredAt: new Date(2026, 10, 3, 23, 45).toISOString() },
    { amountMinor: 250, occurredAt: new Date(2026, 10, 5, 8, 10).toISOString() },
    { amountMinor: 999, occurredAt: new Date(2026, 9, 30, 8, 10).toISOString() },
  ];
  assert.equal(sumExpenses(expenses, new Date(2026, 10, 3), new Date(2026, 10, 4)), 450);
});

test('computes daily spend trends across a date window', () => {
  const expenses = [
    { amountMinor: 300, occurredAt: new Date(2026, 10, 2, 10, 0).toISOString() },
    { amountMinor: 200, occurredAt: new Date(2026, 10, 2, 14, 0).toISOString() },
    { amountMinor: 150, occurredAt: new Date(2026, 10, 3, 9, 0).toISOString() },
  ];
  const trend = dailySpendTrend(expenses, new Date(2026, 10, 1), new Date(2026, 10, 3));
  assert.equal(trend.length, 3);
  assert.equal(trend[0].amountMinor, 0);
  assert.equal(trend[1].amountMinor, 500);
  assert.equal(trend[2].amountMinor, 150);
});

test('computes category breakdowns with percentages', () => {
  const expenses = [
    { amountMinor: 400, category: 'Food', occurredAt: new Date(2026, 10, 2).toISOString() },
    { amountMinor: 100, category: 'Transport', occurredAt: new Date(2026, 10, 2).toISOString() },
  ];
  const breakdown = categoryBreakdown(expenses, new Date(2026, 10, 1), new Date(2026, 10, 3));
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].category, 'Food');
  assert.equal(breakdown[0].percentage, 80);
  assert.equal(breakdown[1].category, 'Transport');
  assert.equal(breakdown[1].percentage, 20);
});

test('computes logging streaks correctly', () => {
  const ref = new Date(2026, 10, 15);
  const expenses = [
    { occurredAt: new Date(2026, 10, 15, 12, 0).toISOString() },
    { occurredAt: new Date(2026, 10, 14, 18, 0).toISOString() },
    { occurredAt: new Date(2026, 10, 13, 9, 0).toISOString() },
    { occurredAt: new Date(2026, 10, 10, 9, 0).toISOString() },
  ];

  const streak = calculateLoggingStreak(expenses, ref);
  assert.equal(streak.currentStreak, 3);
  assert.equal(streak.loggedToday, true);
  assert.equal(streak.longestStreak, 3);

  // If not logged today, but logged yesterday, streak stays alive
  const refTomorrow = new Date(2026, 10, 16);
  const aliveStreak = calculateLoggingStreak(expenses, refTomorrow);
  assert.equal(aliveStreak.currentStreak, 3);
  assert.equal(aliveStreak.loggedToday, false);
});

test('generates calendar heatmap data and identifies zero spend days', () => {
  const ref = new Date(2026, 10, 10);
  const expenses = [
    { id: 1, amountMinor: 200, title: 'Bus', category: 'Transport', occurredAt: new Date(2026, 10, 2, 10, 0).toISOString(), reflection: null, note: null },
    { id: 2, amountMinor: 350, title: 'Lunch', category: 'Food', occurredAt: new Date(2026, 10, 5, 12, 0).toISOString(), reflection: null, note: null },
  ];

  const cal = monthCalendarData(expenses, 2026, 10, ref);
  assert.equal(cal.days.length, 30); // November has 30 days
  assert.equal(cal.activeSpendDays, 2);
  assert.equal(cal.zeroSpendDays, 8); // 10 days elapsed - 2 spend days = 8 zero spend days
  assert.equal(cal.totalSpentMinor, 550);
});

test('generates CSV and JSON backup strings properly', () => {
  const expenses = [
    { id: 1, occurredAt: '2026-11-10T12:00:00.000Z', title: 'Lunch "Special"', category: 'Food', amountMinor: 15000, reflection: 'Planned', note: 'With friends' },
  ];
  const csv = generateExpensesCSV(expenses, 'INR');
  assert.match(csv, /"Lunch ""Special"""/);
  assert.match(csv, /150\.00/);

  const json = generateBackupJSON({ name: 'Alex' }, expenses, [], {});
  assert.match(json, /Pennywise/);
  assert.match(json, /"name": "Alex"/);
});

test('calculates adaptive rollover vs fixed daily pacing', () => {
  // Allowance = ₹9,000 (900000 minor), 30 days total
  // Day 1: spent = 0, daysLeft = 30
  const day1Adaptive = calculateDailyPace({
    allowanceMinor: 900000,
    spentMinor: 0,
    totalCycleDays: 30,
    daysLeft: 30,
    pacingMode: 'adaptive',
  });
  assert.equal(day1Adaptive.dailyRoomMinor, 30000); // ₹300

  // Day 2: Student spent nothing on day 1! (zero-spend day)
  // Now daysLeft = 29, remaining = 900000
  const day2Adaptive = calculateDailyPace({
    allowanceMinor: 900000,
    spentMinor: 0,
    totalCycleDays: 30,
    daysLeft: 29,
    pacingMode: 'adaptive',
  });
  // Unspent budget rolls over and increases daily room!
  assert.equal(day2Adaptive.dailyRoomMinor, 31034); // ₹310.34
  assert.equal(day2Adaptive.dailyRoomMinor > day1Adaptive.dailyRoomMinor, true);

  // Fixed pacing remains constant benchmark regardless of zero-spend days
  const fixed = calculateDailyPace({
    allowanceMinor: 900000,
    spentMinor: 0,
    totalCycleDays: 30,
    daysLeft: 29,
    pacingMode: 'fixed',
  });
  assert.equal(fixed.dailyRoomMinor, 30000);
});

test('validates quick expense fields and keeps reflection optional', () => {
  const entry = { amount: 42.5, title: 'Lunch', category: 'Food', currency: 'INR' };
  assert.deepEqual(validateExpense(entry), {});
  assert.ok(validateExpense({ ...entry, amount: 0 }).amount);
  assert.ok(validateExpense({ ...entry, title: ' ' }).title);
});

test('computes weekly and monthly spend trends', () => {
  const expenses = [
    { amountMinor: 2000, occurredAt: '2026-11-02T10:00:00.000Z' },
    { amountMinor: 3000, occurredAt: '2026-11-10T12:00:00.000Z' },
  ];
  const weekly = weeklySpendTrend(expenses, '2026-11-01', '2026-11-28');
  assert.ok(weekly.length >= 4);
  assert.equal(weekly[0].amountMinor, 2000);

  const monthly = monthlySpendTrend(expenses, '2026-10-01', '2026-11-30');
  assert.equal(monthly.length, 2);
  assert.equal(monthly[1].amountMinor, 5000);
});
