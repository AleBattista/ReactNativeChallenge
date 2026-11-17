import { MockLiveQuoteSource } from '../../data/market/datasources/LiveQuoteSource';
import { MockMarketDataSource } from '../../data/market/datasources/MarketRemoteDataSource';
import { MarketRepositoryImpl } from '../../data/market/repositories/MarketRepositoryImpl';
import { marketMemoryStore } from '../../data/market/store/MarketMemoryStore';
import type { MarketRepository, QuoteFeed } from '../../domain/market';

/**
 * Composition root: el ÚNICO lugar que conoce implementaciones concretas.
 * Presentation recibe interfaces de dominio; cambiar Mock por Http (o
 * ajustar el simulador en vivo) se hace acá sin tocar ninguna vista.
 */
export interface Dependencies {
  readonly marketRepository: MarketRepository;
  readonly quoteFeed: QuoteFeed;
  // readonly orderRepository: OrderRepository;       -> próximo paso
  // readonly portfolioRepository: PortfolioRepository; -> próximo paso
}

export const createDependencies = (): Dependencies => {
  const remoteDataSource = new MockMarketDataSource();
  const liveQuoteSource = new MockLiveQuoteSource(marketMemoryStore);
  const marketRepository = new MarketRepositoryImpl(
    remoteDataSource,
    marketMemoryStore,
    liveQuoteSource,
  );
  return { marketRepository, quoteFeed: marketMemoryStore };
};
