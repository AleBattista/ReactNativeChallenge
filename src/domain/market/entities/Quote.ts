import type { Ticker, Timestamp } from '../../shared';

/** Una punta del book (compra o venta). */
export interface PriceLevel {
  /** `null` si no hay oferta en esa punta. */
  readonly price: number | null;
  readonly quantity: number;
}

/** Métricas de rendimiento, solo aplican a renta fija. */
export interface YieldMetrics {
  readonly irr: number | null;
  readonly bidRate: number | null;
  readonly askRate: number | null;
}

/**
 * Cotización en vivo. Es la parte "caliente" que cambia con cada tick y
 * vive en el MarketMemoryStore (fuera de React).
 *
 * Convención de nulabilidad: un precio `null` significa "dato no disponible".
 * El backend envía `0` en esos casos (ej. `ultimoCierre: 0`); el mapper lo
 * normaliza a `null` para que ningún cálculo use un 0 ficticio.
 */
export interface Quote {
  readonly symbol: Ticker;
  readonly lastPrice: number | null;
  readonly previousClose: number | null;
  readonly open: number | null;
  readonly dayLow: number | null;
  readonly dayHigh: number | null;
  /** En puntos porcentuales: -0.54 significa -0,54 %. */
  readonly changePercent: number | null;
  readonly volume: number;
  readonly tradedQuantity: number;
  readonly tradedAmount: number;
  readonly bid: PriceLevel;
  readonly ask: PriceLevel;
  readonly yield: YieldMetrics | null;
  readonly updatedAt: Timestamp;
}

export type Trend = 'up' | 'down' | 'flat';

/** Regla de negocio pura: dirección del movimiento diario. */
export const getTrend = (changePercent: number | null): Trend => {
  if (changePercent === null || changePercent === 0) {
    return 'flat';
  }
  return changePercent > 0 ? 'up' : 'down';
};

/** Spread absoluto entre puntas, `null` si falta alguna. */
export const getSpread = (quote: Pick<Quote, 'bid' | 'ask'>): number | null =>
  quote.bid.price !== null && quote.ask.price !== null
    ? quote.ask.price - quote.bid.price
    : null;
