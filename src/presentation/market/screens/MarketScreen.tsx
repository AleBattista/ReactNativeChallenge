import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { Ticker } from '../../../domain/shared';
import type { MainTabScreenProps } from '../../navigation/types';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { Card } from '../../shared/components/Card';
import {
  MARKET_ITEM_ROW_HEIGHT,
  MarketItemRow,
} from '../components/MarketItemRow';
import { MarketSearchBar } from '../components/MarketSearchBar';
import { MarketSortSheet } from '../components/MarketSortSheet';
import { ThemeToggleSwitch } from '../components/ThemeToggleSwitch';
import { useMarketCatalog } from '../hooks/useMarketCatalog';

/**
 * Constante local de respaldo en caso de re-evaluación circular de módulos en Metro.
 */
const ESTIMATED_ROW_HEIGHT = MARKET_ITEM_ROW_HEIGHT ?? 76;

const renderHeaderRight = () => <ThemeToggleSwitch />;

type Props = MainTabScreenProps<'Market'>;

/**
 * Pantalla principal de Mercado:
 *  - Renderiza 2.100+ activos a 60 FPS usando `@shopify/flash-list` con
 *    `estimatedItemSize={ESTIMATED_ROW_HEIGHT}`.
 *  - Gestiona localmente qué filas están expandidas mediante un `Set<Ticker>`
 *    (`expandedTickers`), sin contaminar el estado global de Zustand.
 *  - Integra `MarketSortSheet` para ordenar imperativamente sobre los resultados
 *    filtrados conservando la preferencia al navegar hacia `AssetDetail` y volver.
 */
export function MarketScreen({ navigation }: Props) {
  const { colors, spacing, radii } = useTheme();
  const {
    status,
    errorMessage,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    clearSearch,
    sortConfig,
    applySort,
    filteredSymbols,
    totalCount,
    retry,
    refresh,
  } = useMarketCatalog();

  // Estado local de expansión con Set<Ticker>, fuera de Zustand
  const [expandedTickers, setExpandedTickers] = useState<ReadonlySet<Ticker>>(
    () => new Set<Ticker>(),
  );
  const [isSortSheetVisible, setIsSortSheetVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation]);

  const handleOpenSortSheet = useCallback(() => {
    setIsSortSheetVisible(true);
  }, []);

  const handleCloseSortSheet = useCallback(() => {
    setIsSortSheetVisible(false);
  }, []);

  const handleToggleExpand = useCallback((ticker: Ticker) => {
    if (!ticker) {
      return;
    }
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  }, []);

  const handlePressDetail = useCallback(
    (symbol: Ticker) => {
      if (!symbol) {
        return;
      }
      navigation.navigate('AssetDetail', { symbol });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Ticker>) => {
      if (!item) {
        return null;
      }
      return (
        <MarketItemRow
          ticker={item}
          isExpanded={Boolean(expandedTickers?.has(item))}
          onToggle={handleToggleExpand}
          onPressDetail={handlePressDetail}
        />
      );
    },
    [expandedTickers, handleToggleExpand, handlePressDetail],
  );

  const keyExtractor = useCallback(
    (item: Ticker, index: number) => item ?? `row-${index}`,
    [],
  );

  // Separa los pools de reciclaje de FlashList entre celdas colapsadas y expandidas
  const getItemType = useCallback(
    (item: Ticker) =>
      item && expandedTickers?.has(item) ? 'expanded' : 'collapsed',
    [expandedTickers],
  );

  const safeFilteredSymbols = filteredSymbols ?? [];
  const safeSearchQuery = searchQuery ?? '';

  if (status === 'loading') {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
            padding: spacing.xl,
            gap: spacing.md,
          },
        ]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodyStrong">
          Cargando mercado (2.100+ activos)...
        </AppText>
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
            {errorMessage ??
              'No se pudieron obtener las cotizaciones del mercado.'}
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
        value={safeSearchQuery}
        onChangeText={setSearchQuery}
        onClear={clearSearch}
        resultCount={safeFilteredSymbols.length}
        totalCount={totalCount ?? 0}
        sortConfig={sortConfig}
        onPressSort={handleOpenSortSheet}
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
          data={safeFilteredSymbols}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          extraData={expandedTickers}
          estimatedItemSize={ESTIMATED_ROW_HEIGHT}
          drawDistance={ESTIMATED_ROW_HEIGHT * 8}
          maintainVisibleContentPosition={{ disabled: false }}
          refreshing={Boolean(isRefreshing)}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={[
                styles.emptyState,
                { padding: spacing.xl },
              ]}>
              <Card style={[styles.emptyCard, { gap: spacing.md }]}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.neutralSoft,
                      borderColor: colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}>
                  <AppText variant="title" color="accent">
                    ⌕
                  </AppText>
                </View>

                <AppText variant="title" style={styles.centeredText}>
                  Sin resultados para tu búsqueda
                </AppText>

                <AppText
                  variant="body"
                  color="textSecondary"
                  style={styles.centeredText}>
                  {`No encontramos ningún activo que coincida con "${safeSearchQuery.trim()}". Prueba con otro ticker o limpia el filtro.`}
                </AppText>

                {safeSearchQuery.length > 0 ? (
                  <View style={styles.emptyActionWrapper}>
                    <AppButton
                      label="Limpiar búsqueda"
                      variant="secondary"
                      onPress={clearSearch}
                    />
                  </View>
                ) : null}
              </Card>
            </View>
          }
        />
      </View>

      <MarketSortSheet
        visible={isSortSheetVisible}
        currentSort={sortConfig}
        onApplySort={applySort}
        onClose={handleCloseSortSheet}
      />
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
  emptyCard: {
    width: '100%',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  centeredText: {
    textAlign: 'center',
  },
  emptyActionWrapper: {
    width: '100%',
    marginTop: 4,
  },
});

export default MarketScreen;
