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
import cors from 'cors';
import rateLimit from 'express-rate-limit';

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

const apiLimiter = rateLimit({ windowMs: 60000, max: 100 });
app.use('/api/market', apiLimiter, marketRouter);

app.use('/api/portfolio', portfolioRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/stock/', stockRouter);
app.use('/api/stocks/', mulStockRouter);

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
});

const wss = new WebSocketServer({ server });
// Finnhub WS
const FINNHUB_URL = `wss://ws.finnhub.io?token=${config.finnhubApiKey}`;

wss.on("connection", (client) => {
    console.log("Frontend connected");

    let finnhubWS;

    client.on("message", (msg) => {
        const { symbol } = JSON.parse(msg);

        finnhubWS = new WebSocket(FINNHUB_URL);

        finnhubWS.on("open", () => {
            finnhubWS.send(JSON.stringify({
                type: "subscribe",
                symbol
            }));
        });

        finnhubWS.on("message", (data) => {
            client.send(data.toString());
        });
    });

    client.on("close", () => {
        if (finnhubWS) finnhubWS.close();
    });
});