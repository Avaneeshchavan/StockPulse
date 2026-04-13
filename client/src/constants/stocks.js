import { apiUrl } from '../config.js'

/** Market grid + fallback when batch quote API is unavailable */
export const MARKET_STOCKS = [
  { symbol: 'AAPL', company: 'Apple Inc.' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.' },
  { symbol: 'MSFT', company: 'Microsoft Corp.' },
  { symbol: 'AMZN', company: 'Amazon.com Inc.' },
  { symbol: 'TSLA', company: 'Tesla Inc.' },
  { symbol: 'META', company: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', company: 'Netflix Inc.' },
  { symbol: 'NVDA', company: 'NVIDIA Corp.' },
  { symbol: 'JPM', company: 'JPMorgan Chase' },
  { symbol: 'V', company: 'Visa Inc.' },
  { symbol: 'WMT', company: 'Walmart Inc.' },
  { symbol: 'DIS', company: 'Walt Disney Co.' },
  { symbol: 'PYPL', company: 'PayPal Holdings' },
  { symbol: 'INTC', company: 'Intel Corp.' },
  { symbol: 'AMD', company: 'AMD Inc.' },
  { symbol: 'BA', company: 'Boeing Co.' },
  { symbol: 'NKE', company: 'Nike Inc.' },
  { symbol: 'COST', company: 'Costco Wholesale' },
  { symbol: 'SBUX', company: 'Starbucks Corp.' },
  { symbol: 'PFE', company: 'Pfizer Inc.' },
]

export const STATIC_STOCK = {
  AAPL: { name: 'Apple Inc.', price: 175.43, change: 2.34 },
  GOOGL: { name: 'Alphabet Inc.', price: 142.18, change: 1.87 },
  MSFT: { name: 'Microsoft Corp.', price: 378.91, change: 0.95 },
  AMZN: { name: 'Amazon.com Inc.', price: 168.24, change: -0.42 },
  TSLA: { name: 'Tesla Inc.', price: 207.83, change: 3.21 },
  META: { name: 'Meta Platforms Inc.', price: 484.03, change: 1.56 },
  NFLX: { name: 'Netflix Inc.', price: 612.45, change: -1.23 },
  NVDA: { name: 'NVIDIA Corp.', price: 721.33, change: 4.12 },
  JPM: { name: 'JPMorgan Chase', price: 189.67, change: 0.78 },
  V: { name: 'Visa Inc.', price: 278.12, change: -0.34 },
  WMT: { name: 'Walmart Inc.', price: 67.89, change: 0.56 },
  DIS: { name: 'Walt Disney Co.', price: 92.34, change: -1.45 },
  PYPL: { name: 'PayPal Holdings', price: 64.23, change: 2.11 },
  INTC: { name: 'Intel Corp.', price: 43.56, change: -0.89 },
  AMD: { name: 'AMD Inc.', price: 156.78, change: 3.45 },
  BA: { name: 'Boeing Co.', price: 198.45, change: -2.12 },
  NKE: { name: 'Nike Inc.', price: 105.67, change: 1.23 },
  COST: { name: 'Costco Wholesale', price: 723.45, change: 0.67 },
  SBUX: { name: 'Starbucks Corp.', price: 94.32, change: -0.78 },
  PFE: { name: 'Pfizer Inc.', price: 28.91, change: 1.45 },
}

export function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function fetchStockQuotes(symbols) {
  if (!symbols.length) return []
  try {
    const batches = chunkArray(symbols, 10)
    const results = await Promise.all(
      batches.map((batch) =>
        fetch(apiUrl(`/api/stocks/?symbols=${batch.join(',')}`)).then((r) => {
          if (!r.ok) throw new Error('quote fetch failed')
          return r.json()
        }).catch((error) => {
          console.error("fetchStockQuotes batch failed:", error)
          return []
        })
      )
    )
    return results.flat()
  } catch (error) {
    console.error("fetchStockQuotes failed:", error)
    return []
  }
}
