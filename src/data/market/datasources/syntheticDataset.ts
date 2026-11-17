import type {
  AssetPriceDto,
  AssetPricesResponseDto,
} from '../dto/AssetPriceDto';
import assetPricesFixture from './fixtures/assetPrices.json';

/** Cantidad mínima por defecto (> 2.000 activos como exige el challenge). */
export const DEFAULT_SYNTHETIC_ASSET_COUNT = 2100;

/**Redondeo financiero a 2 decimales evitando artefactos de punto flotante. */
export const roundPrice = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const MODULUS = 4_294_967_296; // 2^32

/**
 * PRNG determinístico (Generador Congruencial Lineal aritmético, sin bitwise).
 * Permite generar siempre el mismo universo de 2.000+ activos de forma
 * reproducible en tests y entre ejecuciones.
 */
export const createSeededRandom = (seed = 539_409_594): () => number => {
  let state = Math.abs(Math.trunc(seed)) % MODULUS;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % MODULUS;
    return state / MODULUS;
  };
};

/**
 * Genera un sufijo limpio para la serie `seriesIndex` (1-based).
 * Ej.: serie 1 de AGRO -> "AGRO.01", serie 69 -> "AGRO.69".
 */
const formatSeriesSymbol = (baseSymbol: string, seriesIndex: number): string => {
  const padded = String(seriesIndex).padStart(2, '0');
  return `${baseSymbol}.${padded}`;
};

/**
 * Crea una variante coherente de un activo base conservando las relaciones
 * financieras:
 *  - `min <= min(apertura, ultimoPrecio) <= max(apertura, ultimoPrecio) <= max`
 *  - `precioCompra <= precioVenta` manteniendo la proporción de las puntas originales
 *  - `variacionDiaria` lógica dentro de [-5.5%, +5.5%]
 */
const createDerivedAssetDto = (
  base: AssetPriceDto,
  seriesIndex: number,
  random: () => number,
): AssetPriceDto => {
  // Factor de escala entre 0.45x y 2.25x del precio del activo madre
  const scale = 0.45 + random() * 1.8;
  const baseLast = base.ultimoPrecio && base.ultimoPrecio > 0 ? base.ultimoPrecio : 100;
  const lastPrice = Math.max(0.5, roundPrice(baseLast * scale));

  // Variación diaria inicial entre -5.50% y +5.50%
  const changePercent = roundPrice((random() - 0.5) * 11);

  // Precio de apertura cercano al precio de referencia implícito
  const referencePrice = lastPrice / (1 + changePercent / 100);
  const openDrift = 1 + (random() - 0.5) * 0.015;
  const open = Math.max(0.5, roundPrice(referencePrice * openDrift));

  // Rango intradía consistente con apertura y último precio
  const lowBase = Math.min(open, lastPrice);
  const highBase = Math.max(open, lastPrice);
  const min = Math.max(0.1, roundPrice(lowBase * (1 - random() * 0.025)));
  const max = Math.max(highBase, roundPrice(highBase * (1 + random() * 0.025)));

  // Puntas compra/venta proporcionales al activo original
  const bidRatio =
    base.precioCompra && base.ultimoPrecio && base.ultimoPrecio > 0
      ? base.precioCompra / base.ultimoPrecio
      : 0.998;
  const askRatio =
    base.precioVenta && base.ultimoPrecio && base.ultimoPrecio > 0
      ? base.precioVenta / base.ultimoPrecio
      : 1.002;

  const rawBid = roundPrice(lastPrice * bidRatio);
  const rawAsk = roundPrice(lastPrice * askRatio);
  const precioCompra = Math.max(0.1, Math.min(rawBid, rawAsk));
  const precioVenta = Math.max(precioCompra, rawAsk);

  const volumeScale = 0.25 + random() * 2.5;
  const volumenOperado = Math.round((base.volumenOperado ?? 0) * volumeScale);
  const cantidadOperada = Math.round((base.cantidadOperada ?? 0) * volumeScale);
  const montoOperado = roundPrice(
    cantidadOperada > 0
      ? cantidadOperada * lastPrice
      : (base.montoOperado ?? 0) * scale * volumeScale,
  );

  const cantidadCompra = Math.max(1, Math.round((base.cantidadCompra ?? 100) * volumeScale));
  const cantidadVenta = Math.max(1, Math.round((base.cantidadVenta ?? 100) * volumeScale));

  return {
    ...base,
    symbol: formatSeriesSymbol(base.symbol, seriesIndex),
    description: `${base.description} · Serie ${String(seriesIndex).padStart(2, '0')}`,
    variacionDiaria: changePercent,
    ultimoPrecio: lastPrice,
    // Respetamos el comportamiento real del feed donde muchos cierres vienen en 0
    ultimoCierre: base.ultimoCierre && base.ultimoCierre > 0 ? roundPrice(referencePrice) : 0,
    apertura: open,
    min,
    max,
    volumenOperado,
    cantidadOperada,
    montoOperado,
    cantidadCompra,
    cantidadVenta,
    precioCompra,
    precioVenta,
  };
};

/**
 * Multiplica algorítmicamente los 30 activos base hasta alcanzar `targetCount`
 * (por defecto 2.100 ítems). Los primeros N elementos son exactamente los del
 * fixture base sin alterar.
 */
export const buildSyntheticAssetPricesResponse = (
  baseResponse: AssetPricesResponseDto = assetPricesFixture,
  targetCount: number = DEFAULT_SYNTHETIC_ASSET_COUNT,
  seed?: number,
): AssetPricesResponseDto => {
  const baseItems = baseResponse.assetPrices;
  if (baseItems.length === 0 || targetCount <= baseItems.length) {
    return { assetPrices: baseItems.slice(0, Math.max(0, targetCount)) };
  }

  const random = createSeededRandom(seed);
  const result: AssetPriceDto[] = [...baseItems];

  let seriesIndex = 1;
  while (result.length < targetCount) {
    for (const base of baseItems) {
      if (result.length >= targetCount) {
        break;
      }
      result.push(createDerivedAssetDto(base, seriesIndex, random));
    }
    seriesIndex += 1;
  }

  return { assetPrices: result };
};

let cachedDefaultSyntheticDataset: AssetPricesResponseDto | null = null;

/** Devuelve el dataset sintético por defecto (2.100 activos) cacheado en memoria. */
export const getDefaultSyntheticAssetPrices = (): AssetPricesResponseDto => {
  if (!cachedDefaultSyntheticDataset) {
    cachedDefaultSyntheticDataset = buildSyntheticAssetPricesResponse();
  }
  return cachedDefaultSyntheticDataset;
};
