import { computeHoldingValuation } from '../components/HoldingItemRow';
import { formatOrderTimestamp } from '../components/OrderHistoryItemRow';

describe('OrdersScreen helpers (valuación de tenencias y formato de historial)', () => {
  describe('computeHoldingValuation', () => {
    it('calcula costo invertido, valor de mercado y P&L no realizado en pesos y porcentaje', () => {
      // 100 nominales comprados a $900 promedio, cotizando hoy a $990 (+10%)
      const valuation = computeHoldingValuation(100, 900, 990);
      expect(valuation).toEqual({
        costBasis: 90_000,
        marketValue: 99_000,
        unrealizedPnl: 9_000,
        unrealizedPnlPercent: 10,
      });
    });

    it('conserva costBasis y devuelve nulls para mercado cuando aún no hay cotización en vivo', () => {
      const valuation = computeHoldingValuation(50, 40, null);
      expect(valuation).toEqual({
        costBasis: 2_000,
        marketValue: null,
        unrealizedPnl: null,
        unrealizedPnlPercent: null,
      });
    });
  });

  describe('formatOrderTimestamp', () => {
    it('formatea timestamps válidos como DD/MM/YYYY HH:mm:ss y devuelve guion ante inválidos', () => {
      const ts = new Date(2026, 10, 18, 14, 5, 9).getTime();
      expect(formatOrderTimestamp(ts)).toBe('18/11/2026 14:05:09');
      expect(formatOrderTimestamp(0)).toBe('—');
      expect(formatOrderTimestamp(Number.NaN)).toBe('—');
    });
  });
});
