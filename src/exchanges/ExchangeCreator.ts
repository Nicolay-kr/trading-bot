import { ExchangeClient } from "./ExchangeClient";
import { TradeSignal } from "../signalbot/type";

export abstract class ExchangeCreator {
  public abstract factoryMethod(): ExchangeClient;

  public async executeTrade(signal: TradeSignal): Promise<any> {
    const client = this.factoryMethod();
    return await client.createOrder(signal);
  }

  public async cancellAllTrade(): Promise<any> {
    const client = this.factoryMethod();
    return await client.cancelAllOrders() ;
  }
}
