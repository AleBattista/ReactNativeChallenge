import { MockMarketDataSource } from '../../data/market/datasources/MarketRemoteDataSource';
import { MarketRepositoryImpl } from '../../data/market/repositories/MarketRepositoryImpl';
import { marketMemoryStore } from '../../data/market/store/MarketMemoryStore';
import type { MarketRepository, QuoteFeed } from '../../domain/market';

/**
 * Composition root: el ÚNICO lugar que conoce implementaciones concretas.
 * Presentation recibe interfaces de dominio; cambiar Mock por Http (o
 * agregar un LiveQuoteSource) se hace acá sin tocar ninguna vista.
 */
export interface Dependencies {
  readonly marketRepository: MarketRepository;
  readonly quoteFeed: QuoteFeed;
  // readonly orderRepository: OrderRepository;       -> próximo paso
  // readonly portfolioRepository: PortfolioRepository; -> próximo paso
}

export const createDependencies = (): Dependencies => {
  const marketRepository = new MarketRepositoryImpl(
    new MockMarketDataSource(),
    marketMemoryStore,
  );
  return { marketRepository, quoteFeed: marketMemoryStore };
};
