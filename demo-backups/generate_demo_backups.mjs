import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  calculateSpendingProfile,
  categoryBreakdown,
  dailySpendTrend,
  generateBackupJSON,
  goalLedgerSummaryForPeriod,
  validateBackupPayload,
} from '../src/finance.mjs';

const OUT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const START = new Date(2026, 10, 5, 12, 0, 0);
const END = new Date(2026, 10, 25, 12, 0, 0);

const toMinor = (rupees) => Math.round(rupees * 100);
const iso = (day, hour = 12, minute = 0) =>
  new Date(2026, 10, day, hour, minute, 0).toISOString();

function expense(id, day, hour, amount, title, category, reflection, note = null) {
  return {
    id,
    amountMinor: toMinor(amount),
    title,
    category,
    occurredAt: iso(day, hour),
    reflection,
    note,
  };
}

function income(id, day, hour, amount, title, source, note = null) {
  return {
    id,
    amountMinor: toMinor(amount),
    title,
    source,
    occurredAt: iso(day, hour),
    note,
  };
}

function goal(id, name, target, saved, createdDay, deletedDay = null) {
  return {
    id,
    name,
    targetMinor: toMinor(target),
    savedMinor: toMinor(saved),
    createdAt: iso(createdDay, 9),
    deletedAt: deletedDay ? iso(deletedDay, 18) : null,
  };
}

function goalTx(id, goalId, kind, amount, day, hour, note, snapshot, operationType) {
  return {
    id,
    goalId,
    kind,
    amountMinor: toMinor(amount),
    occurredAt: iso(day, hour),
    note,
    goalNameSnapshot: snapshot,
    operationType,
  };
}

