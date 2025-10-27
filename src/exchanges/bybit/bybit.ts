import "dotenv/config";
const { RestClientV5 } = require("bybit-api");
import { TradeSignal } from "../../signalbot/type";

const ONE_DEAL_RISK = 50;

export class BybitClient {
  private client: InstanceType<typeof RestClientV5>;

  constructor() {
    this.client = new RestClientV5({
      testnet: false,
      key: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_API_SECRET,
      recv_window: 10000,
      enableTimeSync: true,
    });
  }

  async syncTimeWithBybit(): Promise<void> {
    try {
      const serverTimeRes = await this.client.getServerTime();
      const serverTimestamp = serverTimeRes.time;
      const localTimestamp = Date.now();
      const drift = serverTimestamp - localTimestamp;

      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + drift;

      console.log(`Time synced with Bybit. Drift: ${drift}ms`);
    } catch (error) {
      console.error("Failed to sync time with Bybit:", error);
      throw error;
    }
  }

  static calculateQtyAndLeverage({
    entryPrice,
    stopLoss,
    oneDealRisk,
  }: {
    entryPrice: number;
    stopLoss: number;
    oneDealRisk: number;
  }): { qty: number; leverage: number } {
    const stopLossPercent = Math.abs((entryPrice - stopLoss) / entryPrice);

    if (stopLossPercent <= 0) {
      throw new Error("Invalid stop loss or entry price");
    }

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
  }: {
    category: "linear" | "inverse" | "spot";
    symbol: string;
    orderId: string;
  }): Promise<any> {
    try {
      await this.syncTimeWithBybit();
      const response = await this.client.cancelOrder({
        category,
        symbol,
        orderId,
      });

      console.log("cancelOrder result: ", response);
      return response;
    } catch (error) {
      console.error("cancelOrder error", error);
      throw error;
    }
  }

  async cancelAllOrders(
    {
      category,
      settleCoin,
    }: {
      category?: "linear" | "inverse" | "spot";
      settleCoin?: string;
    } = { category: "linear", settleCoin: "USDT" }
  ): Promise<any> {
    try {
      await this.syncTimeWithBybit();
      const response = await this.client.cancelAllOrders({
        category,
        settleCoin,
      });

      console.log("cancelAllOrders result: ", response);
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
  }: {
    category?: "spot" | "linear";
    symbol: string;
    side: "Buy" | "Sell";
    orderType: "Market" | "Limit";
    qty: string;
    price?: string;
    stopLoss?: string;
    takeProfit?: string;
    tpslMode?: "Full" | "Partial";
  }): Promise<any> {
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

    console.log("placeOrder parameters: ", parameters);

    try {
      const response = await this.client.submitOrder(parameters);

      console.log("placeOrder result: ", response);
      return response;
    } catch (error) {
      console.error("placeOrder error", error);
      throw error;
    }
  }

  async setBybitLeverage({
    category = "linear",
    symbol,
    buyLeverage,
    sellLeverage,
  }: {
    category?: "linear" | "inverse";
    symbol: string;
    buyLeverage: string;
    sellLeverage: string;
  }): Promise<any> {
    const parameters: any = {
      category,
      symbol,
      buyLeverage,
      sellLeverage,
    };

    console.log("setBybitLeverage parameters: ", parameters);

    try {
      const response = await this.client.setLeverage(parameters);

      console.log("setBybitLeverage result", response);
      return response;
    } catch (error) {
      console.error("setBybitLeverage error", error);
      throw error;
    }
  }

  async setBybitSetTradingStop({
    category = "linear",
    symbol,
    takeProfit,
    stopLoss,
    tpslMode = "Partial",
    positionIdx = 0,
    tpSize,
    slSize,
    tpLimitPrice,
    tpOrderType,
  }: {
    category?: "linear" | "inverse";
    symbol: string;
    takeProfit?: string;
    stopLoss?: string;
    tpslMode?: "Full" | "Partial";
    positionIdx?: number;
    tpSize?: string;
    slSize?: string;
    tpOrderType?: "Market" | "Limit";
    tpLimitPrice?: string;
  }): Promise<any> {
    try {
      const response = await this.client.setTradingStop({
        category,
        symbol,
        tpslMode,
        positionIdx,
        ...(takeProfit ? { takeProfit } : {}),
        ...(stopLoss ? { stopLoss } : {}),
        ...(tpSize ? { tpSize } : {}),
        ...(slSize ? { slSize } : {}),
        ...(tpLimitPrice ? { tpLimitPrice } : {}),
        ...(tpOrderType ? { tpOrderType } : {}),
      });

      console.log("setBybitSetTradingStop result", response);
      return response;
    } catch (error) {
      console.error("setBybitSetTradingStop error", error);
      throw error;
    }
  }

  async getCurrentPrice({
    symbol,
    category = "linear",
    interval = "1",
  }: {
    symbol: string;
    category?: "linear" | "inverse" | "spot";
    interval?:
      | "1"
      | "3"
      | "5"
      | "15"
      | "30"
      | "60"
      | "120"
      | "240"
      | "360"
      | "720"
      | "D"
      | "M"
      | "W";
  }): Promise<number> {
    try {
      const now = Date.now();
      const response = await this.client.getMarkPriceKline({
        category,
        symbol,
        interval,
        end: now,
        limit: 1,
      });

      if (
        response.retCode !== 0 ||
        !response.result?.list?.length ||
        !response.result.list[0][4]
      ) {
        throw new Error(`No valid price data for ${symbol}`);
      }

      const closePrice = parseFloat(response.result.list[0][4]);
      console.log(`getCurrentPrice: Close price for ${symbol}:`, closePrice);
      return closePrice;
    } catch (error) {
      console.error(
        `getCurrentPrice: Failed to get current price for ${symbol}`,
        error
      );
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
    console.log("createOrder with signal:", tradeSignal);

    try {
      await this.syncTimeWithBybit();
      const currentPrice = await this.getCurrentPrice({ symbol });
      const entryPrice = BybitClient.getEntryPrice(currentPrice, entryZone, side);
      const { qty, leverage } = BybitClient.calculateQtyAndLeverage({
        entryPrice,
        stopLoss: tradeSignal.stopLoss,
        oneDealRisk: ONE_DEAL_RISK,
      });

      await this.setBybitLeverage({
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      });

      const isMarketPrice = currentPrice === entryPrice;

      const orderResult = await this.placeOrder({
        symbol,
        side,
        orderType: isMarketPrice ? "Market" : "Limit",
        qty: qty.toString(),
        price: isMarketPrice ? undefined : entryPrice.toString(),
        stopLoss: stopLoss.toString(),
        tpslMode: "Full",
      });

      // const partialQty = (qty / 3).toFixed(1);

      // await this.setBybitSetTradingStop({
      //   symbol,
      //   tpslMode: "Partial",
      //   takeProfit: '152.5',
      //   tpSize: partialQty.toString(),
      //   tpOrderType: "Limit",
      //   tpLimitPrice: '152.4',
      // });

      return orderResult;
    } catch (error) {
      console.error("createOrder error", error);
      throw error;
    }
  }
}

// Example usage:
const parsedSignal: TradeSignal = {
  symbol: "XRPUSDT",
  side: "Sell",
  entryZone: [2.86, 2.87],
  stopLoss: 3.2,
  takeProfits: [2.7, 2.6, 2.5],
};

const bybit = new BybitClient();

const run = async () => {
  // await bybit.createOrder(parsedSignal);
  // await bybit.cancelOrder({
  //   category: "linear",
  //   symbol: "XRPUSDT",
  //   orderId: "57a2b0b5-e207-4c3f-93e6-2410f485e586",
  // });
  // await bybit.cancelAllOrders();
};

// run();
