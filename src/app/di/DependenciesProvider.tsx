import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Dependencies } from './container';

const DependenciesContext = createContext<Dependencies | null>(null);

interface Props {
  readonly value: Dependencies;
  readonly children: ReactNode;
}

/**
 * Proveedor raíz de dependencias (Composition Root) y gestor del ciclo de vida
 * de las conexiones en vivo mediante `AppState`:
 *  - Cuando la app pasa a `background` / `inactive`, invoca `quoteFeed.pause()`
 *    deteniendo timers y notificaciones de streaming para ahorrar CPU y batería.
 *  - Cuando la app regresa a `active`, invoca `quoteFeed.resume()`, disparando
 *    Sync-on-Resume (snapshot fresco inmediato de los activos visibles en el
 *    viewport) y retomando el bucle de streaming continuo.
 */
export function DependenciesProvider({ value, children }: Props) {
  const appStateRef = useRef<string | null | undefined>(
    AppState.currentState,
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        value.quoteFeed.pause();
        return;
      }

      if (
        nextAppState === 'active' &&
        (previousState === 'background' || previousState === 'inactive')
      ) {
        value.quoteFeed.resume();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [value]);

  return (
    <DependenciesContext.Provider value={value}>
      {children}
    </DependenciesContext.Provider>
  );
}

export const useDependencies = (): Dependencies => {
  const deps = useContext(DependenciesContext);
  if (!deps) {
    throw new Error(
      'useDependencies debe usarse dentro de <DependenciesProvider>',
    );
  }
  return deps;
};

export default DependenciesProvider;
