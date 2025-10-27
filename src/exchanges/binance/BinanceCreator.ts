import { ExchangeCreator } from "../ExchangeCreator";
import { ExchangeClient } from "../ExchangeClient";
import { BinanceClient } from "./BinanceClient";

export class BinanceCreator extends ExchangeCreator {
  public config: { oneDealRisk: number; testnet: boolean };
  constructor(config: { oneDealRisk?: number; testnet?: boolean }) {
    super();
    this.config = {
      oneDealRisk: config.oneDealRisk ?? 50,
      testnet: config.testnet ?? false,
    };
  }
  public factoryMethod(): ExchangeClient {
    return new BinanceClient(this.config);
  }
}

