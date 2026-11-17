import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useTheme } from '../../core/theme';
import { OrderModalScreen } from '../orders/screens/OrderModalScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { toNavigationTheme } from './navigationTheme';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * Árbol de navegación:
 *
 *   RootStack (native-stack)
 *   ├── MainTabs (bottom-tabs)
 *   │   ├── Market
 *   │   ├── Favorites
 *   │   └── Orders
 *   └── OrderModal  ← presentation: 'modal' (nativo: sheet en iOS)
 */
export function AppNavigator() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
<StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        {...(Platform.OS === 'android' ? { backgroundColor: theme.colors.surface } : {})}
      />
      <RootStack.Navigator initialRouteName="MainTabs">
        <RootStack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Group
          screenOptions={{
            presentation: 'modal',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.textPrimary,
            headerShadowVisible: false,
          }}>
          <RootStack.Screen
            name="OrderModal"
            component={OrderModalScreen}
            options={({ route }) => ({ title: `Operar ${route.params.symbol}` })}
          />
        </RootStack.Group>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
