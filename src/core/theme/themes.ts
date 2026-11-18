import { darkColors, lightColors, type ThemeColors } from './colors';
import { radii, spacing, typography } from './tokens';

export type { ThemeColors } from './colors';
export type ColorScheme = 'light' | 'dark';

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
  colors: lightColors,
};

export const darkTheme: Theme = {
  ...base,
  scheme: 'dark',
  colors: darkColors,
};

export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};
