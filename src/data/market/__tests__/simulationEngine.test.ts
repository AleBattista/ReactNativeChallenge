import {
  calculateChangePercent,
  calculateReferencePrice,
  computeQuoteTickPatch,
  MockLiveQuoteSource,
} from '../datasources/LiveQuoteSource';
import { MockMarketDataSource } from '../datasources/MarketRemoteDataSource';
import {
  buildSyntheticAssetPricesResponse,
  DEFAULT_SYNTHETIC_ASSET_COUNT,
} from '../datasources/syntheticDataset';
import { mapAssetPricesResponse } from '../mappers/assetMapper';
import { MarketRepositoryImpl } from '../repositories/MarketRepositoryImpl';
import { MarketMemoryStore } from '../store/MarketMemoryStore';

describe('Synthetic Dataset (2.000+ activos)', () => {
  it('genera 2.100 activos únicos con sufijos limpios y 0 rechazados por el mapper', () => {
    const dataset = buildSyntheticAssetPricesResponse();
    expect(dataset.assetPrices.length).toBeGreaterThanOrEqual(2000);
    expect(dataset.assetPrices).toHaveLength(DEFAULT_SYNTHETIC_ASSET_COUNT);

    const mapped = mapAssetPricesResponse(dataset, 1_700_000_000_000);
    expect(mapped).not.toBeNull();
    expect(mapped?.rejected).toBe(0);
    expect(mapped?.assets).toHaveLength(DEFAULT_SYNTHETIC_ASSET_COUNT);

    // Verifica sufijos limpios en las series derivadas (ej. AGRO.01)
    expect(mapped?.assets[0]?.symbol).toBe('AGRO');
    expect(mapped?.assets[30]?.symbol).toBe('AGRO.01');

    // Invariantes financieras en todos los ítems sintéticos generados (del 30 al 2.099)
    for (const asset of mapped!.assets.slice(30)) {
      const { quote } = asset;
      expect(quote.lastPrice).not.toBeNull();
      expect(quote.dayLow).toBeLessThanOrEqual(quote.lastPrice!);
      expect(quote.dayHigh).toBeGreaterThanOrEqual(quote.lastPrice!);
      if (quote.bid.price !== null && quote.ask.price !== null) {
        expect(quote.bid.price).toBeLessThanOrEqual(quote.ask.price);
      }
    }
  });
});

describe('MockMarketDataSource (latencia y fallos simulados)', () => {
  it('devuelve error NETWORK en el repositorio cuando se dispara el fallo simulado', async () => {
    const failingSource = new MockMarketDataSource({
      minLatencyMs: 1,
      maxLatencyMs: 5,
      failureRate: 1, // 100% fallo para testear determinísticamente
    });
    const store = new MarketMemoryStore(flush => flush());
    const repo = new MarketRepositoryImpl(failingSource, store);

    const result = await repo.getAssets();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });

  it('hidrata los 2.100+ activos cuando la red simulada responde ok', async () => {
    const okSource = new MockMarketDataSource({
      minLatencyMs: 1,
      maxLatencyMs: 5,
      failureRate: 0,
    });
    const store = new MarketMemoryStore(flush => flush());
    const repo = new MarketRepositoryImpl(okSource, store);

    const result = await repo.getAssets();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(DEFAULT_SYNTHETIC_ASSET_COUNT);
      expect(store.getSymbols().length).toBe(DEFAULT_SYNTHETIC_ASSET_COUNT);
    }
  });
});

