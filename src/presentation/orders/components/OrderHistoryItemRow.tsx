import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type {
  StoredOrder,
  StoredOrderStatus,
} from '../../../app/store/OrderStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import {
  formatCurrency,
  formatQuantity,
} from '../../../core/utils/formatters';
import type { Ticker, Timestamp } from '../../../domain/shared';
import { AppText } from '../../shared/components/AppText';

/** Altura estimada de la fila de historial de órdenes en dp para FlashList. */
export const ORDER_HISTORY_ITEM_ROW_HEIGHT = 100;

export interface OrderHistoryItemRowProps {
  readonly order: StoredOrder;
  readonly onPressAsset: (symbol: Ticker) => void;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatea un timestamp epoch (ms) a `"DD/MM/YYYY HH:mm:ss"` con ancho fijo.
 */
export const formatOrderTimestamp = (timestamp: Timestamp): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '—';
  }
  const date = new Date(timestamp);
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const STATUS_LABEL: Readonly<Record<StoredOrderStatus, string>> = {
  PENDING: 'PENDIENTE',
  EXECUTED: 'EJECUTADA',
  REJECTED: 'RECHAZADA',
};

/**
 * Fila de Historial de Órdenes (`OrderHistoryItemRow`):
 *  - Envuelta en `React.memo`.
 *  - Muestra tipo de orden (Compra/Venta con indicador visual de color),
 *    timestamp, nominales, precio unitario, monto total final y estado.
 */
export const OrderHistoryItemRow = memo(function OrderHistoryItemRowBase({
  order,
  onPressAsset,
}: OrderHistoryItemRowProps) {
  const { colors, spacing, radii } = useTheme();
  const isBuy = order.type === 'BUY';

  const sideColor = isBuy ? colors.buy : colors.sell;
  const sideLabel = isBuy ? 'COMPRA' : 'VENTA';

  const statusTone = {
    PENDING: {
      bg: colors.neutralSoft,
      textColor: 'textSecondary' as const,
    },
    EXECUTED: {
      bg: colors.positiveSoft,
      textColor: 'positive' as const,
    },
    REJECTED: {
      bg: colors.negativeSoft,
      textColor: 'negative' as const,
    },
  }[order.status];

  const handlePress = useCallback(() => {
    onPressAsset(order.ticker);
  }, [onPressAsset, order.ticker]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Orden de ${sideLabel} ${order.ticker}, ${formatQuantity(order.quantity)} nominales, estado ${STATUS_LABEL[order.status]}`}
      accessibilityHint="Toca para ver el detalle del activo"
      onPress={handlePress}
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
        <View style={[styles.leftHeader, { gap: spacing.xs }]}>
          <View
            style={[styles.sideIndicator, { backgroundColor: sideColor }]}
          />
          <AppText
            variant="caption"
            color={isBuy ? 'positive' : 'negative'}
            style={styles.sideText}>
            {sideLabel}
          </AppText>
          <AppText variant="bodyStrong">{order.ticker}</AppText>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusTone.bg,
              borderRadius: radii.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
            },
          ]}>
          <AppText variant="caption" color={statusTone.textColor}>
            {STATUS_LABEL[order.status]}
          </AppText>
        </View>
      </View>

      <View style={styles.middleRow}>
        <View>
          <AppText variant="caption" color="textMuted" style={styles.tabular}>
            {formatOrderTimestamp(order.createdAt)}
          </AppText>
          <AppText variant="caption" color="textSecondary" style={styles.tabular}>
            {`${formatQuantity(order.quantity)} nom. × ${formatCurrency(
              order.price,
              'ARS',
            )}`}
          </AppText>
        </View>

        <View style={styles.totalColumn}>
          <AppText variant="caption" color="textMuted">
            Monto total final
          </AppText>
          <AppText variant="price" style={styles.tabular}>
            {formatCurrency(order.totalAmount, 'ARS')}
          </AppText>
        </View>
      </View>

      {order.status === 'REJECTED' && order.rejectionReason ? (
        <AppText variant="caption" color="negative" numberOfLines={2}>
          {order.rejectionReason}
        </AppText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: ORDER_HISTORY_ITEM_ROW_HEIGHT,
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideIndicator: {
    width: 8,
    height: 16,
    borderRadius: 4,
  },
  sideText: {
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  totalColumn: {
    alignItems: 'flex-end',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default OrderHistoryItemRow;
