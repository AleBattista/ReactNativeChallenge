import type { Result } from '../../shared';
import type { Order, OrderId, OrderRequest } from '../entities/Order';

export interface OrderRepository {
  placeOrder(request: OrderRequest): Promise<Result<Order>>;
  getOrders(): Promise<Result<readonly Order[]>>;
  getOrder(id: OrderId): Promise<Result<Order>>;
  cancelOrder(id: OrderId): Promise<Result<Order>>;
}
