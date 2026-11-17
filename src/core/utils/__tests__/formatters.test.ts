import {
  PLACEHOLDER,
  formatCompact,
  formatCurrency,
  formatIsoDate,
  formatNumber,
  formatPercent,
  formatQuantity,
} from '../formatters';

// Intl en Node/Hermes puede usar espacio fino; normalizamos para comparar.
const n = (s: string) => s.replace(/\s/g, ' ');

describe('formatters', () => {
  it('formatea en es-AR', () => {
    expect(formatNumber(11182061.2)).toBe('11.182.061,20');
    expect(formatQuantity(72714)).toBe('72.714');
  });

  it('moneda con signo correcto', () => {
    expect(n(formatCurrency(941, 'ARS'))).toBe('$ 941,00');
    expect(n(formatCurrency(-12.5, 'USD'))).toBe('-US$ 12,50');
  });

  it('porcentaje en puntos porcentuales con signo', () => {
    expect(n(formatPercent(-0.54))).toBe('-0,54 %');
    expect(n(formatPercent(1.2))).toBe('+1,20 %');
    expect(n(formatPercent(-0))).toBe('0,00 %');
  });

  it('compacto y fechas', () => {
    expect(n(formatCompact(68651818))).toBe('68,65 M');
    expect(formatIsoDate('2030-07-09')).toBe('09/07/2030');
  });

  it('placeholder ante null/NaN', () => {
    expect(formatNumber(null)).toBe(PLACEHOLDER);
    expect(formatPercent(Number.NaN)).toBe(PLACEHOLDER);
    expect(formatCurrency(undefined, 'ARS')).toBe(PLACEHOLDER);
  });
});
