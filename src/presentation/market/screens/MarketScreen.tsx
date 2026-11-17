import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme';
import type { Ticker } from '../../../domain/shared';
import type { MainTabScreenProps } from '../../navigation/types';
import { AppButton, AppText, Card } from '../../shared/components';
import {
  MARKET_ITEM_ROW_HEIGHT,
  MarketItemRow,
  MarketSearchBar,
} from '../components';
import { useMarketCatalog } from '../hooks';

type Props = MainTabScreenProps<'Market'>;

/**
 * Pantalla principal de Mercado:
 *  - Renderiza 2.100+ activos a 60 FPS usando `@shopify/flash-list` con
 *    `estimatedItemSize={MARKET_ITEM_ROW_HEIGHT}`.
 *  - Pasa únicamente `Ticker` (string) como ítem a `FlashList`: los ticks de
 *    precios en vivo no alteran la colección de la lista y solo re-renderizan
 *    la celda afectada mediante `useSyncExternalStore`.
 *  - Filtra instantáneamente en memoria por símbolo o descripción.
 */
export function MarketScreen({ navigation }: Props) {
  const { colors, spacing } = useTheme();
  const {
    status,
    errorMessage,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    clearSearch,
    filteredSymbols,
    totalCount,
    retry,
    refresh,
  } = useMarketCatalog();

  const handlePressItem = useCallback(
    (symbol: Ticker) => {
      navigation.navigate('OrderModal', { symbol, side: 'BUY' });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Ticker>) => (
      <MarketItemRow ticker={item} onPress={handlePressItem} />
    ),
    [handlePressItem],
  );

  const keyExtractor = useCallback((item: Ticker) => item, []);

  if (status === 'loading') {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
        ]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodyStrong">Cargando mercado (2.100+ activos)...</AppText>
        <AppText variant="caption" color="textSecondary">
          Conectando cotizaciones en tiempo real
        </AppText>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, padding: spacing.xl },
        ]}>
        <Card style={[styles.errorCard, { gap: spacing.md }]}>
          <AppText variant="title" color="negative">
            Error de conexión
          </AppText>
          <AppText color="textSecondary">
            {errorMessage ?? 'No se pudieron obtener las cotizaciones del mercado.'}
          </AppText>
          <AppButton
            label="Reintentar carga"
            accessibilityHint="Vuelve a solicitar el listado de activos"
            onPress={retry}
          />
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MarketSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={clearSearch}
        resultCount={filteredSymbols.length}
        totalCount={totalCount}
      />

      {errorMessage ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.negativeSoft,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.xs,
            },
          ]}>
          <AppText variant="caption" color="negative">
            {`${errorMessage} · Mostrando última instantánea`}
          </AppText>
        </View>
      ) : null}

      <View style={styles.listContainer}>
        <FlashList<Ticker>
          data={filteredSymbols}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={MARKET_ITEM_ROW_HEIGHT}
          drawDistance={MARKET_ITEM_ROW_HEIGHT * 8}
          refreshing={isRefreshing}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={[styles.emptyState, { padding: spacing.xl, gap: spacing.sm }]}>
              <AppText variant="bodyStrong">Sin resultados</AppText>
              <AppText variant="caption" color="textSecondary">
                {`No se encontraron activos que coincidan con "${searchQuery.trim()}".`}
              </AppText>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    width: '100%',
  },
  errorBanner: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
