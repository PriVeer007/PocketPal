import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowanceProgress,
  applyGoalBalanceChange,
  buildActivityRecords,
  calculateBudgetSummary,
  calculateDailyPace,
  calculateLoggingStreak,
  calculateSpendingProfile,
  categoryBreakdown,
  categoryColor,
  currencyDigits,
  cycleStart,
  dailySpendTrend,
  formatMoney,
  generateBackupJSON,
  generateExpensesCSV,
  goalLedgerSummary,
  goalLedgerSummaryForPeriod,
  localDateKey,
  monthCalendarData,
  monthlySpendTrend,
  nextCycleStart,
  reconcileGoalBalances,
  remainingAllowance,
  sumExpenses,
  toMinorUnits,
  validateBackupPayload,
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

test('builds the cycle budget from base allowance and all eligible in-cycle income', () => {
  const cycleStartDate = new Date(2026, 10, 5);
  const cycleThroughDate = new Date(2026, 10, 20);
  const base = calculateBudgetSummary({ allowanceMinor: 10000 });
  assert.equal(base.allowanceMinor, 10000);
  assert.equal(base.incomeTopUpMinor, 0);
  assert.equal(base.adjustedCycleBudgetMinor, 10000);
  const ordinaryIncome = calculateBudgetSummary({
    allowanceMinor: 10000,
    incomes: [{ amountMinor: 5000, source: 'Scholarship', occurredAt: '2026-11-10T12:00:00.000Z' }],
    cycleStartDate,
    cycleThroughDate,
  });
  assert.equal(ordinaryIncome.incomeTopUpMinor, 5000);
  assert.equal(ordinaryIncome.adjustedCycleBudgetMinor, 15000);

  const incomes = [
    { id: 1, amountMinor: 2000, source: 'Allowance', occurredAt: '2026-11-05T12:00:00.000Z' },
    { id: 2, amountMinor: 1000, source: 'Allowance', occurredAt: '2026-11-20T12:00:00.000Z' },
    { id: 3, amountMinor: 5000, source: 'Scholarship', occurredAt: '2026-11-10T12:00:00.000Z' },
    { id: 4, amountMinor: 6000, source: 'Part-time work', occurredAt: '2026-11-12T12:00:00.000Z' },
    { id: 5, amountMinor: 1500, source: 'Freelance', occurredAt: '2026-11-15T12:00:00.000Z' },
    { id: 6, amountMinor: 2500, source: 'Other', occurredAt: '2026-11-16T12:00:00.000Z' },
    { id: 7, amountMinor: 7000, source: 'Custom source', occurredAt: '2026-11-04T12:00:00.000Z' },
    { id: 8, amountMinor: 8000, source: 'Custom source', occurredAt: '2026-11-21T12:00:00.000Z' },
  ];
  const summary = calculateBudgetSummary({
    allowanceMinor: 10000,
    incomes,
    cycleStartDate,
    cycleThroughDate,
  });

  assert.equal(summary.allowanceMinor, 10000);
  assert.equal(summary.incomeTopUpMinor, 18000);
  assert.equal(summary.adjustedCycleBudgetMinor, 28000);
  assert.equal(summary.availableMinor, 28000);
});

test('includes every built-in and custom income source independently', () => {
  const sources = ['Allowance', 'Scholarship', 'Part-time work', 'Freelance', 'Other', 'Custom source'];
  for (const source of sources) {
    const summary = calculateBudgetSummary({
      allowanceMinor: 10000,
      incomes: [{ id: 1, amountMinor: 1250, source, occurredAt: '2026-11-10T12:00:00.000Z' }],
      cycleStartDate: new Date(2026, 10, 1),
      cycleThroughDate: new Date(2026, 10, 30),
    });
    assert.equal(summary.incomeTopUpMinor, 1250, `${source} should contribute to extra income`);
    assert.equal(summary.adjustedCycleBudgetMinor, 11250, `${source} should not replace or duplicate the base allowance`);
  }
});

