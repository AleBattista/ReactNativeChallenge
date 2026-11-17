import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Adaptador explícito de AsyncStorage al contrato `StateStorage` de Zustand.
 */
const asyncStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/** Fábrica reutilizable de JSON storage sobre AsyncStorage para los 4 stores. */
export const createPersistedStorage = <T>() =>
  createJSONStorage<T>(() => asyncStateStorage);
