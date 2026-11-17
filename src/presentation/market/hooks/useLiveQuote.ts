import { useCallback, useSyncExternalStore } from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { Quote } from '../../../domain/market';
import type { Listener, Ticker } from '../../../domain/shared';

/**
 * Puente store → React. Re-renderiza SOLO cuando cambia la cotización de
 * `symbol` (el store reemplaza el objeto únicamente si hubo cambio real).
 */
export function useLiveQuote(symbol: Ticker): Quote | undefined {
  const { quoteFeed } = useDependencies();
  const subscribe = useCallback(
    (listener: Listener) => quoteFeed.subscribe(symbol, listener),
    [quoteFeed, symbol],
  );
  const getSnapshot = useCallback(() => quoteFeed.getQuote(symbol), [quoteFeed, symbol]);
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
  const getSnapshot = () => selector(quoteFeed.getQuote(symbol));
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useMarketSymbols(): readonly Ticker[] {
  const { quoteFeed } = useDependencies();
  return useSyncExternalStore(quoteFeed.subscribeToSymbols, quoteFeed.getSymbols);
}
