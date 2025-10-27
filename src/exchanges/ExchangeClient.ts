import { TradeSignal } from "../signalbot/type";

export interface ExchangeClient {
  oneDealRisk: number;
  syncTimeWithExchange?(): Promise<void>;
  cancelOrder(params: any): Promise<any>;
  cancelAllOrders(params?: any): Promise<any>;
  placeOrder(params: any): Promise<any>;
  getCurrentPrice?(params: { symbol: string }): Promise<number>;
  createOrder(tradeSignal: TradeSignal): Promise<any>;
}