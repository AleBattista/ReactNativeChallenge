/**
 * DTO: espejo EXACTO del JSON del backend (nombres en español incluidos).
 * Nunca sale de la capa de datos; el mapper lo convierte a entidades.
 *
 * Los numéricos se tipan `number | null` aunque el ejemplo no traiga nulls:
 * el backend no es nuestro y así TypeScript obliga al mapper a contemplarlo.
 * Ojo semántico: además de nulls, el backend usa `0` como "sin dato"
 * (ej. `ultimoCierre: 0` en ALUA, `tasaCompra: 0` en acciones).
 */
export interface AssetPriceDto {
  readonly symbol: string;
  readonly description: string;
  readonly market: string;
  readonly currency: string;
  readonly variacionDiaria: number | null;
  readonly ultimoPrecio: number | null;
  readonly ultimoCierre: number | null;
  readonly apertura: number | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly volumenOperado: number | null;
  readonly cantidadOperada: number | null;
  readonly montoOperado: number | null;
  readonly cantidadCompra: number | null;
  readonly cantidadVenta: number | null;
  readonly precioCompra: number | null;
  readonly precioVenta: number | null;
  readonly tasaCompra: number | null;
  readonly tasaVenta: number | null;
  readonly tir: number | null;
  /** Fecha de vencimiento (renta fija). `null` en acciones. */
  readonly maturityDate: string | null;
}

export interface AssetPricesResponseDto {
  readonly assetPrices: readonly AssetPriceDto[];
}

const NUMERIC_FIELDS = [
  'variacionDiaria',
  'ultimoPrecio',
  'ultimoCierre',
  'apertura',
  'min',
  'max',
  'volumenOperado',
  'cantidadOperada',
  'montoOperado',
  'cantidadCompra',
  'cantidadVenta',
  'precioCompra',
  'precioVenta',
  'tasaCompra',
  'tasaVenta',
  'tir',
] as const satisfies readonly (keyof AssetPriceDto)[];

const STRING_FIELDS = [
  'symbol',
  'description',
  'market',
  'currency',
] as const satisfies readonly (keyof AssetPriceDto)[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumberOrNullish = (value: unknown): boolean =>
  value === null || value === undefined || typeof value === 'number';

/**
 * Type guard en el borde: el JSON llega como `unknown` y solo después de
 * validarlo lo tratamos como DTO. Campos ausentes se aceptan (el mapper los
 * trata como null); tipos incorrectos invalidan el item.
 */
export const isAssetPriceDto = (value: unknown): value is AssetPriceDto => {
  if (!isRecord(value)) {
    return false;
  }
  const hasIdentity = STRING_FIELDS.every(
    field => typeof value[field] === 'string' && value[field] !== '',
  );
  const numericOk = NUMERIC_FIELDS.every(field => isNumberOrNullish(value[field]));
  const maturity = value.maturityDate;
  const maturityOk =
    maturity === null || maturity === undefined || typeof maturity === 'string';
  return hasIdentity && numericOk && maturityOk;
};

export const isAssetPricesResponse = (
  value: unknown,
): value is { assetPrices: readonly unknown[] } =>
  isRecord(value) && Array.isArray(value.assetPrices);
