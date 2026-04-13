import { config } from './src/config.js';
import express from 'express';
import WebSocket from "ws";
import { WebSocketServer } from "ws";
import newsRouter from './src/routes/newsRouter.js';
import stockRouter from './src/routes/stockRouter.js';
import mulStockRouter from './src/routes/mulStockRouter.js';
import tradeRouter from './src/routes/tradeRouter.js';
import portfolioRouter from './src/routes/portfolioRouter.js';
import watchlistRouter from './src/routes/watchlistRouter.js';
import marketRouter from './src/routes/marketRouter.js';
import leaderboardRouter from './src/routes/leaderboardRouter.js';
import dashboardRouter from './src/routes/dashboardRouter.js';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './src/middleware/auth.js';
import { createUserSupabase } from './src/lib/supabaseUser.js';
import { startPriceCache } from './src/services/priceCache.js';

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message);
    console.error(err.stack);
    process.exit(1);
});

const app = express();
 
// Middleware
app.use(compression());
app.use(express.json());
app.use(cors({
    origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://stock-pulse-phi.vercel.app'
], 
    credentials: true
}));

// Routes
app.use('/api/news', newsRouter);
app.use('/api/dashboard', dashboardRouter);

const apiLimiter = rateLimit({ windowMs: 60000, max: 100 });
app.use('/api/market', apiLimiter, marketRouter);

app.use('/api/portfolio', portfolioRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/stock/', stockRouter);
app.use('/api/stocks/', mulStockRouter);

// ── GET /api/transactions ───────────────────────────────────────────────────
// Returns all transactions for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const sb = createUserSupabase(req.accessToken || req.headers.authorization?.replace('Bearer ', ''))
    const { data, error } = await sb
      .from('transactions')
      .select('id, user_id, symbol, type, quantity, price, created_at, company_name, asset_type, total, notes')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/transactions] Supabase error:', error)
      return res.status(400).json({ success: false, error: error.message })
    }

    return res.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('[GET /api/transactions] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

const server = app.listen(config.port, () => {
    console.log(`Server running on port: ${config.port}`);
    // Start background price cache — pre-warms quotes so user requests always hit warm cache
    startPriceCache();
});

const wss = new WebSocketServer({ server });

// ── Pooled Finnhub WebSocket ────────────────────────────────────────────────
// One shared upstream connection; broadcasts to all interested clients.
const FINNHUB_URL = `wss://ws.finnhub.io?token=${config.finnhubApiKey}`;
let finnhubWS = null;
const symbolClients = new Map(); // symbol → Set<client>

function ensureFinnhub() {
  if (finnhubWS && finnhubWS.readyState === WebSocket.OPEN) return;

  finnhubWS = new WebSocket(FINNHUB_URL);

  finnhubWS.on('open', () => {
    console.log('[WS] Finnhub upstream connected');
    // Re-subscribe all active symbols
    for (const sym of symbolClients.keys()) {
      finnhubWS.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
    }
  });

  finnhubWS.on('message', (raw) => {
    const msg = raw.toString();
    // Broadcast to ALL connected clients (they filter client-side)
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  });

  finnhubWS.on('close', () => {
    console.log('[WS] Finnhub upstream disconnected, reconnecting in 3s...');
    setTimeout(ensureFinnhub, 3000);
  });

  finnhubWS.on('error', (err) => {
    console.error('[WS] Finnhub error:', err.message);
  });
}

wss.on("connection", (client) => {
  console.log("[WS] Frontend client connected");

  client.on("message", (msg) => {
    try {
      const { symbol } = JSON.parse(msg);
      if (!symbol) return;

      // Track this client's interest
      if (!symbolClients.has(symbol)) {
        symbolClients.set(symbol, new Set());
      }
      symbolClients.get(symbol).add(client);

      // Ensure upstream is open and subscribe
      ensureFinnhub();
      if (finnhubWS && finnhubWS.readyState === WebSocket.OPEN) {
        finnhubWS.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    } catch (e) {
      console.error('[WS] Bad client message:', e.message);
    }
  });

  client.on("close", () => {
    // Remove this client from all symbol subscriptions
    for (const [sym, clients] of symbolClients.entries()) {
      clients.delete(client);
      // If no clients left for this symbol, unsubscribe upstream
      if (clients.size === 0) {
        symbolClients.delete(sym);
        if (finnhubWS && finnhubWS.readyState === WebSocket.OPEN) {
          finnhubWS.send(JSON.stringify({ type: 'unsubscribe', symbol: sym }));
        }
      }
    }
  });
});