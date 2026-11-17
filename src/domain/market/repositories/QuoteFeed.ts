import type { Listener, Ticker, Unsubscribe } from '../../shared';
import type { Quote } from '../entities/Quote';

/**
 * Puerto de lectura de precios en vivo con suscripción granular por símbolo.
 *
 * El contrato está diseñado para encajar 1:1 con `useSyncExternalStore`:
 *  - `subscribe` recibe un listener sin argumentos.
 *  - `getQuote` devuelve un snapshot referencialmente estable mientras no cambie.
 *
 * El dominio no sabe que la implementación es un singleton en memoria.
 */
export interface QuoteFeed {
  getQuote(symbol: Ticker): Quote | undefined;
  subscribe(symbol: Ticker, listener: Listener): Unsubscribe;

  /** Universo de símbolos disponibles (cambia solo al rehidratar). */
  getSymbols(): readonly Ticker[];
  subscribeToSymbols(listener: Listener): Unsubscribe;
}