test('shows ₹1,500 extra and ₹13,500 available as the five income sources are added', () => {
  const incomes = [];
  const entries = [
    { source: 'Allowance', amountMinor: 20_000 },
    { source: 'Scholarship', amountMinor: 50_000 },
    { source: 'Part-time work', amountMinor: 30_000 },
    { source: 'Freelance', amountMinor: 40_000 },
    { source: 'Other', amountMinor: 10_000 },
  ];
  const cycleStartDate = new Date(2026, 10, 1);
  const cycleThroughDate = new Date(2026, 10, 28);

  entries.forEach((entry, index) => {
    incomes.push({
      ...entry,
      id: index + 1,
      title: entry.source,
      occurredAt: '2026-11-28T12:00:00.000Z',
    });
    const summary = calculateBudgetSummary({
      allowanceMinor: 1_200_000,
      incomes,
      cycleStartDate,
      cycleThroughDate,
      expenseMinor: 0,
      savingsReservedMinor: 0,
    });

    assert.equal(summary.incomeTopUpMinor, entries.slice(0, index + 1).reduce((total, item) => total + item.amountMinor, 0));
    assert.equal(summary.availableMinor, 1_200_000 + summary.incomeTopUpMinor);
  });

  const finalSummary = calculateBudgetSummary({
    allowanceMinor: 1_200_000,
    incomes,
    cycleStartDate,
    cycleThroughDate,
  });
  assert.equal(finalSummary.incomeTopUpMinor, 150_000);
  assert.equal(finalSummary.availableMinor, 1_350_000);
  assert.equal(
    `Base ${formatMoney(finalSummary.allowanceMinor, 'INR')} + Extra ${formatMoney(finalSummary.incomeTopUpMinor, 'INR')}`,
    'Base ₹12,000.00 + Extra ₹1,500.00'
  );
  assert.equal(formatMoney(finalSummary.availableMinor, 'INR'), '₹13,500.00');
});

test('matches the adjusted-cycle dashboard values for the ₹10,000 + ₹1,500 example', () => {
  const summary = calculateBudgetSummary({
    allowanceMinor: 1_000_000,
    incomes: [
      { id: 1, amountMinor: 150_000, source: 'Allowance', occurredAt: '2026-11-20T12:00:00.000Z' },
    ],
    cycleStartDate: new Date(2026, 10, 1),
    cycleThroughDate: new Date(2026, 10, 24),
    expenseMinor: 404_200,
  });

  assert.equal(summary.allowanceMinor, 1_000_000);
  assert.equal(summary.incomeTopUpMinor, 150_000);
  assert.equal(summary.adjustedCycleBudgetMinor, 1_150_000);
  assert.equal(summary.availableMinor, 745_800);
  assert.ok(Math.abs(allowanceProgress(summary.expenseMinor, summary.adjustedCycleBudgetMinor) - 0.3514782609) < 0.000000001);
});

test('counts distinct income transactions once across source types', () => {
  const summary = calculateBudgetSummary({
    allowanceMinor: 1_000_000,
    incomes: [
      { id: 1, amountMinor: 50_000, source: 'Scholarship', occurredAt: '2026-11-20T12:00:00.000Z' },
      { id: 1, amountMinor: 50_000, source: 'Scholarship', occurredAt: '2026-11-20T12:00:00.000Z' },
      { id: 2, amountMinor: 100_000, source: 'Freelance', occurredAt: '2026-11-21T12:00:00.000Z' },
    ],
    cycleStartDate: new Date(2026, 10, 1),
    cycleThroughDate: new Date(2026, 10, 24),
    expenseMinor: 404_200,
  });

  assert.equal(summary.incomeTopUpMinor, 150_000);
  assert.equal(summary.adjustedCycleBudgetMinor, 1_150_000);
  assert.equal(summary.availableMinor, 745_800);
});

