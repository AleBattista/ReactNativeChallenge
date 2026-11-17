import React, { createContext, useContext, type ReactNode } from 'react';
import type { Dependencies } from './container';

const DependenciesContext = createContext<Dependencies | null>(null);

interface Props {
  readonly value: Dependencies;
  readonly children: ReactNode;
}

/** El valor es estable (se crea una vez): este Context nunca provoca re-renders. */
export function DependenciesProvider({ value, children }: Props) {
  return <DependenciesContext.Provider value={value}>{children}</DependenciesContext.Provider>;
}

export const useDependencies = (): Dependencies => {
  const deps = useContext(DependenciesContext);
  if (!deps) {
    throw new Error('useDependencies debe usarse dentro de <DependenciesProvider>');
  }
  return deps;
};
