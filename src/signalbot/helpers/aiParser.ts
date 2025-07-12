import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";


const GPT_MODEL = "gpt-4-turbo-preview";

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an AI trading assistant. You will receive raw trading signals in free text format. Your job is to extract and return the following as a valid JSON object for use with the Bybit API:

- symbol: formatted as a Bybit trading pair (e.g. Sol/Usd → SOLUSDT)
- direction: 'long' for bullish, 'short' for bearish
- entryZone: [upper, lower] range as numbers (used for determining order type)
- stopLoss: number (used as stop-loss level)
- takeProfits: array of numbers (used for setting multiple TP levels)

Do not include any commentary or explanation. Return only a JSON object with the fields described above. Format symbol names in uppercase with no slashes or spaces.`,
  ],
  ["user", "{input}"],
]);

const model = new ChatOpenAI({
  modelName: GPT_MODEL,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new JsonOutputParser();

export const parseSignal = async (message: string) => {
  const chain = prompt.pipe(model).pipe(parser);
  return await chain.invoke({ input: message });
};

