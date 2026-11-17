import assetPricesFixture from './fixtures/assetPrices.json';

/**
 * Fuente remota de precios. Devuelve `unknown` A PROPÓSITO: el JSON de red no
 * es confiable y debe pasar por el type guard + mapper antes de usarse.
 */
export interface MarketRemoteDataSource {
  fetchAssetPrices(): Promise<unknown>;
}

export class HttpMarketDataSource implements MarketRemoteDataSource {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 10_000,
  ) {}

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

/** Fuente local para desarrollo/tests: sirve el fixture con latencia simulada. */
export class MockMarketDataSource implements MarketRemoteDataSource {
  constructor(
    private readonly payload: unknown = assetPricesFixture,
    private readonly latencyMs = 400,
  ) {}

  fetchAssetPrices(): Promise<unknown> {
    return new Promise(resolve => setTimeout(() => resolve(this.payload), this.latencyMs));
  }
}
