/**
 * Market data constants — asset groups for the tab filter.
 * Each entry maps a symbol → { company, assetType, marketCap (static) }
 */

export const ASSET_GROUPS = {
  stocks: [
    { symbol: 'AAPL',  company: 'Apple Inc.',          assetType: 'stock', marketCap: 2.89e12 },
    { symbol: 'GOOGL', company: 'Alphabet Inc.',         assetType: 'stock', marketCap: 2.05e12 },
    { symbol: 'MSFT',  company: 'Microsoft Corp.',      assetType: 'stock', marketCap: 3.01e12 },
    { symbol: 'AMZN',  company: 'Amazon.com Inc.',       assetType: 'stock', marketCap: 1.89e12 },
    { symbol: 'TSLA',  company: 'Tesla Inc.',            assetType: 'stock', marketCap: 0.68e12 },
    { symbol: 'META',  company: 'Meta Platforms',        assetType: 'stock', marketCap: 1.32e12 },
    { symbol: 'NFLX',  company: 'Netflix Inc.',          assetType: 'stock', marketCap: 0.27e12 },
    { symbol: 'NVDA',  company: 'NVIDIA Corp.',          assetType: 'stock', marketCap: 2.30e12 },
  ],

  crypto: [
    { symbol: 'BTC', company: 'Bitcoin',  assetType: 'crypto', marketCap: 1.28e12 },
    { symbol: 'ETH', company: 'Ethereum', assetType: 'crypto', marketCap: 0.41e12 },
    { symbol: 'SOL', company: 'Solana',   assetType: 'crypto', marketCap: 0.07e12 },
    { symbol: 'BNB', company: 'BNB Chain',assetType: 'crypto', marketCap: 0.09e12 },
    { symbol: 'ADA', company: 'Cardano',  assetType: 'crypto', marketCap: 0.018e12 },
    { symbol: 'XRP', company: 'Ripple',   assetType: 'crypto', marketCap: 0.035e12 },
    { symbol: 'DOGE',company: 'Dogecoin', assetType: 'crypto', marketCap: 0.025e12 },
    { symbol: 'AVAX',company: 'Avalanche',assetType: 'crypto', marketCap: 0.015e12 },
  ],

  etfs: [
    { symbol: 'SPY',   company: 'SPDR S&P 500 ETF',    assetType: 'etf', marketCap: 0.50e12 },
    { symbol: 'QQQ',   company: 'Invesco QQQ Trust',   assetType: 'etf', marketCap: 0.24e12 },
    { symbol: 'VTI',   company: 'Vanguard Total Market',assetType: 'etf', marketCap: 0.37e12 },
    { symbol: 'ARKK',  company: 'ARK Innovation ETF',  assetType: 'etf', marketCap: 0.008e12 },
  ],

  commodities: [
    { symbol: 'GLD',   company: 'Gold (via GLD ETF)',  assetType: 'commodity', marketCap: null },
    { symbol: 'SLV',   company: 'Silver (via SLV ETF)',assetType: 'commodity', marketCap: null },
    { symbol: 'USO',   company: 'Crude Oil (via USO)', assetType: 'commodity', marketCap: null },
  ],
}

// Market indices shown in the sidebar
export const INDEX_SYMBOLS = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'NASDAQ' },
  { symbol: 'DIA', label: 'DOW' },
  { symbol: 'VIXY', label: 'VIX Proxy' },
]

/** Format large market caps → "$2.89T", "$340B" */
export function fmtMarketCap(v) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`
  return `$${v}`
}

/** Format absolute prices */
export function fmtPrice(v) {
  if (v == null) return '—'
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "2 hours ago", "just now" etc. from a unix timestamp or ISO date */
export function timeAgo(dateStr) {
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return ''
  const diff = Math.floor((Date.now() - then) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/** 
 * Peer suggestions for major tickers 
 * Used for the "Compare with..." feature
 */
export const PEER_MAP = {
  AAPL:  ['MSFT', 'GOOGL', 'META'],
  MSFT:  ['AAPL', 'GOOGL', 'AMZN'],
  GOOGL: ['META', 'MSFT', 'NFLX'],
  AMZN:  ['WMT', 'EBAY', 'TGT'],
  TSLA:  ['RIVN', 'F', 'GM'],
  META:  ['GOOGL', 'SNAP', 'PINS'],
  NFLX:  ['DIS', 'PARA', 'WBD'],
  NVDA:  ['AMD', 'INTC', 'AVGO'],
  BTC:   ['ETH', 'SOL', 'XRP'],
  ETH:   ['BTC', 'SOL', 'BNB'],
  SPY:   ['QQQ', 'DIA', 'IWM'],
  QQQ:   ['SPY', 'IWM', 'SMH'],
  GLD:   ['SLV', 'GDX', 'IAU'],
}
