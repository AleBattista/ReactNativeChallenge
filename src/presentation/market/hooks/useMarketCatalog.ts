import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { Ticker } from '../../../domain/shared';
import {
  sortMarketTickers,
  type MarketSortConfig,
} from '../components/MarketSortSheet';
import { useMarketSymbols } from './useLiveQuote';

export type MarketLoadStatus = 'loading' | 'ready' | 'error';

interface SearchableEntry {
  readonly symbol: Ticker;
  readonly symbolLower: string;
  readonly descriptionLower: string;
}

export interface UseMarketCatalogResult {
  readonly status: MarketLoadStatus;
  readonly errorMessage: string | null;
  readonly isRefreshing: boolean;
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly clearSearch: () => void;
  readonly sortConfig: MarketSortConfig | null;
  readonly applySort: (sort: MarketSortConfig | null) => void;
  readonly filteredSymbols: readonly Ticker[];
  readonly totalCount: number;
  readonly retry: () => void;
  readonly refresh: () => void;
}

/**
 * Orquesta la carga inicial del catálogo de 2.100+ activos, la conexión al
 * streaming en vivo (`connectLiveQuotes`), el filtrado instantáneo en memoria
 * y el ordenamiento imperativo sobre los resultados filtrados.
 */
export function useMarketCatalog(): UseMarketCatalogResult {
  const { marketRepository, quoteFeed } = useDependencies();
  const storeSymbols = useMarketSymbols();

  const [status, setStatus] = useState<MarketLoadStatus>(() =>
    storeSymbols.length > 0 ? 'ready' : 'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<MarketSortConfig | null>(null);
  const mountedRef = useRef(true);

  const loadAssets = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') {
        setStatus('loading');
      } else {
        setIsRefreshing(true);
      }
      setErrorMessage(null);

      const result = await marketRepository.getAssets();
      if (!mountedRef.current) {
        return;
      }

      if (result.ok) {
        setStatus('ready');
        setErrorMessage(null);
      } else {
        setErrorMessage(result.error.message);
        if (storeSymbols.length === 0) {
          setStatus('error');
        }
      }
      setIsRefreshing(false);
    },
    [marketRepository, storeSymbols.length],
  );

  useEffect(() => {
    mountedRef.current = true;
    loadAssets('initial');
    const disconnectLive = marketRepository.connectLiveQuotes();
    return () => {
      mountedRef.current = false;
      disconnectLive();
    };
    // Solo al montar el catálogo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketRepository]);

  // Índice precalculado en minúsculas: filtrar 2.100 activos por pulsación toma < 0.5 ms
  const searchIndex = useMemo<readonly SearchableEntry[]>(
    () =>
      storeSymbols.map(symbol => {
        const info = quoteFeed.getAssetInfo(symbol);
        return {
          symbol,
          symbolLower: symbol.toLowerCase(),
          descriptionLower: (info?.description ?? '').toLowerCase(),
        };
      }),
    [storeSymbols, quoteFeed],
  );

  // 1. Filtrado en vivo por símbolo o descripción
  const matchedSymbols = useMemo<readonly Ticker[]>(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (normalized.length === 0) {
      return storeSymbols;
    }
    const matches: Ticker[] = [];
    for (const entry of searchIndex) {
      if (
        entry.symbolLower.includes(normalized) ||
        entry.descriptionLower.includes(normalized)
      ) {
        matches.push(entry.symbol);
      }
    }
    return matches;
  }, [searchQuery, storeSymbols, searchIndex]);

  // 2. Ordenamiento imperativo sobre los resultados ya filtrados
  const filteredSymbols = useMemo<readonly Ticker[]>(
    () => sortMarketTickers(matchedSymbols, sortConfig, quoteFeed.getQuote),
    [matchedSymbols, sortConfig, quoteFeed.getQuote],
  );

  const applySort = useCallback((nextSort: MarketSortConfig | null) => {
    setSortConfig(nextSort ? { ...nextSort } : null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const retry = useCallback(() => {
    loadAssets('initial');
  }, [loadAssets]);

  const refresh = useCallback(() => {
    loadAssets('refresh');
  }, [loadAssets]);

  return {
    status,
    errorMessage,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    clearSearch,
    sortConfig,
    applySort,
    filteredSymbols,
    totalCount: storeSymbols.length,
    retry,
    refresh,
  };
}
