import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ticker, Timestamp } from '../../domain/shared';
import { roundCurrency, usePortfolioStore } from './PortfolioStore';
import { createPersistedStorage } from './storage';

export type OrderTradeType = 'BUY' | 'SELL';
export type StoredOrderStatus = 'PENDING' | 'EXECUTED' | 'REJECTED';

export interface StoredOrder {
  readonly id: string;
  readonly ticker: Ticker;
  readonly type: OrderTradeType;
  readonly quantity: number;
  readonly price: number;
  readonly totalAmount: number;
  readonly status: StoredOrderStatus;
  readonly rejectionReason: string | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  /** Indica si el débito/crédito en PortfolioStore ya fue aplicado atómicamente. */
  readonly portfolioSettled?: boolean;
}

export interface PlaceOrderInput {
  readonly ticker: Ticker;
  readonly type: OrderTradeType;
  readonly quantity: number;
  readonly price: number;
  /** Monto final con comisiones e IVA incluidos (si ya fue calculado por la boleta). */
  readonly totalAmount?: number;
  /** Si es `true`, `PortfolioStore` ya aplicó la transacción al confirmar en el modal. */
  readonly portfolioAlreadySettled?: boolean;
  /**
   * Demora opcional en ms para la resolución en segundo plano.
   * Si se omite, se usa un valor aleatorio entre 2.000 ms y 3.500 ms.
   */
  readonly simulationDelayMs?: number;
}

interface OrderPersistedState {
  readonly orders: readonly StoredOrder[];
}

export interface OrderStoreState extends OrderPersistedState {
  /**
   * Registra una nueva orden en estado `'PENDING'` al inicio del historial
   * (de más nueva a más vieja) y dispara el temporizador en segundo plano
   * fuera del árbol de React para resolverla a `'EXECUTED'` o `'REJECTED'`.
   */
  readonly placeOrder: (input: PlaceOrderInput) => StoredOrder;
  /**
   * Resuelve inmediatamente una orden pendiente ejecutando la validación
   * transaccional contra `PortfolioStore`.
   */
  readonly settlePendingOrder: (orderId: string) => void;
  /** Reanuda temporizadores de órdenes que hayan quedado en `'PENDING'` al rehidratar. */
  readonly resumePendingOrders: () => void;
  /** Limpia el historial y cancela temporizadores activos (útil para tests/reset). */
  readonly clearOrders: () => void;
}

const MIN_SIMULATION_DELAY_MS = 2_000;
const MAX_SIMULATION_DELAY_MS = 3_500;

/**
 * Registro de temporizadores a nivel módulo (fuera de React):
 * garantiza que las órdenes pasen de `'PENDING'` a `'EXECUTED' | 'REJECTED'`
 * aunque el usuario cierre el modal o cambie de solapa en el TabNavigator.
 */
const activeOrderTimers = new Map<string, ReturnType<typeof setTimeout>>();

let orderSequence = 0;

const generateOrderId = (now: Timestamp): string => {
  orderSequence += 1;
  return `ORD-${now}-${orderSequence}`;
};

const computeRandomDelayMs = (): number => {
  const span = MAX_SIMULATION_DELAY_MS - MIN_SIMULATION_DELAY_MS;
  return Math.round(MIN_SIMULATION_DELAY_MS + Math.random() * span);
};

const cancelAllTimers = (): void => {
  for (const timer of activeOrderTimers.values()) {
    clearTimeout(timer);
  }
  activeOrderTimers.clear();
};

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => {
      const scheduleBackgroundResolution = (
        orderId: string,
        delayMs: number,
      ): void => {
        const existingTimer = activeOrderTimers.get(orderId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
          activeOrderTimers.delete(orderId);
          get().settlePendingOrder(orderId);
        }, Math.max(0, delayMs));

        activeOrderTimers.set(orderId, timer);
      };

      return {
        orders: [],

        placeOrder: (input: PlaceOrderInput): StoredOrder => {
          const now = Date.now();
          const normalizedTicker = input.ticker.trim().toUpperCase();
          const quantity = Math.trunc(input.quantity);
          const price = roundCurrency(input.price);
          const totalAmount =
            input.totalAmount !== undefined && Number.isFinite(input.totalAmount)
              ? roundCurrency(input.totalAmount)
              : roundCurrency(quantity * price);

          const newOrder: StoredOrder = {
            id: generateOrderId(now),
            ticker: normalizedTicker,
            type: input.type,
            quantity,
            price,
            totalAmount,
            status: 'PENDING',
            rejectionReason: null,
            createdAt: now,
            updatedAt: now,
            portfolioSettled: Boolean(input.portfolioAlreadySettled),
          };

          // Insertar al comienzo: historial ordenado de más nueva a más vieja
          set(state => ({
            orders: [newOrder, ...state.orders],
          }));

          const delayMs = input.simulationDelayMs ?? computeRandomDelayMs();
          scheduleBackgroundResolution(newOrder.id, delayMs);

          return newOrder;
        },

        settlePendingOrder: (orderId: string): void => {
          const activeTimer = activeOrderTimers.get(orderId);
          if (activeTimer) {
            clearTimeout(activeTimer);
            activeOrderTimers.delete(orderId);
          }

          const target = get().orders.find(order => order.id === orderId);
          if (!target || target.status !== 'PENDING') {
            return;
          }

          const resolvedAt = Date.now();
          if (target.portfolioSettled) {
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId
                  ? {
                      ...order,
                      status: 'EXECUTED',
                      rejectionReason: null,
                      updatedAt: resolvedAt,
                    }
                  : order,
              ),
            }));
            return;
          }

          const portfolioStore = usePortfolioStore.getState();
          const txResult =
            target.type === 'BUY'
              ? portfolioStore.executeBuy(
                  target.ticker,
                  target.quantity,
                  target.price,
                  target.totalAmount,
                )
              : portfolioStore.executeSell(
                  target.ticker,
                  target.quantity,
                  target.price,
                  target.totalAmount,
                );

          const nextStatus: StoredOrderStatus = txResult.ok
            ? 'EXECUTED'
            : 'REJECTED';
          const rejectionReason = txResult.ok ? null : txResult.message;

          set(state => ({
            orders: state.orders.map(order =>
              order.id === orderId
                ? {
                    ...order,
                    status: nextStatus,
                    rejectionReason,
                    updatedAt: resolvedAt,
                  }
                : order,
            ),
          }));
        },

        resumePendingOrders: (): void => {
          const pendingOrders = get().orders.filter(
            order => order.status === 'PENDING',
          );
          for (const order of pendingOrders) {
            if (!activeOrderTimers.has(order.id)) {
              scheduleBackgroundResolution(order.id, computeRandomDelayMs());
            }
          }
        },

        clearOrders: (): void => {
          cancelAllTimers();
          set({ orders: [] });
        },
      };
    },
    {
      name: 'challenge:order-store',
      storage: createPersistedStorage<OrderPersistedState>(),
      partialize: state => ({
        orders: state.orders,
      }),
      onRehydrateStorage: () => state => {
        state?.resumePendingOrders();
      },
    },
  ),
);
