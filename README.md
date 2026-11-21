# PocketPal

PocketPal is a behavioural approach to student budget management. It keeps everyday expenses, category limits, and savings goals on the device and works without an account or bank connection.

## Start the app

```sh
npm install
npx expo start
```

Use `a` in the Expo terminal to open the Android emulator, or scan the development QR code with Expo Go. A development build is needed for native packages that Expo Go does not include; the app currently uses Expo SQLite, which is included in Expo Go for SDK 58.

## Product areas

- First-run setup for student name, currency, allowance amount, and cycle start day.
- Dashboard with cycle remainder, spending pace, optional category budgets, and recent entries.
- One-step expense entry with optional behavioural reflection and a note.
- Searchable, filterable activity with confirmed deletion.
- Current-cycle category insights and non-judgemental reflection summaries.
- Savings goals with locally recorded contributions.
- Profile, allowance, category budget, and adaptive light/dark settings.

See [PRODUCT-DESIGN.md](./PRODUCT-DESIGN.md) for the screen-by-screen specification and interaction rules.

## Local data and money

The app stores its SQLite database in the device's application data directory as `pocketpal.db`. Versioned schema migrations create tables for preferences, expenses, goals, and category budgets. All user values go through parameterized SQL statements. Records stay on the device; this MVP does not sync or back up data.

Money uses integer currency minor units and the selected currency's fraction digits. Expense timestamps are stored as ISO instants and grouped using the device's local calendar. The allowance cycle supports start days 1 through 28 to avoid short-month edge cases.

## Checks

```sh
npm run typecheck
npm test
npm run lint
npx expo export --platform android --output-dir .expo/export-android
```

The calculation tests use Node's built-in test runner and cover currency minor units and formatting, date and cycle boundaries, allowance totals and progress, daily spend trends, category breakdowns, and expense validation.
