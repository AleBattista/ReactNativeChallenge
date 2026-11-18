import type { Quote } from '../../../domain/market';
import type { Ticker } from '../../../domain/shared';
import {
  formatSortBadgeLabel,
  sortMarketTickers,
} from '../components/MarketSortSheet';

const makeQuote = (
  symbol: Ticker,
  changePercent: number | null,
  tradedAmount: number,
): Quote => ({
  symbol,
  lastPrice: 100,
  previousClose: 95,
  open: 95,
  dayLow: 90,
  dayHigh: 105,
  changePercent,
  volume: 1000,
  tradedQuantity: 1000,
  tradedAmount,
  bid: { price: 99, quantity: 100 },
  ask: { price: 101, quantity: 100 },
  yield: null,
  updatedAt: 1,
});

const QUOTES: Readonly<Record<string, Quote>> = {
  GGAL: makeQuote('GGAL', 3.2, 50_000_000),
  ALUA: makeQuote('ALUA', -1.5, 10_000_000),
  YPFD: makeQuote('YPFD', 0.8, 90_000_000),
  AGRO: makeQuote('AGRO', null, 5_000_000),
};

const getQuote = (symbol: Ticker): Quote | undefined => QUOTES[symbol];

describe('MarketSortSheet helpers', () => {
  it('devuelve el arreglo intacto cuando sort es null', () => {
    const input = ['GGAL', 'ALUA', 'YPFD'];
    expect(sortMarketTickers(input, null, getQuote)).toBe(input);
  });

  it('ordena por símbolo ascendente (A-Z) y descendente (Z-A)', () => {
    const input = ['GGAL', 'ALUA', 'YPFD', 'AGRO'];
    expect(
      sortMarketTickers(input, { field: 'symbol', direction: 'asc' }, getQuote),
    ).toEqual(['AGRO', 'ALUA', 'GGAL', 'YPFD']);

    expect(
      sortMarketTickers(input, { field: 'symbol', direction: 'desc' }, getQuote),
    ).toEqual(['YPFD', 'GGAL', 'ALUA', 'AGRO']);
  });

  it('ordena por variación diaria dejando nulos al final', () => {
    const input = ['GGAL', 'ALUA', 'YPFD', 'AGRO'];
    expect(
      sortMarketTickers(
        input,
        { field: 'changePercent', direction: 'desc' },
        getQuote,
      ),
    ).toEqual(['GGAL', 'YPFD', 'ALUA', 'AGRO']);

    expect(
      sortMarketTickers(
        input,
        { field: 'changePercent', direction: 'asc' },
        getQuote,
      ),
    ).toEqual(['ALUA', 'YPFD', 'GGAL', 'AGRO']);
  });

  it('ordena por monto operado ascendente y descendente', () => {
    const input = ['GGAL', 'ALUA', 'YPFD', 'AGRO'];
    expect(
      sortMarketTickers(
        input,
        { field: 'tradedAmount', direction: 'desc' },
        getQuote,
      ),
    ).toEqual(['YPFD', 'GGAL', 'ALUA', 'AGRO']);

    expect(
      sortMarketTickers(
        input,
        { field: 'tradedAmount', direction: 'asc' },
        getQuote,
      ),
    ).toEqual(['AGRO', 'ALUA', 'GGAL', 'YPFD']);
  });

  it('formatea las etiquetas del botón de ordenamiento', () => {
    expect(formatSortBadgeLabel(null)).toBe('⇅ Ordenar');
    expect(formatSortBadgeLabel({ field: 'symbol', direction: 'asc' })).toBe(
      'Símbolo ↑',
    );
    expect(
      formatSortBadgeLabel({ field: 'changePercent', direction: 'desc' }),
    ).toBe('Variación ↓');
    expect(
      formatSortBadgeLabel({ field: 'tradedAmount', direction: 'desc' }),
    ).toBe('Monto ↓');
  });
});
