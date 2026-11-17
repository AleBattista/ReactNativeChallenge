import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme';
import {
  formatCurrency,
  formatPrice,
} from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import { AppText, ChangeBadge } from '../../shared/components';
import { useAssetInfo, useLiveQuote } from '../hooks/useLiveQuote';

/** Altura fija de cada fila en dp para optimizar el layout de FlashList. */
export const MARKET_ITEM_ROW_HEIGHT = 76;

export interface MarketItemRowProps {
  /** Recibe únicamente el ticker para garantizar estabilidad referencial en React.memo. */
  readonly ticker: Ticker;
  /** Callback estable (useCallback) que abre el OrderModal para este símbolo. */
  readonly onPress: (ticker: Ticker) => void;
}

/**
 * Celda de ultra alto rendimiento para el listado de Mercado:
 *  - Envuelta en `React.memo` y parametrizada únicamente por `ticker` + `onPress`.
 *  - Se suscribe de forma granular al `MarketMemoryStore` vía `useLiveQuote(ticker)`
 *    (`useSyncExternalStore`): un tick en este activo re-renderiza SOLO esta fila.
 *  - Usa `fontVariant: ['tabular-nums']` en todos los importes y porcentajes.
 */
export const MarketItemRow = memo(function MarketItemRowBase({
  ticker,
  onPress,
}: MarketItemRowProps) {
  const { colors, spacing, radii } = useTheme();
  const info = useAssetInfo(ticker);
  const quote = useLiveQuote(ticker);

  const handlePress = useCallback(() => {
    onPress(ticker);
  }, [onPress, ticker]);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? ticker;
  const market = info?.market ?? 'BCBA';

  const lastPriceLabel = formatCurrency(quote?.lastPrice, currency);
  const bidLabel = formatPrice(quote?.bid.price);
  const askLabel = formatPrice(quote?.ask.price);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ticker}, ${description}, último precio ${lastPriceLabel}`}
      accessibilityHint="Toca para abrir el modal de orden de compra"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.lg,
        },
      ]}>
      <View style={styles.leftColumn}>
        <View style={[styles.symbolRow, { gap: spacing.xs }]}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {ticker}
          </AppText>
          <View
            style={[
              styles.marketTag,
              {
                backgroundColor: colors.neutralSoft,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.xs,
              },
            ]}>
            <AppText variant="caption" color="textSecondary">
              {`${market} · ${currency}`}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {description}
        </AppText>

        <AppText
          variant="caption"
          color="textMuted"
          numberOfLines={1}
          style={styles.tabular}>
          {`C: ${bidLabel}  ·  V: ${askLabel}`}
        </AppText>
      </View>

      <View style={[styles.rightColumn, { gap: spacing.xs }]}>
        <AppText variant="price" style={styles.tabular}>
          {lastPriceLabel}
        </AppText>
        <ChangeBadge value={quote?.changePercent ?? null} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    height: MARKET_ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
    gap: 2,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketTag: {
    paddingVertical: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
