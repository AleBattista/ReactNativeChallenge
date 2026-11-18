import {
  calculateOrderBreakdown,
  validateOrderDraft,
} from '../screens/OrderModalScreen';

describe('OrderModalScreen motor financiero y validaciones', () => {
  describe('calculateOrderBreakdown', () => {
    it('calcula monto bruto, comisión (0.5%), IVA (21% sobre comisión) y suma costos en COMPRA', () => {
      // 100 acciones a $1.000 = $100.000 bruto
      // Comisión (0.5%) = $500
      // IVA (21% de $500) = $105
      // Total costos = $605 -> Total final Compra = $100.605
      const buyBreakdown = calculateOrderBreakdown(100, 1000, 'BUY');
      expect(buyBreakdown).toEqual({
        quantity: 100,
        unitPrice: 1000,
        grossAmount: 100_000,
        commission: 500,
        vat: 105,
        totalFees: 605,
        finalTotal: 100_605,
      });
    });

    it('descuenta comisión e IVA del monto bruto en VENTA', () => {
      // 100 acciones a $1.000 = $100.000 bruto - $605 costos = $99.395 neto
      const sellBreakdown = calculateOrderBreakdown(100, 1000, 'SELL');
      expect(sellBreakdown.totalFees).toBe(605);
      expect(sellBreakdown.finalTotal).toBe(99_395);
    });
  });

  describe('validateOrderDraft', () => {
    it('valida en COMPRA que finalTotal no supere cashBalance', () => {
      expect(
        validateOrderDraft({
          side: 'BUY',
          quantity: 10,
          unitPrice: 1000,
          finalTotal: 10_060.5,
          cashBalance: 10_000,
          ownedQuantity: 0,
        }),
      ).toEqual({
        isValid: false,
        errorMessage:
          'El total final con comisiones e IVA supera tu saldo disponible en efectivo.',
      });

      expect(
        validateOrderDraft({
          side: 'BUY',
          quantity: 10,
          unitPrice: 1000,
          finalTotal: 10_060.5,
          cashBalance: 15_000,
          ownedQuantity: 0,
        }).isValid,
      ).toBe(true);
    });

    it('valida en VENTA que quantity no supere ownedQuantity', () => {
      expect(
        validateOrderDraft({
          side: 'SELL',
          quantity: 50,
          unitPrice: 1000,
          finalTotal: 49_697.5,
          cashBalance: 1_000_000,
          ownedQuantity: 30,
        }).isValid,
      ).toBe(false);

      expect(
        validateOrderDraft({
          side: 'SELL',
          quantity: 30,
          unitPrice: 1000,
          finalTotal: 29_818.5,
          cashBalance: 1_000_000,
          ownedQuantity: 30,
        }).isValid,
      ).toBe(true);
    });
  });
});
