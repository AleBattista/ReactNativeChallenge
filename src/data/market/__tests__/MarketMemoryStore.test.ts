import fixture from '../datasources/fixtures/assetPrices.json';
import { mapAssetPricesResponse } from '../mappers/assetMapper';
import { MarketMemoryStore } from '../store/MarketMemoryStore';

const quotes = () => mapAssetPricesResponse(fixture, 1)!.assets.map(a => a.quote);

/** Scheduler síncrono manual para controlar el flush en tests. */
const createManualStore = () => {
  let queued: (() => void) | null = null;
  const store = new MarketMemoryStore(flush => {
    queued = flush;
  });
  const flush = () => {
    const fn = queued;
    queued = null;
    fn?.();
  };
  return { store, flush };
};

describe('MarketMemoryStore', () => {
  it('notifica solo a los suscriptores del símbolo que cambió', () => {
    const { store, flush } = createManualStore();
    store.hydrate(quotes());
    flush();

    const agro = jest.fn();
    const alua = jest.fn();
    store.subscribe('AGRO', agro);
    store.subscribe('ALUA', alua);

    store.applyPatches([{ symbol: 'ALUA', lastPrice: 945 }]);
    flush();

    expect(alua).toHaveBeenCalledTimes(1);
    expect(agro).not.toHaveBeenCalled();
    expect(store.getQuote('ALUA')?.lastPrice).toBe(945);
  });

  it('preserva la referencia de los símbolos no modificados', () => {
    const { store, flush } = createManualStore();
    store.hydrate(quotes());
    flush();
    const agroBefore = store.getQuote('AGRO');
    const aluaBefore = store.getQuote('ALUA');

    store.applyPatches([{ symbol: 'ALUA', lastPrice: 950 }]);
    flush();

    expect(store.getQuote('AGRO')).toBe(agroBefore);
    expect(store.getQuote('ALUA')).not.toBe(aluaBefore);
  });

  it('agrupa múltiples ticks en una sola notificación y deduplica parches sin cambios', () => {
    const { store, flush } = createManualStore();
    store.hydrate(quotes());
    flush();
    const listener = jest.fn();
    store.subscribe('ALUA', listener);

    store.applyPatches([{ symbol: 'ALUA', lastPrice: 942 }]);
    store.applyPatches([{ symbol: 'ALUA', lastPrice: 943 }]);
    flush();
    expect(listener).toHaveBeenCalledTimes(1);

    store.applyPatches([{ symbol: 'ALUA', lastPrice: 943 }]);
    flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('desuscribe correctamente y notifica cambios de universo', () => {
    const { store, flush } = createManualStore();
    const onSymbols = jest.fn();
    store.subscribeToSymbols(onSymbols);
    store.hydrate(quotes());
    flush();
    expect(onSymbols).toHaveBeenCalledTimes(1);
    expect(store.getSymbols()).toEqual(['AGRO', 'ALUA']);

    const listener = jest.fn();
    const unsubscribe = store.subscribe('AGRO', listener);
    unsubscribe();
    store.applyPatches([{ symbol: 'AGRO', lastPrice: 40 }]);
    flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignora ticks de símbolos desconocidos', () => {
    const { store, flush } = createManualStore();
    store.hydrate(quotes());
    flush();
    store.applyPatches([{ symbol: 'GGAL', lastPrice: 1 }]);
    expect(store.getQuote('GGAL')).toBeUndefined();
  });
});
