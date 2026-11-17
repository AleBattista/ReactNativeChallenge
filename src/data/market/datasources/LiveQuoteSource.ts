import type { Quote, QuoteFeed } from '../../../domain/market';
import type { Ticker, Timestamp, Unsubscribe } from '../../../domain/shared';
import type { QuotePatch } from '../store/MarketMemoryStore';
import { roundPrice } from './syntheticDataset';

/**
 * Fuente de ticks en vivo (websocket, polling o simulador). Solo empuja
 * parches ligeros (`QuotePatch`) al store; nunca habla con React.
 */
export interface LiveQuoteSource {
  connect(onPatches: (patches: readonly QuotePatch[]) => void): Unsubscribe;
}

/**
 * Regla financiera 1:
 * Calcula el Precio de Referencia Fijo a partir del precio y variación diarios
 * iniciales sin depender de `ultimoCierre` (que en el feed real suele venir en 0):
 *
 *   PrecioReferencia = ultimoPrecio_ini / (1 + variacionDiaria_ini / 100)
 */
export const calculateReferencePrice = (
  initialLastPrice: number,
  initialChangePercent: number | null,
): number => {
  const divisor = 1 + (initialChangePercent ?? 0) / 100;
  if (divisor <= 0) {
    return initialLastPrice;
  }
  return initialLastPrice / divisor;
};

/**
 * Regla financiera 2:
 * Recalcula la variación porcentual diaria en tiempo real contra el
 * Precio de Referencia Fijo:
 *
 *   changePercent = ((nuevoPrecio / PrecioReferencia) - 1) * 100
 */
export const calculateChangePercent = (
  newPrice: number,
  referencePrice: number,
): number => {
  if (referencePrice <= 0) {
    return 0;
  }
  return roundPrice((newPrice / referencePrice - 1) * 100);
};

/**
 * Regla financiera 3:
 * Dado el estado actual de un `Quote`, su `referencePrice` fijo y una variación
 * relativa `relativeDelta` (ej. +0.003 = +0.3%), construye un `QuotePatch` ligero:
 *  - Mueve `lastPrice` en la proporción `1 + relativeDelta`.
 *  - Mueve `bid.price` y `ask.price` en la MISMA proporción exacta que `lastPrice`
 *    para mantener el spread relativo constante.
 *  - Actualiza `dayLow` (`min`) y `dayHigh` (`max`) si `nuevoPrecio` los supera.
 *  - Recalcula `changePercent` respecto de `referencePrice`.
 */
export const computeQuoteTickPatch = (
  current: Quote,
  referencePrice: number,
  relativeDelta: number,
  now: Timestamp = Date.now(),
): QuotePatch | null => {
  if (current.lastPrice === null || current.lastPrice <= 0) {
    return null;
  }

  const targetFactor = 1 + relativeDelta;
  const newLastPrice = Math.max(0.01, roundPrice(current.lastPrice * targetFactor));
  if (newLastPrice === current.lastPrice) {
    return null;
  }

  // Proporción exacta aplicada a las puntas compra (bid) y venta (ask)
  const exactRatio = newLastPrice / current.lastPrice;

  const nextBidPrice =
    current.bid.price !== null
      ? Math.max(0.01, roundPrice(current.bid.price * exactRatio))
      : null;
  const nextAskPrice =
    current.ask.price !== null
      ? Math.max(
          nextBidPrice ?? 0.01,
          roundPrice(current.ask.price * exactRatio),
        )
      : null;

  const nextDayLow =
    current.dayLow === null ? newLastPrice : Math.min(current.dayLow, newLastPrice);
  const nextDayHigh =
    current.dayHigh === null ? newLastPrice : Math.max(current.dayHigh, newLastPrice);

  const nextChangePercent = calculateChangePercent(newLastPrice, referencePrice);

  return {
    symbol: current.symbol,
    lastPrice: newLastPrice,
    changePercent: nextChangePercent,
    dayLow: nextDayLow,
    dayHigh: nextDayHigh,
    bid: {
      price: nextBidPrice,
      quantity: current.bid.quantity,
    },
    ask: {
      price: nextAskPrice,
      quantity: current.ask.quantity,
    },
    updatedAt: now,
  };
};

