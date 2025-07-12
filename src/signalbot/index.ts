import { parseSignal } from "./helpers/aiParser";

export const handler = async (event: any): Promise<any> => {
  try{
      if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: No body provided", event }),
    };
  }
  const now = new Date();
  const message = event.body;

  if (message.includes("Premium Crypto Ideas")) {
    const parsed = await parseSignal(message);
    return {
      statusCode: 200,
      body: JSON.stringify({ parsed, time: now.toISOString() }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message, time: now.toISOString() }),
  };

  } catch (error: any) {
    console.error("Error processing event:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }   
};
