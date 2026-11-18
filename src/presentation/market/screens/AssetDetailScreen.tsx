import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavoritesStore } from '../../../app/store/FavoritesStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCompact,
  formatCurrency,
  formatIsoDate,
  formatPercent,
  formatQuantity,
} from '../../../core/utils/formatters';
import { getSpread } from '../../../domain/market/entities/Quote';
import type { RootStackScreenProps } from '../../navigation/types';
import { AppText } from '../../shared/components/AppText';
import { Card } from '../../shared/components/Card';
import { ChangeBadge } from '../../shared/components/ChangeBadge';
import { useAssetInfo, useLiveQuote } from '../hooks/useLiveQuote';

const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';

export type AssetDetailScreenProps = RootStackScreenProps<'AssetDetail'>;

/**
 * Calcula el progreso normalizado [0, 1] del último precio dentro del rango
 * intradía [dayLow, dayHigh] aplicando clamping seguro para no desbordar jamás
 * aunque el precio cotice transitoriamente fuera del rango o min === max.
 */
export const computeClampedDayRangeProgress = (
  lastPrice: number | null | undefined,
  dayLow: number | null | undefined,
  dayHigh: number | null | undefined,
): number => {
  if (
    lastPrice === null ||
    lastPrice === undefined ||
    dayLow === null ||
    dayLow === undefined ||
    dayHigh === null ||
    dayHigh === undefined ||
    !Number.isFinite(lastPrice) ||
    !Number.isFinite(dayLow) ||
    !Number.isFinite(dayHigh)
  ) {
    return 0.5;
  }
  const span = dayHigh - dayLow;
  if (span <= 0) {
    return 0.5;
  }
  const rawRatio = (lastPrice - dayLow) / span;
  return Math.min(1, Math.max(0, rawRatio));
};

/**
 * Calcula el spread absoluto (`precioVenta - precioCompra`) y el porcentaje
 * relativo respecto del último precio (`(spread / ultimoPrecio) * 100`).
 */
export const computeSpreadMetrics = (
  bidPrice: number | null | undefined,
  askPrice: number | null | undefined,
  lastPrice: number | null | undefined,
): { readonly absolute: number | null; readonly relativePercent: number | null } => {
  if (
    bidPrice === null ||
    bidPrice === undefined ||
    askPrice === null ||
    askPrice === undefined
  ) {
    return { absolute: null, relativePercent: null };
  }
  const absolute = getSpread({
    bid: { price: bidPrice, quantity: 0 },
    ask: { price: askPrice, quantity: 0 },
  });
  if (absolute === null) {
    return { absolute: null, relativePercent: null };
  }
  const relativePercent =
    lastPrice !== null && lastPrice !== undefined && lastPrice > 0
      ? (absolute / lastPrice) * 100
      : null;

  return { absolute, relativePercent };
};

/**
 * Pantalla de Detalle del Activo (`AssetDetailScreen`):
 *  - Suscripción granular en vivo vía `useLiveQuote(symbol)` (`useSyncExternalStore`).
 *  - Sincronizada con `FavoritesStore` para marcar/desmarcar favorito.
 *  - Muestra cotización completa, puntas Compra/Venta, Spread derivado,
 *    Barra de Rango del Día con clamping seguro y CTAs de Comprar / Vender.
 */
