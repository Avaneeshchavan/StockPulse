import axios from 'axios';
import { config } from '../config.js';
import { cacheUtil } from '../utils/cache.js';

const API_KEY = config.finnhubApiKey;

export const withTimeout = (promise, ms = 5000) => {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms))
  ]);
};

export const COMPANY_NAMES = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GOOGL: 'Alphabet Inc.',
  TSLA: 'Tesla Inc.',
  NVDA: 'NVIDIA Corp.',
  META: 'Meta Platforms',
  AMZN: 'Amazon.com Inc.',
  BTC: 'Bitcoin USD',
  ETH: 'Ethereum USD',
  SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco QQQ ETF',
  GLD: 'SPDR Gold Shares',
};

export const cryptoSymbolMap = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  BNB: 'BINANCE:BNBUSDT',
  ADA: 'BINANCE:ADAUSDT',
  XRP: 'BINANCE:XRPUSDT',
  DOGE: 'BINANCE:DOGEUSDT',
  AVAX: 'BINANCE:AVAXUSDT'
};

export async function getQuotes(symbols) {
  const results = await Promise.all(
    symbols.map(async (origSymbol) => {
      // 1. Determine the symbol to fetch (unprefixed vs prefixed crypto)
      const fetchSymbol = cryptoSymbolMap[origSymbol] || origSymbol;

      const cacheKey = `quote:${fetchSymbol}`;
      const cached = cacheUtil.get(cacheKey);
      if (cached) return { symbol: origSymbol, data: cached };

      return withTimeout(axios
        .get(`https://finnhub.io/api/v1/quote?symbol=${fetchSymbol}&token=${API_KEY}`))
        .then((r) => {
          if (r && r.data) {
            cacheUtil.set(cacheKey, r.data, 20);
            return { symbol: origSymbol, data: r.data };
          }
          return { symbol: origSymbol, data: null };
        })
        .catch(() => ({ symbol: origSymbol, data: null }));
    })
  );

  return results.map(({ symbol, data: q }) => ({
    symbol,
    name: (COMPANY_NAMES[symbol] || symbol).replace(' USD', ''),
    price: q?.c ?? null,
    prevClose: q?.pc ?? null,
    change: q?.d ?? null,
    changePercent: q?.dp ?? null,
    open: q?.o ?? null,
    high: q?.h ?? null,
    low: q?.l ?? null,
    timestamp: q?.t ?? null,
  }));
}

/**
 * getSparklineData
 * ----------------
 * Fetches intraday closing prices from Alpha Vantage for a symbol.
 * Uses cache to respect strict rate limits.
 */
export async function getSparklineData(symbol) {
  const cacheKey = `sparkline:${symbol}`;
  const cached = cacheUtil.get(cacheKey);
  if (cached) return cached;

  const API_KEY = config.alphaVantageApiKey;
  if (!API_KEY) return [];

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&outputsize=compact&apikey=${API_KEY}`;
    const res = await withTimeout(axios.get(url));
    
    if (res && res.data) {
      const timeSeries = res.data['Time Series (5min)'];
      if (timeSeries) {
        // Extract closing prices, reverse chronologically to chronologically
        const values = Object.values(timeSeries)
          .map(v => parseFloat(v['4. close']))
          .reverse()
          .slice(-10); // Last 10 points
        
        cacheUtil.set(cacheKey, values, 60 * 60); // Cache for 1 hour
        return values;
      }
    }
  } catch (err) {
    console.error(`[AlphaVantage] Error for ${symbol}:`, err.message);
  }
  return [];
}