function aarav() {
  const expenses = [
    expense(101, 5, 8, 180, 'PG breakfast and filter coffee', 'Food', 'Needed'),
    expense(102, 5, 18, 85, 'Metro card top-up', 'Transport', 'Planned'),
    expense(103, 6, 13, 240, 'College canteen lunch', 'Food', 'Needed'),
    expense(104, 7, 11, 800, 'Bluetooth earbuds', 'Shopping', 'Just wanted it', 'Convenience purchase'),
    expense(105, 8, 20, 650, 'Cinema ticket and popcorn', 'Social', 'Spontaneous'),
    expense(106, 10, 9, 95, 'Tea and poha', 'Food', 'Needed'),
    expense(107, 10, 19, 55, 'Bus ticket home', 'Transport', 'Needed'),
    expense(108, 11, 17, 850, 'USB-C hub for laptop', 'Shopping', 'Just wanted it', 'Electronic accessory'),
    expense(109, 12, 12, 320, 'Mess lunch with friends', 'Food', 'Needed'),
    expense(110, 14, 8, 650, 'Fuel for borrowed scooter', 'Transport', 'Needed'),
    expense(111, 14, 15, 95, 'Haircut', 'Shopping', 'Needed'),
    expense(112, 15, 21, 420, 'Bowling arcade session', 'Social', 'Spontaneous'),
    expense(113, 17, 13, 350, 'Cafe catch-up', 'Social', 'Spontaneous'),
    expense(114, 18, 10, 800, 'Printer ink and notebook bundle', 'Study', 'Planned'),
    expense(115, 19, 12, 180, 'Tiffin meal', 'Food', 'Needed'),
    expense(116, 19, 18, 90, 'Auto ride', 'Transport', 'Needed'),
    expense(117, 21, 20, 550, 'Weekend dinner with friends', 'Social', 'Spontaneous'),
    expense(118, 22, 8, 140, 'Breakfast at PG', 'Food', 'Needed'),
    expense(119, 22, 18, 70, 'Bus fare', 'Transport', 'Needed'),
    expense(120, 23, 16, 650, 'Casual shoes', 'Shopping', 'Spontaneous'),
    expense(121, 24, 13, 210, 'South Indian lunch', 'Food', 'Needed'),
    expense(122, 24, 19, 260, 'Online subscription renewal', 'Other', 'Planned'),
    expense(124, 6, 18, 45, 'Evening chai', 'Food', 'Spontaneous'),
    expense(125, 12, 18, 65, 'Bakery snack', 'Food', 'Spontaneous'),
    expense(126, 17, 21, 50, 'Ice cream with classmates', 'Social', 'Just wanted it'),
    expense(127, 24, 8, 75, 'Short auto ride', 'Transport', 'Needed'),
  ];

  const incomes = [
    income(201, 5, 9, 10000, 'Monthly family allowance', 'Family transfer'),
    income(202, 8, 11, 1500, 'Family top-up', 'Allowance', 'One-time top-up'),
    income(203, 14, 16, 2500, 'Weekend tutoring payment', 'Part-time work'),
  ];

  const goals = [
    goal(301, 'Emergency cushion', 5000, 2000, 5),
    goal(302, 'Wireless headphones', 1500, 800, 7),
    goal(303, 'Old laptop fund', 1000, 0, 9, 23),
  ];

  const goalTransactions = [
    goalTx(401, 301, 'deposit', 1000, 9, 10, null, 'Emergency cushion', 'Added Savings'),
    goalTx(402, 301, 'deposit', 1500, 18, 10, null, 'Emergency cushion', 'Added Savings'),
    goalTx(403, 301, 'withdrawal', 500, 22, 18, null, 'Emergency cushion', 'Withdrawal'),
    goalTx(404, 302, 'deposit', 500, 11, 10, null, 'Wireless headphones', 'Added Savings'),
    goalTx(405, 302, 'deposit', 300, 20, 10, null, 'Wireless headphones', 'Added Savings'),
    goalTx(406, 303, 'deposit', 600, 10, 10, null, 'Old laptop fund', 'Added Savings'),
    goalTx(407, 303, 'withdrawal', 600, 23, 17, 'Withdrawn from deleted Old laptop fund', 'Old laptop fund', 'Deleted Goal Withdrawal'),
  ];

  const preferences = {
    name: 'Aarav',
    currency: 'INR',
    allowanceMinor: toMinor(10000),
    cycleStartDay: 1,
    themeMode: 'system',
    pacingMode: 'adaptive',
    onboarded: 1,
  };

  return {
    name: 'Aarav',
    preferences,
    expenses,
    incomes,
    goals,
    goalTransactions,
    budgets: {
      Food: toMinor(2500),
      Transport: toMinor(1600),
      Study: toMinor(1800),
      Social: toMinor(2200),
      Shopping: toMinor(2600),
      Other: toMinor(800),
    },
    zeroSpendDays: ['2026-11-09', '2026-11-13', '2026-11-16', '2026-11-20', '2026-11-25'],
  };
}

