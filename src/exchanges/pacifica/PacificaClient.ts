import "dotenv/config";
import axios from "axios";
import * as nacl from "tweetnacl";
import bs58 from "bs58";
import { ExchangeClient } from "../ExchangeClient";
import { TradeSignal } from "../../signalbot/type";
import { MarketResponse } from "../pacifica/type";

/**
 * Helper to recursively sort JSON keys (like the Python version)
 */
function sortJsonKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  } else if (typeof value === "object" && value !== null) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortJsonKeys(value[key]);
        return acc;
      }, {} as Record<string, any>);
  }
  return value;
}

/**
 * Signs a message using Ed25519, then encodes in base58.
 */
function signMessage(
  header: Record<string, any>,
  payload: Record<string, any>,
  secretKey: Uint8Array
): { message: string; signature: string } {
  if (!header.type || !header.timestamp || !header.expiry_window) {
    throw new Error("Header must have type, timestamp, and expiry_window");
  }

  const dataToSign = {
    ...header,
    data: payload,
  };

  const sortedMessage = sortJsonKeys(dataToSign);

  const message = JSON.stringify(sortedMessage);

  const messageBytes = Buffer.from(message, "utf8");
  const signatureBytes = nacl.sign.detached(messageBytes, secretKey);
  const signature = bs58.encode(signatureBytes);

  return { message, signature };
}

export class PacificaClient extends ExchangeClient {
  public oneDealRisk: number;
  private apiKey: string;
  private apiSecret: string; // base58-encoded Ed25519 private key
  private baseURL: string;
  private account: string;
  private maxLeverage: number = 30;

  constructor(config: { oneDealRisk: number; testnet: boolean }) {
    super(config.oneDealRisk);
    this.oneDealRisk = config.oneDealRisk;
    this.apiKey = process.env.PACIFICA_API_KEY!;
    this.apiSecret = process.env.PACIFICA_PRIVATE_KEY!;
    this.account = process.env.PACIFICA_ACCOUNT!;
    this.baseURL = config.testnet
      ? "https://test-api.pacifica.fi/api/v1"
      : "https://api.pacifica.fi/api/v1";
  }

  private createSignedPayload(
    type: string,
    operationData: Record<string, any>
  ) {
    const timestamp = Date.now();
    const expiry_window = 5000;

    const header = { type, timestamp, expiry_window };
    const secretKeyBytes = bs58.decode(this.apiSecret);

    const { signature } = signMessage(header, operationData, secretKeyBytes);

    return { header, signature, operationData };
  }

  private async post({
    endpoint,
    type,
    operationData,
  }: {
    endpoint: string;
    type: string;
    operationData: Record<string, any>;
  }) {
    const { header, signature, operationData: data } = this.createSignedPayload(
      type,
      operationData
    );

    const requestBody = {
      account: this.account,
      agent_wallet: this.apiKey,
      signature,
      timestamp: header.timestamp,
      expiry_window: header.expiry_window,
      ...data,
    };

    const headers = {
      "Content-Type": "application/json",
      type: type,
    };

    const res = await axios.post(`${this.baseURL}${endpoint}`, requestBody, {
      headers,
    });
    console.log("res.data", res.data);
    return res.data;
  }

  async setLeverage({
    symbol,
    leverage,
  }: {
    symbol: string;
    leverage: number;
  }) {
    return this.post({
      endpoint: "/account/leverage",
      type: "update_leverage",
      operationData: {
        symbol,
        leverage: leverage > this.maxLeverage ? this.maxLeverage : leverage,
      },
    });
  }

  async getCurrentPrice({
    symbol,
  }: {
    symbol: string;
  }): Promise<number | undefined> {
    try {
      const response = await axios.get<MarketResponse>(
        `${this.baseURL}/info/prices`
      );

      const data = response.data?.data;
      const currentPrice = data.find((item) => item.symbol === symbol);

      return Number(currentPrice?.mark);
    } catch (error) {
      console.error(
        `getCurrentPrice: Failed to get current price for ${symbol}`,
        error
      );
      throw error;
    }
  }

  async placeOrder({
    symbol,
    side,
    quantity,
    price,
    takeProfit,
    stopLoss,
  }: {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price?: string;
    takeProfit?: string;
    stopLoss?: string;
  }) {
    const sideMapped = side === "BUY" ? "bid" : "ask";

    const payload: Record<string, any> = {
      symbol,
      side: sideMapped,
      amount: quantity.toString(),
      tif: "GTC",
      reduce_only: false,
      stop_loss: {
        stop_price: stopLoss,
      },
    };

    if (price) {
      payload.price = price;
      return this.post({
        endpoint: "/orders/create",
        type: "create_order",
        operationData: payload,
      });
    } else {
      return this.post({
        endpoint: "/orders/create_market",
        type: "create_market_order",
        operationData: payload,
      });
    }
  }

  async cancelAllOrders(symbol?: string) {
    const body = {
      all_symbols: true,
      symbol: symbol ?? undefined,
      exclude_reduce_only: false,
    };
    return this.post({
      endpoint: "/orders/cancel_all",
      type: "cancel_all_orders",
      operationData: body,
    });
  }

  async cancelOrder({ symbol, orderId }: { symbol: string; orderId: number }) {
    return this.post({
      endpoint: "/orders/cancel-order",
      type: "cancel_order",
      operationData: {
        symbol,
        order_id: orderId,
      },
    });
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
      qty: Number(positionSize.toFixed(3)),
      leverage: Math.round(leverage),
    };
  }

  async createOrder(tradeSignal: TradeSignal) {
    const {
      symbol: rawSymbol,
      side: signalSide,
      entryZone,
      stopLoss,
    } = tradeSignal;
    const side = signalSide === "Buy" ? "BUY" : "SELL";
    const symbol = rawSymbol.match(/^[A-Z]+?(?=USDT$)/)?.[0] ?? rawSymbol;

    const { qty, leverage } = this.calculateQtyAndLeverage({
      entryPrice: entryZone[0],
      stopLoss,
      oneDealRisk: this.oneDealRisk,
    });
    const currentPrice = await this.getCurrentPrice({ symbol });
    const entryPrice = this.getEntryPrice(
      Number(currentPrice),
      entryZone,
      signalSide
    );

    await this.setLeverage({ symbol, leverage });
    const orderType = currentPrice === entryPrice ? "Market" : "Limit";
    return this.placeOrder({
      symbol,
      side,
      quantity: qty,
      price: orderType === "Limit" ? entryPrice.toString() : undefined,
      ...(stopLoss ? { stopLoss: stopLoss.toString() } : {}),
    });
  }
}

// For test:

// const parsedSignal: any = {
//   symbol: "ETHUSDT",
//   side: "Buy",
//   entryZone: [3000, 2800],
//   stopLoss: 2700,
//   takeProfits: [3100, 3200, 3300],
// };

// const pacifica = new PacificaClient({ oneDealRisk: 20, testnet: false });

// const run = async () => {
//   // await pacifica.createOrder(parsedSignal);
//   await pacifica.cancelAllOrders();
// };

// run();