describe('MockLiveQuoteSource y Reglas Financieras', () => {
  it('calcula PrecioReferencia sin usar ultimoCierre y recalcula changePercent en tiempo real', () => {
    // Caso ALUA: ultimoPrecio = 941, variacionDiaria = -0.89, ultimoCierre = 0
    const referencePrice = calculateReferencePrice(941, -0.89);
    // 941 / (1 - 0.0089) = 949.4501...
    expect(referencePrice).toBeCloseTo(949.4501, 3);

    // Si vuelve exactamente al precio inicial, la variación sigue siendo -0.89%
    expect(calculateChangePercent(941, referencePrice)).toBeCloseTo(-0.89, 2);

    // Si sube a 958.94 (+1% sobre el precio de referencia), changePercent = +1.00%
    expect(calculateChangePercent(referencePrice * 1.01, referencePrice)).toBeCloseTo(1.0, 2);
  });

  it('actualiza dayLow/dayHigh y mueve bid/ask en la misma proporción que lastPrice', () => {
    const store = new MarketMemoryStore(flush => flush());
    const mapped = mapAssetPricesResponse(
      buildSyntheticAssetPricesResponse(undefined, 2),
      1_700_000_000_000,
    )!;
    store.hydrate(mapped.assets.map(a => a.quote));

    const aluaInitial = store.getQuote('ALUA')!;
    const refPrice = calculateReferencePrice(
      aluaInitial.lastPrice!,
      aluaInitial.changePercent,
    );

    // Subida de +2% que supera el dayHigh (951) -> nuevo lastPrice = 941 * 1.02 = 959.82
    const upPatch = computeQuoteTickPatch(aluaInitial, refPrice, 0.02, 2_000);
    expect(upPatch).not.toBeNull();
    expect(upPatch!.lastPrice).toBe(959.82);
    expect(upPatch!.dayHigh).toBe(959.82);
    expect(upPatch!.dayLow).toBe(aluaInitial.dayLow);

    // Proporción exacta aplicada a bid (930) y ask (932.5)
    const exactRatio = upPatch!.lastPrice! / aluaInitial.lastPrice!;
    expect(upPatch!.bid?.price).toBeCloseTo(aluaInitial.bid.price! * exactRatio, 2);
    expect(upPatch!.ask?.price).toBeCloseTo(aluaInitial.ask.price! * exactRatio, 2);

    // Bajada fuerte (-3%) que perfora el dayLow (932.5)
    const downPatch = computeQuoteTickPatch(aluaInitial, refPrice, -0.03, 3_000);
    expect(downPatch!.lastPrice).toBe(912.77);
    expect(downPatch!.dayLow).toBe(912.77);
  });

  it('emite parches granulares al MarketMemoryStore mantendo fijo el PrecioReferencia inicial', () => {
    const store = new MarketMemoryStore(flush => flush());
    const mapped = mapAssetPricesResponse(
      buildSyntheticAssetPricesResponse(undefined, 5),
      1_700_000_000_000,
    )!;
    store.hydrate(mapped.assets.map(a => a.quote));

    const agroInit = store.getQuote('AGRO')!;
    const expectedRefPrice = calculateReferencePrice(
      agroInit.lastPrice!,
      agroInit.changePercent,
    );

    // Random fijo (0.9 => +0.4% dentro de ±0.5%)
    const live = new MockLiveQuoteSource(store, {
      batchSize: 5,
      maxDeltaPercent: 0.5,
      random: () => 0.9,
      now: () => 5_000,
    });

    const firstPatches = live.generateTickPatches();
    expect(firstPatches.length).toBeGreaterThan(0);
    store.applyPatches(firstPatches);

    // Segundo tick consecutivo: el PrecioReferencia NO debe recalcularse con el tick 1
    const secondPatches = live.generateTickPatches();
    store.applyPatches(secondPatches);

    const agroAfterTwoTicks = store.getQuote('AGRO')!;
    expect(agroAfterTwoTicks.changePercent).toBe(
      calculateChangePercent(agroAfterTwoTicks.lastPrice!, expectedRefPrice),
    );
  });

  it('pausa el streaming en background y ejecuta Sync-on-Resume inmediato sobre los símbolos visibles al volver a active', () => {
    jest.useFakeTimers();
    try {
      const store = new MarketMemoryStore(flush => flush());
      const mapped = mapAssetPricesResponse(
        buildSyntheticAssetPricesResponse(undefined, 10),
        1_700_000_000_000,
      )!;
      store.hydrate(mapped.assets.map(a => a.quote));

      const live = new MockLiveQuoteSource(store, {
        intervalMs: 2500,
        batchSize: 3,
        maxDeltaPercent: 0.5,
        random: () => 0.95,
        now: () => 10_000,
      });

      const okSource = new MockMarketDataSource({
        minLatencyMs: 1,
        maxLatencyMs: 2,
        failureRate: 0,
      });
      const repo = new MarketRepositoryImpl(okSource, store, live);
      const disconnect = repo.connectLiveQuotes();

      // Simulamos que ALUA está visible en el viewport (tiene suscriptor activo)
      const aluaListener = jest.fn();
      const unsubscribeAlua = store.subscribe('ALUA', aluaListener);
      expect(store.getActiveSymbols()).toEqual(['ALUA']);

      // La app pasa a background -> se pausa el store y el timer de streaming
      store.pause();
      expect(store.isPaused()).toBe(true);
      expect(live.isPaused()).toBe(true);

      // Avanzamos 10 segundos en background: no debe dispararse ningún tick
      jest.advanceTimersByTime(10_000);
      expect(aluaListener).not.toHaveBeenCalled();

      // La app vuelve a active -> Sync-on-Resume actualiza instantáneamente ALUA sin esperar 2.5s
      store.resume();
      expect(store.isPaused()).toBe(false);
      expect(live.isPaused()).toBe(false);
      expect(aluaListener).toHaveBeenCalledTimes(1);

      unsubscribeAlua();
      disconnect();
    } finally {
      jest.useRealTimers();
    }
  });
});
