import React, { useMemo } from 'react'
import { getSector } from '../data/sectorMap'

// Color Constants
const COLORS = {
  DEEP_GREEN: '#1a6b3c',
  TEAL_GREEN: '#26a69a',
  MUTED_GREEN: '#1e4d3a',
  MUTED_RED: '#4d1e1e',
  RED: '#ef5350',
  DEEP_RED: '#8b0000',
  TEXT_PRIMARY: '#ffffff',
  BORDER: 'rgba(255,255,255,0.1)'
}

const getColor = (change) => {
  if (change >= 3) return COLORS.DEEP_GREEN
  if (change >= 1) return COLORS.TEAL_GREEN
  if (change >= 0) return COLORS.MUTED_GREEN
  if (change >= -1) return COLORS.MUTED_RED
  if (change >= -3) return COLORS.RED
  return COLORS.DEEP_RED
}

// 50 Stocks with simulated/static market caps for sizing
// Real market caps (approx in Billions) for relative sizing
const STOCK_DATA = [
  // Tech
  { symbol: 'AAPL', cap: 2800 }, { symbol: 'MSFT', cap: 3000 }, { symbol: 'GOOGL', cap: 1900 }, { symbol: 'NVDA', cap: 2200 }, { symbol: 'META', cap: 1200 },
  { symbol: 'AVGO', cap: 600 }, { symbol: 'ORCL', cap: 350 }, { symbol: 'ADBE', cap: 250 }, { symbol: 'CRM', cap: 280 }, { symbol: 'AMD', cap: 300 },
  { symbol: 'CSCO', cap: 200 }, { symbol: 'INTC', cap: 180 }, { symbol: 'QCOM', cap: 190 }, { symbol: 'AMAT', cap: 160 }, { symbol: 'TXN', cap: 150 },
  { symbol: 'NOW', cap: 150 }, { symbol: 'INTU', cap: 170 }, { symbol: 'IBM', cap: 140 },
  
  // Finance
  { symbol: 'JPM', cap: 550 }, { symbol: 'BAC', cap: 280 }, { symbol: 'WFC', cap: 200 }, { symbol: 'MS', cap: 150 }, { symbol: 'GS', cap: 140 },
  { symbol: 'V', cap: 500 }, { symbol: 'MA', cap: 430 }, { symbol: 'AXP', cap: 150 }, { symbol: 'PYPL', cap: 70 }, { symbol: 'BX', cap: 150 },
  { symbol: 'C', cap: 110 }, { symbol: 'SCHW', cap: 130 },
  
  // Healthcare
  { symbol: 'JNJ', cap: 380 }, { symbol: 'UNH', cap: 450 }, { symbol: 'PFE', cap: 150 }, { symbol: 'ABBV', cap: 300 }, { symbol: 'MRK', cap: 320 },
  { symbol: 'LLY', cap: 700 }, { symbol: 'TMO', cap: 220 }, { symbol: 'AMGN', cap: 150 }, { symbol: 'DHR', cap: 180 }, { symbol: 'ABT', cap: 190 },
  
  // Consumer
  { symbol: 'AMZN', cap: 1800 }, { symbol: 'TSLA', cap: 550 }, { symbol: 'HD', cap: 350 }, { symbol: 'MCD', cap: 200 }, { symbol: 'NKE', cap: 140 },
  { symbol: 'SBUX', cap: 100 }, { symbol: 'LOW', cap: 130 }, { symbol: 'WMT', cap: 480 }, { symbol: 'COST', cap: 320 }, { symbol: 'PG', cap: 380 },
  
  // Energy
  { symbol: 'XOM', cap: 480 }, { symbol: 'CVX', cap: 300 }, { symbol: 'COP', cap: 140 }, { symbol: 'SLB', cap: 70 },
  
  // Industrial
  { symbol: 'BA', cap: 110 }, { symbol: 'GE', cap: 180 }, { symbol: 'CAT', cap: 170 }, { symbol: 'HON', cap: 100 }, { symbol: 'UPS', cap: 130 },
]

export const HEATMAP_SYMBOLS = STOCK_DATA.map(s => s.symbol)

export default function HeatMap({ quotes, onStockClick }) {
  const groups = useMemo(() => {
    const sectors = {}
    
    // Normalize weights (log scale base 1.5 to reduce disparity between MSFT and small caps)
    const normalizedStocks = STOCK_DATA.map(s => ({
      ...s,
      weight: Math.pow(Math.log10(s.cap), 2.5) // Empirical curve for nice visual blocks
    }))
    
    const totalWeight = normalizedStocks.reduce((a, b) => a + b.weight, 0)

    normalizedStocks.forEach(s => {
      const sector = getSector(s.symbol)
      if (!sectors[sector]) sectors[sector] = []
      
      const q = quotes[s.symbol]
      sectors[sector].push({
        ...s,
        price: q?.price ?? 0,
        change: q?.changePercent ?? 0,
        width: (s.weight / totalWeight) * 100
      })
    })

    // Sort sectors by total weight
    return Object.entries(sectors)
      .map(([name, stocks]) => ({
        name,
        stocks: stocks.sort((a,b) => b.weight - a.weight), // Large stocks first
        totalWeight: stocks.reduce((a, b) => a + b.weight, 0)
      }))
      .filter(g => g.name !== 'Other' && g.stocks.length > 0)
      .sort((a, b) => b.totalWeight - a.totalWeight)
  }, [quotes])

  return (
    <div style={{ padding: '0 16px 24px', flex: 1, overflowY: 'auto' }}>
      {groups.map(group => (
        <div key={group.name} style={{ marginBottom: 20 }}>
          <div style={{ 
            fontSize: 11, 
            fontWeight: 600, 
            color: 'var(--tv-text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.06em',
            padding: '12px 0 8px',
            borderBottom: '1px solid var(--tv-border)',
            marginBottom: 8
          }}>
            {group.name}
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2, // Tiny gap for definition
            width: '100%'
          }}>
            {group.stocks.map(stock => {
              const color = getColor(stock.change)
              // Calculate width - each sector has 100% width, so we scale weights relative to sector total
              const sectorWidth = (stock.weight / group.totalWeight) * 100
              
              return (
                <div
                  key={stock.symbol}
                  onClick={() => onStockClick && onStockClick(stock.symbol)}
                  title={`${stock.symbol}: ${stock.price ? `$${stock.price.toFixed(2)}` : '—'} (${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%)`}
                  style={{
                    flex: `1 0 calc(${sectorWidth}% - 4px)`, // Subtract gap
                    minWidth: '60px',
                    maxWidth: '300px',
                    height: sectorWidth > 15 ? '100px' : '65px', // Larger stocks are taller
                    background: color,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  className="heatmap-cell"
                >
                  <span style={{ 
                    fontWeight: 700, 
                    color: '#fff',
                    fontSize: 'clamp(10px, 1.2vw, 15px)',
                    textAlign: 'center'
                  }}>
                    {stock.symbol}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 'clamp(9px, 0.9vw, 12px)',
                    marginTop: 2
                  }}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                  </span>

                  <style>{`
                    .heatmap-cell:hover {
                      filter: brightness(1.3);
                      z-index: 10;
                    }
                  `}</style>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      
      {groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--tv-text-muted)' }}>
          Loading market data...
        </div>
      )}
    </div>
  )
}
