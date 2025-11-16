import { TradeSignal } from "../signalbot/type";

export abstract class ExchangeClient {
  public oneDealRisk: number;

  constructor(oneDealRisk: number) {
    this.oneDealRisk = oneDealRisk;
  }

  syncTimeWithExchange?(): Promise<void>;

  abstract cancelOrder(params: any): Promise<any>;
  abstract cancelAllOrders(params?: any): Promise<any>;
  abstract placeOrder(params: any): Promise<any>;

  abstract getCurrentPrice?(params: { symbol: string }): Promise<any>;

  abstract createOrder(tradeSignal: TradeSignal): Promise<any>;
  
  public getEntryPrice(
    currentPrice: number,
    entryZone: number[],
    side: string
  ): number {
    if (side === "Buy") {
      const [upper] = entryZone;
      return currentPrice > upper ? upper : currentPrice;
    }
    const [lower] = entryZone;
    return currentPrice < lower ? lower : currentPrice;
  }
}
