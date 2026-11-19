import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ticker } from '../../domain/shared';
import { createPersistedStorage } from './storage';

/** Saldo inicial estricto: $1,000,000 ARS. */
export const INITIAL_CASH_BALANCE = 1_000_000;

/** Redondeo monetario a 2 decimales para evitar errores de punto flotante. */
export const roundCurrency = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

export interface PortfolioHolding {
  readonly ticker: Ticker;
  readonly quantity: number;
  readonly averagePrice: number;
}

export type PortfolioTransactionErrorCode =
  | 'INVALID_PARAMETERS'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_POSITION';

export type PortfolioTransactionResult =
  | {
      readonly ok: true;
      readonly cashBalance: number;
      readonly holding: PortfolioHolding | null;
      readonly totalAmount: number;
    }
  | {
      readonly ok: false;
      readonly code: PortfolioTransactionErrorCode;
      readonly message: string;
    };

interface PortfolioPersistedState {
  readonly cashBalance: number;
  readonly holdings: readonly PortfolioHolding[];
}

export interface PortfolioStoreState extends PortfolioPersistedState {
  /** Indica si el store ya terminó de rehidratarse desde AsyncStorage. */
  readonly hasHydrated: boolean;
  /** Actualiza el flag de hidratación al finalizar `onRehydrateStorage`. */
  readonly setHasHydrated: (hydrated: boolean) => void;
  /** Obtiene la tenencia actual de un activo (si existe). */
  readonly getHolding: (ticker: Ticker) => PortfolioHolding | undefined;
  /** Verifica sin mutar si el saldo disponible alcanza para la compra. */
  readonly canAffordBuy: (quantity: number, unitPrice: number) => boolean;
  /** Verifica sin mutar si existen suficientes nominales para vender. */
  readonly hasSufficientHoldings: (ticker: Ticker, quantity: number) => boolean;
  /**
   * Ejecuta una compra de forma transaccional y atómica:
   *  - Valida que `cashBalance >= quantity * unitPrice`.
   *  - Debita `cashBalance` y recalcula el precio promedio ponderado (`averagePrice`).
   */
  readonly executeBuy: (
    ticker: Ticker,
    quantity: number,
    unitPrice: number,
    totalWithFees?: number,
  ) => PortfolioTransactionResult;
  /**
   * Ejecuta una venta de forma transaccional y atómica:
   *  - Valida que el usuario posea al menos `quantity` nominales del activo.
   *  - Acredita el producido en `cashBalance` y descuenta las unidades vendidas.
   */
  readonly executeSell: (
    ticker: Ticker,
    quantity: number,
    unitPrice: number,
    netTotalAfterFees?: number,
  ) => PortfolioTransactionResult;
  /** Restaura la cuenta al estado inicial ($1,000,000 ARS y sin tenencias). */
  readonly resetPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioStoreState>()(
  persist(
    (set, get) => ({
      cashBalance: INITIAL_CASH_BALANCE,
      holdings: [],
      hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      getHolding: (ticker: Ticker) => {
        const normalized = ticker.trim().toUpperCase();
        return get().holdings.find(item => item.ticker === normalized);
      },

      canAffordBuy: (quantity: number, unitPrice: number) => {
        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          return false;
        }
        if (quantity <= 0 || unitPrice <= 0) {
          return false;
        }
        const totalAmount = roundCurrency(quantity * unitPrice);
        return get().cashBalance >= totalAmount;
      },

      hasSufficientHoldings: (ticker: Ticker, quantity: number) => {
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return false;
        }
        const holding = get().getHolding(ticker);
        return holding !== undefined && holding.quantity >= quantity;
      },

      executeBuy: (
        ticker: Ticker,
        quantity: number,
        unitPrice: number,
        totalWithFees?: number,
      ) => {
        const normalizedTicker = ticker.trim().toUpperCase();
        if (
          !normalizedTicker ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(unitPrice) ||
          quantity <= 0 ||
          unitPrice <= 0
        ) {
          return {
            ok: false,
            code: 'INVALID_PARAMETERS',
            message: 'La cantidad y el precio deben ser mayores a cero.',
          };
        }

        const grossAmount = roundCurrency(quantity * unitPrice);
        const totalAmount =
          totalWithFees !== undefined && Number.isFinite(totalWithFees) && totalWithFees > 0
            ? roundCurrency(totalWithFees)
            : grossAmount;
        let outcome: PortfolioTransactionResult = {
          ok: false,
          code: 'INSUFFICIENT_FUNDS',
          message: 'Saldo insuficiente para completar la compra.',
        };

        // Transacción atómica dentro de `set`
        set(state => {
          if (state.cashBalance < totalAmount) {
            outcome = {
              ok: false,
              code: 'INSUFFICIENT_FUNDS',
              message: `Saldo insuficiente. Disponible: $ ${state.cashBalance.toFixed(2)}, requerido: $ ${totalAmount.toFixed(2)}.`,
            };
            return state;
          }

          const nextCashBalance = roundCurrency(state.cashBalance - totalAmount);
          const existingIndex = state.holdings.findIndex(
            h => h.ticker === normalizedTicker,
          );

          let updatedHolding: PortfolioHolding;
          let nextHoldings: PortfolioHolding[];

          if (existingIndex >= 0) {
            const current = state.holdings[existingIndex]!;
            const nextQuantity = current.quantity + quantity;
            const totalCost =
              current.quantity * current.averagePrice + grossAmount;
            updatedHolding = {
              ticker: normalizedTicker,
              quantity: nextQuantity,
              averagePrice: roundCurrency(totalCost / nextQuantity),
            };
            nextHoldings = state.holdings.map((item, idx) =>
              idx === existingIndex ? updatedHolding : item,
            );
          } else {
            updatedHolding = {
              ticker: normalizedTicker,
              quantity,
              averagePrice: roundCurrency(unitPrice),
            };
            nextHoldings = [...state.holdings, updatedHolding];
          }

          outcome = {
            ok: true,
            cashBalance: nextCashBalance,
            holding: updatedHolding,
            totalAmount,
          };

          return {
            cashBalance: nextCashBalance,
            holdings: nextHoldings,
          };
        });

        return outcome;
      },

      executeSell: (
        ticker: Ticker,
        quantity: number,
        unitPrice: number,
        netTotalAfterFees?: number,
      ) => {
        const normalizedTicker = ticker.trim().toUpperCase();
        if (
          !normalizedTicker ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(unitPrice) ||
          quantity <= 0 ||
          unitPrice <= 0
        ) {
          return {
            ok: false,
            code: 'INVALID_PARAMETERS',
            message: 'La cantidad y el precio deben ser mayores a cero.',
          };
        }

        const grossAmount = roundCurrency(quantity * unitPrice);
        const totalAmount =
          netTotalAfterFees !== undefined &&
          Number.isFinite(netTotalAfterFees) &&
          netTotalAfterFees >= 0
            ? roundCurrency(netTotalAfterFees)
            : grossAmount;
        let outcome: PortfolioTransactionResult = {
          ok: false,
          code: 'INSUFFICIENT_POSITION',
          message: 'Tenencia insuficiente para realizar la venta.',
        };

        // Transacción atómica dentro de `set`
        set(state => {
          const existingIndex = state.holdings.findIndex(
            h => h.ticker === normalizedTicker,
          );
          const existing =
            existingIndex >= 0 ? state.holdings[existingIndex] : undefined;

          if (!existing || existing.quantity < quantity) {
            const availableQty = existing?.quantity ?? 0;
            outcome = {
              ok: false,
              code: 'INSUFFICIENT_POSITION',
              message: `Tenencia insuficiente de ${normalizedTicker}. Disponible: ${availableQty}, solicitado: ${quantity}.`,
            };
            return state;
          }

          const nextCashBalance = roundCurrency(state.cashBalance + totalAmount);
          const remainingQty = existing.quantity - quantity;

          let updatedHolding: PortfolioHolding | null = null;
          let nextHoldings: PortfolioHolding[];

          if (remainingQty === 0) {
            nextHoldings = state.holdings.filter(
              (_, idx) => idx !== existingIndex,
            );
          } else {
            updatedHolding = {
              ticker: normalizedTicker,
              quantity: remainingQty,
              // Al vender se conserva el precio promedio de compra histórico
              averagePrice: existing.averagePrice,
            };
            nextHoldings = state.holdings.map((item, idx) =>
              idx === existingIndex ? updatedHolding! : item,
            );
          }

          outcome = {
            ok: true,
            cashBalance: nextCashBalance,
            holding: updatedHolding,
            totalAmount,
          };

          return {
            cashBalance: nextCashBalance,
            holdings: nextHoldings,
          };
        });

        return outcome;
      },

      resetPortfolio: () => {
        set({
          cashBalance: INITIAL_CASH_BALANCE,
          holdings: [],
        });
      },
    }),
    {
      name: 'challenge:portfolio-store',
      storage: createPersistedStorage<PortfolioPersistedState>(),
      partialize: state => ({
        cashBalance: state.cashBalance,
        holdings: state.holdings,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          usePortfolioStore.setState({ hasHydrated: true });
        }
      },
    },
  ),
);
