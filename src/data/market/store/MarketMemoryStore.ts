import type { AssetInfo, Quote, QuoteFeed } from '../../../domain/market';
import type { Listener, Ticker, Unsubscribe } from '../../../domain/shared';

/** Actualización parcial de una cotización (lo que trae un tick). */
export type QuotePatch = { readonly symbol: Ticker } & Partial<
  Omit<Quote, 'symbol'>
>;

export type Scheduler = (flush: () => void) => void;

export interface StoreLifecycleHandlers {
  readonly onPause?: () => void;
  readonly onResume?: () => void;
}

/** Por defecto agrupa todos los ticks de un mismo turno del event loop. */
const microtaskScheduler: Scheduler = flush => {
  Promise.resolve().then(flush);
};

const sameLevel = (a: Quote['bid'], b: Quote['bid']): boolean =>
  a.price === b.price && a.quantity === b.quantity;

const sameYield = (a: Quote['yield'], b: Quote['yield']): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.irr === b.irr &&
    a.bidRate === b.bidRate &&
    a.askRate === b.askRate);

/** Igualdad por valor ignorando `updatedAt` (un tick sin cambios no notifica). */
const isSameQuote = (a: Quote, b: Quote): boolean =>
  a.lastPrice === b.lastPrice &&
  a.previousClose === b.previousClose &&
  a.open === b.open &&
  a.dayLow === b.dayLow &&
  a.dayHigh === b.dayHigh &&
  a.changePercent === b.changePercent &&
  a.volume === b.volume &&
  a.tradedQuantity === b.tradedQuantity &&
  a.tradedAmount === b.tradedAmount &&
  sameLevel(a.bid, b.bid) &&
  sameLevel(a.ask, b.ask) &&
  sameYield(a.yield, b.yield);

const sameSymbols = (a: readonly Ticker[], b: readonly Ticker[]): boolean =>
  a.length === b.length && a.every((s, i) => s === b[i]);

/**
 * Store de precios en vivo, FUERA de React.
 *
 * Estrategia:
 *  1. Estado en `Map<Ticker, Quote>` con objetos inmutables: si un símbolo
 *     cambia se reemplaza SOLO su objeto; el resto conserva la referencia.
 *     Eso hace que `getQuote` sea un snapshot estable para useSyncExternalStore.
 *  2. Suscripciones granulares `Map<Ticker, Set<Listener>>`: un tick de ALUA
 *     solo despierta a los componentes suscritos a ALUA. Nada de re-render global.
 *  3. Dedupe: un parche que no cambia valores no genera notificación.
 *  4. Batching: N ticks en el mismo turno => 1 notificación por símbolo.
 *  5. Ciclo de vida (pause / resume + Sync-on-Resume): pausa notificaciones y
 *     streaming cuando la app pasa a background, y al reanudar fuerza un
 *     snapshot inmediato sobre los símbolos activos en el viewport.
 */
export class MarketMemoryStore implements QuoteFeed {
  private quotes = new Map<Ticker, Quote>();
  private assetInfoBySymbol = new Map<Ticker, AssetInfo>();
  private symbols: readonly Ticker[] = [];
  private readonly listenersBySymbol = new Map<Ticker, Set<Listener>>();
  private readonly symbolsListeners = new Set<Listener>();
  private readonly lifecycleHandlers = new Set<StoreLifecycleHandlers>();
  private readonly pending = new Set<Ticker>();
  private symbolsDirty = false;
  private flushScheduled = false;
  private paused = false;

  constructor(private readonly schedule: Scheduler = microtaskScheduler) {}

  // ---- Lectura (QuoteFeed). Arrow fns: se pasan sin bind a useSyncExternalStore.

  getQuote = (symbol: Ticker): Quote | undefined => this.quotes.get(symbol);

  getAssetInfo = (symbol: Ticker): AssetInfo | undefined =>
    this.assetInfoBySymbol.get(symbol);

  getSymbols = (): readonly Ticker[] => this.symbols;

  /**
   * Devuelve únicamente los símbolos que tienen al menos un componente montado
   * suscrito actualmente (celdas visibles en el viewport de FlashList, pantalla
   * de detalle o modal de orden).
   */
  getActiveSymbols = (): readonly Ticker[] => [
    ...this.listenersBySymbol.keys(),
  ];

