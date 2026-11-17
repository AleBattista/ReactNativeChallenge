import type { Currency, Ticker, Timestamp } from '../../shared';

export interface Position {
  readonly symbol: Ticker;
  readonly currency: Currency;
  readonly quantity: number;
  /** Precio promedio de compra (costo unitario). */
  readonly averageCost: number;
}

export interface CashBalance {
  readonly currency: Currency;
  readonly available: number;
  /** Comprometido en órdenes abiertas. */
  readonly reserved: number;
}

/**
 * Tenencia del usuario. Guarda solo hechos (cantidades y costos), NUNCA
 * valores de mercado: la valuación se deriva combinando posiciones con el
 * QuoteFeed, así un tick no obliga a recrear el Portfolio.
 */
export interface Portfolio {
  readonly positions: readonly Position[];
  readonly cash: readonly CashBalance[];
  readonly updatedAt: Timestamp;
}

/** Read-model derivado (Position + último precio). Lo calculan los casos de uso. */
export interface PositionValuation {
  readonly symbol: Ticker;
  readonly currency: Currency;
  readonly quantity: number;
  readonly costBasis: number;
  readonly marketValue: number | null;
  readonly unrealizedPnl: number | null;
  /** En puntos porcentuales. */
  readonly unrealizedPnlPercent: number | null;
}
