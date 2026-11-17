import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ticker } from '../../domain/shared';
import { createPersistedStorage } from './storage';

interface FavoritesPersistedState {
  /** Lista ordenada de tickers marcados como favoritos (`string[]`). */
  readonly favorites: readonly Ticker[];
}

export interface FavoritesStoreState extends FavoritesPersistedState {
  /** Alterna el estado de favorito de un ticker (agrega si no está, quita si ya está). */
  readonly toggleFavorite: (ticker: Ticker) => void;
  /** Verifica si un ticker se encuentra en la lista de favoritos. */
  readonly isFavorite: (ticker: Ticker) => boolean;
  /** Vacía la lista de favoritos. */
  readonly clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesStoreState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (ticker: Ticker) => {
        const normalized = ticker.trim().toUpperCase();
        if (!normalized) {
          return;
        }
        set(state => {
          const exists = state.favorites.includes(normalized);
          const nextFavorites = exists
            ? state.favorites.filter(item => item !== normalized)
            : [...state.favorites, normalized];
          return { favorites: nextFavorites };
        });
      },

      isFavorite: (ticker: Ticker) => {
        const normalized = ticker.trim().toUpperCase();
        return get().favorites.includes(normalized);
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'challenge:favorites-store',
      storage: createPersistedStorage<FavoritesPersistedState>(),
      partialize: state => ({
        favorites: state.favorites,
      }),
    },
  ),
);
