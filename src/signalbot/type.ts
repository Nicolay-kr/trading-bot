export type TradeSignal = {
  symbol: string;            // e.g. "SOLUSDT"
  side: "Buy" | "Sell";      // "Buy" for long, "Sell" for short
  entryZone: [number, number]; // [upper, lower] entry zone
  stopLoss: number;          // stop-loss level
  takeProfits: number[];     // array of take-profit levels
};