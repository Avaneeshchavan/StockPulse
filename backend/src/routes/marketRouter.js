import express from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { cacheUtil } from '../utils/cache.js';

const router = express.Router();
const API_KEY = config.finnhubApiKey;

import { withTimeout, COMPANY_NAMES, getQuotes, getSparklineData, cryptoSymbolMap } from '../services/marketService.js';

// GET /api/market/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = cryptoSymbolMap[rawSymbol] || rawSymbol;

    const cacheKey = `quote:${symbol}`;
    const cached = cacheUtil.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await withTimeout(axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    ));

    if (!response) {
      return res.status(408).json({ error: 'Request timeout' });
    }

    const q = response.data;

    if (!q || q.c === 0) {
      return res.status(404).json({ error: `No data for symbol: ${symbol}` });
    }

    const result = {
      symbol,
      name: COMPANY_NAMES[symbol] || symbol,
      price: q.c,           // current price
      open: q.o,            // open
      high: q.h,            // high
      low: q.l,             // low
      prevClose: q.pc,      // previous close
      change: q.d,          // change
      changePercent: q.dp,  // change percent
      timestamp: q.t,
    };
    cacheUtil.set(cacheKey, result, 20);
    res.json(result);
  } catch (err) {
    console.error('Market quote error:', err.message);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// GET /api/market/profile/:symbol
router.get('/profile/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `profile:${symbol}`;
    const cached = cacheUtil.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await withTimeout(axios.get(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`
    ));
    if (response && response.data && Object.keys(response.data).length > 0) {
      cacheUtil.set(cacheKey, response.data, 24 * 60 * 60); // 24 hours
      return res.json(response.data);
    }
    res.status(404).json({ error: 'Profile not found' });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/market/quotes/batch?symbols=AAPL,MSFT,...
router.get('/quotes/batch', async (req, res) => {
  try {
    if (!req.query.symbols) {
      return res.status(400).json({ error: 'symbols query param required' });
    }

    const symbols = req.query.symbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // getQuotes internally checks cache first for each symbol, 
    // only fetches uncached ones, and returns an array of formatted quotes
    const quotes = await getQuotes(symbols);
    
    // Enrich with sparkline data in parallel
    const enrichedData = await Promise.all(
      quotes.map(async (q) => {
        const sparklineData = await getSparklineData(q.symbol);
        return {
          ...q,
          sparklineData
        };
      })
    );

    const responseObj = {};
    for (const q of enrichedData) {
      if (q.symbol) {
        responseObj[q.symbol] = q;
      }
    }
    
    res.json(responseObj);
  } catch (err) {
    console.error('Batch quotes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch batch quotes' });
  }
});

// GET /api/market/quotes?symbols=AAPL,MSFT,...
router.get('/quotes', async (req, res) => {
  try {
    if (!req.query.symbols) {
      return res.status(400).json({ error: 'symbols query param required' });
    }

    const symbols = req.query.symbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const data = await getQuotes(symbols);
    res.json(data);
  } catch (err) {
    console.error('Market quotes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// GET /api/market/candles?symbol=AAPL&resolution=D&from=1700000000&to=1710000000
router.get('/candles', async (req, res) => {
  try {
    const rawSymbol  = (req.query.symbol || '').toUpperCase()
    const symbol     = cryptoSymbolMap[rawSymbol] || rawSymbol;
    const resolution = req.query.resolution || '5'   // fallback
    const to         = req.query.to   || Math.floor(Date.now() / 1000)
    const from       = req.query.from || (Number(to) - 365 * 86400)

    if (!symbol) return res.status(400).json({ error: 'symbol required' })
    const cacheKey = `candles:${rawSymbol}:${resolution}:${from}:${to}`;
    const cached = cacheUtil.get(cacheKey);
    if (cached) return res.json(cached);

    const yInterval = (resolution === '5') ? '5m' : (resolution === '30' ? '15m' : (resolution === '60' ? '60m' : (resolution === 'W' ? '1wk' : (resolution === 'M' ? '1mo' : '1d'))));
    let yRange = '1y';
    
    if (resolution === '5') yRange = '1d';
    else if (resolution === '30') yRange = '5d';
    else if (resolution === '60') yRange = '1mo';
    else if (resolution === 'D') {
        const days = (to - from) / 86400;
        yRange = days > 200 ? '1y' : '3mo';
    } else if (resolution === 'W' || resolution === 'M') {
        yRange = '5y';
    }

    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yInterval}&range=${yRange}`;
    const yResponse = await withTimeout(axios.get(yUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })).catch(e => null);
    
    const chart = yResponse?.data?.chart?.result?.[0];
    if (!chart) {
      console.log(`[Candles API] Yahoo Finance failed for ${symbol}. Returning empty fallback.`);
      return res.json({ candles: [], symbol, resolution });
    }

    const timestamps = chart.timestamp || [];
    const quote = chart.indicators.quote[0] || {};
    
    const yCandles = timestamps.map((ts, i) => ({
        time: ts,
        open: typeof quote.open[i] === 'number' ? quote.open[i] : null,
        high: typeof quote.high[i] === 'number' ? quote.high[i] : null,
        low: typeof quote.low[i] === 'number' ? quote.low[i] : null,
        close: typeof quote.close[i] === 'number' ? quote.close[i] : null,
        volume: typeof quote.volume[i] === 'number' ? quote.volume[i] : null,
    })).filter(c => c.open !== null);

    const result = { candles: yCandles, symbol, resolution };
    const ttl = resolution === '5' ? 60 : 300;
    cacheUtil.set(cacheKey, result, ttl);
    res.json(result);
  } catch (err) {
    console.error(`[Candles API] error for ${req.query?.symbol}:`, err.response?.data || err.message)
    res.status(200).json({ candles: [], symbol: req.query.symbol || 'UNKNOWN', resolution: req.query.resolution || 'D', error: 'Failed to fetch candles' })
  }
})

// GET /api/market/search?q=AAPL
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toUpperCase()
    if (!q) return res.json([])

    const cacheKey = `search:${q}`;
    const cached = cacheUtil.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${API_KEY}`
    )

    const results = (response.data?.result ?? [])
      .filter(r => r.symbol && r.type !== 'EQS')  // filter out noise
      .slice(0, 15)
      .map(r => ({
        symbol:      r.symbol,
        company:     r.description,
        exchange:    r.type,
        displaySymbol: r.displaySymbol,
      }))

    cacheUtil.set(cacheKey, results, 30);
    res.json(results)
  } catch (err) {
    console.error('Market search error:', err.message)
    res.status(500).json({ error: 'Search failed' })
  }
})

export default router;