test('recalculates the cycle budget when an eligible income top-up is edited or deleted', () => {
  const cycleStartDate = new Date(2026, 10, 1);
  const cycleThroughDate = new Date(2026, 10, 30);
  const topUp = { id: 1, amountMinor: 150_000, source: 'Allowance', occurredAt: '2026-11-10T12:00:00.000Z' };
  const additionalTopUp = { id: 2, amountMinor: 50_000, source: 'Allowance', occurredAt: '2026-11-12T12:00:00.000Z' };
  const summarize = (incomes) => calculateBudgetSummary({
    allowanceMinor: 1_000_000,
    incomes,
    cycleStartDate,
    cycleThroughDate,
    expenseMinor: 404_200,
  });

  const oneTopUp = summarize([topUp]);
  assert.equal(oneTopUp.adjustedCycleBudgetMinor, 1_150_000);
  assert.equal(oneTopUp.availableMinor, 745_800);

  const twoTopUps = summarize([topUp, additionalTopUp]);
  assert.equal(twoTopUps.adjustedCycleBudgetMinor, 1_200_000);
  assert.equal(twoTopUps.availableMinor, 795_800);

  const afterDeletion = summarize([topUp]);
  assert.equal(afterDeletion.adjustedCycleBudgetMinor, 1_150_000);
  assert.equal(afterDeletion.availableMinor, 745_800);

  const afterEdit = summarize([{ ...topUp, amountMinor: 200_000 }]);
  assert.equal(afterEdit.adjustedCycleBudgetMinor, 1_200_000);
  assert.equal(afterEdit.availableMinor, 795_800);

  const afterSourceEdit = summarize([{ ...topUp, source: 'Freelance' }]);
  assert.equal(afterSourceEdit.incomeTopUpMinor, 150_000);
  assert.equal(afterSourceEdit.adjustedCycleBudgetMinor, 1_150_000);
  assert.equal(afterSourceEdit.availableMinor, 745_800);

  const afterDateEdit = summarize([{ ...topUp, occurredAt: '2026-10-31T12:00:00.000Z' }]);
  assert.equal(afterDateEdit.incomeTopUpMinor, 0);
  assert.equal(afterDateEdit.adjustedCycleBudgetMinor, 1_000_000);
  assert.equal(afterDateEdit.availableMinor, 595_800);

  const withUnchangedSavings = calculateBudgetSummary({
    allowanceMinor: 1_000_000,
    incomes: [{ ...topUp, source: 'Freelance' }],
    cycleStartDate,
    cycleThroughDate,
    expenseMinor: 404_200,
    savingsReservedMinor: 20_000,
  });
  assert.equal(withUnchangedSavings.expenseMinor, 404_200);
  assert.equal(withUnchangedSavings.savingsReservedMinor, 20_000);
  assert.equal(withUnchangedSavings.availableMinor, 725_800);

  const noTopUps = summarize([]);
  assert.equal(noTopUps.adjustedCycleBudgetMinor, 1_000_000);
  assert.equal(noTopUps.availableMinor, 595_800);
});

test('deducts expenses and net savings once from the adjusted budget', () => {
  const cycleStartDate = new Date(2026, 10, 1);
  const cycleThroughDate = new Date(2026, 10, 30);
  const incomes = [{ id: 1, amountMinor: 2000, source: 'Allowance', occurredAt: '2026-11-10T12:00:00.000Z' }];
  const goals = [{ id: 1 }];
  const deposit = { id: 1, goalId: 1, kind: 'deposit', amountMinor: 1000 };
  const withdrawal = { id: 2, goalId: 1, kind: 'withdrawal', amountMinor: 1000 };
  const summarize = (goalTransactions) => {
    const balances = reconcileGoalBalances(goals, goalTransactions);
    const savingsReservedMinor = Object.values(balances).reduce((total, amount) => total + amount, 0);
    return calculateBudgetSummary({
      allowanceMinor: 10000,
      incomes,
      cycleStartDate,
      cycleThroughDate,
      expenseMinor: 3000,
      savingsReservedMinor,
    });
  };

  const afterAllocation = summarize([deposit]);
  assert.equal(afterAllocation.adjustedCycleBudgetMinor, 12000);
  assert.equal(afterAllocation.availableMinor, 8000);
  assert.equal(allowanceProgress(afterAllocation.expenseMinor, afterAllocation.adjustedCycleBudgetMinor), 0.25);

  const afterWithdrawal = summarize([deposit, withdrawal]);
  assert.equal(afterWithdrawal.availableMinor, 9000);
  assert.equal(afterWithdrawal.savingsReservedMinor, 0);
  assert.equal(afterWithdrawal.incomeTopUpMinor, 2000);
});

