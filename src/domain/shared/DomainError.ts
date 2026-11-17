export type DomainErrorCode =
  | 'NETWORK'
  | 'INVALID_DATA'
  | 'NOT_FOUND'
  | 'INVALID_ORDER'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_POSITION'
  | 'UNKNOWN';

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  /** Error original (para logging). Nunca se muestra al usuario. */
  readonly cause?: unknown;
}

export const domainError = (
  code: DomainErrorCode,
  message: string,
  cause?: unknown,
): DomainError => ({ code, message, cause });
