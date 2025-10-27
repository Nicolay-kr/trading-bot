import "dotenv/config";
import axios from "axios";
import * as crypto from "crypto";
import { ExchangeClient } from "../ExchangeClient";
import { TradeSignal } from "../../signalbot/type";

export class BinanceClient implements ExchangeClient {
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;
  public oneDealRisk: number;
  public config: { oneDealRisk: number; testnet: boolean };

  constructor(config: { oneDealRisk: number; testnet: boolean }) {
    this.oneDealRisk = config.oneDealRisk;
    this.apiKey = process.env.BINANCE_API_KEY!;
    this.apiSecret = process.env.BINANCE_API_SECRET!;
    this.baseURL = config.testnet
      ? "https://testnet.binancefuture.com"
      : "https://papi.binance.com";
  }

  private signQuery(params: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(query)
      .digest("hex");
    return `${query}&signature=${signature}`;
  }

  private async request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, any> = {}
  ) {
    const timestamp = Date.now();
    const signedQuery = this.signQuery({ ...params, timestamp });

    const response = await axios({
      method,
      url: `${this.baseURL}${path}?${signedQuery}`,
      headers: { "X-MBX-APIKEY": this.apiKey },
    });

    return response.data;
  }

  async placeOrder({
    symbol,
    side,
    quantity,
  }: {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
  }): Promise<any> {
    return this.request("POST", "/papi/v1/um/order", {
      symbol,
      side,
      type: "MARKET",
      quantity,
    });
  }

  async setLeverage(leverage: any): Promise<any> {} // need to implement

  async createOrder(tradeSignal: TradeSignal): Promise<any> {
    const { symbol, side: signalSide, entryZone, stopLoss } = tradeSignal;
    const side = signalSide === "Buy" ? "BUY" : "SELL";
    const { qty, leverage } = this.calculateQtyAndLeverage({
      entryPrice: entryZone[0],
      stopLoss,
      oneDealRisk: this.oneDealRisk,
    });

    this.setLeverage(leverage);
    return this.placeOrder({ symbol, side, quantity: qty });
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

  async cancelAllOrders(symbol: string) {
    return this.request("DELETE", "/papi/v1/um/allOpenOrders", { symbol });
  }

  async cancelOrder({ symbol, orderId }: { symbol: string; orderId: number }) {
    return this.request("DELETE", "/papi/v1/um/order", { symbol, orderId });
  }

  async getOpenOrders(symbol?: string) {
    return this.request(
      "GET",
      "/papi/v1/um/openOrders",
      symbol ? { symbol } : {}
    );
  }
}