test('uses adjusted budget for zero-spend progress and caps visual progress at 100 percent', () => {
  const cycleStartDate = new Date(2026, 10, 1);
  const cycleThroughDate = new Date(2026, 10, 30);
  const summary = calculateBudgetSummary({
    allowanceMinor: 10000,
    incomes: [{ id: 1, amountMinor: 2000, source: 'Allowance', occurredAt: '2026-11-10T12:00:00.000Z' }],
    cycleStartDate,
    cycleThroughDate,
  });

  assert.equal(summary.availableMinor, 12000);
  assert.equal(allowanceProgress(0, summary.adjustedCycleBudgetMinor), 0);
  assert.equal(allowanceProgress(3000, 13000), 3000 / 13000);
  assert.equal(allowanceProgress(13000, summary.adjustedCycleBudgetMinor), 1);
  assert.equal(allowanceProgress(15000, summary.adjustedCycleBudgetMinor), 1);
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

  const zeroSpendStreak = calculateLoggingStreak([], new Date(2026, 10, 17), ['2026-11-16', '2026-11-17']);
  assert.equal(zeroSpendStreak.loggedToday, true);
  assert.equal(zeroSpendStreak.currentStreak, 2);
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

test('summarizes savings activity by period and preserves exact operation classifications', () => {
  const transactions = [
    { id: 1, kind: 'deposit', amountMinor: 25000, occurredAt: '2026-11-03T10:00:00.000Z', operationType: 'Added Savings', goalNameSnapshot: 'Books' },
    { id: 2, kind: 'withdrawal', amountMinor: 5000, occurredAt: '2026-11-10T10:00:00.000Z', operationType: 'Withdrawal', goalNameSnapshot: 'Books' },
    { id: 3, kind: 'withdrawal', amountMinor: 7000, occurredAt: '2026-11-12T10:00:00.000Z', operationType: 'Deleted Goal Withdrawal', goalNameSnapshot: 'Laptop', note: 'Withdrawn from deleted Laptop' },
    { id: 4, kind: 'deposit', amountMinor: 9000, occurredAt: '2026-10-12T10:00:00.000Z', operationType: 'Added Savings', goalNameSnapshot: 'Old goal' },
  ];
  const summary = goalLedgerSummaryForPeriod(
    transactions,
    new Date(2026, 10, 1),
    new Date(2026, 10, 30)
  );

  assert.equal(summary.additionsMinor, 25000);
  assert.equal(summary.withdrawalsMinor, 12000);
  assert.equal(summary.netMinor, 13000);
  assert.equal(summary.transactionCount, 3);

  const records = buildActivityRecords({
    goals: [{ id: 2, name: 'Laptop' }],
    goalTransactions: transactions.map((tx) => ({ ...tx, goalId: 2 })),
  });
  assert.equal(records.find((record) => record.type === 'goalClosure')?.title, 'Withdrawn from deleted Laptop');
  assert.equal(records.find((record) => record.type === 'savingsAllocation')?.title, 'Added Savings — Books');
  assert.equal(records.find((record) => record.type === 'savingsWithdrawal')?.title, 'Withdrawal — Books');
});

test('summarizes savings ledger activity and includes it in backups', () => {
  const summary = goalLedgerSummary([
    { kind: 'deposit', amountMinor: 25000 },
    { kind: 'deposit', amountMinor: 5000 },
    { kind: 'withdrawal', amountMinor: 6000 },
  ]);
  assert.equal(summary.depositsMinor, 30000);
  assert.equal(summary.withdrawalsMinor, 6000);
  assert.equal(summary.netMinor, 24000);

  const expenses = [
    { id: 1, occurredAt: '2026-11-10T12:00:00.000Z', title: 'Lunch "Special"', category: 'Food', amountMinor: 15000, reflection: 'Planned', note: 'With friends' },
  ];
  const csv = generateExpensesCSV(expenses, 'INR');
  assert.match(csv, /"Lunch ""Special"""/);
  assert.match(csv, /150\.00/);

  const zeroSpendDays = ['2026-11-09'];
  const incomes = [{ id: 1, amountMinor: 25000, title: 'Freelance', source: 'Client', occurredAt: '2026-11-08T10:00:00.000Z', note: null }];
  const goalTransactions = [{ id: 1, goalId: 42, kind: 'deposit', amountMinor: 25000, occurredAt: '2026-11-08T10:00:00.000Z', note: null }];
  const goals = [{ id: 42, name: 'Books', targetMinor: 50000, savedMinor: 25000, createdAt: '2026-11-01T10:00:00.000Z', deletedAt: null }];
  const json = generateBackupJSON({ name: 'Alex' }, expenses, goals, {}, zeroSpendDays, incomes, goalTransactions);
  assert.match(json, /PocketPal/);
  assert.match(json, /"name": "Alex"/);
  assert.match(json, /"zeroSpendDays": \[\s*"2026-11-09"/s);
  assert.match(json, /"incomes": \[/);
  assert.match(json, /"goalTransactions": \[/);

  const parsed = JSON.parse(json);
  const validated = validateBackupPayload(parsed);
  assert.equal(validated.goalTransactionCount, 1);
  assert.doesNotThrow(() => validateBackupPayload(parsed));
  assert.throws(() => validateBackupPayload({ app: 'Wrong' }), /Invalid PocketPal backup file/);
});

test('reconciles goal balances from ledger entries instead of cached balances', () => {
  const goals = [
    { id: 1, savedMinor: 1000 },
    { id: 2, savedMinor: 2000 },
  ];
  const goalTransactions = [
    { goalId: 1, kind: 'deposit', amountMinor: 1500 },
    { goalId: 1, kind: 'withdrawal', amountMinor: 250 },
    { goalId: 2, kind: 'deposit', amountMinor: 800 },
    { goalId: 2, kind: 'withdrawal', amountMinor: 100 },
  ];

  const balances = reconcileGoalBalances(goals, goalTransactions);
  assert.equal(balances[1], 1250);
  assert.equal(balances[2], 700);
  assert.equal(Object.keys(balances).length, 2);
});

test('savings allocation and withdrawal update available budget by the exact amounts', () => {
  const allowanceMinor = 1000000;
  const expenseMinor = 200000;
  const depositMinor = 50000;
  const withdrawalMinor = 20000;

  const afterDeposit = applyGoalBalanceChange(0, 'deposit', depositMinor, 1000000);
  assert.equal(afterDeposit, 50000);
  const afterDepositSummary = calculateBudgetSummary({
    allowanceMinor,
    expenseMinor,
    savingsReservedMinor: afterDeposit,
  });
  assert.equal(afterDepositSummary.availableMinor, 750000);
  assert.equal(afterDepositSummary.expenseMinor, expenseMinor);

  const afterWithdrawal = applyGoalBalanceChange(afterDeposit, 'withdrawal', withdrawalMinor);
  assert.equal(afterWithdrawal, 30000);
  const afterWithdrawalSummary = calculateBudgetSummary({
    allowanceMinor,
    expenseMinor,
    savingsReservedMinor: afterWithdrawal,
  });
  assert.equal(afterWithdrawalSummary.availableMinor, 770000);
  assert.equal(afterWithdrawalSummary.expenseMinor, expenseMinor);
  assert.throws(() => applyGoalBalanceChange(afterWithdrawal, 'withdrawal', 30001), /exceeds the current balance/);
  assert.throws(() => applyGoalBalanceChange(0, 'deposit', 100001, 100000), /exceed the goal target/);
  assert.throws(() => applyGoalBalanceChange(afterWithdrawal, 'withdrawal', 0), /valid savings amount/);

  const persistedBalance = reconcileGoalBalances(
    [{ id: 1, savedMinor: afterWithdrawal }],
    [
      { id: 1, goalId: 1, kind: 'deposit', amountMinor: depositMinor },
      { id: 2, goalId: 1, kind: 'withdrawal', amountMinor: withdrawalMinor },
    ]
  );
  assert.equal(persistedBalance[1], afterWithdrawal);
});

test('builds one shared activity history for expenses, income, savings, and goal closures', () => {
  const records = buildActivityRecords({
    expenses: [
      { id: 1, title: 'Lunch', amountMinor: 2000, occurredAt: '2026-11-03T12:00:00.000Z', category: 'Food', reflection: 'Planned', note: null },
    ],
    incomes: [
      { id: 1, title: 'Allowance', amountMinor: 50000, occurredAt: '2026-11-03T11:00:00.000Z', source: 'Family allowance', note: null },
    ],
    goals: [{ id: 7, name: 'Books' }],
    goalTransactions: [
      { id: 1, goalId: 7, kind: 'deposit', amountMinor: 10000, occurredAt: '2026-11-03T10:00:00.000Z', note: null },
      { id: 2, goalId: 7, kind: 'withdrawal', amountMinor: 5000, occurredAt: '2026-11-03T09:00:00.000Z', note: null },
      { id: 3, goalId: 7, kind: 'withdrawal', amountMinor: 5000, occurredAt: '2026-11-03T08:00:00.000Z', note: 'Goal closed: Books' },
    ],
  });

  assert.equal(records.length, 5);
  assert.equal(new Set(records.map((record) => record.key)).size, records.length);
  assert.equal(records[0].type, 'expense');
  assert.equal(records.find((record) => record.type === 'income').amountMinor, 50000);
  assert.equal(records.find((record) => record.type === 'savingsAllocation').goalName, 'Books');
  assert.equal(records.find((record) => record.type === 'goalClosure').type, 'goalClosure');
  assert.equal(dailySpendTrend([{ amountMinor: 2000, occurredAt: '2026-11-03T12:00:00.000Z' }], '2026-11-03', '2026-11-03')[0].amountMinor, 2000);
});

test('spending profiles return no-data and insufficient-data states without fabrication', () => {
  const from = new Date(2026, 10, 1);
  const to = new Date(2026, 10, 30);

  const noData = calculateSpendingProfile({ expenses: [], from, to });
  assert.equal(noData.status, 'no-data');
  assert.equal(noData.persona, null);
  assert.equal(noData.mindfulPercentage, null);

  const oneExpense = calculateSpendingProfile({
    expenses: [
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 3).toISOString(), reflection: 'Planned' },
    ],
    from,
    to,
  });
  assert.equal(oneExpense.status, 'insufficient-data');
  assert.equal(oneExpense.eligibleTransactionCount, 1);

  const fiveSameDay = calculateSpendingProfile({
    expenses: Array.from({ length: 5 }, (_, index) => ({
      amountMinor: 1000,
      category: 'Food',
      occurredAt: new Date(2026, 10, 3, index + 8).toISOString(),
      reflection: 'Needed',
    })),
    from,
    to,
  });
  assert.equal(fiveSameDay.status, 'insufficient-data');
  assert.equal(fiveSameDay.eligibleTransactionCount, 5);
});

test('spending profiles classify deterministic supported personas', () => {
  const from = new Date(2026, 10, 1);
  const to = new Date(2026, 10, 30);
  const expense = (day, amountMinor, category, reflection = 'Needed') => ({
    amountMinor,
    category,
    occurredAt: new Date(2026, 10, day, 12).toISOString(),
    reflection,
  });

  const food = calculateSpendingProfile({
    expenses: [1, 5, 8, 12, 20].map((day) => expense(day, day === 20 ? 1200 : 2400, 'Food')),
    from,
    to,
  });
  assert.equal(food.status, 'ready');
  assert.equal(food.persona.id, 'food-enthusiast');

  const transport = calculateSpendingProfile({
    expenses: [1, 5, 8, 12, 20].map((day) => expense(day, day === 1 ? 500 : 2000, 'Transport')),
    from,
    to,
  });
  assert.equal(transport.persona.id, 'transport-heavy');

  const impulse = calculateSpendingProfile({
    expenses: [1, 5, 8, 12, 20].map((day, index) =>
      expense(day, 1000 + index * 100, 'Shopping', index < 4 ? 'Just wanted it' : 'Needed')
    ),
    from,
    to,
  });
  assert.equal(impulse.persona.id, 'impulse-prone');
  assert.equal(impulse.mindfulPercentage, 20);

  const balanced = calculateSpendingProfile({
    expenses: [
      expense(1, 1000, 'Food'),
      expense(5, 1000, 'Transport'),
      expense(8, 1000, 'Study'),
      expense(12, 1000, 'Social'),
      expense(20, 1000, 'Shopping'),
    ],
    from,
    to,
  });
  assert.equal(balanced.persona.id, 'balanced');

  const savvy = calculateSpendingProfile({
    expenses: [
      expense(1, 500, 'Food'),
      expense(5, 500, 'Transport'),
      expense(8, 500, 'Study'),
      expense(12, 500, 'Social'),
      expense(20, 500, 'Shopping'),
    ],
    from,
    to,
    allowanceMinor: 10000,
    savingsTransactions: [
      { kind: 'deposit', amountMinor: 3000, occurredAt: new Date(2026, 10, 10).toISOString() },
    ],
  });
  assert.equal(savvy.persona.id, 'savvy-saver');

  const inconsistent = calculateSpendingProfile({
    expenses: [1, 5, 8, 12, 20].map((day) => expense(day, 1000, 'Other')),
    from,
    to,
    trend: [
      { amountMinor: 100 },
      { amountMinor: 5000 },
      { amountMinor: 100 },
      { amountMinor: 5000 },
    ],
  });
  assert.equal(inconsistent.persona.id, 'inconsistent');
});

test('income and savings are excluded from spending profile expenditure', () => {
  const from = new Date(2026, 10, 1);
  const to = new Date(2026, 10, 30);
  const result = calculateSpendingProfile({
    expenses: [
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 2).toISOString() },
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 4).toISOString() },
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 8).toISOString() },
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 12).toISOString() },
      { amountMinor: 1000, category: 'Food', occurredAt: new Date(2026, 10, 20).toISOString() },
    ],
    incomes: [{ amountMinor: 900000 }],
    savingsTransactions: [{ kind: 'deposit', amountMinor: 900000, occurredAt: new Date(2026, 10, 10).toISOString() }],
    from,
    to,
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.eligibleTransactionCount, 5);
});

