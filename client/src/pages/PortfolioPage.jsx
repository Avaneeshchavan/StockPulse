import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMarketQuotes } from '../hooks/useMarketData.js'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, BarChart, Bar, Legend, CartesianGrid } from 'recharts'
import { getSector } from '../data/sectorMap.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { fetchWithAuth } from '../lib/api.js'
import { apiUrl } from '../config'
import { useToast } from '../components/ui/Toast.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import PriceChange from '../components/ui/PriceChange.jsx'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'
import Button from '../components/ui/Button.jsx'
import { STATIC_STOCK } from '../constants/stocks.js'

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────────── */
const STARTING_BALANCE = 100_000

// Professional multi-color palette for dark backgrounds
const PORTFOLIO_COLORS = [
  '#00d4aa',  // teal - primary accent
  '#3b82f6',  // blue
  '#f59e0b',  // amber
  '#ef4444',  // red
  '#8b5cf6',  // purple
  '#10b981',  // emerald
  '#f97316',  // orange
  '#ec4899',  // pink
  '#06b6d4',  // cyan
  '#84cc16',  // lime
  '#6366f1',  // indigo
  '#14b8a6',  // teal-2
]
// Legacy alias so existing references still work
const PIE_PALETTE = PORTFOLIO_COLORS

/* ─────────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────────── */
const fmtMoney = (n, dec = 2) =>
  n != null && Number.isFinite(Number(n))
    ? `$${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })}`
    : '—'

const fmtPct = (n) =>
  n != null && Number.isFinite(n)
    ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
    : '—'

/* ─────────────────────────────────────────────────────────────────
   SECTION HEADER
   ───────────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--tv-text-muted)',
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   FLUSH STAT CARDS ROW
   4 cells joined — gap 0, separated by 1px shared borders
   ───────────────────────────────────────────────────────────────── */
