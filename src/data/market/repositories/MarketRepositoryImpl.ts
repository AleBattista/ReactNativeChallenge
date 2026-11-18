import type { Asset, MarketRepository } from '../../../domain/market';
import {
  domainError,
  err,
  ok,
  type Result,
  type Ticker,
  type Unsubscribe,
} from '../../../domain/shared';
import type { LiveQuoteSource } from '../datasources/LiveQuoteSource';
import type { MarketRemoteDataSource } from '../datasources/MarketRemoteDataSource';
import { mapAssetPricesResponse } from '../mappers/assetMapper';
import type { MarketMemoryStore } from '../store/MarketMemoryStore';

const noop: Unsubscribe = () => {};

export class MarketRepositoryImpl implements MarketRepository {
  private assets = new Map<Ticker, Asset>();

  constructor(
    private readonly remote: MarketRemoteDataSource,
    private readonly store: MarketMemoryStore,
    private readonly live: LiveQuoteSource | null = null,
  ) {}

  async getAssets(): Promise<Result<readonly Asset[]>> {
    let raw: unknown;
    try {
      raw = await this.remote.fetchAssetPrices();
    } catch (cause) {
      return err(domainError('NETWORK', 'No se pudieron obtener las cotizaciones', cause));
    }

    const mapped = mapAssetPricesResponse(raw);
    if (!mapped) {
      return err(domainError('INVALID_DATA', 'Respuesta de cotizaciones inválida'));
    }
    if (__DEV__ && mapped.rejected > 0) {
      console.warn(`[MarketRepository] ${mapped.rejected} activos descartados por datos inválidos`);
    }

    this.assets = new Map(mapped.assets.map(asset => [asset.symbol, asset]));
    this.store.hydrate(
      mapped.assets.map(asset => asset.quote),
      mapped.assets,
    );
    return ok(mapped.assets);
  }

  async getAsset(symbol: Ticker): Promise<Result<Asset>> {
    if (!this.assets.has(symbol)) {
      const result = await this.getAssets();
      if (!result.ok) {
        return result;
      }
    }
    const asset = this.assets.get(symbol);
    if (!asset) {
      return err(domainError('NOT_FOUND', `Activo ${symbol} inexistente`));
    }
    // La info estática viene del cache; la cotización, siempre la más fresca del store.
    const quote = this.store.getQuote(symbol) ?? asset.quote;
    return ok({ ...asset, quote });
  }

  connectLiveQuotes(): Unsubscribe {
    if (!this.live) {
      return noop;
    }
    const disconnectSource = this.live.connect(patches =>
      this.store.applyPatches(patches),
    );
    const unregisterLifecycle = this.store.registerLifecycleHandlers({
      onPause: () => this.live?.pause(),
      onResume: () => this.live?.resume(),
    });

    return () => {
      unregisterLifecycle();
      disconnectSource();
    };
  }

  pauseLiveQuotes(): void {
    this.store.pause();
  }

  resumeLiveQuotes(): void {
    this.store.resume();
  }
}
