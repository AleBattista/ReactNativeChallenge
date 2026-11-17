import fixture from '../datasources/fixtures/assetPrices.json';
import { mapAssetPricesResponse } from '../mappers/assetMapper';

const NOW = 1_700_000_000_000;

describe('mapAssetPricesResponse', () => {
  it('mapea el fixture a entidades de dominio', () => {
    const result = mapAssetPricesResponse(fixture, NOW);
    expect(result?.rejected).toBe(0);
    expect(result?.assets.length).toBe(fixture.assetPrices.length);
    expect(result?.assets.slice(0, 2).map(a => a.symbol)).toEqual(['AGRO', 'ALUA']);
  });

  it('normaliza ultimoCierre: 0 a previousClose null (caso ALUA)', () => {
    const alua = mapAssetPricesResponse(fixture, NOW)?.assets.find(a => a.symbol === 'ALUA');
    expect(alua?.quote.previousClose).toBeNull();
    expect(alua?.quote.lastPrice).toBe(941);
    expect(alua?.quote.changePercent).toBe(-0.89);
  });

  it('acciones: sin vencimiento y sin métricas de rendimiento (tasas 0 / tir null)', () => {
    const agro = mapAssetPricesResponse(fixture, NOW)?.assets[0];
    expect(agro?.instrumentType).toBe('EQUITY');
    expect(agro?.maturityDate).toBeNull();
    expect(agro?.quote.yield).toBeNull();
    expect(agro?.quote.volume).toBe(0); // 0 legítimo, no se "corrige"
  });

  it('descarta items inválidos sin romper la lista', () => {
    const result = mapAssetPricesResponse(
      { assetPrices: [...fixture.assetPrices, { symbol: 'BAD' }, { ...fixture.assetPrices[0], symbol: 'X', currency: 'EUR' }] },
      NOW,
    );
    expect(result?.assets).toHaveLength(fixture.assetPrices.length);
    expect(result?.rejected).toBe(2);
  });

  it('devuelve null si la estructura raíz es inválida', () => {
    expect(mapAssetPricesResponse({ foo: [] })).toBeNull();
    expect(mapAssetPricesResponse(null)).toBeNull();
  });

  it('deriva changePercent cuando variacionDiaria es null', () => {
    const base = fixture.assetPrices[0]!;
    const result = mapAssetPricesResponse(
      { assetPrices: [{ ...base, variacionDiaria: null, ultimoPrecio: 110, ultimoCierre: 100 }] },
      NOW,
    );
    expect(result?.assets[0]?.quote.changePercent).toBeCloseTo(10);
  });

  it('detecta renta fija por maturityDate/tir', () => {
    const base = fixture.assetPrices[0]!;
    const result = mapAssetPricesResponse(
      { assetPrices: [{ ...base, symbol: 'AL30', tir: 12.5, tasaCompra: 12.1, maturityDate: '2030-07-09T00:00:00' }] },
      NOW,
    );
    const bond = result?.assets[0];
    expect(bond?.instrumentType).toBe('FIXED_INCOME');
    expect(bond?.maturityDate).toBe('2030-07-09');
    expect(bond?.quote.yield).toEqual({ irr: 12.5, bidRate: 12.1, askRate: 0 });
  });
});