function FlushStatCard({ label, value, sub, subColor, borderLeft = false }) {
  return (
    <div style={{
      flex: '1 1 0',
      padding: '14px 18px 12px',
      background: 'var(--tv-bg-secondary)',
      borderTop: '1px solid var(--tv-border)',
      borderBottom: '1px solid var(--tv-border)',
      borderRight: '1px solid var(--tv-border)',
      borderLeft: borderLeft ? '1px solid var(--tv-border)' : 'none',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--tv-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, fontFamily: 'var(--tv-font-mono)',
        color: 'var(--tv-text-primary)', letterSpacing: '-0.02em',
        lineHeight: 1.15, marginBottom: sub ? 4 : 0,
      }}>
        {value}
      </div>
      {sub != null && (
        <div style={{
          fontSize: 12, fontFamily: 'var(--tv-font-mono)', fontWeight: 600,
          color: subColor ?? 'var(--tv-text-secondary)',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   PERFORMANCE CHART  (lightweight-charts area)
   ───────────────────────────────────────────────────────────────── */
const RANGE_LABELS = ['1W', '1M', '3M', 'ALL']

function PerformanceChart({ livePortfolioValue }) {
  const { user, profile } = useAuth()
  const [range, setRange] = useState('1M')

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['portfolioHistoryTransactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Transactions query error:', error)
        throw error
      }
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  })

  const series = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) {
      const bal = livePortfolioValue !== undefined ? livePortfolioValue : (Number(profile?.virtual_balance) || STARTING_BALANCE)
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      return [
        { time: yesterday, value: bal },
        { time: today, value: bal }
      ].map(p => ({ ...p, timeMs: new Date(p.time).getTime() }))
    }

    let cash = STARTING_BALANCE
    const positions = {}
    const lastKnownPrices = {}
    const dataPoints = []

    for (const tx of allTransactions) {
      const qty = Number(tx.quantity) || 0
      const price = Number(tx.price) || 0
      const sym = tx.symbol
      const isBuy = tx.side === 'buy' || tx.type === 'buy'

      lastKnownPrices[sym] = price

      if (isBuy) {
        cash -= qty * price
        positions[sym] = (positions[sym] || 0) + qty
      } else {
        cash += qty * price
        positions[sym] = (positions[sym] || 0) - qty
      }

      let positionsValue = 0
      for (const [s, q] of Object.entries(positions)) {
        if (q > 0) {
          positionsValue += q * (lastKnownPrices[s] || 0)
        }
      }

      dataPoints.push({
        time: tx.created_at.slice(0, 10),
        value: cash + positionsValue
      })
    }

    if (livePortfolioValue !== undefined) {
      dataPoints.push({
        time: new Date().toISOString().slice(0, 10),
        value: livePortfolioValue
      })
    }

    return dedupeByTime(dataPoints).map(p => ({ ...p, timeMs: new Date(p.time).getTime() }))
  }, [allTransactions, profile?.virtual_balance, livePortfolioValue])

  const visibleSeries = useMemo(() => {
    if (range === 'ALL' || series.length === 0) return series
    const cutoff = Date.now() - (range === '1W' ? 7 : range === '1M' ? 30 : 90) * 86400000
    const filtered = series.filter(p => p.timeMs >= cutoff)
    if (filtered.length < 2 && series.length >= 2) {
      return [series[series.length - 2], series[series.length - 1]]
    }
    return filtered.length > 0 ? filtered : series
  }, [series, range])

  const lastValue   = visibleSeries[visibleSeries.length - 1]?.value ?? STARTING_BALANCE
  const isPositive  = lastValue >= STARTING_BALANCE
  const chartColor  = isPositive ? '#26a69a' : '#ef5350'

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', padding: '8px 12px', fontSize: 12, borderRadius: 4, color: 'var(--tv-text-primary)' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tv-text-muted)' }}>{label}</p>
          <p style={{ margin: 0, fontFamily: 'var(--tv-font-mono)', fontWeight: 600 }}>{fmtMoney(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{
      background: 'var(--tv-bg-secondary)',
      borderBottom: '1px solid var(--tv-border)',
    }}>
      {/* Chart controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 0',
      }}>
        <div style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>
          Portfolio Value Over Time
          <span style={{
            marginLeft: 8, fontSize: 10,
            color: 'rgba(120,123,134,0.7)',
          }}>
            — $100,000 baseline
          </span>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {RANGE_LABELS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: range === r ? '2px solid var(--tv-accent)' : '2px solid transparent',
                color: range === r ? 'var(--tv-text-primary)' : 'var(--tv-text-muted)',
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', cursor: 'pointer',
                transition: 'color 0.1s',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height: 280, width: '100%', padding: '20px 20px 10px 0', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleSeries}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" minTickGap={30} tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(v) => '$' + v.toLocaleString()} tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false} orientation="right" width={60} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={STARTING_BALANCE} stroke="rgba(120,123,134,0.5)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="value" stroke={chartColor} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- chart helpers ---
function toChartDate(isoStr, offsetDays = 0) {
  const d = new Date(isoStr)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)  // 'YYYY-MM-DD'
}

function dedupeByTime(pts) {
  const seen = new Map()
  for (const p of pts) seen.set(p.time, p)
  return [...seen.values()].sort((a, b) => a.time.localeCompare(b.time))
}

/* ─────────────────────────────────────────────────────────────────
   HOLDINGS TABLE
   ───────────────────────────────────────────────────────────────── */
function buildColumns(navigate, totalPortfolioValue) {
  return [
    {
      key: 'symbol',
      label: 'Symbol',
      sortable: true,
      width: '8%',
      render: (v) => (
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--tv-text-primary)' }}>{v}</span>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      sortable: true,
      width: '16%',
      render: (v) => (
        <span style={{
          fontSize: 12, color: 'var(--tv-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block', maxWidth: 180,
        }}>{v}</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Shares',
      sortable: true,
      numeric: true,
      width: '7%',
      render: (v) => Number(v).toLocaleString(),
    },
    {
      key: 'avgPrice',
      label: 'Avg Price',
      sortable: true,
      numeric: true,
      width: '9%',
      render: (v) => fmtMoney(v),
    },
    {
      key: 'currentPrice',
      label: 'Cur Price',
      sortable: true,
      numeric: true,
      width: '9%',
      render: (v) => fmtMoney(v),
    },
    {
      key: 'dayChange',
      label: 'Day Chg',
      sortable: true,
      numeric: true,
      width: '9%',
      render: (v) => <PriceChange value={null} percent={v} size="sm" />,
    },
    {
      key: 'currentValue',
      label: 'Total Value',
      sortable: true,
      numeric: true,
      width: '10%',
      render: (v) => (
        <span style={{ fontWeight: 600 }}>{fmtMoney(v)}</span>
      ),
    },
    {
      key: 'returnPct',
      label: 'Total Return',
      sortable: true,
      numeric: true,
      width: '11%',
      render: (v, row) => (
        <span style={{ fontFamily: 'var(--tv-font-mono)', fontSize: 12 }}>
          <span style={{ color: (row.gainLoss ?? 0) >= 0 ? 'var(--tv-green)' : 'var(--tv-red)', fontWeight: 600 }}>
            {fmtMoney(Math.abs(row.gainLoss ?? 0))}
          </span>
          {' '}
          <span style={{
            fontSize: 11,
            color: (row.gainLoss ?? 0) >= 0 ? 'var(--tv-green)' : 'var(--tv-red)',
          }}>
            {fmtPct(v)}
          </span>
        </span>
      ),
    },
    {
      key: 'portfolioPct',
      label: '% of Port.',
      sortable: true,
      numeric: true,
      width: '9%',
      render: (v) => (
        <span style={{ fontFamily: 'var(--tv-font-mono)', fontSize: 12, color: 'var(--tv-text-secondary)' }}>
          {v != null ? `${v.toFixed(1)}%` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '9%',
      align: 'center',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); navigate(`/stock/${row.symbol}`) }}
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          Trade
        </Button>
      ),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   ALLOCATION SECTION
   ───────────────────────────────────────────────────────────────── */
function AllocationSection({ rows }) {
  const slices = useMemo(() => {
    const total = rows.reduce((s, r) => s + Math.max(0, r.currentValue), 0)
    return rows
      .filter(r => r.currentValue > 0)
      .map((r, i) => ({
        symbol:  r.symbol,
        company: r.company,
        value:   r.currentValue,
        pct:     total > 0 ? (r.currentValue / total) * 100 : 0,
        color:   PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  if (!slices.length) return null

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{
        background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)',
        borderRadius: 4, padding: '8px 12px', fontSize: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontWeight: 700, color: 'var(--tv-text-primary)', marginBottom: 3 }}>
          {d.symbol}
        </div>
        <div style={{ color: 'var(--tv-text-secondary)', fontSize: 11 }}>{d.company}</div>
        <div style={{ marginTop: 4, fontFamily: 'var(--tv-font-mono)', color: 'var(--tv-text-primary)' }}>
          {fmtMoney(d.value)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>
          {d.pct.toFixed(1)}% of portfolio
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: 0,
      border: '1px solid var(--tv-border)',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'var(--tv-bg-secondary)',
    }}>
      {/* Left: donut chart */}
      <div style={{
        padding: '16px 8px 16px 16px',
        borderRight: '1px solid var(--tv-border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <SectionLabel>Allocation</SectionLabel>
        <div style={{ width: '100%', height: 200, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                stroke="none"
                paddingAngle={2}
              >
                {slices.map((s, i) => (
                  <Cell key={s.symbol} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Compact legend — only show slices > 5% to avoid crowding */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
          {slices.map(s => s.pct > 5 ? (
            <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: s.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: 'var(--tv-text-muted)' }}>
                {s.symbol} <span style={{ color: 'var(--tv-text-secondary)' }}>{s.pct.toFixed(1)}%</span>
              </span>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Right: allocation list with % bars */}
      <div style={{ padding: '16px' }}>
        <SectionLabel>Holdings Breakdown</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slices.map(s => (
            <div key={s.symbol}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: s.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tv-text-primary)' }}>
                    {s.symbol}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--tv-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {s.company}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 12, fontFamily: 'var(--tv-font-mono)',
                    color: 'var(--tv-text-primary)', fontWeight: 600,
                  }}>
                    {fmtMoney(s.value)}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--tv-font-mono)',
                    color: 'var(--tv-text-muted)', width: 38, textAlign: 'right',
                  }}>
                    {s.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              {/* Thin colored progress bar */}
              <div style={{
                height: 4, borderRadius: 2,
                background: 'var(--tv-bg-elevated)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, s.pct)}%`,
                  background: s.color,
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   ACHIEVEMENTS GRID
   ───────────────────────────────────────────────────────────────── */
function AchievementGrid({ unlockedKeys = [] }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
      gap: 16, 
      marginTop: 20 
    }}>
      {ACHIEVEMENTS.map(ach => {
        const isUnlocked = unlockedKeys.includes(ach.key);
        return (
          <div 
            key={ach.key}
            title={ach.description}
            style={{
              padding: '20px 16px',
              background: isUnlocked ? 'var(--tv-bg-secondary)' : 'rgba(120,123,134,0.05)',
              border: isUnlocked ? '1px solid #ffd700' : '1px solid var(--tv-border)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transition: 'transform 0.2s',
              cursor: 'help',
              position: 'relative'
            }}
          >
            {!isUnlocked && (
              <div style={{
                position: 'absolute', top: 8, right: 8, fontSize: 12, opacity: 0.5
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            )}
            
            <div style={{ 
              fontSize: 13, 
              fontWeight: 700, 
              color: isUnlocked ? 'var(--tv-text-primary)' : 'var(--tv-text-muted)',
              marginBottom: 4
            }}>
              {ach.title}
            </div>
            
            <div style={{ 
              fontSize: 11, 
              color: 'var(--tv-text-muted)',
              lineHeight: 1.3
            }}>
              {ach.description}
            </div>

            {isUnlocked && (
              <div style={{ 
                marginTop: 10, 
                fontSize: 9, 
                color: '#ffd700', 
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                Unlocked
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   ANALYTICS TAB
   ───────────────────────────────────────────────────────────────── */
function AnalyticsTab({ transactions, rows, loading }) {
  const stats = useMemo(() => {
    if (!transactions.length) return { winRate: 0, best: 0, worst: 0, avgHold: 0, mostTraded: '—' }

    const symbolState = {}
    const completedTrades = []
    const counts = {}

    // Process transactions chronologically to match buys/sells
    const sortedTx = [...transactions].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
    
    sortedTx.forEach(t => {
      const sym = t.symbol
      counts[sym] = (counts[sym] || 0) + 1
      if (!symbolState[sym]) symbolState[sym] = { history: [] }
      
      const priceAtTime = Number(t.price) || 0
      const txQty = Number(t.quantity) || 0

      if (t.side === 'buy') {
        symbolState[sym].history.push({ qty: txQty, price: priceAtTime, date: new Date(t.created_at) })
      } else {
        // Simple FIFO-ish hold time and P&L matching
        let sellQtyLeft = txQty
        const sellDate = new Date(t.created_at)
        while (sellQtyLeft > 0 && symbolState[sym].history.length > 0) {
          const buy = symbolState[sym].history[0]
          const matchQty = Math.min(sellQtyLeft, buy.qty)
          
          const days = Math.max(1, Math.ceil((sellDate - buy.date) / (1000 * 60 * 60 * 24)))
          const profit = matchQty * (priceAtTime - buy.price)
          
          completedTrades.push({ profit, days })
          
          buy.qty -= matchQty
          sellQtyLeft -= matchQty
          if (buy.qty <= 0) symbolState[sym].history.shift()
        }
      }
    })

    const profitableSells = completedTrades.filter(tr => tr.profit > 0).length
    const winRate = completedTrades.length > 0 ? (profitableSells / completedTrades.length) * 100 : 0
    const best = Math.max(0, ...completedTrades.map(tr => tr.profit))
    const worst = Math.min(0, ...completedTrades.map(tr => tr.profit))
    const avgHold = completedTrades.length > 0 ? (completedTrades.reduce((s, tr) => s + tr.days, 0) / completedTrades.length) : 0
    
    let mostTraded = '—'
    let maxCount = 0
    Object.entries(counts).forEach(([s, c]) => {
      if (c > maxCount) { mostTraded = s; maxCount = c; }
    })

    return { winRate, best, worst, avgHold, mostTraded }
  }, [transactions])

  const sectorSlices = useMemo(() => {
    const sectors = {}
    rows.forEach(r => {
      const s = getSector(r.symbol)
      sectors[s] = (sectors[s] || 0) + r.currentValue
    })
    const total = Object.values(sectors).reduce((a, b) => a + b, 0)
    return Object.entries(sectors).map(([name, value], i) => ({
      name,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]
    })).sort((a,b) => b.value - a.value)
  }, [rows])

  const activityData = useMemo(() => {
    const weeks = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - (i * 7))
      const label = `W${8-i}`
      weeks.push({ label, buys: 0, sells: 0, date: d })
    }

    transactions.forEach(t => {
      const tDate = new Date(t.created_at)
      const weekIdx = weeks.findIndex((w, i) => {
        const nextW = (i < weeks.length - 1) ? weeks[i+1].date : new Date(now.getTime() + 86400000)
        return tDate >= w.date && tDate < nextW
      })
      if (weekIdx !== -1) {
        if (t.side === 'buy') weeks[weekIdx].buys++
        else weeks[weekIdx].sells++
      }
    })
    return weeks
  }, [transactions])

  if (loading) return <div style={{ padding: 40 }}><LoadingSkeleton height={300} width="100%" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
      {/* Row 1: Stats */}
      <div style={{ display: 'flex', gap: 0 }}>
        <FlushStatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub="Profitable trades" subColor="var(--tv-green)" borderLeft />
        <FlushStatCard label="Best Trade" value={fmtMoney(stats.best)} sub="Max single profit" subColor="var(--tv-green)" />
        <FlushStatCard label="Worst Trade" value={fmtMoney(stats.worst)} sub="Max single loss" subColor="var(--tv-red)" />
        <FlushStatCard label="Avg Hold" value={`${Math.round(stats.avgHold)}d`} sub="Time in position" />
        <FlushStatCard label="Most Traded" value={stats.mostTraded} sub="Highest activity" />
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Sector Exposure */}
        <div style={{ background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 4, padding: 16, minWidth: 0 }}>
          <SectionLabel>Sector Exposure</SectionLabel>
          <div style={{ height: 260, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectorSlices} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} stroke="none" paddingAngle={2}>
                  {sectorSlices.map((s, i) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip 
                   contentStyle={{ background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', borderRadius: 4 }}
                   formatter={(v, name, props) => [fmtMoney(v), `${name} (${props.payload.pct.toFixed(1)}%)`]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Activity */}
        <div style={{ background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 4, padding: 16, minWidth: 0 }}>
          <SectionLabel>Trade Activity (8W)</SectionLabel>
          <div style={{ height: 260, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,123,134,0.1)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--tv-text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--tv-text-muted)' }} />
                <Tooltip cursor={{ fill: 'rgba(120,123,134,0.05)' }} contentStyle={{ background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', borderRadius: 4, fontSize: 12 }} />
                <Bar dataKey="buys" name="Buys" fill="var(--tv-green)" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="sells" name="Sells" fill="var(--tv-red)" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top Holdings Performance */}
      <div style={{ background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 4, padding: 16 }}>
        <SectionLabel>Top Holdings Performance</SectionLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 10 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--tv-border)' }}>
              {['Symbol','Shares','Avg Buy','Current','Return %'].map(h => (
                <th key={h} style={{ padding: '8px 4px', fontSize: 10, color: 'var(--tv-text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a,b) => b.returnPct - a.returnPct).slice(0, 5).map(r => (
              <tr key={r.symbol} style={{ borderBottom: '1px solid var(--tv-border)' }}>
                <td style={{ padding: '10px 4px', fontWeight: 700 }}>{r.symbol}</td>
                <td style={{ padding: '10px 4px', fontSize: 12 }}>{r.quantity.toLocaleString()}</td>
                <td style={{ padding: '10px 4px', fontSize: 12, fontFamily: 'var(--tv-font-mono)' }}>{fmtMoney(r.avgPrice)}</td>
                <td style={{ padding: '10px 4px', fontSize: 12, fontFamily: 'var(--tv-font-mono)' }}>{fmtMoney(r.currentPrice)}</td>
                <td style={{ padding: '10px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 100, height: 4, background: 'var(--tv-bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(100, Math.abs(r.returnPct))}%`, 
                        background: r.returnPct >= 0 ? 'var(--tv-green)' : 'var(--tv-red)',
                        opacity: 0.6
                      }} />
                    </div>
                    <PriceChange percent={r.returnPct} size="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   EMPTY STATE
   ───────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px',
      border: '1px solid var(--tv-border)', borderRadius: 4,
      background: 'var(--tv-bg-secondary)',
    }}>
      <div style={{ marginBottom: 12, opacity: 0.4 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18"/>
          <path d="M18 9l-5 5-4-4-6 6"/>
        </svg>
      </div>
      <p style={{
        fontSize: 14, fontWeight: 600, color: 'var(--tv-text-primary)',
        marginBottom: 6,
      }}>
        No holdings yet
      </p>
      <p style={{ fontSize: 12, color: 'var(--tv-text-secondary)', marginBottom: 20 }}>
        Make your first virtual trade to start building your portfolio.
      </p>
      <Link
        to="/"
        style={{
          background: 'var(--tv-accent)', color: '#fff',
          padding: '7px 18px', borderRadius: 4,
          fontSize: 12, fontWeight: 500, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center',
        }}
      >
        Browse Markets
      </Link>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   REALTIME DOT
   ───────────────────────────────────────────────────────────────── */
function LiveDot({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? 'var(--tv-green)' : 'var(--tv-text-muted)',
        boxShadow: active ? '0 0 0 2px rgba(38,166,154,0.25)' : 'none',
        animation: active ? 'livePulse 2s infinite' : 'none',
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 10, color: active ? 'var(--tv-green)' : 'var(--tv-text-muted)' }}>
        {active ? 'Live' : 'Offline'}
      </span>
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
   PORTFOLIO PAGE (ROOT)
   ───────────────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const { error: errorToast } = useToast()

  const [rawHoldings,  setRawHoldings]  = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState(false)
  const [realtimeOn,   setRealtimeOn]   = useState(false)
  const [activeTab,    setActiveTab]    = useState('holdings') // holdings | analytics | history | achievements

  /* ── Fetch achievements ─────────────────────────────────────────── */
  const { data: unlockedKeys = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase.from('achievements').select('achievement_key').eq('user_id', user.id)
      if (error) {
        console.warn('achievements table not ready:', error.message)
        return []
      }
      return data?.map(a => a.achievement_key) || []
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => console.error('Achievements query error:', err)
  })

  /* ── Fetch holdings ─────────────────────────────────────────────── */
  const fetchHoldings = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetchWithAuth(apiUrl('/portfolio'))
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const errorData = await res.json()
          errMsg = errorData.message || errorData.error || JSON.stringify(errorData)
          console.error('[fetchHoldings] Backend error:', errorData)
        } catch {
          console.error('[fetchHoldings] HTTP error (non-JSON body):', res.status, res.statusText)
        }
        throw new Error(errMsg)
      }
      const body = await res.json()
      if (body.success) {
        // Map backend fields to frontend expected fields
        const formattedData = body.data.map(h => ({
          ...h,
          avg_buy_price: h.average_price, // backend uses 'average_price'
          created_at: h.updated_at,       // backend uses 'updated_at'
        }))
        setRawHoldings(formattedData)
      } else {
        console.error('[fetchHoldings] Unexpected body:', body)
        throw new Error(body.error || body.message || 'Failed to fetch holdings')
      }
    } catch (e) {
      console.error('[fetchHoldings] failed:', e.message)
      throw e
    }
  }, [user?.id])

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetchWithAuth(apiUrl('/portfolio/transactions?limit=100'))
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const errorData = await res.json()
          errMsg = errorData.message || errorData.error || JSON.stringify(errorData)
          console.error('[fetchTransactions] Backend error:', errorData)
        } catch {
          console.error('[fetchTransactions] HTTP error (non-JSON body):', res.status, res.statusText)
        }
        throw new Error(errMsg)
      }
      const body = await res.json()
      if (body.success) {
        // Map backend fields to frontend expected fields
        const formattedData = body.data.map(t => ({
          ...t,
          type: t.side,               // backend uses 'side', frontend expects 'type'
          created_at: t.created_at,   // backend uses 'created_at', frontend expects 'created_at' 
          price: t.price,             // backend uses 'price', frontend expects 'price'
        }))
        setTransactions(formattedData)
      } else {
        console.error('[fetchTransactions] Unexpected body:', body)
        throw new Error(body.error || body.message || 'Failed to fetch transactions')
      }
    } catch (error) {
      console.error('[fetchTransactions] failed:', error.message)
      throw error
    }
  }, [user?.id])

  /* ── Fetch current prices via hook ─────────────────────────── */
  const symbolsArray = useMemo(() => Array.from(new Set(rawHoldings.map(h => h.symbol))), [rawHoldings])
  const { quotes: priceMap } = useMarketQuotes(symbolsArray)

  /* ── Initial load ───────────────────────────────────────────────── */
  useEffect(() => {
    async function init() {
      setLoading(true)
      setFetchError(false)
      try {
        await Promise.all([fetchHoldings(), fetchTransactions()])
      } catch (err) {
        console.error("init failed:", err)
        setFetchError(true)
        setRawHoldings([])
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchHoldings, fetchTransactions])

  /* ── Supabase Realtime ─────────────────────────────────────────── */
  // Use a ref to keep the handlers stable for the subscription without re-triggering it
  const handlersRef = useRef({ fetchHoldings, fetchTransactions, fetchProfile })
  useEffect(() => {
    handlersRef.current = { fetchHoldings, fetchTransactions, fetchProfile }
  }, [fetchHoldings, fetchTransactions, fetchProfile])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`portfolio-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portfolio', filter: `user_id=eq.${user.id}` },
        () => {
          handlersRef.current.fetchHoldings()
          handlersRef.current.fetchProfile(user.id)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => handlersRef.current.fetchTransactions()
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeOn(true)
        if (status === 'CLOSED') setRealtimeOn(false)
      })

    return () => {
      supabase.removeChannel(channel)
      setRealtimeOn(false)
    }
  }, [user?.id])



  /* ── Derived rows ───────────────────────────────────────────────── */
  const rows = useMemo(() => {
    const totalValue = rawHoldings.reduce((s, h) => {
      const qty = Number(h.quantity)
      const p   = priceMap[h.symbol]?.price ?? STATIC_STOCK[h.symbol]?.price ?? Number(h.avg_buy_price)
      return s + qty * p
    }, 0)

    return rawHoldings.map(h => {
      const qty        = Number(h.quantity)
      const avgPrice   = Number(h.avg_buy_price)
      const curPrice   = priceMap[h.symbol]?.price ?? STATIC_STOCK[h.symbol]?.price ?? avgPrice
      const dayChange  = priceMap[h.symbol]?.changePercent ?? null
      const costBasis  = qty * avgPrice
      const curValue   = qty * curPrice
      const gainLoss   = curValue - costBasis
      const returnPct  = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      const portPct    = totalValue > 0 ? (curValue / totalValue) * 100 : 0

      return {
        id:           h.id ?? h.symbol,
        symbol:       h.symbol,
        company:      h.company_name ?? STATIC_STOCK[h.symbol]?.name ?? h.symbol,
        quantity:     qty,
        avgPrice,
        currentPrice: curPrice,
        dayChange,
        currentValue: curValue,
        gainLoss,
        returnPct,
        portfolioPct: portPct,
      }
    })
  }, [rawHoldings, priceMap])

  /* ── Portfolio totals ───────────────────────────────────────────── */
  const totals = useMemo(() => {
    // Get cash balance from profile - ensure it's a number
    const cashBalance = Number(profile?.virtual_balance) || 0

    // Day P&L: sum of (dayChange% × currentValue) across all holdings
    let dayPnl = 0
    for (const r of rows) {
      if (r.dayChange != null) {
        dayPnl += r.currentValue * (r.dayChange / 100)
      }
    }

    const totalHoldValue = rows.reduce((s, r) => s + r.currentValue, 0)
    const portfolioValue = cashBalance + totalHoldValue
    const totalReturn = portfolioValue - STARTING_BALANCE
    const totalReturnPct = (totalReturn / STARTING_BALANCE) * 100
    const dayPnlPct = totalHoldValue > 0 ? (dayPnl / totalHoldValue) * 100 : 0

    return {
      cash: cashBalance,
      portfolioValue,
      totalReturn,
      totalReturnPct,
      dayPnl,
      dayPnlPct,
      _hasBalanceError: !profile || cashBalance === 0 && rows.length > 0
    }
  }, [rows, profile])

  /* ── Price map for chart (keyed by symbol) ─────────────────────── */
  const chartPriceMap = useMemo(() => {
    const m = {}
    for (const [sym, q] of Object.entries(priceMap)) {
      m[sym] = q.price
    }
    return m
  }, [priceMap])

  /* ── Column defs ────────────────────────────────────────────────── */
  const columns = useMemo(
    () => buildColumns(navigate, totals.portfolioValue),
    [navigate, totals.portfolioValue]
  )

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <>
      {/* Livepulse keyframe */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ paddingBottom: 48 }}>

        {/* ── Page title bar ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 12px', borderBottom: '1px solid var(--tv-border)',
          marginBottom: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tv-text-primary)' }}>
              Portfolio
            </h1>
            <LiveDot active={realtimeOn} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/transaction-history" style={{
              fontSize: 11, color: 'var(--tv-text-secondary)',
              background: 'var(--tv-bg-elevated)',
              border: '1px solid var(--tv-border)',
              borderRadius: 4, padding: '4px 10px', textDecoration: 'none',
            }}>
              Transaction History
            </Link>
            <Link to="/" style={{
              fontSize: 11, color: '#fff',
              background: 'var(--tv-accent)',
              borderRadius: 4, padding: '4px 10px', textDecoration: 'none',
            }}>
              + New Trade
            </Link>
          </div>
        </div>

        {fetchError ? (
          <div style={{ textAlign: "center", padding: "40px", marginTop: 24, background: "var(--tv-bg-secondary)", borderRadius: 4, border: "1px solid var(--tv-border)" }}>
            <p style={{ color: "var(--tv-red)", fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Failed to load portfolio data. Please refresh.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', color: 'var(--tv-text-primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background='var(--tv-bg-primary)'} onMouseOut={(e) => e.target.style.background='var(--tv-bg-elevated)'}>Refresh Page</button>
          </div>
        ) : totals._hasBalanceError && !loading ? (
          <div style={{ textAlign: "center", padding: "40px", marginTop: 24, background: "var(--tv-bg-secondary)", borderRadius: 4, border: "1px solid var(--tv-border)" }}>
            <p style={{ color: "var(--tv-red)", fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Virtual balance is missing or 0. Cannot compute portfolio totals.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', color: 'var(--tv-text-primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Refresh Page</button>
          </div>
        ) : (
          <>
            {/* ── FLUSH SUMMARY CARDS (gap 0, 1px borders) ────────────── */}
            <div style={{ display: 'flex', marginBottom: 0 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                flex: '1 1 0', padding: '14px 18px',
                background: 'var(--tv-bg-secondary)',
                borderTop: '1px solid var(--tv-border)',
                borderBottom: '1px solid var(--tv-border)',
                borderRight: '1px solid var(--tv-border)',
                borderLeft: i === 0 ? '1px solid var(--tv-border)' : 'none',
              }}>
                <LoadingSkeleton height={10} width="55%" style={{ marginBottom: 8 }} />
                <LoadingSkeleton height={22} width="75%" />
              </div>
            ))
          ) : (
            <>
              <FlushStatCard
                label="Portfolio Value"
                value={fmtMoney(totals.portfolioValue)}
                borderLeft
              />
              <FlushStatCard
                label="Day's P&L"
                value={`${totals.dayPnl >= 0 ? '+' : ''}${fmtMoney(totals.dayPnl)}`}
                sub={fmtPct(totals.dayPnlPct)}
                subColor={totals.dayPnl >= 0 ? 'var(--tv-green)' : 'var(--tv-red)'}
              />
              <FlushStatCard
                label="Total Return"
                value={`${totals.totalReturn >= 0 ? '+' : ''}${fmtMoney(totals.totalReturn)}`}
                sub={fmtPct(totals.totalReturnPct)}
                subColor={totals.totalReturn >= 0 ? 'var(--tv-green)' : 'var(--tv-red)'}
              />
              <FlushStatCard
                label="Cash Balance"
                value={fmtMoney(totals.cash)}
                sub={`$${STARTING_BALANCE.toLocaleString()} starting`}
              />
            </>
          )}
        </div>

        {/* ── PERFORMANCE CHART ───────────────────────────────────── */}
        {loading ? (
          <div style={{ background: 'var(--tv-bg-secondary)', borderBottom: '1px solid var(--tv-border)', height: 320, padding: '16px' }}>
            <LoadingSkeleton height={14} width="200px" style={{ marginBottom: 12 }} />
            <LoadingSkeleton height="100%" width="100%" />
          </div>
        ) : (
          <PerformanceChart livePortfolioValue={totals.portfolioValue} />
        )}
        {/* ── TABS ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, padding: '12px 0 0', borderBottom: '1px solid var(--tv-border)', background: 'var(--tv-bg-primary)' }}>
          {['holdings', 'analytics', 'history', 'achievements'].map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent', border: 'none',
                  padding: '8px 4px', fontSize: 13, fontWeight: 600,
                  textTransform: 'capitalize', cursor: 'pointer',
                  color: activeTab === tab ? 'var(--tv-accent)' : 'var(--tv-text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--tv-accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
             >
               {tab}
             </button>
          ))}
        </div>

        {/* ── HOLDINGS TABLE / ANALYTICS / HISTORY ─────────────────── */}
        {activeTab === 'holdings' && (
          <div style={{ marginTop: 24 }}>
            <SectionLabel>Current Holdings</SectionLabel>
            {!loading && rows.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={rows}
                  rowKey="id"
                  loading={loading}
                  onRowClick={(row) => navigate(`/stock/${row.symbol}`)}
                  emptyText="No holdings yet — browse the market to start trading."
                  stickyHeader
                />
                {!loading && rows.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <AllocationSection rows={rows} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            transactions={transactions} 
            rows={rows} 
            loading={loading} 
          />
        )}

        {activeTab === 'history' && (
          <div style={{ marginTop: 24 }}>
            <SectionLabel>Recent Activity</SectionLabel>
            <DataTable
              columns={[
                { key: 'created_at', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
                { key: 'symbol', label: 'Symbol', render: (v) => <strong>{v}</strong> },
                { key: 'side', label: 'Type', render: (v) => <span style={{ textTransform: 'uppercase', color: v === 'buy' ? 'var(--tv-green)' : 'var(--tv-red)', fontWeight: 700, fontSize: 10 }}>{v}</span> },
                { key: 'quantity', label: 'Shares', numeric: true },
                { key: 'price', label: 'Price', numeric: true, render: (v) => fmtMoney(v) },
                { key: 'notes', label: 'Note', render: (v) => <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>{v || '—'}</span> }
              ]}
              data={transactions.slice(0, 20)}
              rowKey="id"
              loading={loading}
              emptyText="No transaction history yet."
            />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link to="/transaction-history" style={{ fontSize: 12, color: 'var(--tv-accent)', fontWeight: 600 }}>View Full Transaction History →</Link>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div style={{ marginTop: 24 }}>
            <SectionLabel>Your Achievements</SectionLabel>
            <AchievementGrid unlockedKeys={unlockedKeys} />
          </div>
        )}
          </>
        )}
      </div>
    </>
  )
}
