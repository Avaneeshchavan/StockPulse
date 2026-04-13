console.log("Stock router running");
import express from 'express';
import axios from 'axios';
import { config } from '../config.js';

const router = express.Router();
const API_KEY = config.finnhubApiKey;

// GET stock price
router.get("/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;

    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    );
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// optional: multiple stocks
router.get("/stocks", async (req, res) => {
  try {
    const symbols = req.query.symbols.split(",");

    const results = await Promise.all(
      symbols.map((s) =>
        axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${s}&token=${API_KEY}`
        ).catch((err) => {
          console.error(`Error fetching quote for ${s}:`, err.message);
          return { data: {} };
        })
      )
    );

    const data = symbols.map((s, i) => ({
      symbol: s,
      ...results[i].data,
    }));

    res.json(data);
  } catch {
    res.status(500).json({ error: "Error fetching stocks" });
  }
});
export default router;