export function AssetDetailScreen({ route, navigation }: AssetDetailScreenProps) {
  const symbol = route.params.symbol;
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();

  const info = useAssetInfo(symbol);
  const quote = useLiveQuote(symbol);

  const isFavorite = useFavoritesStore(
    useCallback(state => state.favorites.includes(symbol), [symbol]),
  );
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

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

  const animatedPriceFlashStyle = useAnimatedStyle(() => {
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

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(symbol);
  }, [toggleFavorite, symbol]);

  const handleBuy = useCallback(() => {
    navigation.navigate('OrderModal', { symbol, side: 'BUY' });
  }, [navigation, symbol]);

  const handleSell = useCallback(() => {
    navigation.navigate('OrderModal', { symbol, side: 'SELL' });
  }, [navigation, symbol]);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? symbol;
  const market = info?.market ?? 'BCBA';

  const dayLow = quote?.dayLow ?? null;
  const dayHigh = quote?.dayHigh ?? null;
  const bidPrice = quote?.bid?.price ?? null;
  const askPrice = quote?.ask?.price ?? null;

  const rangeProgress = useMemo(
    () => computeClampedDayRangeProgress(lastPrice, dayLow, dayHigh),
    [lastPrice, dayLow, dayHigh],
  );
  const rangePercentageWidth = `${Math.round(rangeProgress * 100)}%` as const;

  const spread = useMemo(
    () => computeSpreadMetrics(bidPrice, askPrice, lastPrice),
    [bidPrice, askPrice, lastPrice],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Barra superior con botón de retorno y favorito */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingBottom: spacing.sm,
            paddingHorizontal: spacing.lg,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al listado"
          hitSlop={8}
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <AppText variant="bodyStrong">← Volver</AppText>
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {symbol}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {`${market} · ${currency}`}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isFavorite }}
          accessibilityLabel={
            isFavorite ? `Quitar ${symbol} de favoritos` : `Agregar ${symbol} a favoritos`
          }
          hitSlop={8}
          onPress={handleToggleFavorite}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: isFavorite ? colors.positiveSoft : colors.background,
              borderColor: isFavorite ? colors.positive : colors.border,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <AppText
            variant="bodyStrong"
            color={isFavorite ? 'positive' : 'textSecondary'}>
            {isFavorite ? '★ Favorito' : '☆ Favorito'}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: spacing.lg, gap: spacing.lg },
        ]}>
        {/* 1. Información general y cotización en vivo */}
        <Card style={{ gap: spacing.md }}>
          <View style={styles.identityHeader}>
            <View style={styles.identityTitleBlock}>
              <View style={[styles.badgeRow, { gap: spacing.xs }]}>
                <AppText variant="title">{symbol}</AppText>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.neutralSoft,
                      borderRadius: radii.sm,
                      paddingHorizontal: spacing.sm,
                    },
                  ]}>
                  <AppText variant="caption" color="textSecondary">
                    {market}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.neutralSoft,
                      borderRadius: radii.sm,
                      paddingHorizontal: spacing.sm,
                    },
                  ]}>
                  <AppText variant="caption" color="textSecondary">
                    {currency}
                  </AppText>
                </View>
              </View>
              <AppText variant="body" color="textSecondary">
                {description}
              </AppText>
            </View>

            <View style={[styles.livePill, { gap: spacing.xxs }]}>
              <View
                style={[styles.liveDot, { backgroundColor: colors.positive }]}
              />
              <AppText variant="caption" color="textSecondary">
                EN VIVO
              </AppText>
            </View>
          </View>

          <Animated.View
            style={[
              styles.priceHeroBox,
              {
                borderRadius: radii.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
              },
              animatedPriceFlashStyle,
            ]}>
            <View>
              <AppText variant="caption" color="textMuted">
                Último precio
              </AppText>
              <AppText variant="priceLarge" style={styles.tabular}>
                {formatCurrency(lastPrice, currency)}
              </AppText>
            </View>
            <ChangeBadge value={quote?.changePercent ?? null} />
          </Animated.View>

          {/* Barra de Rango del Día (Mínimo a Máximo) con clamping seguro [0, 1] */}
          <View style={{ gap: spacing.xs }}>
            <View style={styles.rangeLabelsRow}>
              <View>
                <AppText variant="caption" color="textMuted">
                  Mínimo diario
                </AppText>
                <AppText variant="bodyStrong" style={styles.tabular}>
                  {formatCurrency(dayLow, currency)}
                </AppText>
              </View>

              <View style={styles.rangeRightLabel}>
                <AppText variant="caption" color="textMuted">
                  Máximo diario
                </AppText>
                <AppText variant="bodyStrong" style={styles.tabular}>
                  {formatCurrency(dayHigh, currency)}
                </AppText>
              </View>
            </View>

            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(rangeProgress * 100),
              }}
              style={[
                styles.rangeTrack,
                {
                  backgroundColor: colors.neutralSoft,
                  borderRadius: radii.pill,
                },
              ]}>
              <View
                style={[
                  styles.rangeFill,
                  {
                    width: rangePercentageWidth,
                    backgroundColor: colors.accent,
                    borderRadius: radii.pill,
                  },
                ]}
              />
            </View>

            <AppText
              variant="caption"
              color="textMuted"
              style={[styles.tabular, styles.rangeCaption]}>
              {`Posición en el rango del día: ${Math.round(rangeProgress * 100)} %`}
            </AppText>
          </View>

          <View
            style={[
              styles.metricsRow,
              { borderTopColor: colors.border, paddingTop: spacing.md },
            ]}>
            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Apertura (Open)
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatCurrency(quote?.open, currency)}
              </AppText>
            </View>

            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Último cierre
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatCurrency(quote?.previousClose, currency)}
              </AppText>
            </View>

            {info?.maturityDate ? (
              <View style={styles.metricColumn}>
                <AppText variant="caption" color="textMuted">
                  Vencimiento
                </AppText>
                <AppText variant="bodyStrong" style={styles.tabular}>
                  {formatIsoDate(info.maturityDate)}
                </AppText>
              </View>
            ) : null}
          </View>
        </Card>

        {/* 2. Puntas Compra / Venta (Bid / Ask) y Spread derivado */}
        <Card style={{ gap: spacing.md }}>
          <AppText variant="bodyStrong">Caja de Puntas (Compra / Venta)</AppText>

          <View style={[styles.bookRow, { gap: spacing.md }]}>
            <View
              style={[
                styles.bookSideCard,
                {
                  backgroundColor: colors.positiveSoft,
                  borderRadius: radii.md,
                  padding: spacing.md,
                },
              ]}>
              <AppText variant="caption" color="positive">
                Compra (Bid)
              </AppText>
              <AppText variant="price" color="positive" style={styles.tabular}>
                {formatCurrency(bidPrice, currency)}
              </AppText>
              <AppText variant="caption" color="textSecondary" style={styles.tabular}>
                {`Cant.: ${formatQuantity(quote?.bid?.quantity)} nom.`}
              </AppText>
            </View>

            <View
              style={[
                styles.bookSideCard,
                {
                  backgroundColor: colors.negativeSoft,
                  borderRadius: radii.md,
                  padding: spacing.md,
                },
              ]}>
              <AppText variant="caption" color="negative">
                Venta (Ask)
              </AppText>
              <AppText variant="price" color="negative" style={styles.tabular}>
                {formatCurrency(askPrice, currency)}
              </AppText>
              <AppText variant="caption" color="textSecondary" style={styles.tabular}>
                {`Cant.: ${formatQuantity(quote?.ask?.quantity)} nom.`}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.spreadRow,
              {
                backgroundColor: colors.background,
                borderRadius: radii.md,
                borderColor: colors.border,
                padding: spacing.md,
              },
            ]}>
            <View>
              <AppText variant="caption" color="textMuted">
                Spread Compra / Venta
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatCurrency(spread.absolute, currency)}
              </AppText>
            </View>

            <View style={styles.rangeRightLabel}>
              <AppText variant="caption" color="textMuted">
                Spread relativo
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatPercent(spread.relativePercent, { signed: false })}
              </AppText>
            </View>
          </View>
        </Card>

        {/* 3. Operaciones y Volumen */}
        <Card style={{ gap: spacing.md }}>
          <AppText variant="bodyStrong">Operaciones de la Rueda</AppText>

          <View style={styles.metricsRow}>
            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Volumen operado
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {`${formatQuantity(quote?.volume)} nom.`}
              </AppText>
            </View>

            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Cantidad operada
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatQuantity(quote?.tradedQuantity)}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.metricsRow,
              { borderTopColor: colors.border, paddingTop: spacing.sm },
            ]}>
            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Monto operado (compacto)
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {`$ ${formatCompact(quote?.tradedAmount)}`}
              </AppText>
            </View>

            <View style={styles.metricColumn}>
              <AppText variant="caption" color="textMuted">
                Monto operado total
              </AppText>
              <AppText variant="bodyStrong" style={styles.tabular}>
                {formatCurrency(quote?.tradedAmount, currency)}
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* 4. CTAs Transaccionales fijos en el pie */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            gap: spacing.md,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comprar ${symbol}`}
          onPress={handleBuy}
          style={({ pressed }) => [
            styles.tradeButton,
            {
              backgroundColor: colors.buy,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <AppText variant="bodyStrong" color="onAccent">
            Comprar
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Vender ${symbol}`}
          onPress={handleSell}
          style={({ pressed }) => [
            styles.tradeButton,
            {
              backgroundColor: colors.sell,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <AppText variant="bodyStrong" color="onAccent">
            Vender
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  identityTitleBlock: {
    flex: 1,
    paddingRight: 8,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priceHeroBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rangeRightLabel: {
    alignItems: 'flex-end',
  },
  rangeTrack: {
    height: 10,
    width: '100%',
    overflow: 'hidden',
  },
  rangeFill: {
    height: '100%',
  },
  rangeCaption: {
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    gap: 12,
  },
  metricColumn: {
    flex: 1,
    gap: 2,
  },
  bookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookSideCard: {
    flex: 1,
    gap: 4,
  },
  spreadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tradeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default AssetDetailScreen;
