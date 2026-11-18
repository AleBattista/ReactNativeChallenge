import type { Listener, Ticker, Unsubscribe } from '../../shared';
import type { AssetInfo } from '../entities/Asset';
import type { Quote } from '../entities/Quote';

/**
 * Puerto de lectura y control de ciclo de vida de precios en vivo con
 * suscripción granular por símbolo.
 *
 * El contrato está diseñado para encajar 1:1 con `useSyncExternalStore`:
 *  - `subscribe` recibe un listener sin argumentos.
 *  - `getQuote` devuelve un snapshot referencialmente estable mientras no cambie.
 *  - `pause` y `resume` permiten detener el streaming en background y disparar
 *    Sync-on-Resume al volver a primer plano (`active`).
 */
export interface QuoteFeed {
  getQuote(symbol: Ticker): Quote | undefined;
  getAssetInfo(symbol: Ticker): AssetInfo | undefined;
  subscribe(symbol: Ticker, listener: Listener): Unsubscribe;

  /** Universo de símbolos disponibles (cambia solo al rehidratar). */
  getSymbols(): readonly Ticker[];
  subscribeToSymbols(listener: Listener): Unsubscribe;

  /** Símbolos con suscriptores activos en el viewport actual. */
  getActiveSymbols(): readonly Ticker[];

  /** Control de ciclo de vida (AppState background / active). */
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}
