import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorScheme } from '../../core/theme/themes';
import { createPersistedStorage } from './storage';

export type ThemeMode = ColorScheme; // 'dark' | 'light'

/** Modo por defecto en 'dark' acorde a la estética fintech. */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

interface ThemePersistedState {
  readonly mode: ThemeMode;
}

export interface ThemeStoreState extends ThemePersistedState {
  /** Alterna instantáneamente entre `'dark'` y `'light'`. */
  readonly toggleTheme: () => void;
  /** Establece explícitamente el modo `'dark'` o `'light'`. */
  readonly setTheme: (mode: ThemeMode) => void;
  /** Restaura el tema por defecto (`'dark'`). */
  readonly resetTheme: () => void;
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    set => ({
      mode: DEFAULT_THEME_MODE,

      toggleTheme: () => {
        set(state => ({
          mode: state.mode === 'dark' ? 'light' : 'dark',
        }));
      },

      setTheme: (mode: ThemeMode) => {
        set({ mode });
      },

      resetTheme: () => {
        set({ mode: DEFAULT_THEME_MODE });
      },
    }),
    {
      name: 'challenge:theme-store',
      storage: createPersistedStorage<ThemePersistedState>(),
      partialize: state => ({
        mode: state.mode,
      }),
    },
  ),
);

export const ThemeStore = useThemeStore;

export default useThemeStore;
