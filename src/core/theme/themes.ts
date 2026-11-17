import { palette, radii, spacing, typography } from './tokens';

export type ColorScheme = 'light' | 'dark';

/** Colores semánticos: describen intención, no tono. */
export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly onAccent: string;
  /** Movimientos de mercado. */
  readonly positive: string;
  readonly negative: string;
  readonly neutral: string;
  readonly positiveSoft: string;
  readonly negativeSoft: string;
  readonly neutralSoft: string;
  /** Lados de una orden. */
  readonly buy: string;
  readonly sell: string;
  readonly warning: string;
}

export interface Theme {
  readonly scheme: ColorScheme;
  readonly colors: ThemeColors;
  readonly spacing: typeof spacing;
  readonly radii: typeof radii;
  readonly typography: typeof typography;
}

const base = { spacing, radii, typography } as const;

export const lightTheme: Theme = {
  ...base,
  scheme: 'light',
  colors: {
    background: palette.gray50,
    surface: palette.white,
    surfaceElevated: palette.white,
    border: palette.gray200,
    textPrimary: palette.gray900,
    textSecondary: palette.gray500,
    textMuted: palette.gray400,
    accent: palette.blue600,
    onAccent: palette.white,
    positive: palette.green600,
    negative: palette.red600,
    neutral: palette.gray500,
    positiveSoft: 'rgba(15,157,88,0.12)',
    negativeSoft: 'rgba(217,48,37,0.12)',
    neutralSoft: palette.gray100,
    buy: palette.green600,
    sell: palette.red600,
    warning: palette.amber500,
  },
};

export const darkTheme: Theme = {
  ...base,
  scheme: 'dark',
  colors: {
    background: palette.gray950,
    surface: palette.gray900,
    surfaceElevated: palette.gray800,
    border: palette.gray700,
    textPrimary: palette.gray50,
    textSecondary: palette.gray400,
    textMuted: palette.gray500,
    accent: palette.blue400,
    onAccent: palette.gray950,
    positive: palette.green400,
    negative: palette.red400,
    neutral: palette.gray400,
    positiveSoft: 'rgba(47,209,138,0.16)',
    negativeSoft: 'rgba(255,107,107,0.16)',
    neutralSoft: palette.gray800,
    buy: palette.green400,
    sell: palette.red400,
    warning: palette.amber500,
  },
};

export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};
