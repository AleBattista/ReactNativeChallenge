import { useCallback, useSyncExternalStore } from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { AssetInfo, Quote } from '../../../domain/market';
import type { Listener, Ticker } from '../../../domain/shared';

/**
 * Puente store → React mediante `useSyncExternalStore`.
 * Re-renderiza SOLO la celda cuyo `symbol` tuvo un cambio real de precio.
 */
export function useLiveQuote(symbol: Ticker): Quote | undefined {
  const { quoteFeed } = useDependencies();
  const subscribe = useCallback(
    (listener: Listener) => quoteFeed.subscribe(symbol, listener),
    [quoteFeed, symbol],
  );
  const getSnapshot = useCallback(
    () => quoteFeed.getQuote(symbol),
    [quoteFeed, symbol],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Granularidad a nivel CAMPO: el componente solo re-renderiza si cambia el
 * valor seleccionado (ej. `lastPrice`), aunque cambie el volumen u otro campo.
 * El selector debe devolver un primitivo (o una referencia estable del store).
 */
export function useLiveQuoteSelector<T>(
  symbol: Ticker,
  selector: (quote: Quote | undefined) => T,
): T {
  const { quoteFeed } = useDependencies();
  const subscribe = useCallback(
    (listener: Listener) => quoteFeed.subscribe(symbol, listener),
    [quoteFeed, symbol],
  );
  const getSnapshot = useCallback(
    () => selector(quoteFeed.getQuote(symbol)),
    [quoteFeed, symbol, selector],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Obtiene la metadata estática del activo (`description`, `currency`, `market`)
 * desde el `QuoteFeed` sin pasar objetos pesados por las props de la lista.
 */
export function useAssetInfo(symbol: Ticker): AssetInfo | undefined {
  const { quoteFeed } = useDependencies();
  return quoteFeed?.getAssetInfo?.(symbol);
}

export function useMarketSymbols(): readonly Ticker[] {
  const { quoteFeed } = useDependencies();
  return useSyncExternalStore(
    quoteFeed.subscribeToSymbols,
    quoteFeed.getSymbols,
  );
}
