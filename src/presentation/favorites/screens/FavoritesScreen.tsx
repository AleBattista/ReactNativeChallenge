import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFavoritesStore } from '../../../app/store/FavoritesStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { formatQuantity } from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import type { MainTabScreenProps } from '../../navigation/types';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { Card } from '../../shared/components/Card';
import {
  FAVORITE_ITEM_ROW_HEIGHT,
  FavoriteItemRow,
} from '../components/FavoriteItemRow';

const ESTIMATED_ROW_HEIGHT = FAVORITE_ITEM_ROW_HEIGHT ?? 84;

export type FavoritesScreenProps = MainTabScreenProps<'Favorites'>;

/**
 * Pantalla de Favoritos (`FavoritesScreen`):
 *  - Conectada reactivamente a `useFavoritesStore` (Zustand + AsyncStorage).
 *  - Renderiza el listado con `@shopify/flash-list` a 60 FPS donde cada fila
 *    se suscribe individualmente a `useLiveQuote(symbol)`.
 *  - Permite navegar al detalle (`AssetDetail`) o quitar de favoritos con un toque.
 *  - Muestra un Empty State informativo con CTA hacia Mercado cuando no hay favoritos.
 */
export function FavoritesScreen({ navigation }: FavoritesScreenProps) {
  const { colors, spacing } = useTheme();

  const favorites = useFavoritesStore(state => state.favorites);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  const handlePressAsset = useCallback(
    (symbol: Ticker) => {
      if (!symbol) {
        return;
      }
      navigation.navigate('AssetDetail', { symbol });
    },
    [navigation],
  );

  const handleRemoveFavorite = useCallback(
    (symbol: Ticker) => {
      if (!symbol) {
        return;
      }
      toggleFavorite(symbol);
    },
    [toggleFavorite],
  );

  const handleGoToMarket = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Market' });
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Ticker>) => {
      if (!item) {
        return null;
      }
      return (
        <FavoriteItemRow
          ticker={item}
          onPress={handlePressAsset}
          onRemoveFavorite={handleRemoveFavorite}
        />
      );
    },
    [handlePressAsset, handleRemoveFavorite],
  );

  const keyExtractor = useCallback(
    (item: Ticker, index: number) => item ?? `fav-${index}`,
    [],
  );

  const safeFavorites = favorites ?? [];

  if (safeFavorites.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: colors.background, padding: spacing.xl },
        ]}>
        <Card style={[styles.emptyCard, { gap: spacing.md }]}>
          <View
            style={[
              styles.starBadge,
              {
                backgroundColor: colors.neutralSoft,
              },
            ]}>
            <AppText variant="display" color="accent">
              ☆
            </AppText>
          </View>

          <AppText variant="title" style={styles.centeredText}>
            Aún no tienes activos favoritos
          </AppText>

          <AppText color="textSecondary" style={styles.centeredText}>
            Marca tus instrumentos preferidos con la estrella (★) desde el
            listado de Mercado o en la pantalla de detalle de cada activo para
            seguir su cotización en tiempo real desde aquí.
          </AppText>

          <View style={styles.ctaWrapper}>
            <AppButton
              label="Explorar Mercado"
              accessibilityHint="Navega a la pestaña de Mercado para buscar y agregar activos favoritos"
              onPress={handleGoToMarket}
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.summaryHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          },
        ]}>
        <AppText variant="caption" color="textSecondary" style={styles.tabular}>
          {`${formatQuantity(safeFavorites.length)} ${
            safeFavorites.length === 1 ? 'activo seguido' : 'activos seguidos'
          }`}
        </AppText>
      </View>

      <View style={styles.listContainer}>
        <FlashList<Ticker>
          data={safeFavorites}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={ESTIMATED_ROW_HEIGHT}
          drawDistance={ESTIMATED_ROW_HEIGHT * 6}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
  },
  starBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  ctaWrapper: {
    width: '100%',
    marginTop: 4,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default FavoritesScreen;
