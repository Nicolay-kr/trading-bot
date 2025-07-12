import "dotenv/config";
import * as readline from "readline";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { context } from "@pinecone-database/pinecone/dist/assistant/data/context";
// import { Pinecone } from "@pinecone-database/pinecone";
// import { PineconeStore } from "@langchain/pinecone";

const EMBEDDING_MODEL = "text-embedding-3-large";
const GPT_MODEL = "gpt-4-turbo-preview";
const CONTEXT_FILE_PATH = "./context/client.txt";
const HISTORY_KEY = "history";
const USER_QUERY_KEY = "input";

// TODO: Function to return a ChatOpenAI model.
// Hint: Use the `ChatOpenAI` class to initialize the chat model with parameters like maxTokens, temperature, and model name.
export const getChatOpenAI = (): ChatOpenAI => {
  // Replace this comment with the implementation.
  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: GPT_MODEL,
    maxTokens: 2000,
    temperature: 0.7,
  });
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}
// TODO: Function to create a ChatPromptTemplate.
// Hint: Use the `ChatPromptTemplate.fromMessages` method to include placeholders for `context` and `history`.
export const getPromptTemplate = (): ChatPromptTemplate => {
  return ChatPromptTemplate.fromMessages([
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
    new MessagesPlaceholder(HISTORY_KEY),
    ["user", "{input}"],
  ]);
};

export const getChainWithHistory = () => {
  const messageHistory = new ChatMessageHistory();
  const chatModel = getChatOpenAI();
  const prompt = getPromptTemplate();
  return new RunnableWithMessageHistory({
    runnable: prompt.pipe(chatModel).pipe(new StringOutputParser()),
    inputMessagesKey: USER_QUERY_KEY,
    historyMessagesKey: "history",
    getMessageHistory: (_sessionId) => messageHistory,
  });
};

// TODO: Implement the main chat function.
// Hint: Use `readline` for user input and the chat chain for generating AI responses.
export const startHealthAssistantChat = async (): Promise<void> => {
  const config = { configurable: { sessionId: "1" } };
  const chainWithHistory = getChainWithHistory();
  const userInput = await askQuestion("You: ");

  if (typeof userInput === "string") {
    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      console.log("Goodbye!");
      rl.close();
      return;
    }
  }

  const output = await chainWithHistory.invoke(
    { input: userInput, context: "" },
    config
  );

  console.log("Assistant:", output);

  await startHealthAssistantChat();
};

// If this script is the main module, start the chat.
// Do not modify this part of the code.
if (require.main === module) {
  startHealthAssistantChat().catch((error) => {
    console.error("An error occurred:", error);
  });
}
