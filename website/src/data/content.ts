export const LINKS = {
  repo: 'https://github.com/PriVeer007/PocketPal',
  releasePage: 'https://github.com/PriVeer007/PocketPal/releases/tag/1.3.16',
  apkDownload:
    'https://github.com/PriVeer007/PocketPal/releases/download/1.3.16/PocketPal_FinalBuild.apk',
  feedbackForm:
    'https://docs.google.com/forms/d/e/1FAIpQLScaCpfu5523qb_Ck7kdXsqP-pq45AMBB8uyY7_C578hS3HqrQ/viewform?usp=dialog',
  version: 'v1.3.16',
  apkName: 'PocketPal_FinalBuild.apk',
  apkSize: '104.3 MB',
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Highlights', href: '#highlights' },
  { label: 'Previews', href: '#previews' },
  { label: 'Reviews', href: '#reviews' },
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
    title: 'Adaptive daily pacing',
    description:
      'Set a monthly allowance cycle (1st–28th) with Fixed limits or Adaptive zero-spend rollover.',
  },
  {
    number: '02',
    title: 'Fast logging & reflections',
    description:
      'Record expenses and income in seconds, with optional Planned, Needed, or Impulse tags.',
  },
  {
    number: '03',
    title: 'Budgets & savings goals',
    description:
      'Keep category guardrails in view and fund personal savings targets with full history.',
  },
  {
    number: '04',
    title: '100% offline SQLite',
    description:
      'No bank logins, no cloud accounts, and no telemetry. Export CSV or JSON backups anytime.',
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
    context: 'Android v1.3.16 tester',
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
