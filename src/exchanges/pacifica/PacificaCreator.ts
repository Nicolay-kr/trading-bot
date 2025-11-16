import { ExchangeCreator } from "../ExchangeCreator";
import { ExchangeClient } from "../ExchangeClient";
import { PacificaClient } from "./PacificaClient";

export class PacificaCreator extends ExchangeCreator {
  public config: { oneDealRisk: number; testnet: boolean };
  constructor(config: { oneDealRisk?: number; testnet?: boolean }) {
    super();
    this.config = {
      oneDealRisk: config.oneDealRisk ?? 50,
      testnet: config.testnet ?? false,
    };
  }
  public factoryMethod(): ExchangeClient {
    return new PacificaClient(this.config);
  }
}

// const parsedSignal: any = {
//   symbol: "ETH",
//   side: "Buy",
//   entryZone: [4000, 4020],
//   stopLoss: 1950,
//   takeProfits: [4010, 4020, 4030],
// };

// const pacifica = new PacificaCreator({ oneDealRisk: 10, testnet: false });

// const run = async () => {
//   await pacifica.executeTrade(parsedSignal);

//   await pacifica.cancellAllTrade();
// };

// run();