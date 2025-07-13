import { parseSignal } from "./helpers/aiParser";
import { createBybitOrder } from "./helpers/bybit";
import { TradeSignal } from "./type";

export const handler = async (event: any): Promise<any> => {
  try {
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
    const message = event.body;

    if (message.includes("Premium Crypto Ideas")) {
      console.log("Message:", message);
      const parsed = (await parseSignal(message)) as TradeSignal;
      console.log("Parsed Signal:", parsed);

      const res =
        parsed.symbol && parsed.stopLoss
          ? await createBybitOrder(parsed)
          : message;

      return {
        statusCode: 200,
        body: JSON.stringify({ res, time: now.toISOString() }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message, time: now.toISOString() }),
    };
  } catch (error) {
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
