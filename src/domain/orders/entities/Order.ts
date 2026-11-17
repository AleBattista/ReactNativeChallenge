import type { Currency, Ticker, Timestamp } from '../../shared';

export type OrderId = string;
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus =
  | 'PENDING'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED';

interface OrderBase {
  readonly id: OrderId;
  readonly symbol: Ticker;
  readonly side: OrderSide;
  readonly currency: Currency;
  /** Cantidad de nominales/acciones solicitada (entero > 0). */
  readonly quantity: number;
  readonly filledQuantity: number;
  /** Precio promedio de ejecución. `null` mientras no haya fills. */
  readonly averageFillPrice: number | null;
  readonly status: OrderStatus;
  readonly rejectionReason: string | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface MarketOrder extends OrderBase {
  readonly type: 'MARKET';
}

export interface LimitOrder extends OrderBase {
  readonly type: 'LIMIT';
  readonly limitPrice: number;
}

/** Unión discriminada por `type`: `limitPrice` solo existe en órdenes LIMIT. */
export type Order = MarketOrder | LimitOrder;

/** Intención del usuario, previa a que el sistema le asigne id/estado. */
export type OrderRequest = {
  readonly symbol: Ticker;
  readonly side: OrderSide;
  readonly quantity: number;
} & (
  | { readonly type: 'MARKET' }
  | { readonly type: 'LIMIT'; readonly limitPrice: number }
);

export const isOrderOpen = (order: Pick<Order, 'status'>): boolean =>
  order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED';
