
# 📄 Technical Task: AI-Powered Trading Bot on AWS

## 📌 App Summary

This project is an **automated crypto trading bot** that receives trading signals via notifications from an Android device (using MacroDroid), processes the signals through **LangChain AI**, determines trade parameters, and places orders on **Bybit** using their API.

It uses **AWS Lambda** for serverless execution, **Pinecone** to store historical messages in vector form, and **DynamoDB** for structured trade logs.

---

## 🔧 Core Stack

| Component       | Technology                   | Purpose                               |
|----------------|-------------------------------|----------------------------------------|
| Notification    | MacroDroid on Android        | Sends raw trade signals to backend     |
| Backend         | AWS Lambda + API Gateway     | Handles requests and processing logic  |
| AI Parser       | LangChain + OpenAI           | Extracts trade details from free text  |
| Market Data     | Bybit Public API             | Fetches current price                  |
| Trading Engine  | Bybit API                    | Places market or limit orders          |
| Logs            | DynamoDB                     | Stores structured trade records        |
| Vector Memory   | Pinecone                     | Stores embeddings of raw messages      |
| Security        | API token from MacroDroid    | Verifies request origin                |

---

## 🔁 Data Flow

```
[MacroDroid Notification] 
      ↓ (HTTP POST)
[AWS Lambda (API Gateway)]
      ↓
[LangChain AI Parser] → structured trade JSON
      ↓
[Bybit Price Fetcher]
      ↓
[Trade Logic Engine]
      ↓
[Bybit API Order Placement]
      ↓
→ Log to DynamoDB
→ Log to Pinecone
→ Return response
```

---

## 📥 Example Incoming Message

```
JIFU Connect:
Premium Crypto Ideas
Daniel Lopez: Sol/Usd
Bullish idea 
Potential zone 150.5-149.50
Potential inv 147.0
Potential exits 152.50/154.50/156.50
```

---

## 🤖 AI Parsing Output (LangChain)

```json
{
  "symbol": "SOLUSDT",
  "direction": "long",
  "entryZone": [150.5, 149.5],
  "stopLoss": 147.0,
  "takeProfits": [152.5, 154.5, 156.5]
}
```

---

## 🧠 Trade Logic

### 1. Price Check
- If current price > entryZone max → create limit order
- If current price inside entryZone → create market order

### 2. Position Volume Calculation

Using a constant `oneDealRisk = 50`

Formula:
```
volume = (100 / ((entryPrice - stopLoss) / entryPrice)) * oneDealRisk
```

### 3. Order Type
- Market order: immediate execution
- Limit order: pending until price reaches zone

---

## 🔐 Security

- Lambda endpoint requires token header `Authorization: Bearer YOUR_SECRET`
- Only MacroDroid sends messages (you control the device)

---

## 🗃 Storage

### DynamoDB Table (example)

| Field        | Type     |
|--------------|----------|
| tradeId      | UUID     |
| timestamp    | ISO date |
| symbol       | string   |
| direction    | string   |
| entryZone    | array    |
| stopLoss     | float    |
| takeProfits  | array    |
| currentPrice | float    |
| orderType    | string   |
| volume       | float    |

---

### Pinecone (Optional Vector Store)

- Stores raw messages as text embeddings
- Useful for querying similar past ideas

---

## 🛠️ Development Steps

### Phase 1: Infrastructure

- [ ] Setup API Gateway + Lambda
- [ ] Add token auth check

### Phase 2: Core Bot Logic

- [ ] Parse `event.body` into plain message
- [ ] Use LangChain parser to extract trade info
- [ ] Fetch price via Bybit API
- [ ] Calculate volume and order type
- [ ] Place order via Bybit API
- [ ] Log structured data to DynamoDB
- [ ] Store original message in Pinecone

### Phase 3: Monitoring and Logs

- [ ] Enable CloudWatch logging for Lambda
- [ ] Optional: Telegram alerts for order success/fail

---

## 🚧 Future Features (Optional)

- Telegram/Discord bot for manual confirmations
- Risk management tuning (multi-level take profits, trailing stops)
- Performance tracking and reports
- Multi-account trading
- Smart AI decision layer (skip trades with low R:R)
