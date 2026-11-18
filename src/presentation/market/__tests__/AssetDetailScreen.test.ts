import {
  computeClampedDayRangeProgress,
  computeSpreadMetrics,
} from '../screens/AssetDetailScreen';

describe('AssetDetailScreen derived metrics', () => {
  describe('computeClampedDayRangeProgress', () => {
    it('calcula la posición proporcional dentro del rango [dayLow, dayHigh]', () => {
      // ALUA: min = 932.5, max = 951, lastPrice = 941 -> (941 - 932.5) / 18.5 = 0.4594...
      expect(computeClampedDayRangeProgress(941, 932.5, 951)).toBeCloseTo(
        8.5 / 18.5,
        4,
      );
      expect(computeClampedDayRangeProgress(932.5, 932.5, 951)).toBe(0);
      expect(computeClampedDayRangeProgress(951, 932.5, 951)).toBe(1);
    });

    it('aplica clamping seguro en [0, 1] cuando el precio cotiza fuera del rango o datos nulos', () => {
      expect(computeClampedDayRangeProgress(900, 932.5, 951)).toBe(0);
      expect(computeClampedDayRangeProgress(990, 932.5, 951)).toBe(1);
      expect(computeClampedDayRangeProgress(100, 100, 100)).toBe(0.5);
      expect(computeClampedDayRangeProgress(null, 932.5, 951)).toBe(0.5);
    });
  });

  describe('computeSpreadMetrics', () => {
    it('calcula el spread absoluto en pesos y relativo sobre el último precio', () => {
      // ALUA: bid = 930, ask = 932.5, lastPrice = 941 -> spread = 2.50, % = (2.5 / 941) * 100
      const metrics = computeSpreadMetrics(930, 932.5, 941);
      expect(metrics.absolute).toBeCloseTo(2.5, 4);
      expect(metrics.relativePercent).toBeCloseTo((2.5 / 941) * 100, 4);
    });

    it('devuelve nulls si falta alguna punta', () => {
      expect(computeSpreadMetrics(null, 932.5, 941)).toEqual({
        absolute: null,
        relativePercent: null,
      });
    });
  });
});
