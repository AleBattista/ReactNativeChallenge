import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PortfolioHolding } from '../../../app/store/PortfolioStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
} from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import {
  useAssetInfo,
  useLiveQuote,
} from '../../market/hooks/useLiveQuote';
import { AppText } from '../../shared/components/AppText';

/** Altura estimada de la fila de tenencia en dp para FlashList. */
export const HOLDING_ITEM_ROW_HEIGHT = 104;

export interface HoldingItemRowProps {
  readonly holding: PortfolioHolding;
  readonly onPressAsset: (symbol: Ticker) => void;
  readonly onPressSell: (symbol: Ticker) => void;
}

/**
 * Calcula la valuación actual y el resultado no realizado (P&L) de una tenencia.
 */
export const computeHoldingValuation = (
  quantity: number,
  averagePrice: number,
  lastPrice: number | null | undefined,
): {
  readonly costBasis: number;
  readonly marketValue: number | null;
  readonly unrealizedPnl: number | null;
  readonly unrealizedPnlPercent: number | null;
} => {
  const costBasis = quantity * averagePrice;
  if (lastPrice === null || lastPrice === undefined || lastPrice <= 0) {
    return {
      costBasis,
      marketValue: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
    };
  }
  const marketValue = quantity * lastPrice;
  const unrealizedPnl = marketValue - costBasis;
  const unrealizedPnlPercent =
    costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : null;

  return {
    costBasis,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent,
  };
};

/**
 * Fila de Tenencia (`HoldingItemRow`):
 *  - Envuelta en `React.memo`.
 *  - Muestra ticker, cantidad nominal acumulada y precio promedio de compra
 *    con `fontVariant: ['tabular-nums']`, además de la valuación en vivo.
 */
export const HoldingItemRow = memo(function HoldingItemRowBase({
  holding,
  onPressAsset,
  onPressSell,
}: HoldingItemRowProps) {
  const { colors, spacing, radii } = useTheme();
  const { ticker, quantity, averagePrice } = holding;

  const info = useAssetInfo(ticker);
  const quote = useLiveQuote(ticker);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? ticker;
  const lastPrice = quote?.lastPrice ?? null;

  const valuation = computeHoldingValuation(quantity, averagePrice, lastPrice);
  const pnlPositive =
    valuation.unrealizedPnl !== null && valuation.unrealizedPnl >= 0;

  const handlePressRow = useCallback(() => {
    onPressAsset(ticker);
  }, [onPressAsset, ticker]);

  const handlePressSell = useCallback(() => {
    onPressSell(ticker);
  }, [onPressSell, ticker]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tenencia ${ticker}, ${formatQuantity(quantity)} nominales, precio promedio ${formatCurrency(averagePrice, currency)}`}
      accessibilityHint="Toca para abrir el detalle del activo"
      onPress={handlePressRow}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.xs,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={[styles.symbolLine, { gap: spacing.xs }]}>
            <AppText variant="bodyStrong">{ticker}</AppText>
            <View
              style={[
                styles.qtyBadge,
                {
                  backgroundColor: colors.neutralSoft,
                  borderRadius: radii.sm,
                  paddingHorizontal: spacing.sm,
                },
              ]}>
              <AppText
                variant="caption"
                color="textPrimary"
                style={styles.tabular}>
                {`${formatQuantity(quantity)} nom.`}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {description}
          </AppText>
        </View>

        <View style={styles.rightBlock}>
          <AppText variant="price" style={styles.tabular}>
            {formatCurrency(
              valuation.marketValue ?? valuation.costBasis,
              currency,
            )}
          </AppText>
          {valuation.unrealizedPnlPercent !== null ? (
            <AppText
              variant="caption"
              color={pnlPositive ? 'positive' : 'negative'}
              style={styles.tabular}>
              {`${formatCurrency(valuation.unrealizedPnl, currency)} (${formatPercent(
                valuation.unrealizedPnlPercent,
              )})`}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.metricsGroup, { gap: spacing.md }]}>
          <View>
            <AppText variant="caption" color="textMuted">
              Precio prom. compra
            </AppText>
            <AppText variant="bodyStrong" style={styles.tabular}>
              {formatCurrency(averagePrice, currency)}
            </AppText>
          </View>

          <View>
            <AppText variant="caption" color="textMuted">
              Último precio
            </AppText>
            <AppText variant="body" style={styles.tabular}>
              {formatCurrency(lastPrice, currency)}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Vender ${ticker}`}
          hitSlop={8}
          onPress={handlePressSell}
          style={({ pressed }) => [
            styles.sellActionButton,
            {
              backgroundColor: colors.negativeSoft,
              borderColor: colors.sell,
              borderRadius: radii.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <AppText variant="caption" color="negative">
            Vender
          </AppText>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: HOLDING_ITEM_ROW_HEIGHT,
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  symbolLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBadge: {
    paddingVertical: 2,
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  metricsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellActionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default HoldingItemRow;