function ananya() {
  const expenses = [
    expense(501, 5, 8, 210, 'Breakfast and coffee', 'Food', 'Needed'),
    expense(501 + 1, 5, 18, 60, 'Metro recharge', 'Transport', 'Needed'),
    expense(503, 6, 13, 260, 'Vegetarian mess lunch', 'Food', 'Needed'),
    expense(504, 8, 17, 450, 'Library stationery refill', 'Study', 'Planned'),
    expense(505, 9, 12, 180, 'Fruit bowl', 'Food', 'Needed'),
    expense(506, 10, 19, 320, 'Bus pass top-up', 'Transport', 'Planned'),
    expense(507, 11, 8, 150, 'Menstrual hygiene essentials', 'Shopping', 'Needed', 'Personal-care necessity'),
    expense(508, 13, 12, 280, 'PG cafeteria meal', 'Food', 'Needed'),
    expense(509, 14, 16, 390, 'Course workbook', 'Study', 'Planned'),
    expense(510, 15, 20, 480, 'Friends dinner', 'Social', 'Just wanted it'),
    expense(511, 17, 10, 220, 'Hygiene and grooming kit', 'Shopping', 'Needed', 'Personal care'),
    expense(512, 18, 12, 275, 'Lunch near campus', 'Food', 'Needed'),
    expense(513, 18, 18, 140, 'Metro fare', 'Transport', 'Needed'),
    expense(514, 19, 16, 500, 'Closed-footwear sale', 'Shopping', 'Planned'),
    expense(515, 20, 19, 350, 'Movie with classmates', 'Social', 'Spontaneous'),
    expense(516, 22, 9, 190, 'Breakfast', 'Food', 'Needed'),
    expense(517, 22, 14, 300, 'Lab printing and graph sheets', 'Study', 'Planned'),
    expense(518, 23, 11, 240, 'Grocery restock', 'Food', 'Planned'),
    expense(519, 23, 17, 160, 'Auto ride', 'Transport', 'Needed'),
    expense(520, 24, 13, 210, 'Cafe study session', 'Social', 'Needed'),
    expense(521, 24, 18, 600, 'Budget mobile charger and power bank', 'Shopping', 'Planned'),
  ];

  const incomes = [
    income(601, 5, 9, 12000, 'Monthly family allowance', 'Family transfer'),
    income(602, 10, 16, 1000, 'Family extra for cycle', 'Allowance', 'One-time top-up'),
    income(603, 17, 12, 1800, 'Graphic design project', 'Freelance'),
  ];

  const goals = [
    goal(701, 'Emergency fund', 4000, 1800, 5),
    goal(702, 'College trip', 2000, 900, 8),
    goal(703, 'Laptop upgrade', 6000, 1500, 12),
  ];

  const goalTransactions = [
    goalTx(801, 701, 'deposit', 600, 6, 10, null, 'Emergency fund', 'Added Savings'),
    goalTx(802, 701, 'deposit', 500, 13, 10, null, 'Emergency fund', 'Added Savings'),
    goalTx(803, 701, 'deposit', 700, 21, 10, null, 'Emergency fund', 'Added Savings'),
    goalTx(804, 702, 'deposit', 400, 9, 10, null, 'College trip', 'Added Savings'),
    goalTx(805, 702, 'deposit', 400, 16, 10, null, 'College trip', 'Added Savings'),
    goalTx(806, 702, 'deposit', 400, 22, 10, null, 'College trip', 'Added Savings'),
    goalTx(807, 702, 'withdrawal', 300, 24, 17, null, 'College trip', 'Withdrawal'),
    goalTx(808, 703, 'deposit', 500, 15, 10, null, 'Laptop upgrade', 'Added Savings'),
    goalTx(809, 703, 'deposit', 1000, 23, 10, null, 'Laptop upgrade', 'Added Savings'),
  ];

  const preferences = {
    name: 'Ananya',
    currency: 'INR',
    allowanceMinor: toMinor(12000),
    cycleStartDay: 1,
    themeMode: 'light',
    pacingMode: 'adaptive',
    onboarded: 1,
  };

  return {
    name: 'Ananya',
    preferences,
    expenses,
    incomes,
    goals,
    goalTransactions,
    budgets: {
      Food: toMinor(2800),
      Transport: toMinor(1800),
      Study: toMinor(2200),
      Social: toMinor(1200),
      Shopping: toMinor(2200),
      Other: toMinor(800),
    },
    zeroSpendDays: ['2026-11-07', '2026-11-12', '2026-11-16', '2026-11-21', '2026-11-25'],
  };
}

