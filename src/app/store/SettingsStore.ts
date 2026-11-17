import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorScheme } from '../../core/theme/themes';
import { createPersistedStorage } from './storage';

export type ThemePreference = ColorScheme | 'system';

interface SettingsPersistedState {
  readonly themePreference: ThemePreference;
}

export interface SettingsStoreState extends SettingsPersistedState {
  /** Establece y persiste la preferencia de tema (`'light' | 'dark' | 'system'`). */
  readonly setThemePreference: (preference: ThemePreference) => void;
  /** Restaura las preferencias a sus valores por defecto. */
  readonly resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    set => ({
      themePreference: 'system',

      setThemePreference: (preference: ThemePreference) => {
        set({ themePreference: preference });
      },

      resetSettings: () => {
        set({ themePreference: 'system' });
      },
    }),
    {
      name: 'challenge:settings-store',
      storage: createPersistedStorage<SettingsPersistedState>(),
      partialize: state => ({
        themePreference: state.themePreference,
      }),
    },
  ),
);
