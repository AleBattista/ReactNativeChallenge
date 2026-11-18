import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  useOrderStore,
  type StoredOrder,
} from '../../../app/store/OrderStore';
import {
  usePortfolioStore,
  type PortfolioHolding,
} from '../../../app/store/PortfolioStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCurrency,
  formatQuantity,
} from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import type { MainTabScreenProps } from '../../navigation/types';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { Card } from '../../shared/components/Card';
import {
  HOLDING_ITEM_ROW_HEIGHT,
  HoldingItemRow,
} from '../components/HoldingItemRow';
import {
  ORDER_HISTORY_ITEM_ROW_HEIGHT,
  OrderHistoryItemRow,
} from '../components/OrderHistoryItemRow';

const ESTIMATED_HOLDING_ROW_HEIGHT = HOLDING_ITEM_ROW_HEIGHT ?? 104;
const ESTIMATED_ORDER_ROW_HEIGHT = ORDER_HISTORY_ITEM_ROW_HEIGHT ?? 100;
const TRANSPARENT_COLOR = 'transparent';

export type OrdersScreenTab = 'HOLDINGS' | 'HISTORY';

export type OrdersScreenProps = MainTabScreenProps<'Orders'>;

/**
 * Pantalla de Órdenes y Portfolio (`OrdersScreen`):
 *  - Resumen de cuenta en tiempo real conectado a `PortfolioStore` (`cashBalance`).
 *  - Pestañas internas para alternar entre Tenencias (`HOLDINGS`) e Historial de
 *    Órdenes (`HISTORY`).
 *  - Listados de alto rendimiento a 60 FPS con `@shopify/flash-list` y
 *    `estimatedItemSize` específico para cada vista.
 *  - Estados vacíos informativos con acceso directo al Mercado.
 */
