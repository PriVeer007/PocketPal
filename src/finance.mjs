/**
 * Amounts are stored as integer minor units. Keeping these functions free of
 * React and SQLite lets the same rules run in the app and Node's test runner.
 */

function getValueOrDefault(value, fallback) {
  return value === undefined || value === null ? fallback : value;
}

export function currencyDigits(currency = 'INR') {
  try {
    const digits = new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
    return Number.isFinite(digits) ? digits : 2;
  } catch {
    return 2;
  }
}

export function toMinorUnits(value, currency = 'INR') {
  if (!Number.isFinite(value) || value <= 0) return null;
  const digits = currencyDigits(currency);
  const minor = Math.round((value + Number.EPSILON) * (10 ** digits));
  return minor > 0 ? minor : null;
}

export function formatMoney(minor, currency = 'INR') {
  const digits = currencyDigits(currency);
  const safeMinor = Number.isFinite(minor) ? Math.max(0, Math.round(minor)) : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(safeMinor / (10 ** digits));
  } catch {
    return `${currency} ${(safeMinor / (10 ** digits)).toFixed(digits)}`;
  }
}

export function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function cycleStart(value, cycleStartDay = 1) {
  if (!Number.isInteger(cycleStartDay) || cycleStartDay < 1 || cycleStartDay > 28) {
    throw new RangeError('Cycle start day must be between 1 and 28');
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');

  const year = date.getFullYear();
  const month = date.getMonth();
  if (date.getDate() < cycleStartDay) {
    return new Date(year, month - 1, cycleStartDay, 0, 0, 0, 0);
  }
  return new Date(year, month, cycleStartDay, 0, 0, 0, 0);
}

export function nextCycleStart(value, cycleStartDay = 1) {
  const start = cycleStart(value, cycleStartDay);
  return new Date(start.getFullYear(), start.getMonth() + 1, cycleStartDay, 0, 0, 0, 0);
}

export function remainingAllowance(allowanceMinor, spentMinor) {
  return Math.max(0, Math.round(allowanceMinor) - Math.round(spentMinor));
}

export function calculateBudgetSummary({
  allowanceMinor = 0,
  incomeMinor = 0,
  expenseMinor = 0,
  savingsReservedMinor = 0,
  withdrawalsMinor = 0,
  totalCycleDays = 1,
  daysLeft = 1,
  pacingMode = 'adaptive',
  zeroSpendDays = [],
}) {
  const safeAllowance = Math.max(0, Number(allowanceMinor) || 0);
  const safeIncome = Math.max(0, Number(incomeMinor) || 0);
  const safeExpense = Math.max(0, Number(expenseMinor) || 0);
  const safeSavingsReserved = Math.max(0, Number(savingsReservedMinor) || 0);
  const safeWithdrawals = Math.max(0, Number(withdrawalsMinor) || 0);
  const safeTotalCycleDays = Math.max(1, Number(totalCycleDays) || 1);
  const safeDaysLeft = Math.max(1, Number(daysLeft) || 1);
  const zeroSpendCount = Array.isArray(zeroSpendDays) ? zeroSpendDays.length : 0;
  const availableMinor = safeAllowance + safeIncome - safeExpense - safeSavingsReserved + safeWithdrawals;

  const dailyRoomMinor =
    pacingMode === 'fixed'
      ? Math.round((safeAllowance + safeIncome) / safeTotalCycleDays)
      : Math.round(Math.max(0, availableMinor) / safeDaysLeft);

  return {
    allowanceMinor: safeAllowance,
    incomeMinor: safeIncome,
    expenseMinor: safeExpense,
    savingsReservedMinor: safeSavingsReserved,
    withdrawalsMinor: safeWithdrawals,
    availableMinor: Math.max(0, availableMinor),
    remainingMinor: Math.max(0, availableMinor),
    dailyRoomMinor,
    zeroSpendDays: zeroSpendCount,
    mode: pacingMode,
  };
}

export function sumExpenses(expenses, from, to) {
  const start = localDateKey(from);
  const end = localDateKey(to);
  return expenses.reduce((total, expense) => {
    const date = localDateKey(expense.occurredAt);
    return total + (date >= start && date <= end ? expense.amountMinor : 0);
  }, 0);
}

export function allowanceProgress(spentMinor, allowanceMinor) {
  if (allowanceMinor <= 0) return 0;
  return Math.min(1, Math.max(0, spentMinor / allowanceMinor));
}

/**
 * Calculates daily allowance pacing based on student preference:
 * - 'adaptive': Unspent allowance rolls over. If a student doesn't spend today,
 *   the unused allowance distributes across remaining days, increasing their daily room!
 * - 'fixed': Constant daily benchmark (allowance ÷ total cycle days).
 */
export function calculateDailyPace({
  allowanceMinor,
  spentMinor,
  totalCycleDays,
  daysLeft,
  pacingMode = 'adaptive',
}) {
  const safeAllowance = Math.max(0, Number(allowanceMinor) || 0);
  const safeSpent = Math.max(0, Number(spentMinor) || 0);
  const remaining = Math.max(0, safeAllowance - safeSpent);
  const safeTotalDays = Math.max(1, Number(totalCycleDays) || 1);
  const safeDaysLeft = Math.max(1, Number(daysLeft) || 1);

  if (pacingMode === 'fixed') {
    const fixedDaily = Math.round(safeAllowance / safeTotalDays);
    return {
      dailyRoomMinor: fixedDaily,
      mode: 'fixed',
      explanation: 'Steady benchmark (allowance ÷ cycle days)',
    };
  }

  // Adaptive mode: unspent allowance rolls over into subsequent days
  const adaptiveDaily = Math.round(remaining / safeDaysLeft);
  return {
    dailyRoomMinor: adaptiveDaily,
    mode: 'adaptive',
    explanation: 'Adaptive room (includes rollover from zero-spend days)',
  };
}

export function dailySpendTrend(expenses, from, to) {
  const startDate = from instanceof Date ? new Date(from) : new Date(from);
  const endDate = to instanceof Date ? new Date(to) : new Date(to);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const startKey = localDateKey(startDate);
  const endKey = localDateKey(endDate);

  const dayMap = new Map();
  for (const exp of expenses) {
    const key = localDateKey(exp.occurredAt);
    if (key >= startKey && key <= endKey) {
      dayMap.set(key, getValueOrDefault(dayMap.get(key), 0) + exp.amountMinor);
    }
  }

  const result = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    const key = localDateKey(curr);
    const amountMinor = getValueOrDefault(dayMap.get(key), 0);
    const label = curr.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const dayNumber = curr.getDate();
    result.push({ dateKey: key, label, dayNumber, amountMinor });
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

export function weeklySpendTrend(expenses, from, to) {
  const startDate = from instanceof Date ? new Date(from) : new Date(from);
  const endDate = to instanceof Date ? new Date(to) : new Date(to);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const startKey = localDateKey(startDate);
  const endKey = localDateKey(endDate);

  const inRange = expenses.filter((e) => {
    const k = localDateKey(e.occurredAt);
    return k >= startKey && k <= endKey;
  });

  const weeks = [];
  const curr = new Date(startDate);
  let weekIndex = 1;

  while (curr <= endDate) {
    const wStart = new Date(curr);
    const wEnd = new Date(curr);
    wEnd.setDate(wEnd.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);
    const cappedEnd = wEnd > endDate ? endDate : wEnd;

    const wStartKey = localDateKey(wStart);
    const wEndKey = localDateKey(cappedEnd);

    const weekTotal = inRange.reduce((acc, exp) => {
      const k = localDateKey(exp.occurredAt);
      return acc + (k >= wStartKey && k <= wEndKey ? exp.amountMinor : 0);
    }, 0);

    const label = `W${weekIndex}`;
    weeks.push({
      dateKey: `${wStartKey}_${wEndKey}`,
      label,
      dayNumber: weekIndex,
      amountMinor: weekTotal,
    });

    curr.setDate(curr.getDate() + 7);
    weekIndex += 1;
  }

  return weeks;
}

export function monthlySpendTrend(expenses, from, to) {
  const startDate = from instanceof Date ? new Date(from) : new Date(from);
  const endDate = to instanceof Date ? new Date(to) : new Date(to);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const startKey = localDateKey(startDate);
  const endKey = localDateKey(endDate);

  const inRange = expenses.filter((e) => {
    const k = localDateKey(e.occurredAt);
    return k >= startKey && k <= endKey;
  });

  const months = [];
  const curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (curr <= endDate) {
    const y = curr.getFullYear();
    const m = curr.getMonth();
    const mStart = new Date(y, m, 1);
    const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const mStartKey = localDateKey(mStart < startDate ? startDate : mStart);
    const mEndKey = localDateKey(mEnd > endDate ? endDate : mEnd);

    const monthTotal = inRange.reduce((acc, exp) => {
      const k = localDateKey(exp.occurredAt);
      return acc + (k >= mStartKey && k <= mEndKey ? exp.amountMinor : 0);
    }, 0);

    const label = curr.toLocaleDateString(undefined, { month: 'short' });
    months.push({
      dateKey: `${y}-${String(m + 1).padStart(2, '0')}`,
      label,
      dayNumber: m + 1,
      amountMinor: monthTotal,
    });

    curr.setMonth(curr.getMonth() + 1);
  }

  return months;
}

export function goalLedgerSummary(goalTransactions = []) {
  const safeTx = Array.isArray(goalTransactions) ? goalTransactions : [];
  let depositsMinor = 0;
  let withdrawalsMinor = 0;

  for (const entry of safeTx) {
    if (!entry || typeof entry !== 'object') continue;
    const rawAmountMinor = Number(getValueOrDefault(entry.amountMinor, getValueOrDefault(entry.amount, 0)));
    const amountMinor = Number.isFinite(rawAmountMinor) ? Math.max(0, rawAmountMinor) : 0;
    const kind = entry.kind === 'withdrawal' ? 'withdrawal' : 'deposit';
    if (kind === 'deposit') {
      depositsMinor += amountMinor;
    } else {
      withdrawalsMinor += amountMinor;
    }
  }

  return {
    depositsMinor,
    withdrawalsMinor,
    netMinor: depositsMinor - withdrawalsMinor,
    transactionCount: safeTx.length,
  };
}

export function applyGoalBalanceChange(balanceMinor, kind, amountMinor, targetMinor = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(balanceMinor) || balanceMinor < 0) {
    throw new Error('The current goal balance is invalid.');
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('A valid savings amount is required.');
  }

  if (kind === 'deposit') {
    if (!Number.isSafeInteger(targetMinor) || targetMinor <= 0 || balanceMinor + amountMinor > targetMinor) {
      throw new Error('This contribution would exceed the goal target.');
    }
    return balanceMinor + amountMinor;
  }
  if (kind === 'withdrawal') {
    if (amountMinor > balanceMinor) {
      throw new Error('Withdrawal exceeds the current balance for this goal.');
    }
    return balanceMinor - amountMinor;
  }
  throw new Error('Unsupported savings transaction type.');
}

export function reconcileGoalBalances(goals = [], goalTransactions = []) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const balances = new Map(
    safeGoals
      .filter((goal) => goal && typeof goal === 'object' && Number.isFinite(Number(goal.id)))
      .map((goal) => [Number(goal.id), 0])
  );

  for (const transaction of Array.isArray(goalTransactions) ? goalTransactions : []) {
    if (!transaction || typeof transaction !== 'object') continue;
    const goalId = Number(getValueOrDefault(transaction.goalId, transaction.goal_id));
    if (!balances.has(goalId)) continue;
    const rawAmount = Number(getValueOrDefault(transaction.amountMinor, transaction.amount));
    if (!Number.isSafeInteger(rawAmount) || rawAmount <= 0) continue;
    const direction = transaction.kind === 'withdrawal' ? -1 : 1;
    balances.set(goalId, balances.get(goalId) + direction * rawAmount);
  }

  return Object.fromEntries(balances);
}

