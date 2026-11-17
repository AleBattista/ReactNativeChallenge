import type { DomainError } from './DomainError';

/**
 * Los repositorios nunca lanzan excepciones hacia arriba: devuelven un Result.
 * Esto obliga a la capa de presentación a manejar explícitamente el caso de error.
 */
export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