test('uses consistent distinct colors for primary and custom categories', () => {
  assert.equal(categoryColor('Food'), '#1DB954');
  assert.equal(categoryColor('Social'), '#9B72CF');
  assert.equal(categoryColor('Transport'), '#4285F4');
  assert.equal(categoryColor('Study'), '#F4B942');
  assert.equal(categoryColor('Other'), '#F06C62');
  assert.equal(categoryColor('Others'), '#F06C62');
  assert.equal(categoryColor('Shopping'), '#22A6A1');

  const customColor = categoryColor('Campus supplies');
  assert.equal(customColor, categoryColor('Campus supplies'));
  assert.match(customColor, /^#[0-9A-F]{6}$/);
  assert.equal(new Set(['#1DB954', '#9B72CF', '#4285F4', '#F4B942', '#F06C62', '#22A6A1']).has(customColor), false);
});

test('uses distinct financial distribution colors that do not reuse category colors', () => {
  const categoryColors = ['Food', 'Social', 'Transport', 'Study', 'Shopping', 'Other']
    .map((category) => categoryColor(category));
  const actualExpenditure = categoryColor('Actual Expenditure');
  const savingsAllocation = categoryColor('Savings Allocation');

  assert.equal(actualExpenditure, '#16805D');
  assert.equal(savingsAllocation, '#C026D3');
  assert.notEqual(actualExpenditure, savingsAllocation);
  assert.equal(categoryColors.includes(actualExpenditure), false);
  assert.equal(categoryColors.includes(savingsAllocation), false);
  assert.equal(categoryColor('actual expenditure'), actualExpenditure);
  assert.equal(categoryColor('savings allocation'), savingsAllocation);
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

  const summary = calculateBudgetSummary({
    allowanceMinor: 900000,
    incomes: [{ amountMinor: 200000, source: 'Freelance', occurredAt: '2026-11-10T12:00:00.000Z' }],
    cycleStartDate: new Date(2026, 10, 1),
    cycleThroughDate: new Date(2026, 10, 20),
    expenseMinor: 250000,
    savingsReservedMinor: 85000,
    totalCycleDays: 30,
    daysLeft: 12,
    pacingMode: 'adaptive',
    zeroSpendDays: ['2026-11-09', '2026-11-10'],
  });
  assert.equal(summary.adjustedCycleBudgetMinor, 1100000);
  assert.equal(summary.availableMinor, 765000);
  assert.equal(summary.remainingMinor, 765000);
  assert.equal(summary.zeroSpendDays, 2);
  assert.equal(summary.dailyRoomMinor, 63750);
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

test('rejects invalid savings backups and preserves ledger summary integrity', () => {
  const summary = goalLedgerSummary([
    { kind: 'deposit', amountMinor: 1200 },
    { kind: 'withdrawal', amountMinor: 300 },
    { kind: 'deposit', amountMinor: 50 },
  ]);
  assert.equal(summary.netMinor, 950);

  assert.throws(() => validateBackupPayload({ app: 'PocketPal', goalTransactions: 'bad' }), /Invalid PocketPal backup file/);
  assert.throws(() => validateBackupPayload({ app: 'PocketPal', goalTransactions: [{ goalId: 1 }] }), /Invalid PocketPal backup file/);
  assert.throws(() => validateBackupPayload({ app: 'PocketPal', goalTransactions: [{ goalId: 1, kind: 'deposit', amountMinor: 0 }] }), /Invalid PocketPal backup file/);

  const goal = { id: 1, name: 'Books', targetMinor: 10000, savedMinor: 1000 };
  const transaction = { id: 1, goalId: 1, kind: 'deposit', amountMinor: 1000, occurredAt: '2026-11-01T10:00:00.000Z' };
  assert.doesNotThrow(() => validateBackupPayload({ app: 'PocketPal', goals: [goal], goalTransactions: [transaction] }));
  assert.doesNotThrow(() => validateBackupPayload({ app: 'PocketPal', goals: [goal] }));
  assert.doesNotThrow(() => validateBackupPayload({
    app: 'PocketPal',
    goals: [{ ...goal, savedMinor: 500 }],
    goalTransactions: [
      { id: 2, goalId: 1, kind: 'withdrawal', amountMinor: 500, occurredAt: '2026-11-02T10:00:00.000Z' },
      { id: 1, goalId: 1, kind: 'deposit', amountMinor: 1000, occurredAt: '2026-11-01T10:00:00.000Z' },
    ],
  }));
  assert.throws(() => validateBackupPayload({ app: 'PocketPal', goalTransactions: [] }), /Invalid PocketPal backup file/);
  assert.throws(
    () => validateBackupPayload({ app: 'PocketPal', goals: [goal], goalTransactions: [{ ...transaction, amountMinor: 999 }] }),
    /Invalid PocketPal backup file/
  );
  assert.throws(
    () => validateBackupPayload({ app: 'PocketPal', goals: [goal], goalTransactions: [transaction, transaction] }),
    /Invalid PocketPal backup file/
  );
  assert.throws(
    () => validateBackupPayload({ app: 'PocketPal', goals: [goal], goalTransactions: [{ ...transaction, goalId: 2 }] }),
    /Invalid PocketPal backup file/
  );
  assert.throws(
    () => validateBackupPayload({
      app: 'PocketPal',
      goals: [{ ...goal, savedMinor: 0 }],
      goalTransactions: [transaction, { ...transaction, id: 2, kind: 'withdrawal', amountMinor: 1001 }],
    }),
    /Invalid PocketPal backup file/
  );
});
