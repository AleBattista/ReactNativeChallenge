/**
 * Tipos primitivos compartidos por todo el dominio.
 * Regla: este directorio es TypeScript puro (sin React, sin RN, sin data/presentation).
 */

/** Identificador de un instrumento (ej. "AGRO", "ALUA"). */
export type Ticker = string;

/** Código de mercado (ej. "BCBA"). Abierto a nuevos mercados sin tocar el dominio. */
export type MarketCode = string;

/** Epoch en milisegundos. Evitamos `Date` en entidades para mantenerlas serializables e inmutables. */
export type Timestamp = number;

/** Fecha calendario en formato ISO `YYYY-MM-DD`. */
export type IsoDate = string;

export const CURRENCIES = ['ARS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const isCurrency = (value: unknown): value is Currency =>
  typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);

export type Listener = () => void;
export type Unsubscribe = () => void;