function periodStats(profile) {
  const expenseTotal = profile.expenses.reduce((sum, row) => sum + row.amountMinor, 0);
  const incomeTotal = profile.incomes.reduce((sum, row) => sum + row.amountMinor, 0);
  const categoryTotals = {};
  for (const row of profile.expenses) {
    categoryTotals[row.category] = (categoryTotals[row.category] || 0) + row.amountMinor;
  }

  const savings = goalLedgerSummaryForPeriod(profile.goalTransactions, START, END);
  const remaining = profile.goals
    .filter((goal) => goal.deletedAt === null)
    .reduce((sum, goal) => sum + goal.savedMinor, 0);
  const trend = dailySpendTrend(profile.expenses, START, END);
  const profileResult = calculateSpendingProfile({
    expenses: profile.expenses,
    from: START,
    to: END,
    allowanceMinor: profile.preferences.allowanceMinor,
    savingsTransactions: profile.goalTransactions,
    trend,
    currency: 'INR',
  });

  const distinctDays = new Set(profile.expenses.map((row) => row.occurredAt.slice(0, 10))).size;
  const average = profile.expenses.length ? expenseTotal / profile.expenses.length : 0;

  return {
    expenseTotal,
    incomeTotal,
    categoryTotals,
    savings,
    remaining,
    distinctDays,
    average,
    profileResult,
  };
}