const CATEGORY_COLORS = Object.freeze({
  Food: '#1DB954',
  Social: '#9B72CF',
  Transport: '#4285F4',
  Study: '#F4B942',
  Shopping: '#22A6A1',
  Other: '#F06C62',
  Entertainment: '#F06C62',
  'Personal Care': '#EC8EBD',
  Health: '#8C9EFF',
  Accommodation: '#B08D57',
  Utilities: '#78909C',
  Subscriptions: '#D18B45',
});

const PRIMARY_CATEGORY_COLORS = new Set(Object.values(CATEGORY_COLORS));

function hslToHex(hue, saturation = 68, lightness = 52) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePart = hue / 60;
  const x = chroma * (1 - Math.abs((huePart % 2) - 1));
  const [r, g, b] =
    huePart < 1 ? [chroma, x, 0] :
    huePart < 2 ? [x, chroma, 0] :
    huePart < 3 ? [0, chroma, x] :
    huePart < 4 ? [0, x, chroma] :
    huePart < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${[r, g, b]
    .map((component) => Math.round((component + match) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function categoryColor(category) {
  const name = typeof category === 'string' ? category.trim() : '';
  const normalized = name.toLowerCase();
  const primaryName = normalized === 'others' ? 'Other' : Object.keys(CATEGORY_COLORS).find((key) => key.toLowerCase() === normalized);
  if (primaryName) return CATEGORY_COLORS[primaryName];

  let hash = 2166136261;
  for (let index = 0; index < name.length; index += 1) {
    hash = Math.imul(hash ^ name.charCodeAt(index), 16777619) >>> 0;
  }
  let hue = hash % 360;
  let color = hslToHex(hue);
  while (PRIMARY_CATEGORY_COLORS.has(color)) {
    hue = (hue + 17) % 360;
    color = hslToHex(hue);
  }
  return color;
}

export function buildActivityRecords({
  expenses = [],
  incomes = [],
  goals = [],
  goalTransactions = [],
} = {}) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const goalNames = new Map(safeGoals.map((goal) => [Number(goal.id), goal.name]));
  const records = [];

  for (const expense of Array.isArray(expenses) ? expenses : []) {
    records.push({
      key: `expense:${expense.id}`,
      recordId: expense.id,
      type: 'expense',
      title: expense.title,
      amountMinor: expense.amountMinor,
      occurredAt: expense.occurredAt,
      category: expense.category,
      reflection: expense.reflection,
      note: expense.note,
    });
  }

  for (const income of Array.isArray(incomes) ? incomes : []) {
    records.push({
      key: `income:${income.id}`,
      recordId: income.id,
      type: 'income',
      title: income.title,
      amountMinor: income.amountMinor,
      occurredAt: income.occurredAt,
      description: income.source,
      note: income.note,
    });
  }

  for (const transaction of Array.isArray(goalTransactions) ? goalTransactions : []) {
    const goalId = Number(getValueOrDefault(transaction.goalId, transaction.goal_id));
    const goalName = goalNames.get(goalId);
    const isClosure =
      transaction.kind === 'withdrawal' &&
      typeof transaction.note === 'string' &&
      transaction.note.startsWith('Goal closed:');
    records.push({
      key: `goal-transaction:${transaction.id}`,
      recordId: transaction.id,
      type: isClosure
        ? 'goalClosure'
        : transaction.kind === 'withdrawal'
        ? 'savingsWithdrawal'
        : 'savingsAllocation',
      title: isClosure ? 'Goal closure · returned savings' : transaction.kind === 'withdrawal' ? 'Savings withdrawal' : 'Savings allocation',
      amountMinor: transaction.amountMinor,
      occurredAt: transaction.occurredAt,
      goalId,
      goalName,
      note: transaction.note,
    });
  }

  return records.sort((left, right) => {
    const timeDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return timeDifference || right.key.localeCompare(left.key);
  });
}

export const SPENDING_PROFILE_EVIDENCE = Object.freeze({
  minimumTransactions: 5,
  minimumDistinctDays: 3,
  minimumReflections: 3,
});

function validExpenseInPeriod(expense, startKey, endKey) {
  if (!expense || typeof expense !== 'object') return null;
  const amountMinor = Number(expense.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  let key;
  try {
    key = localDateKey(expense.occurredAt);
  } catch {
    return null;
  }
  if (key < startKey || key > endKey) return null;
  return {
    ...expense,
    amountMinor,
    category: typeof expense.category === 'string' && expense.category.trim() ? expense.category.trim() : 'Other',
  };
}

function percentage(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function categoryShare(categoryMap, category, totalMinor) {
  const lower = category.toLowerCase();
  const amount = Array.from(categoryMap.entries()).reduce(
    (sum, [name, value]) => sum + (name.toLowerCase() === lower ? value.total : 0),
    0
  );
  return percentage(amount, totalMinor);
}

function sumCategoryNames(categoryMap, names, totalMinor) {
  const normalized = new Set(names.map((name) => name.toLowerCase()));
  const amount = Array.from(categoryMap.entries()).reduce(
    (sum, [name, value]) => sum + (normalized.has(name.toLowerCase()) ? value.total : 0),
    0
  );
  return percentage(amount, totalMinor);
}

export function calculateSpendingProfile({
  expenses = [],
  from,
  to,
  allowanceMinor = 0,
  savingsTransactions = [],
  trend = [],
  currency = 'INR',
}) {
  if (!Array.isArray(expenses) || !Array.isArray(savingsTransactions)) {
    return { status: 'error', persona: null, secondaryPersona: null, mindfulPercentage: null, eligibleTransactionCount: 0 };
  }

  let startKey;
  let endKey;
  try {
    startKey = localDateKey(from);
    endKey = localDateKey(to);
  } catch {
    return { status: 'error', persona: null, secondaryPersona: null, mindfulPercentage: null, eligibleTransactionCount: 0 };
  }

  const eligible = expenses
    .map((expense) => validExpenseInPeriod(expense, startKey, endKey))
    .filter(Boolean);

  const eligibleTransactionCount = eligible.length;
  if (eligibleTransactionCount === 0) {
    return {
      status: 'no-data',
      persona: null,
      secondaryPersona: null,
      mindfulPercentage: null,
      eligibleTransactionCount: 0,
    };
  }

  const distinctDays = new Set(eligible.map((expense) => localDateKey(expense.occurredAt))).size;
  if (
    eligibleTransactionCount < SPENDING_PROFILE_EVIDENCE.minimumTransactions ||
    distinctDays < SPENDING_PROFILE_EVIDENCE.minimumDistinctDays
  ) {
    return {
      status: 'insufficient-data',
      persona: null,
      secondaryPersona: null,
      mindfulPercentage: null,
      eligibleTransactionCount,
      distinctDayCount: distinctDays,
    };
  }

  const totalMinor = eligible.reduce((sum, expense) => sum + expense.amountMinor, 0);
  const categoryMap = new Map();
  for (const expense of eligible) {
    const existing = categoryMap.get(expense.category) ?? { total: 0, count: 0 };
    existing.total += expense.amountMinor;
    existing.count += 1;
    categoryMap.set(expense.category, existing);
  }

  const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1].total - a[1].total);
  const dominantCategory = sortedCategories[0]?.[0] ?? 'Other';
  const dominantShare = totalMinor > 0 ? percentage(sortedCategories[0]?.[1].total ?? 0, totalMinor) : 0;
  const averageMinor = totalMinor / eligibleTransactionCount;

  const reflections = eligible.filter((expense) => typeof expense.reflection === 'string' && expense.reflection);
  const mindfulCount = reflections.filter((expense) =>
    expense.reflection === 'Planned' || expense.reflection === 'Needed'
  ).length;
  const mindfulPercentage =
    reflections.length >= SPENDING_PROFILE_EVIDENCE.minimumReflections
      ? Math.round(percentage(mindfulCount, reflections.length))
      : null;

  const foodShare = categoryShare(categoryMap, 'Food', totalMinor);
  const socialShare = sumCategoryNames(categoryMap, ['Social', 'Entertainment'], totalMinor);
  const entertainmentShare = categoryShare(categoryMap, 'Entertainment', totalMinor);
  const transportShare = categoryShare(categoryMap, 'Transport', totalMinor);
  const studyShare = sumCategoryNames(categoryMap, ['Study', 'Stationery'], totalMinor);
  const essentialsShare = sumCategoryNames(
    categoryMap,
    ['Food', 'Transport', 'Study', 'Health', 'Accommodation', 'Utilities', 'Stationery', 'Personal Care'],
    totalMinor
  );

  const smallPurchaseCount = eligible.filter((expense) => expense.amountMinor <= averageMinor * 0.5).length;
  const smallPurchaseShare = percentage(smallPurchaseCount, eligibleTransactionCount);

  let savingsMinor = 0;
  for (const transaction of savingsTransactions) {
    if (!transaction || typeof transaction !== 'object' || transaction.kind !== 'deposit') continue;
    const amount = Number(transaction.amountMinor);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    try {
      const key = localDateKey(transaction.occurredAt);
      if (key >= startKey && key <= endKey) savingsMinor += amount;
    } catch {
      // Ignore invalid historical savings records.
    }
  }

  const safeAllowance = Number.isSafeInteger(Number(allowanceMinor)) ? Math.max(0, Number(allowanceMinor)) : 0;
  const trendValues = Array.isArray(trend)
    ? trend.map((entry) => Number(entry.amountMinor)).filter((value) => Number.isFinite(value) && value >= 0)
    : [];
  const observedTrendValues = trendValues.filter((value) => value > 0);
  let inconsistent = false;
  if (observedTrendValues.length >= 3) {
    const mean = observedTrendValues.reduce((sum, value) => sum + value, 0) / observedTrendValues.length;
    const variance = observedTrendValues.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / observedTrendValues.length;
    inconsistent = mean > 0 && Math.sqrt(variance) / mean >= 0.5;
  }

  const spontaneousCount = reflections.filter((expense) =>
    expense.reflection === 'Spontaneous' || expense.reflection === 'Just wanted it'
  ).length;
  const spontaneousShare = percentage(spontaneousCount, reflections.length);

  let persona;
  if (inconsistent) {
    persona = {
      id: 'inconsistent',
      name: 'Inconsistent Spender',
      description: 'Spending fluctuates noticeably across comparable observed periods.',
      evidence: `Weekly or monthly observations show substantial spending variation across ${observedTrendValues.length} active periods.`,
    };
  } else if (
    mindfulCount > 0 &&
    reflections.length >= 3 &&
    spontaneousShare >= 60
  ) {
    persona = {
      id: 'impulse-prone',
      name: 'Impulse-Prone Spender',
      description: 'Repeated purchases are recorded as spontaneous or unplanned.',
      evidence: `${spontaneousCount} of ${reflections.length} reflected expenses are spontaneous or marked "Just wanted it" (${Math.round(spontaneousShare)}%).`,
    };
  } else if (
    smallPurchaseCount >= 4 &&
    smallPurchaseShare >= 35 &&
    sumCategoryNames(categoryMap, ['Food', 'Social', 'Shopping', 'Transport', 'Other'], totalMinor) >= 35
  ) {
    persona = {
      id: 'convenience',
      name: 'Convenience Spender',
      description: 'Repeated lower-value purchases make up a meaningful part of recorded spending.',
      evidence: `${smallPurchaseCount} of ${eligibleTransactionCount} expenses are below half the average transaction size.`,
    };
  } else if (entertainmentShare >= 35) {
    persona = {
      id: 'entertainment-led',
      name: 'Entertainment-Led Spender',
      description: 'Entertainment forms a major part of the spending distribution.',
      evidence: `Entertainment accounts for ${Math.round(entertainmentShare)}% of ${formatMoney(totalMinor, currency)} recorded expenditure.`,
    };
  } else if (foodShare >= 40) {
    persona = {
      id: 'food-enthusiast',
      name: 'Food Enthusiast',
      description: 'Food purchases are a substantial and recurring part of spending.',
      evidence: `Food accounts for ${Math.round(foodShare)}% across ${categoryMap.get('Food')?.count ?? 0} recorded food expenses.`,
    };
  } else if (socialShare >= 35) {
    persona = {
      id: 'social',
      name: 'Social Spender',
      description: 'Social and entertainment purchases account for a substantial share.',
      evidence: `Social and entertainment spending accounts for ${Math.round(socialShare)}% of recorded expenditure.`,
    };
  } else if (transportShare >= 40) {
    persona = {
      id: 'transport-heavy',
      name: 'Transport-Heavy Spender',
      description: 'Travel-related expenditure is a major part of recorded spending.',
      evidence: `Transport accounts for ${Math.round(transportShare)}% across ${categoryMap.get('Transport')?.count ?? 0} recorded expenses.`,
    };
  } else if (studyShare >= 35) {
    persona = {
      id: 'study-focused',
      name: 'Study-Focused Spender',
      description: 'Study, stationery and educational purchases form a substantial share.',
      evidence: `Study-related categories account for ${Math.round(studyShare)}% of recorded expenditure.`,
    };
  } else if (
    safeAllowance > 0 &&
    savingsMinor > 0 &&
    totalMinor / safeAllowance <= 0.6
  ) {
    persona = {
      id: 'savvy-saver',
      name: 'Savvy Saver',
      description: 'Recorded spending stays controlled and savings activity is present.',
      evidence: `Spending is ${Math.round(percentage(totalMinor, safeAllowance))}% of the configured allowance, with ${formatMoney(savingsMinor, currency)} deposited during this period.`,
    };
  } else if (essentialsShare >= 70) {
    persona = {
      id: 'essentials-first',
      name: 'Essentials-First Spender',
      description: 'Most recorded spending goes to essential categories.',
      evidence: `Essential categories account for ${Math.round(essentialsShare)}% of recorded expenditure.`,
    };
  } else if (dominantShare >= 55) {
    persona = {
      id: 'category-concentrated',
      name: 'Category-Concentrated Spender',
      description: 'One category dominates the spending distribution.',
      evidence: `${dominantCategory} accounts for ${Math.round(dominantShare)}% of recorded expenditure.`,
    };
  } else {
    persona = {
      id: 'balanced',
      name: 'Balanced Spender',
      description: 'Recorded expenditure is relatively distributed without a dominant category.',
      evidence: `No category exceeds ${Math.round(dominantShare)}% of ${eligibleTransactionCount} expenses across ${distinctDays} distinct days.`,
    };
  }

  let secondaryPersona = null;
  if (persona.id !== 'convenience' && smallPurchaseCount >= 4 && smallPurchaseShare >= 35) {
    secondaryPersona = {
      id: 'convenience',
      name: 'Convenience Spender',
      evidence: `${smallPurchaseCount} lower-value expenses were recorded.`,
    };
  }

  return {
    status: 'ready',
    persona,
    secondaryPersona,
    mindfulPercentage,
    eligibleTransactionCount,
    distinctDayCount: distinctDays,
  };
}

export function categoryBreakdown(expenses, from, to) {
  const startKey = localDateKey(from);
  const endKey = localDateKey(to);
  const filtered = expenses.filter((e) => {
    const key = localDateKey(e.occurredAt);
    return key >= startKey && key <= endKey;
  });
  const totalSpend = filtered.reduce((sum, e) => sum + e.amountMinor, 0);

  const catMap = new Map();
  for (const exp of filtered) {
    const existing = getValueOrDefault(catMap.get(exp.category), { total: 0, count: 0 });
    existing.total += exp.amountMinor;
    existing.count += 1;
    catMap.set(exp.category, existing);
  }

  return Array.from(catMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      totalMinor: total,
      count,
      percentage: totalSpend > 0 ? (total / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/**
 * Calculates student logging streak.
 * Checks consecutive days where at least 1 expense was logged.
 * If logged today, streak is current through today.
 * If not yet logged today, but logged yesterday, streak remains alive through yesterday.
 */
export function toZeroSpendDateSet(zeroSpendDays = []) {
  const dates = new Set();
  if (!Array.isArray(zeroSpendDays)) return dates;

  for (const entry of zeroSpendDays) {
    if (!entry) continue;
    const dateKey =
      typeof entry === 'string'
        ? entry
        : typeof entry === 'object' && 'dateKey' in entry && typeof entry.dateKey === 'string'
        ? entry.dateKey
        : typeof entry === 'object' && 'occurredAt' in entry && typeof entry.occurredAt === 'string'
        ? localDateKey(entry.occurredAt)
        : null;

    if (typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      dates.add(dateKey);
    }
  }

  return dates;
}

export function calculateLoggingStreak(expenses, referenceDate = new Date(), zeroSpendDates = []) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const todayKey = localDateKey(ref);

  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  const loggedDays = new Set([
    ...expenses.map((e) => localDateKey(e.occurredAt)),
    ...Array.from(toZeroSpendDateSet(zeroSpendDates)),
  ]);

  const loggedToday = loggedDays.has(todayKey);
  const loggedYesterday = loggedDays.has(yesterdayKey);

  let currentStreak = 0;
  if (loggedToday || loggedYesterday) {
    const checkDate = new Date(ref);
    if (!loggedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (loggedDays.has(localDateKey(checkDate))) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest historical streak
  const sortedDays = Array.from(loggedDays).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const dayKey of sortedDays) {
    const [y, m, d] = dayKey.split('-').map(Number);
    const curr = new Date(y, m - 1, d);

    if (prevDate) {
      const diff = Math.round((curr.getTime() - prevDate.getTime()) / 86400000);
      if (diff === 1) {
        tempStreak += 1;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = curr;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    loggedToday,
  };
}

/**
 * Generates structured calendar heatmap data for a given month.
 * Computes daily totals, spend intensities, and tracks zero-spend days.
 */
export function monthCalendarData(expenses, year, month, referenceDate = new Date(), zeroSpendDates = []) {
  const todayKey = localDateKey(referenceDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const zeroSpendSet = toZeroSpendDateSet(zeroSpendDates);

  // First day weekday (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayWeekday = new Date(year, month, 1).getDay();
  // We align week to start on Monday (0 = Mon, 6 = Sun)
  const startOffset = (firstDayWeekday + 6) % 7;

  const dayMap = new Map();
  for (const exp of expenses) {
    const key = localDateKey(exp.occurredAt);
    const existing = getValueOrDefault(dayMap.get(key), { total: 0, count: 0, items: [] });
    existing.total += exp.amountMinor;
    existing.count += 1;
    existing.items.push(exp);
    dayMap.set(key, existing);
  }

  const days = [];
  let totalSpentMinor = 0;
  let zeroSpendDays = 0;
  let activeSpendDays = 0;
  let maxDailyMinor = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = localDateKey(dateObj);
    const data = getValueOrDefault(dayMap.get(dateKey), { total: 0, count: 0, items: [] });

    const isToday = dateKey === todayKey;
    const isFuture = dateKey > todayKey;
    const isZeroSpend = !isFuture && (zeroSpendSet.has(dateKey) || data.total === 0);

    if (!isFuture) {
      if (isZeroSpend) {
        zeroSpendDays += 1;
      } else {
        activeSpendDays += 1;
      }
    }

    totalSpentMinor += data.total;
    if (data.total > maxDailyMinor) {
      maxDailyMinor = data.total;
    }

    days.push({
      dayNumber: d,
      dateKey,
      amountMinor: data.total,
      count: data.count,
      items: data.items,
      isToday,
      isFuture,
      isZeroSpend,
    });
  }

  return {
    year,
    month,
    startOffset,
    days,
    totalSpentMinor,
    zeroSpendDays,
    activeSpendDays,
    maxDailyMinor,
  };
}

/**
 * Generates standard RFC 4180 CSV representation of expenses for offline data export.
 */
export function generateExpensesCSV(expenses, currency = 'INR') {
  const digits = currencyDigits(currency);
  const header = ['ID', 'Date', 'Title', 'Category', 'Amount', 'Currency', 'Reflection', 'Note'];

  const rows = expenses.map((exp) => {
    const formattedAmount = (exp.amountMinor / 10 ** digits).toFixed(digits);
    const safeTitle = `"${(exp.title || '').replace(/"/g, '""')}"`;
    const safeCategory = `"${(exp.category || '').replace(/"/g, '""')}"`;
    const safeReflection = `"${(exp.reflection || '').replace(/"/g, '""')}"`;
    const safeNote = `"${(exp.note || '').replace(/"/g, '""')}"`;

    return [
      exp.id,
      exp.occurredAt,
      safeTitle,
      safeCategory,
      formattedAmount,
      currency,
      safeReflection,
      safeNote,
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

/**
 * Generates portable JSON backup of complete SQLite database state.
 */
export function generateBackupJSON(
  preferences,
  expenses,
  goals,
  budgets,
  zeroSpendDays = [],
  incomes = [],
  goalTransactions = []
) {
  return JSON.stringify(
    {
      app: 'PocketPal',
      version: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      preferences,
      expenses,
      incomes,
      goals,
      budgets,
      zeroSpendDays,
      goalTransactions,
    },
    null,
    2
  );
}

export function validateBackupPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.app !== 'PocketPal') {
    throw new Error('Invalid PocketPal backup file.');
  }

  const version = Number(getValueOrDefault(data.version, getValueOrDefault(data.schemaVersion, 1)));
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Invalid PocketPal backup file.');
  }

  if (data.preferences !== undefined && (typeof data.preferences !== 'object' || data.preferences === null)) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.expenses !== undefined && !Array.isArray(data.expenses)) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.incomes !== undefined && !Array.isArray(data.incomes)) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.goals !== undefined && !Array.isArray(data.goals)) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.goalTransactions !== undefined && data.goals === undefined) {
    throw new Error('Invalid PocketPal backup file.');
  }
  const goalsById = new Map();
  for (const goal of Array.isArray(data.goals) ? data.goals : []) {
    if (
      !goal ||
      typeof goal !== 'object' ||
      !Number.isSafeInteger(goal.id) ||
      goal.id <= 0 ||
      goalsById.has(goal.id) ||
      typeof goal.name !== 'string' ||
      !goal.name.trim() ||
      !Number.isSafeInteger(goal.targetMinor) ||
      goal.targetMinor <= 0 ||
      !Number.isSafeInteger(goal.savedMinor) ||
      goal.savedMinor < 0 ||
      goal.savedMinor > goal.targetMinor ||
      (goal.createdAt !== undefined && (typeof goal.createdAt !== 'string' || Number.isNaN(Date.parse(goal.createdAt)))) ||
      (goal.deletedAt !== undefined && goal.deletedAt !== null && (typeof goal.deletedAt !== 'string' || Number.isNaN(Date.parse(goal.deletedAt))))
    ) {
      throw new Error('Invalid PocketPal backup file.');
    }
    goalsById.set(goal.id, goal);
  }
  if (data.goalTransactions !== undefined) {
    if (!Array.isArray(data.goalTransactions)) {
      throw new Error('Invalid PocketPal backup file.');
    }
    const transactionIds = new Set();
    const transactionsByGoal = new Map(Array.from(goalsById.keys(), (goalId) => [goalId, []]));
    for (const transaction of data.goalTransactions) {
      if (
        !transaction ||
        typeof transaction !== 'object' ||
        !Number.isSafeInteger(transaction.id) ||
        transaction.id <= 0 ||
        transactionIds.has(transaction.id) ||
        !Number.isSafeInteger(transaction.goalId) ||
        !goalsById.has(transaction.goalId) ||
        (transaction.kind !== 'deposit' && transaction.kind !== 'withdrawal') ||
        !Number.isSafeInteger(transaction.amountMinor) ||
        transaction.amountMinor <= 0 ||
        typeof transaction.occurredAt !== 'string' ||
        Number.isNaN(Date.parse(transaction.occurredAt)) ||
        (transaction.note !== undefined && transaction.note !== null && typeof transaction.note !== 'string')
      ) {
        throw new Error('Invalid PocketPal backup file.');
      }
      transactionIds.add(transaction.id);
      transactionsByGoal.get(transaction.goalId).push(transaction);
    }
    for (const [goalId, goal] of goalsById) {
      let ledgerBalance = 0;
      const transactions = transactionsByGoal.get(goalId).sort(
        (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id - b.id
      );
      for (const transaction of transactions) {
        ledgerBalance += transaction.kind === 'deposit' ? transaction.amountMinor : -transaction.amountMinor;
        if (ledgerBalance < 0 || ledgerBalance > goal.targetMinor) {
          throw new Error('Invalid PocketPal backup file.');
        }
      }
      if (ledgerBalance !== goal.savedMinor) {
        throw new Error('Invalid PocketPal backup file.');
      }
    }
  }
  if (data.budgets !== undefined && (typeof data.budgets !== 'object' || Array.isArray(data.budgets))) {
    throw new Error('Invalid PocketPal backup file.');
  }
  if (data.zeroSpendDays !== undefined && !Array.isArray(data.zeroSpendDays)) {
    throw new Error('Invalid PocketPal backup file.');
  }

  return {
    version,
    expenseCount: Array.isArray(data.expenses) ? data.expenses.length : 0,
    incomeCount: Array.isArray(data.incomes) ? data.incomes.length : 0,
    goalCount: Array.isArray(data.goals) ? data.goals.length : 0,
    goalTransactionCount: Array.isArray(data.goalTransactions) ? data.goalTransactions.length : 0,
    zeroSpendCount: Array.isArray(data.zeroSpendDays) ? data.zeroSpendDays.length : 0,
  };
}

export function validateExpense(entry) {
  const errors = {};
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
    errors.amount = 'Enter an amount greater than zero.';
  } else if (entry.amount > 10000000) {
    errors.amount = 'Enter a realistic student amount.';
  }
  if (!entry.title || !entry.title.trim()) {
    errors.title = 'Add a short description.';
  }
  if (!entry.category || !entry.category.trim()) {
    errors.category = 'Choose a category.';
  }
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: entry.currency });
  } catch {
    errors.currency = 'Choose a supported currency.';
  }
  return errors;
}
