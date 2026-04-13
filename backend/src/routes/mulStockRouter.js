import express from 'express';
import axios from 'axios';
import { config } from '../config.js';

const router = express.Router();
const API_KEY = config.finnhubApiKey;

router.get("/", async (req, res) => {
  try {
    if (!req.query.symbols) {
      return res.status(400).json({ error: "symbols query required" });
    }

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
  } catch (err) {
    res.status(500).json({ error: "Error fetching stocks" });
  }
});

export default router;  