  subscribe = (symbol: Ticker, listener: Listener): Unsubscribe => {
    let set = this.listenersBySymbol.get(symbol);
    if (!set) {
      set = new Set();
      this.listenersBySymbol.set(symbol, set);
    }
    set.add(listener);
    return () => {
      const current = this.listenersBySymbol.get(symbol);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listenersBySymbol.delete(symbol); // evita leaks de símbolos sin observers
      }
    };
  };

  subscribeToSymbols = (listener: Listener): Unsubscribe => {
    this.symbolsListeners.add(listener);
    return () => {
      this.symbolsListeners.delete(listener);
    };
  };

  // ---- Ciclo de vida (AppState background / active) ------------------------

  isPaused = (): boolean => this.paused;

  pause = (): void => {
    if (this.paused) {
      return;
    }
    this.paused = true;
    for (const handler of this.lifecycleHandlers) {
      handler.onPause?.();
    }
  };

  resume = (): void => {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    for (const handler of this.lifecycleHandlers) {
      handler.onResume?.();
    }
    this.requestFlush();
  };

  /**
   * Permite al repositorio o fuente de streaming engancharse a `.pause()` y
   * `.resume()` sin acoplar la capa de presentación.
   */
  registerLifecycleHandlers(handlers: StoreLifecycleHandlers): Unsubscribe {
    this.lifecycleHandlers.add(handlers);
    return () => {
      this.lifecycleHandlers.delete(handlers);
    };
  }

  // ---- Escritura (solo la usan repositorios / LiveQuoteSource).

  /** Carga inicial o refresh completo: reemplaza el universo de símbolos. */
  hydrate(quotes: readonly Quote[], assetsInfo?: readonly AssetInfo[]): void {
    if (assetsInfo) {
      const nextInfo = new Map<Ticker, AssetInfo>();
      for (const info of assetsInfo) {
        nextInfo.set(info.symbol, info);
      }
      this.assetInfoBySymbol = nextInfo;
    }

    const next = new Map<Ticker, Quote>();
    for (const quote of quotes) {
      const prev = this.quotes.get(quote.symbol);
      if (prev && isSameQuote(prev, quote)) {
        next.set(quote.symbol, prev); // preserva referencia => sin re-render
      } else {
        next.set(quote.symbol, quote);
        this.pending.add(quote.symbol);
      }
    }
    for (const symbol of this.quotes.keys()) {
      if (!next.has(symbol)) {
        this.pending.add(symbol); // símbolo removido: sus observers leen undefined
      }
    }
    this.quotes = next;

    const nextSymbols = [...next.keys()];
    if (!sameSymbols(this.symbols, nextSymbols)) {
      this.symbols = nextSymbols;
      this.symbolsDirty = true;
    }
    this.requestFlush();
  }

  /** Ticks en vivo. Ignora símbolos desconocidos (no se crean por un tick). */
  applyPatches(patches: readonly QuotePatch[]): void {
    for (const patch of patches) {
      const prev = this.quotes.get(patch.symbol);
      if (!prev) {
        continue;
      }
      const next: Quote = {
        ...prev,
        ...patch,
        updatedAt: patch.updatedAt ?? Date.now(),
      };
      if (!isSameQuote(prev, next)) {
        this.quotes.set(patch.symbol, next);
        this.pending.add(patch.symbol);
      }
    }
    this.requestFlush();
  }

  /** Solo tests. */
  reset(): void {
    this.quotes = new Map();
    this.assetInfoBySymbol = new Map();
    this.symbols = [];
    this.listenersBySymbol.clear();
    this.symbolsListeners.clear();
    this.lifecycleHandlers.clear();
    this.pending.clear();
    this.symbolsDirty = false;
    this.paused = false;
  }

  // ---- Interno

  private requestFlush(): void {
    if (
      this.paused ||
      this.flushScheduled ||
      (this.pending.size === 0 && !this.symbolsDirty)
    ) {
      return;
    }
    this.flushScheduled = true;
    this.schedule(this.flush);
  }

  private flush = (): void => {
    this.flushScheduled = false;
    if (this.paused) {
      return;
    }
    const changed = [...this.pending];
    this.pending.clear();

    for (const symbol of changed) {
      const set = this.listenersBySymbol.get(symbol);
      if (set) {
        // Copia: un listener puede desuscribirse durante la iteración.
        [...set].forEach(safeCall);
      }
    }
    if (this.symbolsDirty) {
      this.symbolsDirty = false;
      [...this.symbolsListeners].forEach(safeCall);
    }
  };
}

/** Un listener roto no debe cortar la notificación al resto. */
const safeCall = (listener: Listener): void => {
  try {
    listener();
  } catch (error) {
    if (__DEV__) {
      console.error('[MarketMemoryStore] listener error', error);
    }
  }
};

/** Instancia única de la app. Solo la importa el composition root (src/app/di). */
export const marketMemoryStore = new MarketMemoryStore();
