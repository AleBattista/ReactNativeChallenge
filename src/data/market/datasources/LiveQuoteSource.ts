import type { Unsubscribe } from '../../../domain/shared';
import type { QuotePatch } from '../store/MarketMemoryStore';

/**
 * Fuente de ticks en vivo (websocket, polling o simulador). Solo empuja
 * parches al store; nunca habla con React. La implementación concreta
 * (p. ej. un simulador de random-walk) se agrega en un paso posterior.
 */
export interface LiveQuoteSource {
  connect(onPatches: (patches: readonly QuotePatch[]) => void): Unsubscribe;
}
