# PocketPal

**A private, student-focused money tracker for everyday spending and savings.**

PocketPal helps students make their allowance and personal spending easier to understand. Record expenses and income, set an allowance cycle, reflect on spending choices, review trends, and track savings goals—all in one offline-first mobile app.

## The Problem

Students often need to manage limited or irregular funds while balancing food, transport, study costs, social plans, and savings. Without a simple record of everyday transactions, it is easy to lose track of spending, overlook recurring habits, or postpone savings.

## The approach

PocketPal brings day-to-day financial records, allowance awareness, optional spending reflections, and savings goals together. Its summaries and visual reports help users notice patterns and make their own decisions; they are not financial advice.

## Features

- **Allowance and daily planning:** Set a monthly allowance cycle and choose fixed or adaptive daily pacing.
- **Expense and income tracking:** Record, edit, and review expenses; log income by source, with eligible allowance top-ups reflected in the current cycle.
- **Optional spending reflections:** Mark an expense as planned, spontaneous, needed, or just wanted.
- **Dashboard and activity:** See current-cycle availability, recent activity, and searchable, filterable transaction history.
- **Insights:** Explore daily, weekly, and monthly spending trends, category breakdowns, calendar activity, reflection summaries, and evidence-based spending personas when enough data is available.
- **Savings goals:** Create targets, add contributions, make withdrawals, and retain a history when a goal is closed.
- **Personalisation:** Configure profile details, currency, cycle start day, pacing, and system/light/dark appearance.
- **On-device data tools:** Keep records in local SQLite storage, export expense CSV, and create or restore a JSON backup.

## App screens

| Screen | What it is for |
| --- | --- |
| **Today** | Current-cycle availability, daily pacing, recent activity, and a spending trend. |
| **Activity** | Search and filter expenses, income, and savings history; edit or remove expenses. |
| **Insights** | Review behavioural reflections, category spending, calendar activity, and time-based trends. |
| **Goals** | Track savings targets, contributions, withdrawals, and progress. |
| **You** | Manage your profile, allowance, category limits, pacing, appearance, and data export/restore. |

## Technology

- **Expo SDK 58** and **React Native** — cross-platform mobile application framework.
- **TypeScript** — typed application code.
- **Expo Router** — file-based screens and navigation.
- **Expo SQLite** — local persistence.
- **React Native SVG** — category donut visualisation.
- **React Native Reanimated** — lightweight progress and interaction motion.
- **Node.js test runner** — finance utility tests.

## Getting started

Requirements: Node.js and npm. Android development additionally requires the Android SDK and an emulator or connected device.

```sh
npm install
npm start
```

From the Expo CLI, press `a` to open an available Android emulator, or start the web target with:

```sh
npm run web
```

For a locally compiled Android development app, configure the Android SDK and run:

```sh
npm run android
```

Use the Expo Go app only where its included native modules meet the project’s needs; otherwise build and install a development client.

## Project layout

```text
src/
  app/          Expo Router screens
  components/   Shared UI, charts, and motion components
  constants/    Theme and design tokens
  store.tsx     Local database and app state
  finance.mjs   Reusable financial and analytics utilities
android/        Native Android Gradle project
assets/         App icons and visual assets
```

## Checks

```sh
npm test
npm run typecheck
npm run lint
```

## Future scope

Cloud synchronisation, bank connections, cross-device accounts, and shared household/student budgets are not currently implemented. These are possible future directions, not current features.

## Privacy

PocketPal is designed for local use and does not require an account or bank connection. Exported backups and shared CSV data are controlled by the user; keep backup files in a secure location.
