import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";
import { TradeSignal } from "../type";

const GPT_MODEL = "gpt-4.1-mini";

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an AI trading assistant. You will receive raw trading signals in free text format. Your job is to extract and return the following as a valid JSON object for use with the Bybit API:

    - symbol: formatted as a Bybit trading pair (e.g. Sol/Usd → SOLUSDT)
    - side: ALWAYS return exactly either "Buy" or "Sell".
        Map the source words as follows:
        If the message contains "Bullish", set side to "Buy".
        If the message contains "Bearish", set side to "Sell".
    - entryZone: [upper, lower] range as numbers (used for determining order type)
    - stopLoss: a single number. ALWAYS return a number.
      If the signal explicitly provides a stop-loss, use that value.
      If the signal does NOT provide a stop-loss, you MUST compute it:
        For a Buy signal: take the **upper value of entryZone** (the larger of the two numbers)
        and multiply it by **0.96** (exactly 4 % lower).
        For a Sell signal: take the **lower value of entryZone** (the smaller of the two numbers)
        and multiply it by **1.04** (exactly 4 % higher).
      Round the result to 2 decimal places.
    - takeProfits: array of numbers. ALWAYS return an array of numbers. 
      If the signal contains explicit take-profit levels, use them.  
      If the signal does NOT contain any take-profit info, you MUST compute 
      default take-profits equal to [entryPrice * 1.03, entryPrice * 1.04, entryPrice * 1.05] 
      for a Buy signal OR [entryPrice * 0.97, entryPrice * 0.96, entryPrice * 0.95] 
      for a Sell signal (rounded to 2 decimal places)
    Do not include any commentary or explanation. Return only a JSON object with the fields described above. Format symbol names in uppercase with no slashes or spaces.
    The signal is valid if it contains information about: symbol, side, entryZone
    and you can calculatevanother fields regarding istractions. If message does not contain these information, return error field with describtion what is a problem with the signal.
    `,
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

const run = async (message: string) => {
  return await parseSignal(message);
};

// run(
//   "JIFU Connect:\n" +
//     "Premium Crypto Ideas\n" +
//     "Nick Gomez: New Idea ETH/USD \n" +
//     "Bullish \n" +
//     "Potential zone 4450-4000\n" +
//     "Potential inv .. \n" +
//     "Potential exits ...\n"
// )
//   .then((res) => console.log(res))
//   .catch((err) => console.error(err));
