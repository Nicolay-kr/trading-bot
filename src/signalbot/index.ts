import { parseSignal } from "./helpers/aiParser";
import { BybitCreator } from "../exchanges/bybit/BybitCreator";
import { PacificaCreator } from "../exchanges/pacifica/PacificaCreator";
import { sendMail } from "./helpers/sendMail";
import { TradeSignal } from "./type";

export const handler = async (event: any): Promise<any> => {
  try {
    console.log("Received signal event: ", event);

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Bad Request: No body provided",
          event,
        }),
      };
    }
    const now = new Date();
    const message = event?.body;

    if (message.includes("Premium Crypto Ideas")) {
      const parsed = (await parseSignal(message)) as TradeSignal;
      console.log("Parsed Signal:", parsed);

      const isValidSignal = parsed.symbol && parsed.entryZone;
      const client = new PacificaCreator({ oneDealRisk: 25, testnet: false });

      const res = isValidSignal ? await client.executeTrade(parsed) : message;
      if (isValidSignal) {
        await sendMail(
          `New Signal Received: ${message || "No message"}\n\n
          The Possition was opened: \n\n${JSON.stringify(res, null, 2)}`
        );
      } else {
        await sendMail(`New Signal Received: ${message || "No message"}`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ res, time: now.toISOString() }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message, time: now.toISOString() }),
    };
  } catch (error:any) {
    console.error("Error processing event:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};
