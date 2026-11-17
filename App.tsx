import React, { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createDependencies } from './src/app/di/container';
import { DependenciesProvider } from './src/app/di/DependenciesProvider';
import { ThemeProvider } from './src/core/theme/ThemeProvider';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';

/**
 * Orden de los providers en la raíz:
 *  1. SafeAreaProvider (métricas nativas de pantalla)
 *  2. DependenciesProvider (contenedor de Clean Architecture, referencia única y estable)
 *  3. ThemeProvider (tokens Dark/Light; envuelve a AppNavigator para que useTheme() funcione en el navigator y pantallas)
 *  4. AppNavigator (NavigationContainer + RootStack + MainTabs)
 */
export function App() {
  const dependencies = useMemo(() => createDependencies(), []);

  return (
    <SafeAreaProvider>
      <DependenciesProvider value={dependencies}>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </DependenciesProvider>
    </SafeAreaProvider>
  );
}

export default App;
