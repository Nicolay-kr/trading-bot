export type MarketItem = {
  funding: string;
  mark: string;
  mid: string;
  next_funding: string;
  open_interest: string;
  oracle: string;
  symbol: string;
  timestamp: number;
  volume_24h: string;
  yesterday_price: string;
}

export interface MarketResponse {
  success: boolean;
  data: MarketItem[];
  error: string | null;
  code: string | null;
}