function restoreIntoIsolatedDatabase(profile) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE preferences (id INTEGER PRIMARY KEY, name TEXT, currency TEXT, allowance_minor INTEGER, cycle_start_day INTEGER, theme_mode TEXT, pacing_mode TEXT, onboarded INTEGER);
    CREATE TABLE expenses (id INTEGER PRIMARY KEY, amount_minor INTEGER, title TEXT, category TEXT, occurred_at TEXT, reflection TEXT, note TEXT, created_at TEXT);
    CREATE TABLE incomes (id INTEGER PRIMARY KEY, amount_minor INTEGER, title TEXT, source TEXT, occurred_at TEXT, note TEXT, created_at TEXT);
    CREATE TABLE goals (id INTEGER PRIMARY KEY, name TEXT, target_minor INTEGER, saved_minor INTEGER, created_at TEXT, deleted_at TEXT);
    CREATE TABLE category_budgets (category TEXT PRIMARY KEY, amount_minor INTEGER);
    CREATE TABLE zero_spend_days (date_key TEXT PRIMARY KEY, created_at TEXT);
    CREATE TABLE goal_transactions (id INTEGER PRIMARY KEY, goal_id INTEGER, kind TEXT, amount_minor INTEGER, occurred_at TEXT, note TEXT, created_at TEXT, goal_name_snapshot TEXT, operation_type TEXT, FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE);
  `);

  const p = profile.preferences;
  db.prepare('INSERT INTO preferences VALUES (1,?,?,?,?,?,?,?)')
    .run(p.name, p.currency, p.allowanceMinor, p.cycleStartDay, p.themeMode, p.pacingMode, p.onboarded);

  for (const row of profile.expenses) {
    db.prepare('INSERT INTO expenses VALUES (?,?,?,?,?,?,?,?)')
      .run(row.id, row.amountMinor, row.title, row.category, row.occurredAt, row.reflection, row.note, row.occurredAt);
  }
  for (const row of profile.incomes) {
    db.prepare('INSERT INTO incomes VALUES (?,?,?,?,?,?,?)')
      .run(row.id, row.amountMinor, row.title, row.source, row.occurredAt, row.note, row.occurredAt);
  }
  for (const row of profile.goals) {
    db.prepare('INSERT INTO goals VALUES (?,?,?,?,?,?)')
      .run(row.id, row.name, row.targetMinor, row.savedMinor, row.createdAt, row.deletedAt);
  }
  for (const [category, amountMinor] of Object.entries(profile.budgets)) {
    db.prepare('INSERT INTO category_budgets VALUES (?,?)').run(category, amountMinor);
  }
  for (const dateKey of profile.zeroSpendDays) {
    db.prepare('INSERT INTO zero_spend_days VALUES (?,?)').run(dateKey, iso(25, 18));
  }
  for (const row of profile.goalTransactions) {
    db.prepare('INSERT INTO goal_transactions VALUES (?,?,?,?,?,?,?,?,?)')
      .run(row.id, row.goalId, row.kind, row.amountMinor, row.occurredAt, row.note, row.occurredAt, row.goalNameSnapshot, row.operationType);
  }

  return {
    db,
    counts: {
      expenses: db.prepare('SELECT COUNT(*) AS n FROM expenses').get().n,
      incomes: db.prepare('SELECT COUNT(*) AS n FROM incomes').get().n,
      goals: db.prepare('SELECT COUNT(*) AS n FROM goals').get().n,
      goalTransactions: db.prepare('SELECT COUNT(*) AS n FROM goal_transactions').get().n,
      zeroSpendDays: db.prepare('SELECT COUNT(*) AS n FROM zero_spend_days').get().n,
    },
  };
}

function rupees(minor) {
  return `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyNumber(minor) {
  return (minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hasTitleOrNote(row, terms) {
  const text = `${row.title} ${row.note || ''}`.toLowerCase();
  return terms.some((term) => text.includes(term));
}

function syntheticCategory(profile, categoryName) {
  if (categoryName === 'Personal care') {
    return profile.expenses
      .filter((row) => row.category === 'Shopping' && hasTitleOrNote(row, ['personal care', 'grooming', 'haircut', 'skincare', 'hygiene', 'menstrual', 'mobile']))
      .reduce((sum, row) => sum + row.amountMinor, 0);
  }
  if (categoryName === 'Clothing') {
    return profile.expenses
      .filter((row) => hasTitleOrNote(row, ['shoes', 'footwear', 'clothing', 'clothes']))
      .reduce((sum, row) => sum + row.amountMinor, 0);
  }
  if (categoryName === 'Electronics') {
    return profile.expenses
      .filter((row) => hasTitleOrNote(row, ['earbuds', 'usb-c', 'electronic', 'charger', 'power bank', 'mobile']))
      .reduce((sum, row) => sum + row.amountMinor, 0);
  }
  if (categoryName === 'Entertainment') {
    return profile.expenses
      .filter((row) => row.category === 'Social' && hasTitleOrNote(row, ['cinema', 'movie', 'bowling', 'arcade']))
      .reduce((sum, row) => sum + row.amountMinor, 0);
  }
  return 0;
}

function comparisonRow(label, aaravValue, ananyaValue) {
  return `| ${label} | ${aaravValue} | ${ananyaValue} |`;
}

const profiles = [aarav(), ananya()];

for (const profile of profiles) {
  const backup = generateBackupJSON(
    profile.preferences,
    profile.expenses,
    profile.goals,
    profile.budgets,
    profile.zeroSpendDays,
    profile.incomes,
    profile.goalTransactions
  );
  JSON.parse(backup);
  validateBackupPayload(JSON.parse(backup));

  fs.writeFileSync(
    path.join(OUT_DIR, `PocketPal_Demo_${profile.name}_21_Days.json`),
    backup + '\n'
  );

  const stats = periodStats(profile);
  const expenseIds = new Set(profile.expenses.map((row) => row.id));
  const incomeIds = new Set(profile.incomes.map((row) => row.id));
  const goalIds = new Set(profile.goals.map((row) => row.id));
  const txIds = new Set(profile.goalTransactions.map((row) => row.id));

  if (
    expenseIds.size !== profile.expenses.length ||
    incomeIds.size !== profile.incomes.length ||
    goalIds.size !== profile.goals.length ||
    txIds.size !== profile.goalTransactions.length
  ) {
    throw new Error(`${profile.name}: duplicate IDs detected`);
  }

  for (const row of profile.expenses) {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) throw new Error(`${profile.name}: invalid expense`);
  }
  for (const row of profile.incomes) {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) throw new Error(`${profile.name}: invalid income`);
  }

  const isolated = restoreIntoIsolatedDatabase(profile);
  const dbExpenseTotal = isolated.db.prepare('SELECT COALESCE(SUM(amount_minor),0) AS n FROM expenses').get().n;
  if (dbExpenseTotal !== stats.expenseTotal) throw new Error(`${profile.name}: isolated expense mismatch`);

  const activeGoalRows = isolated.db.prepare('SELECT id, saved_minor FROM goals').all();
  for (const row of activeGoalRows) {
    const ledger = isolated.db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN kind='deposit' THEN amount_minor ELSE -amount_minor END),0) AS n
       FROM goal_transactions WHERE goal_id=?`
    ).get(row.id).n;
    if (ledger !== row.saved_minor) throw new Error(`${profile.name}: isolated ledger mismatch`);
  }

  profile.stats = stats;
  profile.isolatedCounts = isolated.counts;
  isolated.db.close();
}

const [aaravProfile, ananyaProfile] = profiles;
const aaravStats = aaravProfile.stats;
const ananyaStats = ananyaProfile.stats;

const aaravCategoryEducation = aaravStats.categoryTotals.Study || 0;
const ananyaCategoryEducation = ananyaStats.categoryTotals.Study || 0;

const comparison = `# Demo Profile Comparison

