import type { Result, Ticker, Unsubscribe } from '../../shared';
import type { Asset } from '../entities/Asset';

export interface MarketRepository {
  /** Trae el universo de activos y deja hidratado el QuoteFeed. */
  getAssets(): Promise<Result<readonly Asset[]>>;

  getAsset(symbol: Ticker): Promise<Result<Asset>>;

  /**
   * Inicia el flujo de actualizaciones en vivo (websocket / polling / simulador)
   * que alimenta el QuoteFeed. Devuelve la función para cortarlo.
   */
  connectLiveQuotes(): Unsubscribe;

  /** Pausa el streaming de cotizaciones cuando la app pasa a segundo plano. */
  pauseLiveQuotes(): void;

  /**
   * Reanuda el streaming al volver a primer plano (`active`) y ejecuta
   * Sync-on-Resume (actualización inmediata de los activos visibles).
   */
  resumeLiveQuotes(): void;
}
