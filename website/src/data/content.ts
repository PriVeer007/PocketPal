export const LINKS = {
  repo: 'https://github.com/PriVeer007/PocketPal',
  releasePage: 'https://github.com/PriVeer007/PocketPal/releases/tag/1.4.17',
  apkDownload:
    'https://github.com/PriVeer007/PocketPal/releases/download/1.4.17/POCKETPAL.apk',
  feedbackForm:
    'https://docs.google.com/forms/d/e/1FAIpQLScaCpfu5523qb_Ck7kdXsqP-pq45AMBB8uyY7_C578hS3HqrQ/viewform?usp=dialog',
  version: 'v1.4.17',
  apkName: 'POCKETPAL.apk',
  apkSize: '104.3 MB',
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "What's New", href: '#whats-new' },
  { label: 'Pacing Lab', href: '#pacing-lab' },
  { label: '3D Showcase', href: '#showcase' },
  { label: 'Install', href: '#install' },
  { label: 'FAQ', href: '#faq' },
];

export interface HighlightItem {
  number: string;
  title: string;
  description: string;
}

export const HIGHLIGHTS: HighlightItem[] = [
  {
    number: '01',
    title: 'Monthly or No Fixed Cycle',
    description:
      'Switch cleanly between Monthly Cycle and No Fixed Cycle budgeting anytime with balance and history preserved.',
  },
  {
    number: '02',
    title: '5-Second Optional Logging',
    description:
      'Log expenses and income without mandatory descriptions—blank entries default cleanly to Unspecified Expense or Income.',
  },
  {
    number: '03',
    title: 'Adaptive Pacing & Top-Ups',
    description:
      'Zero-spend days roll over into Adaptive Room, and eligible income top-ups reflect immediately across your active cycle.',
  },
  {
    number: '04',
    title: '100% Offline SQLite',
    description:
      'No bank logins, no cloud accounts, and no telemetry. Export CSV spreadsheets or full JSON backups anytime.',
  },
];

export interface InstallStep {
  step: string;
  title: string;
  detail: string;
}

export const INSTALL_STEPS: InstallStep[] = [
  {
    step: '01',
    title: 'Download POCKETPAL.apk',
    detail: 'Grab the verified v1.4.17 Android build (104.3 MB) directly from GitHub Releases.',
  },
  {
    step: '02',
    title: 'Allow APK Install',
    detail: 'If prompted by Android, enable "Install unknown apps" for your browser.',
  },
  {
    step: '03',
    title: 'Let Play Protect Scan',
    detail: 'Allow your device to run its standard security scan—the full source is open on GitHub.',
  },
  {
    step: '04',
    title: 'Set Currency & Start Offline',
    detail: 'Pick your currency (INR, USD, EUR, GBP, CAD) and budgeting mode with zero sign-up.',
  },
];

export interface TechItem {
  label: string;
  value: string;
}

export const TECH_STACK: TechItem[] = [
  { label: 'Mobile Framework', value: 'Expo SDK 58 & React Native' },
  { label: 'Navigation & Types', value: 'Expo Router & TypeScript' },
  { label: 'Local Persistence', value: 'Expo SQLite (Integer Minor Units)' },
  { label: 'Charts & Motion', value: 'React Native SVG & Reanimated' },
  { label: 'Data Portability', value: 'CSV Export & JSON Backup / Restore' },
  { label: 'Privacy Model', value: 'Zero Cloud Telemetry · Zero Bank Links' },
];

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.4.17',
    date: 'Nov 28, 2026',
    title: 'Major fixes & flexible cycle modes',
    notes: [
      'Improved Monthly Cycle and No Fixed Cycle switching with reversible transitions and preserved history.',
      'Descriptions are now optional; blank entries default to "Unspecified Expense" / "Unspecified Income".',
      'Major fixes to income-source handling, persistence, and cycle budget top-ups across all source types.',
      'Improved balance consistency across Dashboard, Activity, and Insights.',
    ],
  },
  {
    version: 'v1.3.16',
    date: 'Initial Release',
    title: 'Offline Edition',
    notes: [
      'Allowance cycles (1st–28th), Adaptive vs. Fixed daily pacing, and optional spending reflections.',
      'Searchable Activity ledger, Insights donut & calendar heat map, Savings Goals, and Dark Mode.',
      'On-device SQLite storage with CSV export and JSON backup/restore.',
    ],
  },
];

export interface ReviewItem {
  id: string;
  author: string;
  context: string;
  quote: string;
}

export const GENUINE_REVIEWS: ReviewItem[] = [
  {
    id: 'walter',
    author: 'Walter Vatsav',
    context: 'Android tester · Shared live Today screen',
    quote: 'Broooo — this is good. Imma use it from now on.',
  },
  {
    id: 'peer-1',
    author: 'Student Tester',
    context: 'Peer review',
    quote:
      'A good and meaningful student project that addresses a real-life problem. Practical, and helps build better money habits.',
  },
  {
    id: 'peer-2',
    author: 'Student Tester',
    context: 'Usability feedback',
    quote:
      'Very easy to use for students. You can clearly see how much you have spent and it helps me protect my savings.',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    question: 'What changed in v1.4.17 (POCKETPAL.apk)?',
    answer:
      'v1.4.17 improves reversible switching between Monthly Cycle and No Fixed Cycle modes, makes transaction descriptions optional (defaulting to "Unspecified Expense" or "Unspecified Income"), fixes income-source persistence and cycle top-ups, and tightens balance consistency across Dashboard, Activity, and Insights.',
  },
  {
    question: 'Does PocketPal require a bank login or account?',
    answer:
      'No. PocketPal works completely offline using local SQLite storage on your Android device—no sign-up, no bank credentials, and no cloud sync.',
  },
  {
    question: 'Why does Android show a scan prompt when installing the APK?',
    answer:
      'Because PocketPal is distributed directly via GitHub Releases rather than Google Play, Android shows its standard APK install and Play Protect scan prompt. The full source code is public on GitHub.',
  },
  {
    question: 'Can I export or back up my records?',
    answer:
      'Yes. You can export your expenses as a CSV spreadsheet or create and restore a full JSON database backup directly from the You tab.',
  },
  {
    question: 'Which currencies and themes are supported?',
    answer:
      'PocketPal supports INR (₹), USD ($), EUR (€), GBP (£), CAD, and more during setup, along with Device, Light, and Dark appearance modes.',
  },
];
