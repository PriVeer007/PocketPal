# PocketPal Product and Experience Specification

PocketPal is a private, offline-first student budgeting and allowance companion. It provides calm, clear visibility into everyday spending, category budgets, and allowance cycles—free of guilt, gamification, bank credentials, cloud tracking, or synthetic data.

---

## 1. Visual and Interaction Design System

### 1.1 Aesthetic Direction: "Editorial Forest & Warm Paper"
- **Light Theme (Warm Paper):**
  - App Background: `#F6F5F0` (calm tactile paper)
  - Card/Surface: `#FFFFFF` (crisp surface)
  - Elevated/Selected: `#EAECE6` (soft neutral tint)
  - Primary Text: `#18201C` (deep ink, WCAG AAA contrast)
  - Secondary Text: `#56645E` (muted stone, WCAG AA contrast)
  - Accent (Action): `#1B4D41` (forest pine, confident and grounding)
  - Soft Accent: `#DEEAE3` (subtle tint for badges and selected chips)
  - Border/Divider: `#DFE3DC` (delicate hairline structure)
  - Attention/Warning: `#9E4D2B` (warm clay, never harsh alarm red)

- **Dark Theme (Deep Forest):**
  - App Background: `#111613` (dense nocturnal forest)
  - Card/Surface: `#18201B` (moss slate surface)
  - Elevated/Selected: `#222D26`
  - Primary Text: `#EEF3EE` (soft linen, legible without eye strain)
  - Secondary Text: `#96A59C` (cool pine mist)
  - Accent (Action): `#52B792` (luminous sage for high dark-mode legibility)
  - Soft Accent: `#1A3326`
  - Border/Divider: `#253229`
  - Attention/Warning: `#E09575` (terracotta highlight)

### 1.2 Typography Hierarchy
System-native typography (`system-ui` / SF Pro on iOS, Roboto on Android) with tabular numbers for financial figures to prevent jitter.
- **Display Large (`display`):** 34pt, Bold, line-height 40pt, letter-spacing -0.8. Used for the prominent allowance balance.
- **Headline (`title`):** 20pt, SemiBold (600), line-height 26pt, letter-spacing -0.4. Used for screen and card titles.
- **Subheadline (`headline`):** 16pt, SemiBold (600), line-height 22pt, letter-spacing -0.2. Used for section headings and modal titles.
- **Body (`body`):** 14pt, Regular (400), line-height 20pt, letter-spacing -0.1. Used for primary descriptions and list items.
- **Body Medium (`bodyMedium`):** 14pt, Medium (500), line-height 20pt. Used for active states and interactive items.
- **Caption (`caption`):** 12pt, Regular (400) & Medium (500), line-height 16pt. Used for dates, metadata, and hints.
- **Eyebrow (`eyebrow`):** 11pt, Bold (700), line-height 15pt, letter-spacing 1.2 (uppercase). Used for section prefixes and breadcrumbs.
- **Numeric (`numeric`):** Tabular figures (`fontVariant: ['tabular-nums']`) ensuring aligned decimal columns.

### 1.3 Layout & Structural Rules
- 8-point spatial grid (4, 8, 12, 16, 20, 24, 32).
- Edge-to-edge safe area handling using `react-native-safe-area-context`.
- Bottom navigation respects system insets on both iOS (home bar) and Android (navigation bar/gesture nav).
- Card radiuses are restrained (16–20pt) to avoid bubbly, childish aesthetics.
- Motion is subtle: native modal presentation for creation flows, zero-flash transitions for bottom tabs.

---

## 2. Screen-by-Screen Specification

### 2.1 First-Run Setup (`/onboarding`)
- **Intent:** Welcome the student, capture core allowance rhythm, and create the local SQLite preferences record.
- **Inputs:**
  - Name (optional, max 32 chars).
  - Monthly allowance amount (required, positive number).
  - Currency selection (`INR`, `USD`, `EUR`, `GBP`, `CAD`, etc.).
  - Cycle start day (selectable quick chips: 1, 5, 10, 15, 20, 25, or custom 1–28).
- **Validation:** Disallows non-numeric allowance; shows inline error near the input.
- **Safety Promise:** Explicit banner noting data remains 100% on-device with zero bank or account tracking.
- **Transition:** Replaces navigation stack with `/` once saved.

### 2.2 Today Dashboard (`/`)
- **Intent:** Calm operational hub for the current allowance cycle.
- **Hero Card:**
  - Remaining allowance formatted in student's currency.
  - Cycle reset date and days remaining count.
  - Allowance consumption progress track.
  - Secondary metrics: Total spent this cycle and daily room to spend.
- **Spending Trend Graph:**
  - Visual daily spending bar chart for the cycle or last 14 days, computed from real SQLite records.
  - Accessible axis showing day labels, current day marker, and spending spikes.
  - Meaningful empty state when no expenses exist ("No spends recorded yet in this cycle. Log your first expense to see your pace.").
