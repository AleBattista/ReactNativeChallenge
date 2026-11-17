import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Fallback en memoria en caso de que el binario nativo aún no haya sido
 * recompilado tras instalar `@react-native-async-storage/async-storage`.
 */
const memoryFallback = new Map<string, string>();

/**
 * Adaptador explícito de AsyncStorage al contrato `StateStorage` de Zustand.
 */
const asyncStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    memoryFallback.set(name, value);
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Mantiene el valor en memoryFallback si el módulo nativo no está enlazado
    }
  },
  removeItem: async (name: string): Promise<void> => {
    memoryFallback.delete(name);
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Ignora si el módulo nativo no está enlazado
    }
  },
};

/** Fábrica reutilizable de JSON storage sobre AsyncStorage para los 4 stores. */
export const createPersistedStorage = <T>() =>
  createJSONStorage<T>(() => asyncStateStorage);

export default createPersistedStorage;
