import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ColorScheme, type Theme } from './themes';

export type ThemePreference = ColorScheme | 'system';

interface ThemeContextValue {
  readonly theme: Theme;
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly initialPreference?: ThemePreference;
}

/**
 * El tema cambia rarísima vez, por eso Context es adecuado aquí
 * (a diferencia de los precios, que NUNCA pasan por Context).
 */
export function ThemeProvider({ children, initialPreference = 'system' }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[scheme], preference, setPreference }),
    [scheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
};

export const useTheme = (): Theme => useThemeContext().theme;

export const useThemePreference = () => {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference } as const;
};
