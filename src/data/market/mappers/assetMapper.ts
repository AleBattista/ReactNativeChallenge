import {
  finiteOrNull,
  nonNegativeOrZero,
  percentChange,
  positiveOrNull,
} from '../../../core/utils/numbers';
import type { Asset, AssetInfo, Quote } from '../../../domain/market';
import { isCurrency, type IsoDate, type Timestamp } from '../../../domain/shared';
import {
  isAssetPriceDto,
  isAssetPricesResponse,
  type AssetPriceDto,
} from '../dto/AssetPriceDto';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

const toIsoDate = (raw: string | null | undefined): IsoDate | null =>
  raw && ISO_DATE.test(raw) ? raw.slice(0, 10) : null;

export const mapAssetInfo = (dto: AssetPriceDto): AssetInfo | null => {
  // Moneda desconocida = no podemos formatear ni operar: se descarta el item.
  if (!isCurrency(dto.currency)) {
    return null;
  }
  const maturityDate = toIsoDate(dto.maturityDate);
  const isFixedIncome = maturityDate !== null || finiteOrNull(dto.tir) !== null;

  return {
    symbol: dto.symbol.trim().toUpperCase(),
    description: dto.description.trim(),
    market: dto.market,
    currency: dto.currency,
    instrumentType: isFixedIncome ? 'FIXED_INCOME' : 'EQUITY',
    maturityDate,
  };
};

export const mapQuote = (
  dto: AssetPriceDto,
  info: Pick<AssetInfo, 'symbol' | 'instrumentType'>,
  now: Timestamp,
): Quote => {
  const lastPrice = positiveOrNull(dto.ultimoPrecio);
  // `ultimoCierre: 0` (caso ALUA) => sin cierre previo, NO un cierre a $0.
  const previousClose = positiveOrNull(dto.ultimoCierre);

  return {
    symbol: info.symbol,
    lastPrice,
    previousClose,
    open: positiveOrNull(dto.apertura),
    dayLow: positiveOrNull(dto.min),
    dayHigh: positiveOrNull(dto.max),
    // Confiamos en la variación del backend; si no viene, la derivamos.
    changePercent:
      finiteOrNull(dto.variacionDiaria) ?? percentChange(lastPrice, previousClose),
    // Cantidades/montos: 0 es legítimo. No "corregimos" inconsistencias del
    // backend (ej. AGRO: volumen 0 con monto > 0); se exponen tal cual llegan.
    volume: nonNegativeOrZero(dto.volumenOperado),
    tradedQuantity: nonNegativeOrZero(dto.cantidadOperada),
    tradedAmount: nonNegativeOrZero(dto.montoOperado),
    bid: {
      price: positiveOrNull(dto.precioCompra),
      quantity: nonNegativeOrZero(dto.cantidadCompra),
    },
    ask: {
      price: positiveOrNull(dto.precioVenta),
      quantity: nonNegativeOrZero(dto.cantidadVenta),
    },
    // En acciones las tasas llegan en 0 y carecen de sentido: no se exponen.
    yield:
      info.instrumentType === 'FIXED_INCOME'
        ? {
            irr: finiteOrNull(dto.tir),
            bidRate: finiteOrNull(dto.tasaCompra),
            askRate: finiteOrNull(dto.tasaVenta),
          }
        : null,
    updatedAt: now,
  };
};

export const mapAsset = (dto: AssetPriceDto, now: Timestamp): Asset | null => {
  const info = mapAssetInfo(dto);
  return info ? { ...info, quote: mapQuote(dto, info, now) } : null;
};

export interface MappedAssetPrices {
  readonly assets: readonly Asset[];
  /** Items descartados por no cumplir el contrato (para logging/monitoreo). */
  readonly rejected: number;
}

/**
 * Punto de entrada desde `unknown`. Devuelve `null` si la ESTRUCTURA general es
 * inválida; items individuales inválidos se descartan sin romper la lista.
 * Ante símbolos duplicados gana el último.
 */
export const mapAssetPricesResponse = (
  raw: unknown,
  now: Timestamp = Date.now(),
): MappedAssetPrices | null => {
  if (!isAssetPricesResponse(raw)) {
    return null;
  }
  const bySymbol = new Map<string, Asset>();
  let rejected = 0;

  for (const item of raw.assetPrices) {
    const asset = isAssetPriceDto(item) ? mapAsset(item, now) : null;
    if (asset) {
      bySymbol.set(asset.symbol, asset);
    } else {
      rejected += 1;
    }
  }
  return { assets: [...bySymbol.values()], rejected };
};
