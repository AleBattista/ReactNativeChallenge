import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useOrderStore } from '../../../app/store/OrderStore';
import {
  roundCurrency,
  usePortfolioStore,
} from '../../../app/store/PortfolioStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCurrency,
  formatQuantity,
} from '../../../core/utils/formatters';
import type { OrderSide } from '../../../domain/orders';
import {
  useAssetInfo,
  useLiveQuote,
} from '../../market/hooks/useLiveQuote';
import type { RootStackScreenProps } from '../../navigation/types';
import { AppText } from '../../shared/components/AppText';

export type OrderModalScreenProps = RootStackScreenProps<'OrderModal'>;

export const COMMISSION_RATE = 0.005; // 0.5% sobre el monto bruto
export const VAT_RATE = 0.21; // 21% sobre la comisión

export interface OrderCostBreakdown {
  readonly quantity: number;
  readonly unitPrice: number;
  readonly grossAmount: number;
  readonly commission: number;
  readonly vat: number;
  readonly totalFees: number;
  readonly finalTotal: number;
}

/**
 * Motor financiero puro:
 *  - Monto bruto = cantidad × precio
 *  - Comisión = 0.5% sobre el monto bruto
 *  - IVA = 21% sobre la comisión
 *  - Total final = Monto + Costos (Compra) / Monto - Costos (Venta)
 */
export const calculateOrderBreakdown = (
  quantity: number,
  unitPrice: number,
  side: OrderSide,
): OrderCostBreakdown => {
  const safeQty =
    Number.isFinite(quantity) && quantity > 0 ? Math.trunc(quantity) : 0;
  const safePrice =
    Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;

  const grossAmount = roundCurrency(safeQty * safePrice);
  const commission = roundCurrency(grossAmount * COMMISSION_RATE);
  const vat = roundCurrency(commission * VAT_RATE);
  const totalFees = roundCurrency(commission + vat);
  const finalTotal =
    side === 'BUY'
      ? roundCurrency(grossAmount + totalFees)
      : Math.max(0, roundCurrency(grossAmount - totalFees));

  return {
    quantity: safeQty,
    unitPrice: safePrice,
    grossAmount,
    commission,
    vat,
    totalFees,
    finalTotal,
  };
};

export interface OrderValidationInput {
  readonly side: OrderSide;
  readonly quantity: number;
  readonly unitPrice: number | null;
  readonly finalTotal: number;
  readonly cashBalance: number;
  readonly ownedQuantity: number;
}

export interface OrderValidationResult {
  readonly isValid: boolean;
  readonly errorMessage: string | null;
}

/**
 * Validaciones de negocio atómicas previas a la confirmación:
 *  - Cantidad entera > 0 y precio en vivo disponible.
 *  - Compra: `finalTotal <= cashBalance`.
 *  - Venta: `quantity <= ownedQuantity`.
 */
export const validateOrderDraft = ({
  side,
  quantity,
  unitPrice,
  finalTotal,
  cashBalance,
  ownedQuantity,
}: OrderValidationInput): OrderValidationResult => {
  if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return {
      isValid: false,
      errorMessage: 'Esperando cotización en vivo del activo...',
    };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      isValid: false,
      errorMessage: null,
    };
  }

  if (side === 'BUY' && finalTotal > cashBalance) {
    return {
      isValid: false,
      errorMessage:
        'El total final con comisiones e IVA supera tu saldo disponible en efectivo.',
    };
  }

  if (side === 'SELL' && quantity > ownedQuantity) {
    return {
      isValid: false,
      errorMessage:
        ownedQuantity === 0
          ? 'No posees tenencias de este activo para vender.'
          : `La cantidad ingresada supera tu tenencia disponible (${ownedQuantity} nom.).`,
    };
  }

  return {
    isValid: true,
    errorMessage: null,
  };
};

type ModalStep = 'INPUT' | 'REVIEW';

/**
 * Modal Transaccional de Tarjeta Flotante Centrada (`OrderModalScreen`):
 *  - Paso 1 (`INPUT`): ingreso de cantidad con cálculo de costos en tiempo real
 *    (`useLiveQuote(symbol)`) y validaciones de saldo/tenencia.
 *  - Paso 2 (`REVIEW`): revisión detallada y confirmación atómica protegida
 *    contra doble tap (`isSubmitting` + `submittingRef`).
 */