export function OrdersScreen({ navigation }: OrdersScreenProps) {
  const { colors, spacing, radii } = useTheme();

  const cashBalance = usePortfolioStore(state => state.cashBalance);
  const holdings = usePortfolioStore(state => state.holdings);
  const orders = useOrderStore(state => state.orders);

  const [activeTab, setActiveTab] = useState<OrdersScreenTab>('HOLDINGS');

  const safeHoldings = useMemo(() => holdings ?? [], [holdings]);
  const safeOrders = useMemo(() => orders ?? [], [orders]);

  const totalInvestedCost = useMemo(
    () =>
      safeHoldings.reduce(
        (sum, item) => sum + item.quantity * item.averagePrice,
        0,
      ),
    [safeHoldings],
  );

  const pendingOrdersCount = useMemo(
    () => safeOrders.filter(order => order.status === 'PENDING').length,
    [safeOrders],
  );

  const handleSelectHoldingsTab = useCallback(() => {
    setActiveTab('HOLDINGS');
  }, []);

  const handleSelectHistoryTab = useCallback(() => {
    setActiveTab('HISTORY');
  }, []);

  const handlePressAsset = useCallback(
    (symbol: Ticker) => {
      if (!symbol) {
        return;
      }
      navigation.navigate('AssetDetail', { symbol });
    },
    [navigation],
  );

  const handlePressSell = useCallback(
    (symbol: Ticker) => {
      if (!symbol) {
        return;
      }
      navigation.navigate('OrderModal', { symbol, side: 'SELL' });
    },
    [navigation],
  );

  const handleGoToMarket = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Market' });
  }, [navigation]);

  const renderHoldingItem = useCallback(
    ({ item }: ListRenderItemInfo<PortfolioHolding>) => {
      if (!item) {
        return null;
      }
      return (
        <HoldingItemRow
          holding={item}
          onPressAsset={handlePressAsset}
          onPressSell={handlePressSell}
        />
      );
    },
    [handlePressAsset, handlePressSell],
  );

  const keyExtractorHolding = useCallback(
    (item: PortfolioHolding, index: number) =>
      item?.ticker ?? `holding-${index}`,
    [],
  );

  const renderOrderItem = useCallback(
    ({ item }: ListRenderItemInfo<StoredOrder>) => {
      if (!item) {
        return null;
      }
      return (
        <OrderHistoryItemRow order={item} onPressAsset={handlePressAsset} />
      );
    },
    [handlePressAsset],
  );

  const keyExtractorOrder = useCallback(
    (item: StoredOrder, index: number) => item?.id ?? `order-${index}`,
    [],
  );

  const isHoldingsTab = activeTab === 'HOLDINGS';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* 1. Resumen de Cuenta y Pestañas Internas */}
      <View
        style={[
          styles.headerPanel,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            gap: spacing.md,
          },
        ]}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceMain}>
            <AppText variant="caption" color="textMuted">
              Efectivo disponible en cuenta
            </AppText>
            <AppText variant="priceLarge" style={styles.tabular}>
              {formatCurrency(cashBalance, 'ARS')}
            </AppText>
          </View>

          <View style={styles.summaryMetaColumn}>
            <AppText variant="caption" color="textMuted">
              Costo invertido
            </AppText>
            <AppText variant="bodyStrong" style={styles.tabular}>
              {formatCurrency(totalInvestedCost, 'ARS')}
            </AppText>
            {pendingOrdersCount > 0 ? (
              <AppText variant="caption" color="accent" style={styles.tabular}>
                {`${formatQuantity(pendingOrdersCount)} en proceso...`}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Control segmentado de solapas: Tenencias vs Historial */}
        <View
          accessibilityRole="tablist"
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.xxs,
            },
          ]}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isHoldingsTab }}
            accessibilityLabel={`Tenencias, ${safeHoldings.length} activos`}
            onPress={handleSelectHoldingsTab}
            style={[
              styles.tabButton,
              {
                backgroundColor: isHoldingsTab
                  ? colors.accent
                  : TRANSPARENT_COLOR,
                borderRadius: radii.sm,
                paddingVertical: spacing.sm,
              },
            ]}>
            <AppText
              variant="bodyStrong"
              color={isHoldingsTab ? 'onAccent' : 'textSecondary'}
              style={styles.tabular}>
              {`Tenencias (${formatQuantity(safeHoldings.length)})`}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !isHoldingsTab }}
            accessibilityLabel={`Historial de órdenes, ${safeOrders.length} registros`}
            onPress={handleSelectHistoryTab}
            style={[
              styles.tabButton,
              {
                backgroundColor: !isHoldingsTab
                  ? colors.accent
                  : TRANSPARENT_COLOR,
                borderRadius: radii.sm,
                paddingVertical: spacing.sm,
              },
            ]}>
            <AppText
              variant="bodyStrong"
              color={!isHoldingsTab ? 'onAccent' : 'textSecondary'}
              style={styles.tabular}>
              {`Historial (${formatQuantity(safeOrders.length)})`}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* 2. Contenido de la solapa activa con FlashList */}
      <View style={styles.listContainer}>
        {isHoldingsTab ? (
          safeHoldings.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { padding: spacing.xl },
              ]}>
              <Card style={[styles.emptyCard, { gap: spacing.md }]}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: colors.neutralSoft,
                      borderColor: colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}>
                  <AppText variant="title" color="accent">
                    💼
                  </AppText>
                </View>

                <AppText variant="title" style={styles.centeredText}>
                  Tu portfolio está vacío
                </AppText>

                <AppText
                  variant="body"
                  color="textSecondary"
                  style={styles.centeredText}>
                  Aún no posees tenencias en cartera. Explora el listado de
                  Mercado, selecciona un activo y presiona &ldquo;Comprar&rdquo;
                  para invertir tu saldo disponible.
                </AppText>

                <View style={styles.ctaWrapper}>
                  <AppButton
                    label="Ir a Mercado"
                    accessibilityHint="Navega a la pestaña de Mercado para comprar activos"
                    onPress={handleGoToMarket}
                  />
                </View>
              </Card>
            </View>
          ) : (
            <FlashList<PortfolioHolding>
              data={safeHoldings}
              renderItem={renderHoldingItem}
              keyExtractor={keyExtractorHolding}
              estimatedItemSize={ESTIMATED_HOLDING_ROW_HEIGHT}
              drawDistance={ESTIMATED_HOLDING_ROW_HEIGHT * 6}
            />
          )
        ) : safeOrders.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { padding: spacing.xl },
            ]}>
            <Card style={[styles.emptyCard, { gap: spacing.md }]}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: colors.neutralSoft,
                    borderColor: colors.border,
                    borderRadius: radii.pill,
                  },
                ]}>
                <AppText variant="title" color="accent">
                  ≡
                </AppText>
              </View>

              <AppText variant="title" style={styles.centeredText}>
                Sin órdenes registradas
              </AppText>

              <AppText
                variant="body"
                color="textSecondary"
                style={styles.centeredText}>
                Todas las órdenes de compra y venta que envíes desde el
                simulador aparecerán aquí ordenadas de más reciente a más
                antigua con su estado de ejecución.
              </AppText>

              <View style={styles.ctaWrapper}>
                <AppButton
                  label="Operar en Mercado"
                  accessibilityHint="Navega a la pestaña de Mercado para enviar tu primera orden"
                  onPress={handleGoToMarket}
                />
              </View>
            </Card>
          </View>
        ) : (
          <FlashList<StoredOrder>
            data={safeOrders}
            renderItem={renderOrderItem}
            keyExtractor={keyExtractorOrder}
            estimatedItemSize={ESTIMATED_ORDER_ROW_HEIGHT}
            drawDistance={ESTIMATED_ORDER_ROW_HEIGHT * 6}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerPanel: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceMain: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  summaryMetaColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  iconBadge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
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

export default OrdersScreen;
