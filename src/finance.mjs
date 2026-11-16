/**
 * Amounts are stored as integer minor units. Keeping these functions free of
 * React and SQLite lets the same rules run in the app and Node's test runner.
 */

export function currencyDigits(currency = 'INR') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
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
      dayMap.set(key, (dayMap.get(key) ?? 0) + exp.amountMinor);
    }
  }

  const result = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    const key = localDateKey(curr);
    const amountMinor = dayMap.get(key) ?? 0;
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
    const existing = catMap.get(exp.category) ?? { total: 0, count: 0 };
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
export function calculateLoggingStreak(expenses, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const todayKey = localDateKey(ref);

  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  const loggedDays = new Set(expenses.map((e) => localDateKey(e.occurredAt)));

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
export function monthCalendarData(expenses, year, month, referenceDate = new Date()) {
  const todayKey = localDateKey(referenceDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // First day weekday (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayWeekday = new Date(year, month, 1).getDay();
  // We align week to start on Monday (0 = Mon, 6 = Sun)
  const startOffset = (firstDayWeekday + 6) % 7;

  const dayMap = new Map();
  for (const exp of expenses) {
    const key = localDateKey(exp.occurredAt);
    const existing = dayMap.get(key) ?? { total: 0, count: 0, items: [] };
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
    const data = dayMap.get(dateKey) ?? { total: 0, count: 0, items: [] };

    const isToday = dateKey === todayKey;
    const isFuture = dateKey > todayKey;
    const isZeroSpend = !isFuture && data.total === 0;

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
export function generateBackupJSON(preferences, expenses, goals, budgets) {
  return JSON.stringify(
    {
      app: 'Pennywise',
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences,
      expenses,
      goals,
      budgets,
    },
    null,
    2
  );
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
