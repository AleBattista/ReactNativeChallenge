import type { Listener, Result, Unsubscribe } from '../../shared';
import type { Portfolio } from '../entities/Portfolio';

export interface PortfolioRepository {
  getPortfolio(): Promise<Result<Portfolio>>;
  /** Notifica cambios de tenencia (ej. tras ejecutarse una orden). */
  subscribe(listener: Listener): Unsubscribe;
}
