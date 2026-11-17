import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTheme } from '../../core/theme';
import { FavoritesScreen } from '../favorites/screens/FavoritesScreen';
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
// (regla react/no-unstable-nested-components).
const marketIcon = (props: TabIconRenderProps) => <TabIcon glyph="▲" {...props} />;
const favoritesIcon = (props: TabIconRenderProps) => <TabIcon glyph="★" {...props} />;
const ordersIcon = (props: TabIconRenderProps) => <TabIcon glyph="≡" {...props} />;

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Market"
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{ title: 'Mercado', tabBarIcon: marketIcon }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favoritos', tabBarIcon: favoritesIcon }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Órdenes', tabBarIcon: ordersIcon }}
      />
    </Tab.Navigator>
  );
}
