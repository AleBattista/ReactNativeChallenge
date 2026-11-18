import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  useThemeStore,
  type ThemeMode,
} from '../../app/store/ThemeStore';
import { themes, type ColorScheme, type Theme } from './themes';

export type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  readonly theme: Theme;
  readonly mode: ThemeMode;
  readonly preference: ThemePreference;
  readonly toggleTheme: () => void;
  readonly setTheme: (mode: ThemeMode) => void;
  readonly setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly initialPreference?: ThemePreference;
}

/**
 * Proveedor global de tema sincronizado reactivamente con `ThemeStore`
 * (`src/app/store/ThemeStore.ts`, persistido en AsyncStorage).
 *
 * Cuando el usuario alterna `mode` ('dark' | 'light'), `themes[scheme]`
 * actualiza instantáneamente los tokens `colors` en toda la aplicación.
 */
export function ThemeProvider({
  children,
  initialPreference,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore(state => state.mode);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const setTheme = useThemeStore(state => state.setTheme);

  const resolveScheme = useCallback(
    (pref: ThemePreference): ColorScheme => {
      if (pref === 'system') {
        return systemScheme === 'light' ? 'light' : 'dark';
      }
      return pref;
    },
    [systemScheme],
  );

  useEffect(() => {
    if (initialPreference !== undefined) {
      setTheme(resolveScheme(initialPreference));
    }
  }, [initialPreference, resolveScheme, setTheme]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setTheme(resolveScheme(pref));
    },
    [resolveScheme, setTheme],
  );

  const scheme: ColorScheme =
    initialPreference !== undefined ? resolveScheme(initialPreference) : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[scheme],
      mode: scheme,
      preference: scheme,
      toggleTheme,
      setTheme,
      setPreference,
    }),
    [scheme, toggleTheme, setTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
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
  const { mode, preference, toggleTheme, setTheme, setPreference } =
    useThemeContext();
  return {
    mode,
    preference,
    toggleTheme,
    setTheme,
    setPreference,
  } as const;
};

export default ThemeProvider;
