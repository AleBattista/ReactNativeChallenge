import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OrderSide } from '../../domain/orders';
import type { Ticker } from '../../domain/shared';

/**
 * Solapas principales. `undefined` = la ruta no recibe parámetros.
 * Usar `type` (no `interface`): React Navigation requiere un index signature implícito.
 */
export type BottomTabParamList = {
  Market: undefined;
  Favorites: undefined;
  Orders: undefined;
};

/**
 * Stack raíz: contiene las tabs, la pantalla de detalle de activo y los modales.
 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  AssetDetail: {
    readonly symbol: Ticker;
  };
  OrderModal: {
    readonly symbol: Ticker;
    /** Lado preseleccionado; si se omite, el usuario lo elige en el modal. */
    readonly side?: OrderSide;
  };
};

// ---- Props tipadas por pantalla -------------------------------------------

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Pantallas dentro de las tabs: componen la navegación de tabs con la del
 * stack padre, así `navigation.navigate('AssetDetail', ...)` y
 * `navigation.navigate('OrderModal', ...)` tipan correctamente desde cualquier solapa.
 */
export type MainTabScreenProps<T extends keyof BottomTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

/**
 * Tipado global: `useNavigation()` sin genéricos queda tipado contra el stack
 * raíz en toda la app (componentes que no son pantallas incluidos).
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
