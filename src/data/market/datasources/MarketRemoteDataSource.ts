import { getDefaultSyntheticAssetPrices } from './syntheticDataset';

/**
 * Fuente remota de precios. Devuelve `unknown` A PROPÓSITO: el JSON de red no
 * es confiable y debe pasar por el type guard + mapper antes de usarse.
 */
export interface MarketRemoteDataSource {
  fetchAssetPrices(): Promise<unknown>;
}

export interface HttpMarketDataSourceOptions {
  readonly timeoutMs?: number;
}

export class HttpMarketDataSource implements MarketRemoteDataSource {
  private readonly timeoutMs: number;

  constructor(
    private readonly baseUrl: string,
    options: HttpMarketDataSourceOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async fetchAssetPrices(): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/assetPrices`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface MockMarketDataSourceOptions {
  /** Payload a devolver. Por defecto: los 2.100+ activos sintéticos. */
  readonly payload?: unknown;
  /** Latencia mínima simulada en ms (default: 300 ms). */
  readonly minLatencyMs?: number;
  /** Latencia máxima simulada en ms (default: 1500 ms). */
  readonly maxLatencyMs?: number;
  /**
   * Probabilidad de fallo de red simulado entre 0 y 1 (default: 0.08 = 8%).
   * Permite ejercitar estados de error y reintento en la UI.
   */
  readonly failureRate?: number;
  /** Generador aleatorio inyectable para tests determinísticos. */
  readonly random?: () => number;
}

/**
 * Fuente mock con comportamiento de red realista:
 *  - Sirve el dataset sintético de 2.000+ activos.
 *  - Latencia aleatoria uniforme entre `minLatencyMs` (300 ms) y `maxLatencyMs` (1500 ms).
 *  - Probabilidad configurable de error HTTP (`failureRate`, 8% por defecto).
 */
export class MockMarketDataSource implements MarketRemoteDataSource {
  private readonly payload: unknown;
  private readonly minLatencyMs: number;
  private readonly maxLatencyMs: number;
  private readonly failureRate: number;
  private readonly random: () => number;

  constructor(options: MockMarketDataSourceOptions = {}) {
    this.payload = options.payload ?? getDefaultSyntheticAssetPrices();
    this.minLatencyMs = Math.max(0, options.minLatencyMs ?? 300);
    this.maxLatencyMs = Math.max(this.minLatencyMs, options.maxLatencyMs ?? 1500);
    this.failureRate = Math.min(1, Math.max(0, options.failureRate ?? 0.08));
    this.random = options.random ?? Math.random;
  }

  /** Calcula una latencia aleatoria en [minLatencyMs, maxLatencyMs]. */
  private nextLatencyMs(): number {
    if (this.maxLatencyMs <= this.minLatencyMs) {
      return this.minLatencyMs;
    }
    const span = this.maxLatencyMs - this.minLatencyMs;
    return Math.round(this.minLatencyMs + this.random() * span);
  }

  fetchAssetPrices(): Promise<unknown> {
    const latency = this.nextLatencyMs();
    const shouldFail = this.failureRate > 0 && this.random() < this.failureRate;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('HTTP 503: Simulated network error fetching assetPrices'));
          return;
        }
        resolve(this.payload);
      }, latency);
    });
  }
}
