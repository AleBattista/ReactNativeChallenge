import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';
import { FavoritesScreen } from '../favorites/screens/FavoritesScreen';
import { ThemeToggleSwitch } from '../market/components/ThemeToggleSwitch';
import { MarketScreen } from '../market/screens/MarketScreen';
import { OrdersScreen } from '../orders/screens/OrdersScreen';
import { TabIcon } from './TabIcon';
import type { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface TabIconRenderProps {
  readonly color: string;
  readonly focused: boolean;
  readonly size: number;
}

// Definidos fuera del render: evita recrear componentes en cada render
const renderMarketIcon = (props: TabIconRenderProps) => (
  <TabIcon glyph="▲" {...props} />
);
const renderFavoritesIcon = (props: TabIconRenderProps) => (
  <TabIcon glyph="★" {...props} />
);
const renderOrdersIcon = (props: TabIconRenderProps) => (
  <TabIcon glyph="≡" {...props} />
);
const renderMarketHeaderRight = () => <ThemeToggleSwitch />;

/**
 * Navegador de solapas inferiores (Mercado, Favoritos, Órdenes).
 * Exportado de forma nombrada y por defecto.
 */
export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Market"
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          title: 'Mercado',
          tabBarIcon: renderMarketIcon,
          headerRight: renderMarketHeaderRight,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favoritos', tabBarIcon: renderFavoritesIcon }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Órdenes', tabBarIcon: renderOrdersIcon }}
      />
    </Tab.Navigator>
  );
}

export default MainTabNavigator;
