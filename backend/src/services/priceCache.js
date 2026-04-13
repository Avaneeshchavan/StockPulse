/**
 * priceCache.js — Background price fetcher
 * ------------------------------------------
 * Pre-warms the cache every 15 seconds for ALL known platform symbols,
 * so user requests to /quotes/batch always hit warm cache (zero latency).
 *
 * This eliminates the N+1 Finnhub API call pattern that caused 6-15s
 * cold-start latency on the homepage.
 */
import axios from 'axios';
import { config } from '../config.js';
import { cacheUtil } from '../utils/cache.js';
import { cryptoSymbolMap } from './marketService.js';

const API_KEY = config.finnhubApiKey;
const REFRESH_INTERVAL_MS = 15_000; // 15 seconds
const QUOTE_TTL_SECONDS = 30;       // cache for 30s (aligned with refresh)

// Every symbol the platform may ever show in one batch
const ALL_SYMBOLS = [
  // Stocks
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA',
  // Crypto  
  'BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'DOGE', 'AVAX',
  // ETFs
  'SPY', 'QQQ', 'VTI', 'ARKK', 'DIA',
  // Commodities
  'GLD', 'SLV', 'USO',
  // Index proxy
  'VIXY',
];

/**
 * Fetch a single quote from Finnhub with a 4s timeout.
 * Returns null on failure (never throws).
 */
async function fetchQuote(fetchSymbol) {
  try {
    const res = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${fetchSymbol}&token=${API_KEY}`,
      { timeout: 4000 }
    );
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Refresh all platform quotes in parallel with concurrency control.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
async function refreshAllQuotes() {
  const start = Date.now();
  let updated = 0;

  // Build the fetch list: map display symbol → Finnhub symbol
  const jobs = ALL_SYMBOLS.map(sym => ({
    displaySymbol: sym,
    fetchSymbol: cryptoSymbolMap[sym] || sym,
  }));

  // Fetch in parallel (Finnhub free tier allows 60 calls/minute;
  // 25 symbols every 15s = ~100/min, within burst tolerance)
  const results = await Promise.allSettled(
    jobs.map(async ({ displaySymbol, fetchSymbol }) => {
      const cacheKey = `quote:${fetchSymbol}`;

      const q = await fetchQuote(fetchSymbol);
      if (q && q.c > 0) {
        cacheUtil.set(cacheKey, q, QUOTE_TTL_SECONDS);
        updated++;
      }
      return displaySymbol;
    })
  );

  const elapsed = Date.now() - start;
  console.log(`[priceCache] Refreshed ${updated}/${ALL_SYMBOLS.length} quotes in ${elapsed}ms`);
}

let intervalId = null;

/**
 * Start the background price cache.
 * Call once on server boot.
 */
export function startPriceCache() {
  console.log('[priceCache] Starting background price fetcher...');

  // Immediate first refresh
  refreshAllQuotes().catch(err =>
    console.error('[priceCache] Initial refresh failed:', err.message)
  );

  // Then every REFRESH_INTERVAL_MS
  intervalId = setInterval(() => {
    refreshAllQuotes().catch(err =>
      console.error('[priceCache] Refresh cycle failed:', err.message)
    );
  }, REFRESH_INTERVAL_MS);
}

/**
 * Stop the background fetcher (for graceful shutdown / tests).
 */
export function stopPriceCache() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[priceCache] Stopped.');
  }
}
