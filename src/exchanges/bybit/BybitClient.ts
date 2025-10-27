import "dotenv/config";
const { RestClientV5 } = require("bybit-api");
import { ExchangeClient } from "../ExchangeClient";
import { TradeSignal } from "../../signalbot/type";

export class BybitClient implements ExchangeClient {
  private client: InstanceType<typeof RestClientV5>;
  public oneDealRisk: number;
  public config: { oneDealRisk: number; testnet: boolean };

  constructor(config: { oneDealRisk: number; testnet: boolean }) {
    this.oneDealRisk = config.oneDealRisk;
    this.client = new RestClientV5({
      testnet: config.testnet,
      key: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_API_SECRET,
      recv_window: 10000,
      enableTimeSync: true,
    });
  }

  async syncTimeWithExchange(): Promise<void> {
    try {
      const serverTimeRes = await this.client.getServerTime();
      const drift = serverTimeRes.time - Date.now();
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + drift;
      console.log(`Time synced with Bybit (drift: ${drift}ms)`);
    } catch (error) {
      console.error("Failed to sync time with Bybit:", error);
      throw error;
    }
  }

  public calculateQtyAndLeverage({
    entryPrice,
    stopLoss,
    oneDealRisk,
  }: {
    entryPrice: number;
    stopLoss: number;
    oneDealRisk: number;
  }): { qty: number; leverage: number } {
    const stopLossPercent = Math.abs((entryPrice - stopLoss) / entryPrice);
    if (stopLossPercent <= 0)
      throw new Error("Invalid stop loss or entry price");
    const leverage = 1 / stopLossPercent;
    const positionSize = (leverage * oneDealRisk) / entryPrice;
    return {
      qty: Number(positionSize.toFixed(1)),
      leverage: Math.round(leverage),
    };
  }

  async cancelOrder({
    category = "linear",
    symbol,
    orderId,
  }: any): Promise<any> {
    try {
      await this.syncTimeWithExchange();
      const response = await this.client.cancelOrder({
        category,
        symbol,
        orderId,
      });
      console.log("cancelOrder result:", response);
      return response;
    } catch (error) {
      console.error("cancelOrder error", error);
      throw error;
    }
  }

  async cancelAllOrders({
    category = "linear",
    settleCoin = "USDT",
  }: any = {}): Promise<any> {
    try {
      await this.syncTimeWithExchange();
      const response = await this.client.cancelAllOrders({
        category,
        settleCoin,
      });
      console.log("cancelAllOrders result:", response);
      return response;
    } catch (error) {
      console.error("cancelAllOrders error", error);
      throw error;
    }
  }

  async placeOrder({
    category = "linear",
    symbol,
    side,
    orderType,
    qty,
    price,
    stopLoss,
    takeProfit,
    tpslMode = "Full",
  }: any): Promise<any> {
    const parameters: any = {
      category,
      symbol,
      side,
      orderType,
      qty,
      ...(price ? { price } : {}),
      ...(stopLoss ? { stopLoss } : {}),
      ...(takeProfit ? { takeProfit } : {}),
      ...(tpslMode ? { tpslMode } : {}),
    };

    console.log("placeOrder parameters:", parameters);

    try {
      const response = await this.client.submitOrder(parameters);
      console.log("placeOrder result:", response);
      return response;
    } catch (error) {
      console.error("placeOrder error", error);
      throw error;
    }
  }

  async getCurrentPrice({
    symbol,
    category = "linear",
    interval = "1",
  }: any): Promise<number> {
    try {
      const response = await this.client.getMarkPriceKline({
        category,
        symbol,
        interval,
        end: Date.now(),
        limit: 1,
      });

      const closePrice = parseFloat(response?.result?.list?.[0]?.[4]);
      if (!closePrice) throw new Error(`No valid price data for ${symbol}`);
      console.log(`Current ${symbol} price: ${closePrice}`);
      return closePrice;
    } catch (error) {
      console.error("getCurrentPrice error:", error);
      throw error;
    }
  }

  static getEntryPrice(
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

  async createOrder(tradeSignal: TradeSignal) {
    const { symbol, side, entryZone, stopLoss } = tradeSignal;
    console.log("Creating Bybit order with signal:", tradeSignal);

    try {
      await this.syncTimeWithExchange();
      const currentPrice = await this.getCurrentPrice({ symbol });
      const entryPrice = BybitClient.getEntryPrice(
        currentPrice,
        entryZone,
        side
      );
      const { qty, leverage } = this.calculateQtyAndLeverage({
        entryPrice,
        stopLoss,
        oneDealRisk: this.oneDealRisk,
      });
      console.log('leverage', leverage);
      
      await this.client.setLeverage({
        category: "linear",
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      });

      const orderType = currentPrice === entryPrice ? "Market" : "Limit";
      const order = await this.placeOrder({
        symbol,
        side,
        orderType,
        qty: qty.toString(),
        price: orderType === "Limit" ? entryPrice.toString() : undefined,
        stopLoss: stopLoss.toString(),
      });

      return order;
    } catch (error) {
      console.error("createOrder error", error);
      throw error;
    }
  }
}
