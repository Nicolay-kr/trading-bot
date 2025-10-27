import "dotenv/config";
import axios from "axios";
import * as crypto from "crypto";

export class BinanceClient {
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor( testnet = true) {
    this.apiKey = process.env.BINANCE_API_KEY!;
    this.apiSecret = process.env.BINANCE_API_SECRET!;
    this.baseURL = testnet
      ? "https://testnet.binancefuture.com" // UM Futures Testnet
      : "https://papi.binance.com"; // Production Portfolio Margin
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

    return axios({
      method,
      url: `${this.baseURL}${path}?${signedQuery}`,
      headers: { "X-MBX-APIKEY": this.apiKey },
    }).then((res) => res.data);
  }

  async placeOrder(symbol: string, side: "BUY" | "SELL", quantity: number) {
    return this.request("POST", "/papi/v1/um/order", {
      symbol,
      side,
      type: "MARKET",
      quantity,
    });
  }

  async cancelAllOrders(symbol: string) {
    return this.request("DELETE", "/papi/v1/um/allOpenOrders", { symbol });
  }

  async cancelOrder(symbol: string, orderId: number) {
    return this.request("DELETE", "/papi/v1/um/order", { symbol, orderId });
  }

  // Query current open orders
  async getOpenOrders(symbol?: string) {
    return this.request("GET", "/papi/v1/um/openOrders", symbol ? { symbol } : {});
  }
}


const client = new BinanceClient(false);

async function run() {
  // Open a BTCUSDT long
  const order = await client.placeOrder("BTCUSDT", "BUY", 0.001);
  console.log("Opened:", order);

  // Cancel that specific order
  const cancelled = await client.cancelOrder("BTCUSDT", order.orderId);
  console.log("Cancelled:", cancelled);

  // Or cancel all open orders for BTCUSDT
  // const allCancelled = await client.closeByCancelAll("BTCUSDT");
  // console.log("All cancelled:", allCancelled);
}

// run();