- **Pace Indicators:**
  - Average daily spend so far vs. planned daily room.
- **Category Guardrails (Budgets):**
  - Visual progress for active category budgets.
  - Direct link to adjust limits in Profile.
- **Recent Activity:**
  - Last 3 transactions with category glyphs, relative dates, and amounts.
  - "See all" shortcut leading to Activity tab.
- **Persistent Bottom Dock:**
  - Direct tab navigation to Activity, Insights, Goals, and You.
  - Elevated "Add" button placed above the dock with safe-area spacing.

### 2.3 Add Expense (`/add` - Modal)
- **Intent:** Frictionless logging in under 5 seconds.
- **Inputs:**
  - Amount: Large clear numeric field with native decimal keyboard and currency prefix.
  - Description: What it was for (max 80 chars).
  - Category selector: Clean pill chips with category glyphs (`Food`, `Transport`, `Study`, `Social`, `Shopping`, `Other`).
  - Optional Behavioral Reflection (collapsible):
    - Tags: `Planned`, `Spontaneous`, `Needed`, `Just wanted it`.
    - Note: Max 160 characters for context.
- **Validation:** Amount > 0, required description, currency validity.
- **Behavior:** Closes immediately upon SQLite transaction completion; handles write errors gracefully with retry.

### 2.4 Activity (`/activity`)
- **Intent:** Searchable, chronological log of all historical expenditures.
- **Features:**
  - Search input filtering title, category, and optional notes in real time.
  - Category filter pills (`All`, `Food`, `Transport`, etc.).
  - Grouped by local calendar day (Today, Yesterday, Full date), newest first.
  - Row shows amount, title, category glyph, reflection badge, and note snippet.
  - Safe deletion: Requires explicit confirmation dialog before removing from SQLite.
  - Empty states: Distinct messaging for "No transactions recorded yet" vs. "No transactions match your search filter".

### 2.5 Insights (`/insights`)
- **Intent:** Non-judgmental behavioral review based on real logged activity.
- **Date Range Selector:** `This Cycle`, `Last 7 Days`, `Last 30 Days`.
- **Spending Breakdown Graph:**
  - Proportional category distribution graph with exact amounts and percentages.
  - Accessible color keys mapped to categories.
- **Daily Pace Graph:**
  - Daily spending bars showing high/low days across the selected range.
- **Reflection Summary:**
  - Aggregation of reflections (`Planned`, `Needed`, `Spontaneous`, `Just wanted it`).
  - Friendly reflective insight (e.g., "Most of your logged spends this cycle felt planned.").
- **Empty State:** Calm explanation that insights build up as everyday spends are logged.

### 2.6 Savings Goals (`/goals`, `/goal-create`, `/goal-add`)
- **Intent:** Goal-oriented savings tracking for student milestones (laptop, trip home, semester buffer).
- **Goal Card:**
  - Goal title, target amount, current saved amount.
  - Bounded progress bar (clamped 0–100%).
  - Quick action: "Add to goal" (`/goal-add`) with safe upper clamping at target.
  - Management action: Delete goal with confirmation.
- **Goal Creation Modal (`/goal-create`):**
  - Goal name and target amount inputs with validation.
- **Empty State:** Inspiring, zero-pressure invitation to set a first goal.

### 2.7 Profile & Settings (`/profile`)
- **Intent:** Personalization, cycle configuration, and appearance.
- **Sections:**
  - Profile Name: Editable inline with instant save.
  - Allowance & Cycle:
    - Edit monthly allowance amount.
    - Change cycle start day (1 through 28).
  - Category Budgets:
    - Set or update specific limits for each of the 6 categories.
  - Appearance:
    - Device (System), Light, or Dark theme toggle with instant, flash-free propagation.
  - Currency Protection:
    - Displays active currency and clarifies that currency is locked to protect historical data integrity.
  - Data Transparency:
    - Itemized count of SQLite records stored locally on the device.

---

## 3. Data Integrity & Persistence Architecture

1. **Integer Minor Units:** All financial values (`allowanceMinor`, `amountMinor`, `targetMinor`, `savedMinor`) are stored as integers. Fractional conversion uses `currencyDigits(currency)`.
2. **Local Calendar Day Boundaries:** All cycle calculations and day grouping use local device time (`localDateKey: YYYY-MM-DD`) rather than UTC string slicing.
3. **Cycle Range Safety:** Cycle start days are restricted to 1–28 to eliminate irregular month-length bugs (February 28/29, April 30, etc.).
4. **Zero-Flash Native Styling:**
   - Splash screen remains visible until SQLite migrations finish and store state is hydrated.
   - `expo-system-ui` dynamically syncs root native window background to `palette.background`.
   - React Navigation theme overrides default backgrounds to match the palette.
   - Stack navigation uses `animation: 'none'` for core tab switching to eliminate flicker.
