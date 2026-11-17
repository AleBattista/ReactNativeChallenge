import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  useSettingsStore,
  type ThemePreference,
} from '../../app/store/SettingsStore';
import { themes, type ColorScheme, type Theme } from './themes';

export type { ThemePreference } from '../../app/store/SettingsStore';

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
 * Proveedor de tema conectado a `SettingsStore` (Zustand + AsyncStorage) para
 * que la preferencia `'light' | 'dark' | 'system'` persista entre sesiones.
 */
export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore(state => state.themePreference);
  const setPreference = useSettingsStore(state => state.setThemePreference);

  useEffect(() => {
    if (initialPreference !== undefined) {
      setPreference(initialPreference);
    }
  }, [initialPreference, setPreference]);

  const effectivePreference = initialPreference ?? preference;
  const scheme: ColorScheme =
    effectivePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : effectivePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[scheme], preference: effectivePreference, setPreference }),
    [scheme, effectivePreference, setPreference],
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

export default ThemeProvider;

