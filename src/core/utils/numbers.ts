/**
 * Helpers numéricos puros. Los usa la capa de datos para sanear el JSON crudo
 * y la capa de presentación para formatear. Sin dependencias.
 */

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Número finito o `null` (descarta null, NaN, Infinity). */
export const finiteOrNull = (value: unknown): number | null =>
  isFiniteNumber(value) ? value : null;

/**
 * Para precios: el backend usa `0` como "sin dato" (ej. `ultimoCierre: 0`).
 * Un precio <= 0 no tiene sentido en este mercado, así que se normaliza a `null`.
 */
export const positiveOrNull = (value: unknown): number | null =>
  isFiniteNumber(value) && value > 0 ? value : null;

/** Para cantidades/montos: 0 es un valor legítimo; inválidos o negativos caen a 0. */
export const nonNegativeOrZero = (value: unknown): number =>
  isFiniteNumber(value) && value >= 0 ? value : 0;

/** Variación porcentual entre dos precios, en puntos porcentuales. */
export const percentChange = (
  current: number | null,
  reference: number | null,
): number | null =>
  current !== null && reference !== null && reference !== 0
    ? ((current - reference) / reference) * 100
    : null;
