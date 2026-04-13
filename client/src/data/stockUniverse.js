/**
 * Stock Universe — 50 major stocks with static metadata.
 * Live price / changePercent are fetched separately via batch endpoint.
 * Screener filters are applied client-side against this array.
 */
export const STOCK_UNIVERSE = [
  // ── Technology ──────────────────────────────────────────────────────────────
  { symbol: 'AAPL',  company: 'Apple Inc.',                sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 29.1, week52High: 199.62, week52Low: 164.08, avgVolume: 58_000_000 },
  { symbol: 'MSFT',  company: 'Microsoft Corp.',           sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 36.4, week52High: 468.35, week52Low: 344.79, avgVolume: 22_000_000 },
  { symbol: 'NVDA',  company: 'NVIDIA Corp.',              sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 55.2, week52High: 153.13, week52Low:  47.32, avgVolume: 42_000_000 },
  { symbol: 'GOOGL', company: 'Alphabet Inc. (Class A)',   sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 23.8, week52High: 207.05, week52Low: 154.84, avgVolume: 24_000_000 },
  { symbol: 'META',  company: 'Meta Platforms Inc.',       sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 27.9, week52High: 740.91, week52Low: 414.50, avgVolume: 18_000_000 },
  { symbol: 'AVGO',  company: 'Broadcom Inc.',             sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 31.6, week52High: 251.88, week52Low: 130.10, avgVolume: 17_000_000 },
  { symbol: 'AMD',   company: 'Advanced Micro Devices',   sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 48.5, week52High: 227.30, week52Low:  117.93, avgVolume: 44_000_000 },
  { symbol: 'INTC',  company: 'Intel Corp.',               sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: null, week52High:  37.33, week52Low:  18.51, avgVolume: 42_000_000 },
  { symbol: 'ORCL',  company: 'Oracle Corp.',              sector: 'Technology',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 38.2, week52High: 198.31, week52Low: 102.86, avgVolume:  9_000_000 },
  { symbol: 'CRM',   company: 'Salesforce Inc.',           sector: 'Technology',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: 47.1, week52High: 369.00, week52Low: 212.00, avgVolume:  5_000_000 },
  { symbol: 'ADBE',  company: 'Adobe Inc.',                sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 30.5, week52High: 587.75, week52Low: 340.00, avgVolume:  4_000_000 },
  { symbol: 'QCOM',  company: 'Qualcomm Inc.',             sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 18.2, week52High: 230.63, week52Low: 139.28, avgVolume: 10_000_000 },

  // ── Finance ─────────────────────────────────────────────────────────────────
  { symbol: 'JPM',   company: 'JPMorgan Chase & Co.',      sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 13.2, week52High: 280.25, week52Low: 182.05, avgVolume: 11_000_000 },
  { symbol: 'BAC',   company: 'Bank of America Corp.',     sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 13.8, week52High:  48.08, week52Low:  31.00, avgVolume: 35_000_000 },
  { symbol: 'WFC',   company: 'Wells Fargo & Co.',         sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 13.0, week52High:  81.00, week52Low:  49.25, avgVolume: 18_000_000 },
  { symbol: 'GS',    company: 'Goldman Sachs Group',       sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 15.6, week52High: 648.00, week52Low: 432.00, avgVolume:  2_800_000 },
  { symbol: 'MS',    company: 'Morgan Stanley',            sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 17.4, week52High: 137.95, week52Low:  89.12, avgVolume:  9_000_000 },
  { symbol: 'V',     company: 'Visa Inc.',                 sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 32.1, week52High: 354.81, week52Low: 252.55, avgVolume:  7_000_000 },
  { symbol: 'MA',    company: 'Mastercard Inc.',           sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 36.4, week52High: 549.95, week52Low: 411.50, avgVolume:  3_200_000 },

  // ── Healthcare ──────────────────────────────────────────────────────────────
  { symbol: 'JNJ',   company: 'Johnson & Johnson',         sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 23.5, week52High: 168.00, week52Low: 143.13, avgVolume: 12_000_000 },
  { symbol: 'LLY',   company: 'Eli Lilly & Co.',           sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 55.8, week52High: 972.53, week52Low: 618.82, avgVolume:  3_500_000 },
  { symbol: 'UNH',   company: 'UnitedHealth Group',        sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 26.3, week52High: 630.73, week52Low: 467.01, avgVolume:  3_100_000 },
  { symbol: 'ABBV',  company: 'AbbVie Inc.',               sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 52.4, week52High: 200.89, week52Low: 149.27, avgVolume:  5_000_000 },
  { symbol: 'MRK',   company: 'Merck & Co.',               sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 14.9, week52High: 134.63, week52Low:  92.12, avgVolume:  9_000_000 },
  { symbol: 'PFE',   company: 'Pfizer Inc.',               sector: 'Healthcare',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: 15.5, week52High:  31.54, week52Low:  24.48, avgVolume: 27_000_000 },

  // ── Consumer ────────────────────────────────────────────────────────────────
  { symbol: 'AMZN',  company: 'Amazon.com Inc.',           sector: 'Consumer',     exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: 40.3, week52High: 242.52, week52Low: 151.61, avgVolume: 36_000_000 },
  { symbol: 'TSLA',  company: 'Tesla Inc.',                sector: 'Consumer',     exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 72.4, week52High: 488.54, week52Low: 138.80, avgVolume: 98_000_000 },
  { symbol: 'NKE',   company: 'Nike Inc.',                 sector: 'Consumer',     exchange: 'NYSE',   marketCapCat: 'large', peRatio: 20.1, week52High:  98.00, week52Low:  70.72, avgVolume:  9_000_000 },
  { symbol: 'MCD',   company: "McDonald's Corp.",          sector: 'Consumer',     exchange: 'NYSE',   marketCapCat: 'large', peRatio: 24.8, week52High: 317.90, week52Low: 243.33, avgVolume:  4_000_000 },
  { symbol: 'SBUX',  company: 'Starbucks Corp.',           sector: 'Consumer',     exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 26.5, week52High: 116.00, week52Low:  72.49, avgVolume:  9_000_000 },
  { symbol: 'WMT',   company: 'Walmart Inc.',              sector: 'Consumer',     exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 34.2, week52High:  98.55, week52Low:  61.97, avgVolume: 11_000_000 },

  // ── Energy ──────────────────────────────────────────────────────────────────
  { symbol: 'XOM',   company: 'Exxon Mobil Corp.',         sector: 'Energy',       exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 14.3, week52High: 126.34, week52Low: 103.44, avgVolume: 18_000_000 },
  { symbol: 'CVX',   company: 'Chevron Corp.',             sector: 'Energy',       exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: 15.2, week52High: 168.96, week52Low: 135.76, avgVolume:  9_000_000 },
  { symbol: 'COP',   company: 'ConocoPhillips',            sector: 'Energy',       exchange: 'NYSE',   marketCapCat: 'large', peRatio: 13.5, week52High: 130.37, week52Low:  99.08, avgVolume:  9_000_000 },
  { symbol: 'SLB',   company: 'SLB (Schlumberger)',        sector: 'Energy',       exchange: 'NYSE',   marketCapCat: 'large', peRatio: 14.8, week52High:  55.20, week52Low:  36.42, avgVolume: 12_000_000 },

  // ── Industrial ──────────────────────────────────────────────────────────────
  { symbol: 'BA',    company: 'Boeing Co.',                sector: 'Industrial',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: null, week52High: 267.54, week52Low: 137.00, avgVolume:  8_000_000 },
  { symbol: 'CAT',   company: 'Caterpillar Inc.',          sector: 'Industrial',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: 18.1, week52High: 418.50, week52Low: 285.00, avgVolume:  3_200_000 },
  { symbol: 'HON',   company: 'Honeywell International',   sector: 'Industrial',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 21.5, week52High: 242.51, week52Low: 187.00, avgVolume:  3_100_000 },
  { symbol: 'GE',    company: 'GE Aerospace',              sector: 'Industrial',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: 32.4, week52High: 210.65, week52Low: 134.61, avgVolume:  7_000_000 },
  { symbol: 'RTX',   company: 'RTX Corp.',                 sector: 'Industrial',   exchange: 'NYSE',   marketCapCat: 'large', peRatio: 47.2, week52High: 134.00, week52Low:  89.30, avgVolume:  7_000_000 },

  // ── Telecom / Communications ─────────────────────────────────────────────────
  { symbol: 'NFLX',  company: 'Netflix Inc.',              sector: 'Technology',   exchange: 'NASDAQ', marketCapCat: 'large', peRatio: 52.1, week52High: 1114.38, week52Low: 542.01, avgVolume:  5_000_000 },
  { symbol: 'DIS',   company: 'Walt Disney Co.',           sector: 'Consumer',     exchange: 'NYSE',   marketCapCat: 'large', peRatio: 33.6, week52High: 122.36, week52Low:  83.91, avgVolume: 10_000_000 },
  { symbol: 'T',     company: 'AT&T Inc.',                 sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 17.2, week52High:  26.94, week52Low:  14.84, avgVolume: 36_000_000 },
  { symbol: 'VZ',    company: 'Verizon Communications',    sector: 'Finance',      exchange: 'NYSE',   marketCapCat: 'large', peRatio: 10.3, week52High:  46.11, week52Low:  37.84, avgVolume: 15_000_000 },

  // ── ETFs ────────────────────────────────────────────────────────────────────
  { symbol: 'SPY',   company: 'SPDR S&P 500 ETF',         sector: 'ETF',          exchange: 'NYSE',   marketCapCat: 'mega',  peRatio: null, week52High: 613.23, week52Low: 480.29, avgVolume: 55_000_000 },
  { symbol: 'QQQ',   company: 'Invesco QQQ Trust',        sector: 'ETF',          exchange: 'NASDAQ', marketCapCat: 'mega',  peRatio: null, week52High: 540.81, week52Low: 404.12, avgVolume: 41_000_000 },
  { symbol: 'IWM',   company: 'iShares Russell 2000 ETF', sector: 'ETF',          exchange: 'NYSE',   marketCapCat: 'large', peRatio: null, week52High: 244.47, week52Low: 175.35, avgVolume: 28_000_000 },
  { symbol: 'GLD',   company: 'SPDR Gold Shares ETF',     sector: 'ETF',          exchange: 'NYSE',   marketCapCat: 'large', peRatio: null, week52High: 306.12, week52Low: 192.46, avgVolume:  8_000_000 },

  // ── Crypto ──────────────────────────────────────────────────────────────────
  { symbol: 'BTCUSD', company: 'Bitcoin',                  sector: 'Crypto',       exchange: 'Crypto', marketCapCat: 'mega',  peRatio: null, week52High: 120_000, week52Low: 40_000, avgVolume: 35_000_000 },
  { symbol: 'ETHUSD', company: 'Ethereum',                 sector: 'Crypto',       exchange: 'Crypto', marketCapCat: 'mega',  peRatio: null, week52High:   6_000, week52Low:  2_000, avgVolume: 18_000_000 },
  { symbol: 'SOLUSD', company: 'Solana',                   sector: 'Crypto',       exchange: 'Crypto', marketCapCat: 'large', peRatio: null, week52High:     280, week52Low:     80, avgVolume:  9_000_000 },
]

export const ALL_SYMBOLS = STOCK_UNIVERSE.map(s => s.symbol)
