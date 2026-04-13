import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import Button from '../components/ui/Button'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

/* ── Constants ───────────────────────────────────────────────────── */
const COLORS = ['#00d4aa', '#f85149', '#d29922', '#7c3aed']
const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

/* ── Helpers ─────────────────────────────────────────────────────── */
const fetchCandles = async (symbol, days) => {
  const now = Math.floor(Date.now() / 1000)
  const from = now - days * 86_400
  const res = await fetch(`/api/market/candles?symbol=${symbol}&resolution=D&from=${from}&to=${now}`)
  if (!res.ok) throw new Error(`Failed to fetch ${symbol}`)
  const data = await res.json()
  return data.candles || []
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const symbols = useMemo(() => {
    const s = searchParams.get('symbols')
    return s ? s.split(',').filter(Boolean) : ['AAPL', 'MSFT']
  }, [searchParams])

  const setSymbols = (newSymbols) => {
    setSearchParams({ symbols: newSymbols.join(',') })
  }

  const [range, setRange] = useState(RANGES[1]) // Default 3M

  const [hasInteracted, setHasInteracted] = useState(false)

  // NEW: Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const searchSymbol = async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      // API directly returns array or { data: [...] } / { result: [...] }
      setSearchResults(Array.isArray(data) ? data : (data.data || data.result || []))
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchSymbol(searchQuery)
      else setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const addSymbol = (symbol) => {
    const upperSym = symbol.toUpperCase()
    if (symbols.includes(upperSym)) return  // already added
    if (symbols.length >= 4) return  // max 4 stocks
    setHasInteracted(true)
    setSymbols([...symbols, upperSym])
    setSearchQuery('')
    setSearchResults([])
  }

  const removeSymbol = (symbolToRemove) => {
    setHasInteracted(true)
    if (symbols.length <= 2) return  // minimum 2 stocks
    setSymbols(symbols.filter(s => s !== symbolToRemove))
  }

  /* ── Multi-Symbol Data Fetching ─────────────────────────────────── */
  const queries = useQueries({
    queries: symbols.map(s => ({
      queryKey: ['compare-candles', s, range.label],
      queryFn: () => fetchCandles(s, range.days),
      staleTime: 60 * 1000,
      enabled: !!s
    }))
  })

  const isLoading = queries.some(q => q.isLoading)
  const isError = queries.some(q => q.isError)

  /* ── Normalization & Alignment Logic ────────────────────────────── */
  const chartData = useMemo(() => {
    if (isLoading || isError || queries.length === 0) return []

    // 1. Map each series with return % logic
    const series = symbols.map((sym, i) => {
      const candles = queries[i].data || []
      if (!candles.length) return []
      
      const startPrice = candles[0].close
      return candles.map(c => ({
        date: new Date(c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: c.time,
        [sym]: Number((((c.close - startPrice) / startPrice) * 100).toFixed(2))
      }))
    })

    // 2. Align all series by date
    const allDates = [...new Set(series.flat().map(p => p.date))].sort((a, b) => {
        // Simple sort by date string might be risky, but we can find rawDate or just trust the first series order
        return 0 
    })
    
    // We'll use the longest series as base instead of first, to ensure coverage
    const longestSeries = series.reduce((a, b) => b.length > a.length ? b : a, [])
    if (!longestSeries.length) return []

    return longestSeries.map((item, idx) => {
      const row = { date: item.date }
      symbols.forEach((sym, i) => {
        // Find existing data for this date in series i
        const point = series[i].find(p => p.date === item.date)
        if (point && point[sym] !== undefined) row[sym] = point[sym]
      })
      return row
    })
  }, [queries, symbols, isLoading, isError])

  const currentReturns = useMemo(() => {
    if (!chartData.length) return {}
    const latest = chartData[chartData.length - 1]
    if (!latest) return {}
    const returns = {}
    symbols.forEach(s => {
      if (latest[s] !== undefined) returns[s] = latest[s]
    })
    return returns
  }, [chartData, symbols])

  return (
    <div style={{ padding: '20px 0 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, borderBottom: '1px solid var(--tv-border)', paddingBottom: 16
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)', marginBottom: 4 }}>
            Stock Comparison
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tv-text-muted)' }}>
            Benchmark relative performance across multiple assets
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: range.label === r.label ? 'var(--tv-accent)' : 'var(--tv-bg-secondary)',
                border: '1px solid var(--tv-border)',
                color: range.label === r.label ? 'white' : 'var(--tv-text-secondary)',
                transition: 'all 0.12s'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol Selection Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20,
        alignItems: 'center', background: 'var(--tv-bg-primary)',
        padding: 16, borderRadius: 8, border: '1px solid var(--tv-border)'
      }}>
        {symbols.map((sym, index) => (
          <div key={sym} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--tv-bg-elevated)',
            border: '1px solid var(--tv-border)',
            borderRadius: '4px',
            padding: '6px 12px',
          }}>
            <span style={{ 
              color: COLORS[index], 
              fontWeight: 600,
              fontSize: '14px'
            }}>
              {sym}
            </span>
            {symbols.length > 2 && (
              <button
                onClick={() => removeSymbol(sym)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--tv-text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '0 2px'
                }}
                onMouseOver={e => e.target.style.color = 'var(--tv-red)'}
                onMouseOut={e => e.target.style.color = 'var(--tv-text-muted)'}
              >
                ×
              </button>
            )}
          </div>
        ))}

        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol e.g. AAPL"
            style={{
              width: '100%',
              background: 'var(--tv-bg-input)',
              border: '1px solid var(--tv-border)',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'var(--tv-text-primary)',
              fontSize: '13px'
            }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--tv-bg-secondary)',
              border: '1px solid var(--tv-border)',
              borderRadius: '4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {searchResults.slice(0, 8).map(result => (
                <div
                  key={result.symbol}
                  onClick={() => addSymbol(result.symbol)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--tv-border)',
                    fontSize: '13px'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--tv-bg-elevated)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 600, color: 'var(--tv-text-primary)' }}>
                    {result.symbol}
                  </span>
                  <span style={{ color: 'var(--tv-text-secondary)', fontSize: '12px' }}>
                    {(result.company || result.description)?.slice(0, 30)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {["TSLA", "GOOGL", "NVDA", "AMZN", "META", "SPY"]
              .filter(s => !symbols.includes(s))
              .map(s => (
                <button
                  key={s}
                  onClick={() => addSymbol(s)}
                  disabled={symbols.length >= 4}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--tv-border)',
                    borderRadius: '4px',
                    color: 'var(--tv-text-secondary)',
                    padding: '3px 10px',
                    fontSize: '11px',
                    cursor: symbols.length >= 4 ? 'not-allowed' : 'pointer',
                    opacity: symbols.length >= 4 ? 0.4 : 1,
                    transition: 'all 0.1s'
                  }}
                  onMouseOver={e => {
                    if (symbols.length < 4) {
                      e.currentTarget.style.borderColor = 'var(--tv-accent)'
                      e.currentTarget.style.color = 'var(--tv-accent)'
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--tv-border)'
                    e.currentTarget.style.color = 'var(--tv-text-secondary)'
                  }}
                >
                  + {s}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div style={{
        background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)',
        borderRadius: 8, padding: '24px 16px 16px', position: 'relative'
      }}>
        <div style={{ height: 400, width: '100%', minWidth: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LoadingSkeleton height={300} width="100%" />
            </div>
          ) : isError ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tv-red)' }}>
              Error loading chart data. Please try again.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {hasInteracted && symbols.filter(Boolean).length < 2 ? (
                <div style={{ 
                  height: '100%', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: 'var(--tv-text-muted)', fontSize: 14,
                  flexDirection: 'column', gap: 12
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                    <path d="M3 3v18h18"/>
                    <path d="M18 9l-5 5-4-4-6 6"/>
                  </svg>
                  Please add at least 2 symbols to compare
                </div>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--tv-border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--tv-text-muted)' }}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--tv-text-muted)' }}
                    tickFormatter={(v) => `${v}%`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--tv-bg-elevated)', 
                      border: '1px solid var(--tv-border)',
                      borderRadius: 4,
                      fontSize: 12
                    }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ paddingTop: 20 }}
                    formatter={(value) => {
                      const ret = currentReturns[value]
                      const color = ret >= 0 ? 'var(--tv-green)' : 'var(--tv-red)'
                      return (
                        <span style={{ color: 'var(--tv-text-primary)', fontSize: 12, fontWeight: 500 }}>
                          {value} <span style={{ color, marginLeft: 4 }}>{ret >= 0 ? '+' : ''}{ret}%</span>
                        </span>
                      )
                    }}
                  />
                  {symbols.filter(Boolean).map((sym, i) => (
                    <Line
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={600}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
        {symbols.filter(Boolean).map((sym, i) => {
          const finalVal = chartData[chartData.length - 1]?.[sym]
          return (
            <div key={sym} style={{
              background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)',
              borderRadius: 8, padding: 16, borderLeft: `4px solid ${COLORS[i]}`
            }}>
              <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {sym} Return ({range.label})
              </div>
              <div style={{ 
                fontSize: 20, fontWeight: 700, fontFamily: 'var(--tv-font-mono)',
                color: finalVal >= 0 ? 'var(--tv-green)' : 'var(--tv-red)'
              }}>
                {finalVal >= 0 ? '+' : ''}{finalVal}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
