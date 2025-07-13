import "dotenv/config";
const { RestClientV5 } = require("bybit-api");
import { TradeSignal } from "../type";

const ONE_DEAL_RISK = 10;

const client = new RestClientV5({
  testnet: false,
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
  recv_window: 10000,
  enableTimeSync: true,
});

export async function syncTimeWithBybit(
  client: InstanceType<typeof RestClientV5>
): Promise<void> {
  try {
    const serverTimeRes = await client.getServerTime();
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

function calculateQtyAndLeverage({
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

export async function placeBybitOrder({
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
  try {
    const response = await client.submitOrder({
      category,
      symbol,
      side,
      orderType,
      qty,
      ...(price ? { price } : {}),
      ...(stopLoss ? { stopLoss } : {}),
      ...(takeProfit ? { takeProfit } : {}),
      ...(tpslMode ? { tpslMode } : {}),
    });

    console.log("placeBybitOrder result: ", response);
    return response;
  } catch (error) {
    console.error("placeBybitOrder error", error);
    throw error;
  }
}

export async function setBybitLeverage({
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
  try {
    const response = await client.setLeverage({
      category,
      symbol,
      buyLeverage,
      sellLeverage,
    });

    console.log("setBybitLeverage result", response);
    return response;
  } catch (error) {
    console.error("setBybitLeverage error", error);
    throw error;
  }
}

const setBybitSetTradingStop = async ({
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
}): Promise<any> => {
  try {
    const response = await client.setTradingStop({
      category,
      symbol,
      tpslMode,
      positionIdx,
      ...(takeProfit? {takeProfit} : {}),
      ...(stopLoss? {stopLoss} : {}),
      ...(tpSize? {tpSize} : {}),
      ...(slSize? {slSize} : {}),
      ...(tpLimitPrice? {tpLimitPrice} : {}),
      ...(tpOrderType? {tpOrderType} : {}),
    });

    console.log("setBybitSetTradingStop result", response);
    return response;
  } catch (error) {
    console.error("setBybitSetTradingStop error", error);
    throw error;
  }
};

export async function getCurrentPrice({
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
    const response = await client.getMarkPriceKline({
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

    const closePrice = parseFloat(response.result.list[0][4]); // close price from latest candle
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

const getEntryPrice = (
  currentPrice: number,
  entryZone: number[],
  side: string
): number => {
  if (side === "Buy") {
    const [upper] = entryZone;
    return currentPrice > upper ? upper : currentPrice;
  }
  const [lower] = entryZone;
  return currentPrice < lower ? lower : currentPrice;
};

export const createBybitOrder = async (tradeSignal: TradeSignal) => {
  const { symbol, side, entryZone, stopLoss, takeProfits } = tradeSignal;

  try {
    await syncTimeWithBybit(client);
    const currentPrice = await getCurrentPrice({ symbol });
    const entryPrice = getEntryPrice(currentPrice, entryZone, side);
    const { qty, leverage } = await calculateQtyAndLeverage({
      entryPrice,
      stopLoss: tradeSignal.stopLoss,
      oneDealRisk: ONE_DEAL_RISK,
    });

    await setBybitLeverage({
      symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString(),
    });

    const isMarketPrice = currentPrice === entryPrice;

    const orderResult = await placeBybitOrder({
      symbol,
      side,
      orderType: isMarketPrice ? "Market" : "Limit",
      qty: qty.toString(),
      price: isMarketPrice ? undefined : entryPrice.toString(),
      stopLoss: stopLoss.toString(),
      tpslMode: "Full",
    });

      // const partialQty = (qty / 3).toFixed(1);

      // await setBybitSetTradingStop({
      //   symbol,
      //   tpslMode: "Partial",
      //   takeProfit: '152.5',
      //   tpSize: partialQty.toString(),
      //   tpOrderType: "Limit",
      //   tpLimitPrice: '152.4',
      // });

    return orderResult;
  } catch (error) {
    console.error("createBybitOrder error", error);
    throw error;
  }
};

// const parsedSignal: TradeSignal = {
//   symbol: "SOLUSDT",
//   side: "Buy",
//   entryZone: [150.5, 149.5],
//   stopLoss: 147,
//   takeProfits: [152.5, 154.5, 156.5],
// };

// const run = async () => {
//   await syncTimeWithBybit(client);
//   await createBybitOrder(parsedSignal);
// };

// run();
