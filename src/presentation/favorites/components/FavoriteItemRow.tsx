import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCurrency,
  formatPrice,
} from '../../../core/utils/formatters';
import type { Ticker } from '../../../domain/shared';
import {
  useAssetInfo,
  useLiveQuote,
} from '../../market/hooks/useLiveQuote';
import { AppText } from '../../shared/components/AppText';
import { ChangeBadge } from '../../shared/components/ChangeBadge';

/** Altura estimada de la celda de favorito en dp para FlashList. */
export const FAVORITE_ITEM_ROW_HEIGHT = 84;

const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';

export interface FavoriteItemRowProps {
  readonly ticker: Ticker;
  readonly onPress: (symbol: Ticker) => void;
  readonly onRemoveFavorite: (symbol: Ticker) => void;
}

/**
 * Celda de alto rendimiento para `FavoritesScreen`:
 *  - Envuelta en `React.memo` y suscrita individualmente vía `useLiveQuote(ticker)`
 *    (`useSyncExternalStore`) para reflejar variaciones en tiempo real a 60 FPS.
 *  - Animación de parpadeo (verde/rojo) en el UI Thread con `react-native-reanimated`.
 *  - Botón directo para quitar de favoritos sin disparar la navegación de la fila.
 */
export const FavoriteItemRow = memo(function FavoriteItemRowBase({
  ticker,
  onPress,
  onRemoveFavorite,
}: FavoriteItemRowProps) {
  const { colors, spacing, radii } = useTheme();
  const info = useAssetInfo(ticker);
  const quote = useLiveQuote(ticker);

  const lastPrice = quote?.lastPrice ?? null;
  const prevPriceRef = useRef<number | null>(lastPrice);

  const flashProgress = useSharedValue(0);
  const flashDirection = useSharedValue<1 | -1>(1);

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

  const positiveFlashColor = colors.positiveSoft;
  const negativeFlashColor = colors.negativeSoft;

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

  const handlePressRow = useCallback(() => {
    onPress(ticker);
  }, [onPress, ticker]);

  const handlePressRemove = useCallback(() => {
    onRemoveFavorite(ticker);
  }, [onRemoveFavorite, ticker]);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? ticker;
  const market = info?.market ?? 'BCBA';

  const lastPriceLabel = formatCurrency(lastPrice, currency);
  const bidLabel = formatPrice(quote?.bid?.price);
  const askLabel = formatPrice(quote?.ask?.price);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        animatedFlashStyle,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ticker}, ${description}, último precio ${lastPriceLabel}`}
        accessibilityHint="Toca para ver el detalle completo del activo"
        onPress={handlePressRow}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed
              ? colors.surfaceElevated
              : TRANSPARENT_COLOR,
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

        <View style={[styles.rightSection, { gap: spacing.md }]}>
          <View style={[styles.priceColumn, { gap: spacing.xxs }]}>
            <AppText variant="price" style={styles.tabular}>
              {lastPriceLabel}
            </AppText>
            <ChangeBadge value={quote?.changePercent ?? null} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${ticker} de favoritos`}
            hitSlop={10}
            onPress={handlePressRemove}
            style={({ pressed }) => [
              styles.favoriteButton,
              {
                backgroundColor: colors.positiveSoft,
                borderColor: colors.positive,
                borderRadius: radii.md,
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <AppText variant="bodyStrong" color="positive">
              ★
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: FAVORITE_ITEM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default FavoriteItemRow;