export interface MockLiveQuoteSourceOptions {
  /** Intervalo entre emisiones de ticks en ms (default: 2500 ms, entre 2 y 3 s). */
  readonly intervalMs?: number;
  /**
   * Cantidad máxima de activos a mover en cada tick (default: 120).
   * Sobre un universo de 2.100 activos actualiza un subconjunto aleatorio sin
   * bloquear el hilo JS.
   */
  readonly batchSize?: number;
  /**
   * Variación porcentual máxima por tick en puntos porcentuales (default: 0.5 = ±0.5%).
   */
  readonly maxDeltaPercent?: number;
  /** Generador aleatorio inyectable para tests determinísticos. */
  readonly random?: () => number;
  /** Reloj inyectable para tests determinísticos. */
  readonly now?: () => Timestamp;
}

/**
 * Motor de simulación de precios en vivo (`MockLiveQuoteSource`).
 *
 * Lee el estado actual desde `QuoteFeed` (puerto del `MarketMemoryStore`),
 * conserva en memoria el `PrecioReferencia` fijo inicial de cada símbolo y
 * emite lotes de `QuotePatch` cada `intervalMs`.
 */
export class MockLiveQuoteSource implements LiveQuoteSource {
  private readonly referencePrices = new Map<Ticker, number>();
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxRelativeDelta: number;
  private readonly random: () => number;
  private readonly now: () => Timestamp;

  constructor(
    private readonly quoteFeed: QuoteFeed,
    options: MockLiveQuoteSourceOptions = {},
  ) {
    this.intervalMs = Math.max(100, options.intervalMs ?? 2500);
    this.batchSize = Math.max(1, options.batchSize ?? 120);
    this.maxRelativeDelta = Math.max(0.0001, (options.maxDeltaPercent ?? 0.5) / 100);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
  }

  /**
   * Obtiene o inicializa el `PrecioReferencia` fijo del símbolo a partir de su
   * primera cotización observada.
   */
  getOrInitReferencePrice(quote: Quote): number | null {
    const existing = this.referencePrices.get(quote.symbol);
    if (existing !== undefined) {
      return existing;
    }
    if (quote.lastPrice === null || quote.lastPrice <= 0) {
      return null;
    }
    const computed = calculateReferencePrice(quote.lastPrice, quote.changePercent);
    this.referencePrices.set(quote.symbol, computed);
    return computed;
  }

  /**
   * Ejecuta un ciclo de simulación y devuelve los parches generados.
   * Expuesto públicamente para poder testear ticks de forma síncrona sin timers.
   */
  generateTickPatches(): readonly QuotePatch[] {
    const symbols = this.quoteFeed.getSymbols();
    if (symbols.length === 0) {
      return [];
    }

    const targetCount = Math.min(this.batchSize, symbols.length);
    const selectedSymbols = this.pickRandomSubset(symbols, targetCount);
    const timestamp = this.now();
    const patches: QuotePatch[] = [];

    for (const symbol of selectedSymbols) {
      const currentQuote = this.quoteFeed.getQuote(symbol);
      if (!currentQuote) {
        continue;
      }
      const referencePrice = this.getOrInitReferencePrice(currentQuote);
      if (referencePrice === null) {
        continue;
      }

      // Movimiento uniforme en [-maxRelativeDelta, +maxRelativeDelta] (hasta ±0.5%)
      const relativeDelta = (this.random() * 2 - 1) * this.maxRelativeDelta;
      const patch = computeQuoteTickPatch(
        currentQuote,
        referencePrice,
        relativeDelta,
        timestamp,
      );
      if (patch) {
        patches.push(patch);
      }
    }

    return patches;
  }

  connect(onPatches: (patches: readonly QuotePatch[]) => void): Unsubscribe {
    // Hidrata precios de referencia de los símbolos ya presentes al conectar
    for (const symbol of this.quoteFeed.getSymbols()) {
      const quote = this.quoteFeed.getQuote(symbol);
      if (quote) {
        this.getOrInitReferencePrice(quote);
      }
    }

    const timer = setInterval(() => {
      const patches = this.generateTickPatches();
      if (patches.length > 0) {
        onPatches(patches);
      }
    }, this.intervalMs);

    return () => {
      clearInterval(timer);
    };
  }

  /** Limpia los precios de referencia cacheados (útil en tests o rehidratación total). */
  resetReferencePrices(): void {
    this.referencePrices.clear();
  }

  /** Selección parcial tipo Fisher-Yates sin clonar todo el arreglo de 2.100 símbolos. */
  private pickRandomSubset(
    symbols: readonly Ticker[],
    count: number,
  ): readonly Ticker[] {
    const total = symbols.length;
    if (count >= total) {
      return symbols;
    }
    const picked = new Set<Ticker>();
    while (picked.size < count) {
      const index = Math.floor(this.random() * total);
      const symbol = symbols[index];
      if (symbol !== undefined) {
        picked.add(symbol);
      }
    }
    return [...picked];
  }
}
