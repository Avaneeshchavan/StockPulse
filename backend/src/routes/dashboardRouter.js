/**
 * dashboardRouter.js — Aggregated dashboard endpoint
 * ---------------------------------------------------
 * Returns all data the homepage needs in a SINGLE response:
 *   - quotes for all platform symbols  (from warm cache)
 *   - news headlines                   (from cache)
 *   - leaderboard top 5               (from cache)
 *
 * This replaces 3 separate frontend calls with 1.
 */
import express from 'express';
import { getQuotes } from '../services/marketService.js';
import { cacheUtil } from '../utils/cache.js';

const router = express.Router();

// All symbols the homepage ever needs
const DASHBOARD_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA',
  'BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'DOGE', 'AVAX',
  'SPY', 'QQQ', 'VTI', 'ARKK', 'DIA',
  'GLD', 'SLV', 'USO',
  'VIXY',
];

/**
 * GET /api/dashboard
 * 
 * Single call that returns everything the homepage needs.
 * Quotes come from the background priceCache (always warm),
 * so this typically responds in <50ms.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Quotes — reads from warm cache (no external calls)
    const quotes = await getQuotes(DASHBOARD_SYMBOLS);
    const quotesMap = {};
    for (const q of quotes) {
      if (q.symbol) quotesMap[q.symbol] = q;
    }

    // 2. News — from newsController cache (10 min TTL)
    const news = cacheUtil.get('news_overview') || [];

    // 3. Leaderboard — from cache if available
    const leaderboard = cacheUtil.get('leaderboard_top') || [];

    res.set('Cache-Control', 'public, max-age=10');
    res.json({
      quotes: quotesMap,
      news: Array.isArray(news) ? news.slice(0, 10) : [],
      leaderboard: Array.isArray(leaderboard) ? leaderboard.slice(0, 5) : [],
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[dashboardRouter] error:', err.message);
    res.status(500).json({ error: 'Dashboard fetch failed' });
  }
});

export default router;
