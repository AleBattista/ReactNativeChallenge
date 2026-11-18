import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';
import { FavoritesScreen } from '../favorites/screens/FavoritesScreen';
import { ThemeToggleSwitch } from '../market/components/ThemeToggleSwitch';
import { MarketScreen } from '../market/screens/MarketScreen';
import { OrdersScreen } from '../orders/screens/OrdersScreen';
import { ScreenHeaderTitle } from '../shared/components/ScreenHeaderTitle';
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
  <TabIcon variant="market" {...props} />
);
const renderFavoritesIcon = (props: TabIconRenderProps) => (
  <TabIcon variant="favorites" {...props} />
);
const renderOrdersIcon = (props: TabIconRenderProps) => (
  <TabIcon variant="orders" {...props} />
);

const renderMarketHeaderTitle = () => (
  <ScreenHeaderTitle
    title="Mercado"
    subtitle="BCBA · Cotizaciones en tiempo real"
  />
);
const renderFavoritesHeaderTitle = () => (
  <ScreenHeaderTitle
    title="Favoritos"
    subtitle="Seguimiento personalizado en vivo"
  />
);
const renderOrdersHeaderTitle = () => (
  <ScreenHeaderTitle
    title="Órdenes"
    subtitle="Portfolio y estado de operaciones"
  />
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
        headerTitleAlign: 'left',
        headerShadowVisible: false,
      }}>
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          title: 'Mercado',
          headerTitle: renderMarketHeaderTitle,
          tabBarIcon: renderMarketIcon,
          headerRight: renderMarketHeaderRight,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favoritos',
          headerTitle: renderFavoritesHeaderTitle,
          tabBarIcon: renderFavoritesIcon,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Órdenes',
          headerTitle: renderOrdersHeaderTitle,
          tabBarIcon: renderOrdersIcon,
        }}
      />
    </Tab.Navigator>
  );
}

export default MainTabNavigator;