export function OrderModalScreen({ route, navigation }: OrderModalScreenProps) {
  const symbol = route.params?.symbol ?? '';
  const side: OrderSide = route.params?.side ?? 'BUY';
  const isBuy = side === 'BUY';

  const { colors, spacing, radii, typography } = useTheme();
  const info = useAssetInfo(symbol);
  const quote = useLiveQuote(symbol);

  const cashBalance = usePortfolioStore(state => state.cashBalance);
  const ownedQuantity = usePortfolioStore(
    useCallback(
      state => {
        const normalized = symbol.trim().toUpperCase();
        return (
          state.holdings.find(item => item.ticker === normalized)?.quantity ?? 0
        );
      },
      [symbol],
    ),
  );
  const executeBuy = usePortfolioStore(state => state.executeBuy);
  const executeSell = usePortfolioStore(state => state.executeSell);
  const placeOrder = useOrderStore(state => state.placeOrder);

  const [quantityText, setQuantityText] = useState('1');
  const [step, setStep] = useState<ModalStep>('INPUT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const currency = info?.currency ?? 'ARS';
  const description = info?.description ?? symbol;
  const livePrice = quote?.lastPrice ?? null;

  const parsedQuantity = useMemo(() => {
    const cleaned = quantityText.trim();
    if (!/^\d+$/.test(cleaned)) {
      return 0;
    }
    const num = Number.parseInt(cleaned, 10);
    return Number.isSafeInteger(num) ? num : 0;
  }, [quantityText]);

  const breakdown = useMemo(
    () => calculateOrderBreakdown(parsedQuantity, livePrice ?? 0, side),
    [parsedQuantity, livePrice, side],
  );

  const validation = useMemo(
    () =>
      validateOrderDraft({
        side,
        quantity: parsedQuantity,
        unitPrice: livePrice,
        finalTotal: breakdown.finalTotal,
        cashBalance,
        ownedQuantity,
      }),
    [side, parsedQuantity, livePrice, breakdown.finalTotal, cashBalance, ownedQuantity],
  );

  const handleChangeQuantity = useCallback((raw: string) => {
    const digitsOnly = raw.replace(/\D+/g, '');
    setQuantityText(digitsOnly);
    setSubmitError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (submittingRef.current) {
      return;
    }
    navigation.goBack();
  }, [navigation]);

  const handleContinueToReview = useCallback(() => {
    if (!validation.isValid) {
      return;
    }
    setSubmitError(null);
    setStep('REVIEW');
  }, [validation.isValid]);

  const handleBackToInput = useCallback(() => {
    if (submittingRef.current) {
      return;
    }
    setSubmitError(null);
    setStep('INPUT');
  }, []);

  const handleConfirmOrder = useCallback(() => {
    // Protección estricta contra doble tap síncrona y por estado
    if (submittingRef.current || isSubmitting) {
      return;
    }
    if (!validation.isValid || livePrice === null || livePrice <= 0) {
      setSubmitError(
        validation.errorMessage ??
          'No es posible confirmar la orden con los datos actuales.',
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const txResult = isBuy
      ? executeBuy(symbol, parsedQuantity, livePrice, breakdown.finalTotal)
      : executeSell(symbol, parsedQuantity, livePrice, breakdown.finalTotal);

    if (!txResult.ok) {
      submittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(txResult.message);
      return;
    }

    placeOrder({
      ticker: symbol,
      type: side,
      quantity: parsedQuantity,
      price: livePrice,
      totalAmount: breakdown.finalTotal,
      portfolioAlreadySettled: true,
    });

    const operationLabel = isBuy ? 'Compra' : 'Venta';
    Alert.alert(
      `${operationLabel} enviada`,
      `Tu orden de ${operationLabel.toLowerCase()} por ${formatQuantity(
        parsedQuantity,
      )} ${symbol} (${formatCurrency(
        breakdown.finalTotal,
        currency,
      )}) fue registrada con éxito.`,
    );

    navigation.goBack();
  }, [
    isSubmitting,
    validation.isValid,
    validation.errorMessage,
    livePrice,
    isBuy,
    executeBuy,
    executeSell,
    symbol,
    parsedQuantity,
    breakdown.finalTotal,
    placeOrder,
    side,
    currency,
    navigation,
  ]);

  const headerTitle = `${isBuy ? 'Comprar' : 'Vender'} ${symbol}`;
  const accentSideColor = isBuy ? colors.buy : colors.sell;
  const activeErrorMessage = submitError ?? validation.errorMessage;

  return (
    <View style={styles.backdrop}>
      {/* Tocar fuera de la tarjeta cierra el modal */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar modal"
        onPress={handleClose}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <View
          style={[
            styles.floatingCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
            },
          ]}>
          {/* Header del modal con operación heredada y botón ✕ */}
          <View
            style={[
              styles.cardHeader,
              {
                borderBottomColor: colors.border,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
              },
            ]}>
            <View style={styles.headerTitleBlock}>
              <View style={[styles.titleRow, { gap: spacing.xs }]}>
                <View
                  style={[
                    styles.sideIndicator,
                    { backgroundColor: accentSideColor },
                  ]}
                />
                <AppText variant="title">{headerTitle}</AppText>
              </View>
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {`${description} · Paso ${step === 'INPUT' ? '1 de 2' : '2 de 2'}`}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar simulador de orden"
              hitSlop={10}
              disabled={isSubmitting}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <AppText variant="bodyStrong" color="textSecondary">
                ✕
              </AppText>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: spacing.xl,
              gap: spacing.md,
            }}>
            {/* Contexto de precio en vivo y disponibilidad */}
            <View
              style={[
                styles.contextBanner,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  padding: spacing.md,
                },
              ]}>
              <View>
                <AppText variant="caption" color="textMuted">
                  Último precio (en vivo)
                </AppText>
                <AppText variant="price" style={styles.tabular}>
                  {formatCurrency(livePrice, currency)}
                </AppText>
              </View>

              <View style={styles.rightAligned}>
                <AppText variant="caption" color="textMuted">
                  {isBuy ? 'Saldo disponible' : 'Tenencia actual'}
                </AppText>
                <AppText variant="bodyStrong" style={styles.tabular}>
                  {isBuy
                    ? formatCurrency(cashBalance, 'ARS')
                    : `${formatQuantity(ownedQuantity)} nom.`}
                </AppText>
              </View>
            </View>

            {step === 'INPUT' ? (
              <>
                {/* Paso 1: Input numérico de cantidad */}
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="bodyStrong">
                    Cantidad de nominales
                  </AppText>
                  <TextInput
                    value={quantityText}
                    onChangeText={handleChangeQuantity}
                    keyboardType="number-pad"
                    placeholder="Ej. 10"
                    placeholderTextColor={colors.textMuted}
                    maxLength={9}
                    accessibilityLabel="Cantidad de nominales a operar"
                    style={[
                      styles.quantityInput,
                      typography.price,
                      styles.tabular,
                      {
                        backgroundColor: colors.background,
                        borderColor: activeErrorMessage
                          ? colors.negative
                          : colors.border,
                        borderRadius: radii.md,
                        color: colors.textPrimary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                      },
                    ]}
                  />
                </View>

                {/* Desglose de costos en vivo */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      gap: spacing.xs,
                    },
                  ]}>
                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Monto bruto ({formatQuantity(parsedQuantity)} ×{' '}
                      {formatCurrency(livePrice, currency)})
                    </AppText>
                    <AppText variant="body" style={styles.tabular}>
                      {formatCurrency(breakdown.grossAmount, currency)}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Comisión (0,50 %)
                    </AppText>
                    <AppText variant="body" style={styles.tabular}>
                      {formatCurrency(breakdown.commission, currency)}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      IVA sobre comisión (21,00 %)
                    </AppText>
                    <AppText variant="body" style={styles.tabular}>
                      {formatCurrency(breakdown.vat, currency)}
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.breakdownRow,
                      styles.totalRow,
                      { borderTopColor: colors.border, paddingTop: spacing.xs },
                    ]}>
                    <AppText variant="bodyStrong">
                      {isBuy ? 'Total a debitar' : 'Total neto a acreditar'}
                    </AppText>
                    <AppText
                      variant="price"
                      color={isBuy ? 'positive' : 'accent'}
                      style={styles.tabular}>
                      {formatCurrency(breakdown.finalTotal, currency)}
                    </AppText>
                  </View>
                </View>

                {activeErrorMessage ? (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: colors.negativeSoft,
                        borderRadius: radii.sm,
                        padding: spacing.sm,
                      },
                    ]}>
                    <AppText variant="caption" color="negative">
                      {activeErrorMessage}
                    </AppText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continuar a revisión de la orden"
                  accessibilityState={{ disabled: !validation.isValid }}
                  disabled={!validation.isValid}
                  onPress={handleContinueToReview}
                  style={({ pressed }) => [
                    styles.primaryActionButton,
                    {
                      backgroundColor: validation.isValid
                        ? accentSideColor
                        : colors.neutralSoft,
                      borderRadius: radii.md,
                      paddingVertical: spacing.md,
                      opacity: pressed && validation.isValid ? 0.85 : 1,
                    },
                  ]}>
                  <AppText
                    variant="bodyStrong"
                    color={validation.isValid ? 'onAccent' : 'textMuted'}>
                    Revisar orden
                  </AppText>
                </Pressable>
              </>
            ) : (
              <>
                {/* Paso 2: Confirmación final detallada */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      gap: spacing.sm,
                    },
                  ]}>
                  <AppText variant="bodyStrong">
                    Resumen de confirmación
                  </AppText>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Operación
                    </AppText>
                    <AppText
                      variant="bodyStrong"
                      color={isBuy ? 'positive' : 'negative'}>
                      {`${isBuy ? 'COMPRA' : 'VENTA'} · ${symbol}`}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Cantidad
                    </AppText>
                    <AppText variant="bodyStrong" style={styles.tabular}>
                      {`${formatQuantity(parsedQuantity)} nominales`}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Precio unitario en vivo
                    </AppText>
                    <AppText variant="bodyStrong" style={styles.tabular}>
                      {formatCurrency(livePrice, currency)}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Monto bruto
                    </AppText>
                    <AppText variant="body" style={styles.tabular}>
                      {formatCurrency(breakdown.grossAmount, currency)}
                    </AppText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <AppText variant="caption" color="textSecondary">
                      Comisión (0,50 %) + IVA (21 %)
                    </AppText>
                    <AppText variant="body" style={styles.tabular}>
                      {formatCurrency(breakdown.totalFees, currency)}
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.breakdownRow,
                      styles.totalRow,
                      { borderTopColor: colors.border, paddingTop: spacing.sm },
                    ]}>
                    <AppText variant="bodyStrong">
                      {isBuy ? 'Total final a pagar' : 'Total neto a recibir'}
                    </AppText>
                    <AppText variant="price" style={styles.tabular}>
                      {formatCurrency(breakdown.finalTotal, currency)}
                    </AppText>
                  </View>
                </View>

                {activeErrorMessage ? (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: colors.negativeSoft,
                        borderRadius: radii.sm,
                        padding: spacing.sm,
                      },
                    ]}>
                    <AppText variant="caption" color="negative">
                      {activeErrorMessage}
                    </AppText>
                  </View>
                ) : null}

                <View style={[styles.reviewActionsRow, { gap: spacing.sm }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Volver a editar cantidad"
                    disabled={isSubmitting}
                    onPress={handleBackToInput}
                    style={({ pressed }) => [
                      styles.secondaryActionButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                        paddingVertical: spacing.md,
                        opacity: pressed && !isSubmitting ? 0.8 : 1,
                      },
                    ]}>
                    <AppText variant="bodyStrong">← Editar</AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar ${isBuy ? 'compra' : 'venta'}`}
                    accessibilityState={{
                      disabled: isSubmitting || !validation.isValid,
                      busy: isSubmitting,
                    }}
                    disabled={isSubmitting || !validation.isValid}
                    onPress={handleConfirmOrder}
                    style={({ pressed }) => [
                      styles.confirmActionButton,
                      {
                        backgroundColor:
                          !isSubmitting && validation.isValid
                            ? accentSideColor
                            : colors.neutralSoft,
                        borderRadius: radii.md,
                        paddingVertical: spacing.md,
                        opacity:
                          pressed && !isSubmitting && validation.isValid
                            ? 0.85
                            : 1,
                      },
                    ]}>
                    <AppText
                      variant="bodyStrong"
                      color={
                        !isSubmitting && validation.isValid
                          ? 'onAccent'
                          : 'textMuted'
                      }>
                      {isSubmitting
                        ? 'Procesando...'
                        : `Confirmar ${isBuy ? 'Compra' : 'Venta'}`}
                    </AppText>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
    justifyContent: 'center',
  },
  floatingCard: {
    width: '100%',
    maxHeight: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleBlock: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideIndicator: {
    width: 8,
    height: 18,
    borderRadius: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  contextBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rightAligned: {
    alignItems: 'flex-end',
  },
  quantityInput: {
    borderWidth: 1,
  },
  breakdownBox: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  errorBox: {
    width: '100%',
  },
  primaryActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmActionButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default OrderModalScreen;