All figures below are calculated from the generated JSON records. Minor units are converted to INR for readability.

| Metric | Aarav | Ananya |
${comparisonRow('Total income', rupees(aaravStats.incomeTotal), rupees(ananyaStats.incomeTotal))}
${comparisonRow('Total expenses', rupees(aaravStats.expenseTotal), rupees(ananyaStats.expenseTotal))}
${comparisonRow('Food expenditure', rupees(aaravStats.categoryTotals.Food || 0), rupees(ananyaStats.categoryTotals.Food || 0))}
${comparisonRow('Transport expenditure', rupees(aaravStats.categoryTotals.Transport || 0), rupees(ananyaStats.categoryTotals.Transport || 0))}
${comparisonRow('Education expenditure', rupees(aaravCategoryEducation), rupees(ananyaCategoryEducation))}
${comparisonRow('Personal-care expenditure', rupees(syntheticCategory(aaravProfile, 'Personal care')), rupees(syntheticCategory(ananyaProfile, 'Personal care')))}
${comparisonRow('Clothing expenditure', rupees(syntheticCategory(aaravProfile, 'Clothing')), rupees(syntheticCategory(ananyaProfile, 'Clothing')))}
${comparisonRow('Electronics expenditure', rupees(syntheticCategory(aaravProfile, 'Electronics')), rupees(syntheticCategory(ananyaProfile, 'Electronics')))}
${comparisonRow('Entertainment expenditure', rupees(syntheticCategory(aaravProfile, 'Entertainment')), rupees(syntheticCategory(ananyaProfile, 'Entertainment')))}
${comparisonRow('Savings added', rupees(aaravStats.savings.additionsMinor), rupees(ananyaStats.savings.additionsMinor))}
${comparisonRow('Savings withdrawn', rupees(aaravStats.savings.withdrawalsMinor), rupees(ananyaStats.savings.withdrawalsMinor))}
${comparisonRow('Net savings activity', rupees(aaravStats.savings.netMinor), rupees(ananyaStats.savings.netMinor))}
${comparisonRow('Remaining goal savings', rupees(aaravStats.remaining), rupees(ananyaStats.remaining))}
${comparisonRow('Expense transaction count', String(aaravProfile.expenses.length), String(ananyaProfile.expenses.length))}
${comparisonRow('Average expense transaction value', rupees(aaravStats.average), rupees(ananyaStats.average))}
${comparisonRow('Primary detected persona', aaravStats.profileResult.persona?.name || 'None', ananyaStats.profileResult.persona?.name || 'None')}
${comparisonRow('Secondary persona', aaravStats.profileResult.secondaryPersona?.name || 'None', ananyaStats.profileResult.secondaryPersona?.name || 'None')}

## Interpretation

