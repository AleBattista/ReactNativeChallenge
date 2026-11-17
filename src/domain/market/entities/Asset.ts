import type { Currency, IsoDate, MarketCode, Ticker } from '../../shared';
import type { Quote } from './Quote';

export type InstrumentType = 'EQUITY' | 'FIXED_INCOME';

/**
 * Datos estáticos (o casi) de un instrumento. No cambian con cada tick,
 * por eso viven separados de `Quote`: la lista puede renderizar el nombre
 * una sola vez y suscribirse únicamente al precio.
 */
export interface AssetInfo {
  readonly symbol: Ticker;
  readonly description: string;
  readonly market: MarketCode;
  readonly currency: Currency;
  readonly instrumentType: InstrumentType;
  /** Solo renta fija. `null` para acciones. */
  readonly maturityDate: IsoDate | null;
}

/** Snapshot completo: info estática + última cotización conocida. */
export interface Asset extends AssetInfo {
  readonly quote: Quote;
}
