import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCompact,
  formatCurrency,
  formatPrice,
  formatQuantity,
} from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { ChangeBadge } from '../../shared/components/ChangeBadge';
import { useAssetInfo, useLiveQuote } from '../hooks/useLiveQuote';

/** Altura estimada de la fila compacta en dp para FlashList. */
export const MARKET_ITEM_ROW_HEIGHT = 76;

const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';

export interface MarketItemRowProps {
  /** Símbolo del activo. */
  readonly ticker: Ticker;
  /** Estado de expansión controlado desde el Set<Ticker> de MarketScreen. */
  readonly isExpanded: boolean;
  /** Callback estable para expandir o colapsar esta fila. */
  readonly onToggle: (ticker: Ticker) => void;
  /** Callback estable ejecutado al presionar el CTA "Ver detalle". */
  readonly onPressDetail: (ticker: Ticker) => void;
}

/**
 * Celda expandible de ultra alto rendimiento (`MarketItemRow`):
 *  - Envuelta en `React.memo` y suscrita individualmente vía `useLiveQuote(ticker)`
 *    (`useSyncExternalStore`): solo esta celda se re-renderiza cuando su precio cambia.
 *  - Ejecuta el parpadeo de color (verde/rojo) en el UI thread con worklets de
 *    `react-native-reanimated` (`useSharedValue`, `withSequence`, `interpolateColor`).
 *  - Transición suave al expandir/colapsar el panel de detalles sin saltos bruscos.
 */
export const MarketItemRow = memo(function MarketItemRowBase({
  ticker,
  isExpanded,
  onToggle,
  onPressDetail,
}: MarketItemRowProps) {
  const { colors, spacing, radii } = useTheme();
  const info = useAssetInfo(ticker);
  const quote = useLiveQuote(ticker);

  const lastPrice = quote?.lastPrice ?? null;
  const prevPriceRef = useRef<number | null>(lastPrice);

  // Shared values en el UI Thread para el flash de precio y rotación del indicador
  const flashProgress = useSharedValue(0);
  const flashDirection = useSharedValue<1 | -1>(1);
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  // Dispara el flash en el hilo nativo de UI cuando fluctúa el último precio
  useEffect(() => {
    const previous = prevPriceRef.current;
    if (previous !== null && lastPrice !== null && lastPrice !== previous) {
      flashDirection.value = lastPrice > previous ? 1 : -1;
      flashProgress.value = withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }),
      );
    }
    prevPriceRef.current = lastPrice;
  }, [lastPrice, flashDirection, flashProgress]);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isExpanded, expandProgress]);

  const positiveFlashColor = colors.positiveSoft;
  const negativeFlashColor = colors.negativeSoft;

  // Worklet que interpola el color de parpadeo directamente en el UI Thread a 60 FPS
  const animatedFlashStyle = useAnimatedStyle(() => {
    'worklet';
    const targetColor =
      flashDirection.value > 0 ? positiveFlashColor : negativeFlashColor;
    return {
      backgroundColor: interpolateColor(
        flashProgress.value,
        [0, 1],
        [TRANSPARENT_COLOR, targetColor],
      ),
    };
  }, [positiveFlashColor, negativeFlashColor]);

  const animatedChevronStyle = useAnimatedStyle(() => {
    'worklet';
    const degrees = expandProgress.value * 180;
    return {
      transform: [{ rotate: `${degrees}deg` }],
    };
  });

  const handleToggle = useCallback(() => {
    onToggle(ticker);
  }, [onToggle, ticker]);

  const handlePressDetail = useCallback(() => {
    onPressDetail(ticker);
  }, [onPressDetail, ticker]);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? ticker;
  const market = info?.market ?? 'BCBA';

  const lastPriceLabel = formatCurrency(lastPrice, currency);
  const openLabel = formatCurrency(quote?.open, currency);
  const lowLabel = formatCurrency(quote?.dayLow, currency);
  const highLabel = formatCurrency(quote?.dayHigh, currency);
  const bidPriceLabel = formatPrice(quote?.bid?.price);
  const bidQtyLabel = formatQuantity(quote?.bid?.quantity);
  const askPriceLabel = formatPrice(quote?.ask?.price);
  const askQtyLabel = formatQuantity(quote?.ask?.quantity);
  const volumeLabel = formatQuantity(quote?.volume);
  const tradedAmountLabel = formatCompact(quote?.tradedAmount);

  return (
    <Animated.View
      layout={LinearTransition?.duration?.(180)}
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}>
      <Animated.View style={animatedFlashStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={`${ticker}, ${description}, último precio ${lastPriceLabel}`}
          accessibilityHint="Toca para expandir o colapsar el detalle del activo"
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.compactRow,
            {
              backgroundColor: pressed ? colors.surfaceElevated : TRANSPARENT_COLOR,
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
          </View>

          <View style={[styles.rightSection, { gap: spacing.md }]}>
            <View style={[styles.priceColumn, { gap: spacing.xxs }]}>
              <AppText variant="price" style={styles.tabular}>
                {lastPriceLabel}
              </AppText>
              <ChangeBadge value={quote?.changePercent ?? null} />
            </View>

            <Animated.View style={[styles.chevronContainer, animatedChevronStyle]}>
              <AppText variant="caption" color="textMuted">
                ▾
              </AppText>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>

      {isExpanded ? (
        <Animated.View
          entering={FadeInDown?.duration?.(180)}
          exiting={FadeOutUp?.duration?.(140)}
          style={[
            styles.expandedPanel,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              gap: spacing.md,
            },
          ]}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <AppText variant="caption" color="textMuted">
                Apertura (Open)
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {openLabel}
              </AppText>
            </View>

            <View style={styles.metricCell}>
              <AppText variant="caption" color="textMuted">
                Mín / Máx intradía
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {`${lowLabel} / ${highLabel}`}
              </AppText>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <AppText variant="caption" color="textMuted">
                Punta Compra (Bid)
              </AppText>
              <AppText variant="bodyStrong" color="positive" style={styles.tabular}>
                {`${bidPriceLabel} (${bidQtyLabel})`}
              </AppText>
            </View>

            <View style={styles.metricCell}>
              <AppText variant="caption" color="textMuted">
                Punta Venta (Ask)
              </AppText>
              <AppText variant="bodyStrong" color="negative" style={styles.tabular}>
                {`${askPriceLabel} (${askQtyLabel})`}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.footerRow,
              {
                borderTopColor: colors.border,
                paddingTop: spacing.sm,
                gap: spacing.md,
              },
            ]}>
            <View style={styles.volumeInfo}>
              <AppText variant="caption" color="textMuted">
                Volumen operado total
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {`${volumeLabel} nom. · $ ${tradedAmountLabel}`}
              </AppText>
            </View>

            <AppButton
              label="Ver detalle"
              accessibilityHint={`Abre la boleta de operación y detalle de ${ticker}`}
              onPress={handlePressDetail}
            />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compactRow: {
    minHeight: MARKET_ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
    gap: 4,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketTag: {
    paddingVertical: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chevronContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    gap: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  volumeInfo: {
    flex: 1,
    gap: 2,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default MarketItemRow;