- Aarav includes frequent low-value food and transport purchases, an occasional accessory purchase, and variable savings allocations.
- Ananya includes regular essentials, course/work materials, personal-care/hygiene purchases, and a steadier savings schedule.
- The profiles do not establish that men or women spend this way; these are fictional individual design choices. Both profiles can spend across every supported category.
- The current app stores category records as PocketPal's six app categories: Food, Transport, Study, Social, Shopping, and Other. Personal care, clothing, electronics, and entertainment are synthetic comparison labels derived from transaction descriptions, without changing PocketPal's category model.

## Detected evidence

- Aarav: ${aaravStats.profileResult.eligibleTransactionCount} expenses across ${aaravStats.profileResult.distinctDayCount} distinct spending days. ${aaravStats.profileResult.persona?.evidence || 'No persona evidence.'}
- Ananya: ${ananyaStats.profileResult.eligibleTransactionCount} expenses across ${ananyaStats.profileResult.distinctDayCount} distinct spending days. ${ananyaStats.profileResult.persona?.evidence || 'No persona evidence.'}
`;

fs.writeFileSync(path.join(OUT_DIR, 'Demo_Profile_Comparison.md'), comparison);

const assumptions = `# Gender-Based Spending Assumptions

## Research sources inspected

- EY India, *Gen Z India Report — Digital* (2025), supplied reference: https://designshaala.rbihub.in/wp-content/uploads/2025/03/EY_GenZ-India-Report-Digital.pdf
- IIM Ahmedabad, *Digital Retail Channels and Consumers: The Indian Perspective* (2023/2024): https://www04.iima.ac.in/rtc/wp-content/uploads/2024/02/Digital-Retail-Channels-and-Consumers-1.0.pdf

## Findings used cautiously

The IIM Ahmedabad report is accessible and is identified on the IIMA Retail Tech Consortium site as a Pan-India consumer survey of 35,000 consumers. It is a digital-retail consumer study, not a student allowance study and not a study establishing gender-specific spending formulas.

The supplied EY India URL returned HTTP 404 and could not be verified. No EY statistics or conclusions were used in the backups. No report is used to claim that gender determines spending.

## Synthetic differences introduced

- Aarav receives the same 21-day observation period and a similar overall scale of income as Ananya, but has more convenience purchases, an accessory purchase, a fuel/transport purchase, cinema/social activity, and variable savings deposits.
- Ananya has regular course and stationery spending, menstrual-hygiene and personal-care essentials, clothing and grooming purchases, social activity, and a steadier savings schedule.
- Aarav and Ananya both spend in Food, Transport, Study, Social, Shopping, and Other.
- Weekend, weekday, planned, spontaneous, and zero-spend behaviour vary independently of gender.

## What is synthetic

All names, ages, locations, lifestyle details, transactions, merchants, timestamps, incomes, savings operations, goals, and personas are invented demonstration data. They are not survey participants or real people.

## Limitations

Two profiles cannot establish universal differences between men and women. Hostel/PG cost, parental support, commute, course requirements, employment, health needs, disability, culture, and personal preference can explain variation more directly than gender. PocketPal does not implement gender-based category rules, scoring multipliers, or restricted personas. The profiles exist only as separate fictional datasets for demonstrating the application's existing analytics.
`;

fs.writeFileSync(path.join(OUT_DIR, 'Gender_Based_Spending_Assumptions.md'), assumptions);

for (const profile of profiles) {
  const stats = profile.stats;
  console.log(JSON.stringify({
    name: profile.name,
    expenses: profile.expenses.length,
    distinctDays: stats.distinctDays,
    expenseMinor: stats.expenseTotal,
    incomeMinor: stats.incomeTotal,
    savingsAddedMinor: stats.savings.additionsMinor,
    savingsWithdrawnMinor: stats.savings.withdrawalsMinor,
    remainingMinor: stats.remaining,
    persona: stats.profileResult.persona?.name || null,
    secondaryPersona: stats.profileResult.secondaryPersona?.name || null,
    isolatedCounts: profile.isolatedCounts,
  }));
}
