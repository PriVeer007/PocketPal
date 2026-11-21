import '@/global.css';
import { Platform, TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export type ColorPalette = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  border: string;
  warning: string;
  chartGrid: string;
  chartBar: string;
  chartBarSecondary: string;
};

export const Colors: Record<ThemeMode, ColorPalette> = {
  light: {
    text: '#18201C',
    background: '#F6F5F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAECE6',
    textSecondary: '#56645E',
    accent: '#1B4D41',
    accentSoft: '#DEEAE3',
    border: '#DFE3DC',
    warning: '#9E4D2B',
    chartGrid: '#E7EBE4',
    chartBar: '#215A4C',
    chartBarSecondary: '#94B4A9',
  },
  dark: {
    text: '#E5ECE7',
    background: '#131614',
    backgroundElement: '#1B1F1C',
    backgroundSelected: '#242A25',
    textSecondary: '#859188',
    accent: '#4A9A7C',
    accentSoft: '#1D2A23',
    border: '#272E29',
    warning: '#C47857',
    chartGrid: '#1D241F',
    chartBar: '#4A9A7C',
    chartBarSecondary: '#2B4237',
  },
};

export type ThemeColor = keyof ColorPalette;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'Courier New',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display), system-ui, -apple-system, sans-serif',
    serif: 'var(--font-serif), Georgia, serif',
    mono: 'var(--font-mono), monospace',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    mono: 'monospace',
  },
});

export const Typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.8,
  },
  titleLarge: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 1.2,
  },
} as const;

export const Spacing = {
  two: 2,
  four: 4,
  eight: 8,
  twelve: 12,
  sixteen: 16,
  twenty: 20,
  twentyFour: 24,
  thirtyTwo: 32,
} as const;
