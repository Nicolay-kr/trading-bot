import { ExchangeCreator } from "../ExchangeCreator";
import { ExchangeClient } from "../ExchangeClient";
import { BybitClient } from "./BybitClient";

export class BybitCreator extends ExchangeCreator {
  public config: { oneDealRisk: number; testnet: boolean };
  constructor(config?: { oneDealRisk?: number; testnet?: boolean }) {
    super();
    this.config = {
      oneDealRisk: config?.oneDealRisk ?? 50,
      testnet: config?.testnet ?? false,
    };
  }

  public factoryMethod(): ExchangeClient {
    return new BybitClient(this.config);
  }
}


// const parsedSignal: any = {
//   symbol: "XRPUSDT",
//   side: "Buy",
//   entryZone: [2.685, 2.80],
//   stopLoss: 2.6,
//   takeProfits: [2.69, 2.7, 2.75],
// };

// const bybit = new BybitCreator({ oneDealRisk: 10, testnet: false });

// const run = async () => {
//   await bybit.executeTrade(parsedSignal);

//   await bybit.cancellAllTrade();
// };

// run();