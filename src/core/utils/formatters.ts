/**
 * Formatters financieros (es-AR: "." miles, "," decimales).
 *
 * Decisiones:
 *  - Las instancias de Intl.NumberFormat son caras: se cachean por configuración.
 *  - Símbolo de moneda y notación compacta se arman a mano: el soporte de
 *    `style: 'currency'` / `notation: 'compact'` en Hermes varía por plataforma.
 *  - Todo formatter acepta `null | undefined` y devuelve un placeholder,
 *    así las vistas nunca necesitan condicionales.
 */

export const PLACEHOLDER = '—';
const LOCALE = 'es-AR';

type Nullable<T> = T | null | undefined;

const formatterCache = new Map<string, Intl.NumberFormat>();

const getNumberFormat = (min: number, max: number): Intl.NumberFormat => {
  const key = `${min}-${max}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: true,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
};

const isValid = (value: Nullable<number>): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Normaliza "-0" para no mostrar "-0,00". */
const normalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

export interface DecimalOptions {
  readonly decimals?: number;
}

/** 941 → "941,00" · 11182061.2 → "11.182.061,20" */
export const formatNumber = (
  value: Nullable<number>,
  { decimals = 2 }: DecimalOptions = {},
): string =>
  isValid(value)
    ? getNumberFormat(decimals, decimals).format(normalizeZero(value))
    : PLACEHOLDER;

/** Precio sin símbolo. Alias semántico de formatNumber. */
export const formatPrice = formatNumber;

/** Cantidades enteras: 72714 → "72.714" */
export const formatQuantity = (value: Nullable<number>): string =>
  isValid(value) ? getNumberFormat(0, 0).format(Math.trunc(value)) : PLACEHOLDER;

const CURRENCY_SYMBOL: Readonly<Record<string, string>> = {
  ARS: '$',
  USD: 'US$',
};

/** (941, 'ARS') → "$ 941,00" · (-12.5, 'USD') → "-US$ 12,50" */
export const formatCurrency = (
  value: Nullable<number>,
  currency: string,
  options: DecimalOptions = {},
): string => {
  if (!isValid(value)) {
    return PLACEHOLDER;
  }
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const amount = formatNumber(Math.abs(value), options);
  const sign = normalizeZero(value) < 0 ? '-' : '';
  return `${sign}${symbol} ${amount}`;
};

export interface PercentOptions extends DecimalOptions {
  /** Antepone "+" a valores positivos. Default: true. */
  readonly signed?: boolean;
}

/**
 * Recibe PUNTOS PORCENTUALES (como `variacionDiaria`), no fracciones.
 * -0.54 → "-0,54 %" · 1.2 → "+1,20 %"
 */
export const formatPercent = (
  value: Nullable<number>,
  { decimals = 2, signed = true }: PercentOptions = {},
): string => {
  if (!isValid(value)) {
    return PLACEHOLDER;
  }
  const normalized = normalizeZero(value);
  const sign = signed && normalized > 0 ? '+' : '';
  return `${sign}${getNumberFormat(decimals, decimals).format(normalized)} %`;
};

const COMPACT_UNITS = [
  { threshold: 1e12, suffix: 'B' }, // billón (es) = 10^12
  { threshold: 1e9, suffix: 'MM' }, // mil millones
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'K' },
] as const;

/** Montos operados: 68651818 → "68,65 M" · 11182061.2 → "11,18 M" */
export const formatCompact = (
  value: Nullable<number>,
  { decimals = 2 }: DecimalOptions = {},
): string => {
  if (!isValid(value)) {
    return PLACEHOLDER;
  }
  const abs = Math.abs(value);
  const unit = COMPACT_UNITS.find(u => abs >= u.threshold);
  if (!unit) {
    return formatNumber(value, { decimals: 0 });
  }
  return `${formatNumber(value / unit.threshold, { decimals })} ${unit.suffix}`;
};

/** ISO "2027-01-09" → "09/01/2027". Sin Date para evitar corrimientos por timezone. */
export const formatIsoDate = (iso: Nullable<string>): string => {
  if (!iso) {
    return PLACEHOLDER;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : PLACEHOLDER;
};
