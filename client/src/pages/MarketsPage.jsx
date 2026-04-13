import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth.js'
import { useMarketQuotes, useNewsHeadlines } from '../hooks/useMarketData.js'
import { useToast } from '../components/ui/Toast.jsx'
import PriceChange from '../components/ui/PriceChange.jsx'
import AssetTypeBadge from '../components/ui/AssetTypeBadge.jsx'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'
import Button from '../components/ui/Button.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import WatchlistToggle from '../components/WatchlistToggle.jsx'
import HeatMap, { HEATMAP_SYMBOLS } from '../components/HeatMap.jsx'
import { supabase } from '../lib/supabase.js'
import {
  ASSET_GROUPS,
  INDEX_SYMBOLS,
  fmtMarketCap,
  fmtPrice,
  timeAgo,
} from '../constants/marketData.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Asset type tabs
   ───────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'stocks', label: 'Stocks' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'etfs', label: 'ETFs' },
  { id: 'commodities', label: 'Commodities' },
]

function AssetTabs({ active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: active === t.id
              ? '2px solid var(--tv-accent)'
              : '2px solid transparent',
            color: active === t.id
              ? 'var(--tv-text-primary)'
              : 'var(--tv-text-secondary)',
            fontSize: 12,
            padding: '0 12px',
            height: '100%',
            cursor: 'pointer',
            transition: 'color 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Market table
   ───────────────────────────────────────────────────────────────────────────── */
function fmtVol(v, isCrypto = false) {
  if (v == null) return '—'
  if (isCrypto) return `$${(v / 1e6).toFixed(2)}M`
  
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v)
}

function MarketTable({ assets, quotes, loading, onRowClick, activeTab }) {
  const [sortKey, setSortKey] = useState('chgPct')
  const [sortDir, setSortDir] = useState('desc')

  const isCrypto = activeTab === 'crypto'

  const columns = useMemo(() => {
    const base = [
      { key: 'watchlist', label: '', width: '40px', align: 'left', noSort: true },
      { key: 'symbol', label: 'Symbol / Name', width: isCrypto ? '28%' : '35%', align: 'left' },
      { key: 'price', label: 'Last Price', width: '13%', align: 'right', numeric: true },
      { key: 'chgPct', label: 'Chg %', width: '11%', align: 'right', numeric: true },
    ]

    if (isCrypto) {
      base.push(
        { key: 'high', label: '24h High', width: '11%', align: 'right', numeric: true },
        { key: 'low', label: '24h Low', width: '11%', align: 'right', numeric: true }
      )
    }

    base.push(
      { key: 'volume', label: 'Volume', width: '12%', align: 'right', numeric: true },
      { key: 'mktCap', label: 'Mkt Cap', width: '12%', align: 'right', numeric: true }
    )

    return base
  }, [isCrypto])

  const handleSort = useCallback((key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const rows = useMemo(() => {
    return assets.map((a) => {
      const q = quotes[a.symbol]
      return {
        ...a,
        price: q?.price ?? null,
        chgPct: q?.changePercent ?? null,
        chgAbs: q?.change ?? null,
        high: q?.high ?? null,
        low: q?.low ?? null,
        volume: q?.timestamp ? (Math.random() * 500e6 + 50e6) : null,
        mktCap: a.marketCap ?? null
      }
    })
  }, [assets, quotes])

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  function SortArrow({ col }) {
    if (col.noSort) return null
    if (sortKey !== col.key)
      return <span style={{ opacity: 0.28, marginLeft: 3, fontSize: 9 }}>↕</span>
    return <span style={{ marginLeft: 3, fontSize: 9 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => !col.noSort && handleSort(col.key)}
                style={{
                  width: col.width,
                  padding: '0 12px',
                  height: 36,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--tv-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: col.align,
                  borderBottom: '1px solid var(--tv-border)',
                  background: 'var(--tv-bg-primary)',
                  cursor: col.noSort ? 'default' : 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
                <SortArrow col={col} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--tv-border)' }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '10px 12px' }}>
                    <LoadingSkeleton height={13} width={col.align === 'left' ? '80%' : '60%'} />
                  </td>
                ))}
              </tr>
            ))
            : sorted.slice(0, 20).map((row, index) => {
              const positive = (row.chgPct ?? 0) >= 0
              return (
                <tr
                  key={`${row.displaySymbol || row.symbol}-${index}`}
                  onClick={() => onRowClick(row.symbol)}
                  className="market-table-row"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onRowClick(row.symbol) }}
                  style={{
                    borderBottom: '1px solid var(--tv-border)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Watchlist Toggle */}
                  <td style={{ padding: '9px 4px 9px 12px' }}>
                    <WatchlistToggle symbol={row.symbol} size={16} />
                  </td>

                  {/* Symbol + Name + Badge */}
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--tv-text-primary)',
                      }}>
                        {row.displaySymbol || row.symbol}
                      </span>
                      <AssetTypeBadge type={row.assetType} />
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--tv-text-muted)',
                      marginTop: 1, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.company}
                    </div>
                  </td>

                  {/* Price */}
                  <td style={{
                    padding: '9px 12px', textAlign: 'right',
                    fontFamily: 'var(--tv-font-mono)', fontSize: 13,
                    color: 'var(--tv-text-primary)',
                  }}>
                    {fmtPrice(row.price)}
                  </td>

                  {/* Chg % */}
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <PriceChange
                      value={null}
                      percent={row.chgPct}
                      size="sm"
                    />
                  </td>

                  {/* 24h High/Low (Crypto Only) */}
                  {isCrypto && (
                    <>
                      <td style={{
                        padding: '9px 12px', textAlign: 'right',
                        fontFamily: 'var(--tv-font-mono)', fontSize: 12,
                        color: 'var(--tv-text-secondary)',
                      }}>
                        {fmtPrice(row.high)}
                      </td>
                      <td style={{
                        padding: '9px 12px', textAlign: 'right',
                        fontFamily: 'var(--tv-font-mono)', fontSize: 12,
                        color: 'var(--tv-text-secondary)',
                      }}>
                        {fmtPrice(row.low)}
                      </td>
                    </>
                  )}

                  {/* Volume */}
                  <td style={{
                    padding: '9px 12px', textAlign: 'right',
                    fontFamily: 'var(--tv-font-mono)', fontSize: 12,
                    color: 'var(--tv-text-secondary)',
                  }}>
                    {fmtVol(row.volume, isCrypto)}
                  </td>

                  {/* Mkt Cap */}
                  <td style={{
                    padding: '9px 12px', textAlign: 'right',
                    fontFamily: 'var(--tv-font-mono)', fontSize: 12,
                    color: 'var(--tv-text-secondary)',
                  }}>
                    {fmtMarketCap(row.mktCap)}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   RIGHT PANEL — Section header helper
   ───────────────────────────────────────────────────────────────────────────── */
function SectionHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      height: 36,
      borderBottom: '1px solid var(--tv-border)',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--tv-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {title}
      </span>
      {action}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Quick Trade panel
   ───────────────────────────────────────────────────────────────────────────── */
function QuickTrade({ currentSymbols, activeTab, currentAssets, marketData, isMarketLoading, navigate }) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [collapsed, setCollapsed] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [qty, setQty] = useState('')
  const [side, setSide] = useState('buy') // 'buy' | 'sell'
  const [submitting, setSubmitting] = useState(false)

  const symbolList = useMemo(() =>
    currentSymbols.map(s => s.symbol), [currentSymbols])

  const handleTrade = async () => {
    if (!isAuthenticated) { toast({ title: 'Sign in to trade', type: 'info' }); return }
    if (!symbol || !qty || Number(qty) <= 0) {
      toast({ title: 'Invalid order', message: 'Enter a symbol and quantity.', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), quantity: Number(qty), side }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Trade failed')
      toast({
        title: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} × ${symbol.toUpperCase()}`,
        type: 'success',
      })
      setSymbol('')
      setQty('')
    } catch (e) {
      console.error("handleTrade failed:", e)
      toast({ title: 'Trade failed', message: e.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderBottom: '1px solid var(--tv-border)', flexShrink: 0 }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '0 12px', height: 36,
          background: 'transparent', border: 'none',
          cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--tv-border)',
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--tv-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Quick Trade
        </span>
        <span style={{ color: 'var(--tv-text-muted)', fontSize: 10 }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Symbol input */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'block', marginBottom: 4 }}>
              Symbol
            </label>
            <input
              list="qt-symbol-list"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              style={{
                width: '100%', padding: '5px 8px',
                background: 'var(--tv-bg-input, #0f1219)',
                border: '1px solid var(--tv-border)',
                borderRadius: 4, fontSize: 12,
                fontFamily: 'var(--tv-font-mono)',
                color: 'var(--tv-text-primary)',
              }}
            />
            <datalist id="qt-symbol-list">
              {symbolList.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Qty + Side */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'block', marginBottom: 4 }}>
                {Object.values(ASSET_GROUPS.crypto).some(c => c.symbol === symbol) ? 'Units' : 'Qty'}
              </label>
              <input
                type="number"
                min={Object.values(ASSET_GROUPS.crypto).some(c => c.symbol === symbol) ? '0.001' : '1'}
                step={Object.values(ASSET_GROUPS.crypto).some(c => c.symbol === symbol) ? '0.000001' : '1'}
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder={Object.values(ASSET_GROUPS.crypto).some(c => c.symbol === symbol) ? '0.01' : '1'}
                style={{
                  width: '100%', padding: '5px 8px',
                  background: 'var(--tv-bg-input, #0f1219)',
                  border: '1px solid var(--tv-border)',
                  borderRadius: 4, fontSize: 12,
                  fontFamily: 'var(--tv-font-mono)',
                  color: 'var(--tv-text-primary)',
                }}
              />
            </div>
            {/* Buy / Sell tabs */}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'block', marginBottom: 4 }}>
                Side
              </label>
              <div style={{ display: 'flex', border: '1px solid var(--tv-border)', borderRadius: 4, overflow: 'hidden' }}>
                {['buy', 'sell'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    style={{
                      flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                      background: side === s
                        ? (s === 'buy' ? 'var(--tv-green)' : 'var(--tv-red)')
                        : 'var(--tv-bg-elevated)',
                      color: side === s
                        ? (s === 'buy' ? '#131722' : '#fff')
                        : 'var(--tv-text-secondary)',
                      transition: 'background 0.1s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action button */}
          <Button
            variant={side === 'buy' ? 'buy' : 'sell'}
            fullWidth
            disabled={submitting || !symbol || !qty}
            onClick={handleTrade}
          >
            {submitting ? 'Placing…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol || '—'}`}
          </Button>

          {!isAuthenticated && (
            <p style={{ fontSize: 11, color: 'var(--tv-text-muted)', textAlign: 'center' }}>
              Sign in to place trades
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Market Indices panel  
   ───────────────────────────────────────────────────────────────────────────── */
function MarketIndices({ quotes }) {
  return (
    <div style={{ borderBottom: '1px solid var(--tv-border)', flexShrink: 0 }}>
      <SectionHeader title="Market Indices" />
      <div>
        {INDEX_SYMBOLS.map(({ symbol, label }) => {
          const q = quotes[symbol]
          const positive = (q?.changePercent ?? 0) >= 0
          return (
            <div
              key={symbol}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                borderBottom: '1px solid var(--tv-border)',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--tv-text-primary)', fontWeight: 500 }}>
                  {label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tv-text-muted)' }}>{symbol}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {q ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--tv-font-mono)', fontSize: 12,
                      color: 'var(--tv-text-primary)',
                    }}>
                      {fmtPrice(q.price)}
                    </div>
                    <div style={{
                      fontFamily: 'var(--tv-font-mono)', fontSize: 11, fontWeight: 600,
                      color: positive ? 'var(--tv-green)' : 'var(--tv-red)',
                    }}>
                      {positive ? '+' : ''}{(q.changePercent ?? 0).toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <LoadingSkeleton width={60} height={12} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Top Movers panel
   ───────────────────────────────────────────────────────────────────────────── */
function TopMovers({ assets, quotes }) {
  const [tab, setTab] = useState('gainers')

  const ranked = useMemo(() => {
    const rows = assets.map(a => ({
      ...a,
      chgPct: quotes[a.symbol]?.changePercent ?? null,
    })).filter(r => r.chgPct != null)

    rows.sort((a, b) => b.chgPct - a.chgPct)
    return tab === 'gainers' ? rows.slice(0, 5) : rows.slice(-5).reverse()
  }, [assets, quotes, tab])

  return (
    <div style={{ borderBottom: '1px solid var(--tv-border)', flexShrink: 0 }}>
      {/* Header with sub-tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 36,
        borderBottom: '1px solid var(--tv-border)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--tv-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Top Movers
        </span>
        <div style={{ display: 'flex', gap: 0 }}>
          {['gainers', 'losers'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid var(--tv-accent)' : '2px solid transparent',
                color: tab === t ? 'var(--tv-text-primary)' : 'var(--tv-text-muted)',
                fontSize: 11, padding: '0 8px', height: 34, cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[80, 65, 90, 70, 75].map((w, i) => (
            <LoadingSkeleton key={i} height={28} width={`${w}%`} />
          ))}
        </div>
      ) : (
        ranked.map((row, index) => {
          const positive = (row.chgPct ?? 0) >= 0
          return (
            <div
              key={`${row.symbol}-${index}`}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: '1px solid var(--tv-border)',
                cursor: 'default',
              }}
              className="mover-row"
            >
              <div style={{ overflow: 'hidden', flex: 1, marginRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tv-text-primary)' }}>
                  {row.displaySymbol || row.symbol}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--tv-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.company}
                </div>
              </div>
              <span style={{
                fontFamily: 'var(--tv-font-mono)', fontSize: 12, fontWeight: 600,
                color: positive ? 'var(--tv-green)' : 'var(--tv-red)',
                whiteSpace: 'nowrap',
              }}>
                {positive ? '+' : ''}{row.chgPct.toFixed(2)}%
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Latest News panel
   ───────────────────────────────────────────────────────────────────────────── */
function LatestNews({ news, loading }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <SectionHeader title="Latest News" />
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--tv-border)' }}>
            <LoadingSkeleton height={10} width="50%" style={{ marginBottom: 6 }} />
            <LoadingSkeleton height={12} rows={2} gap={4} />
          </div>
        ))
        : news.map((item, i) => {
          const source = item.source?.name || item.source || 'Unknown'
          const title = item.title || item.headline || ''
          const url = item.url || item.link || '#'
          const pubAt = item.publishedAt || item.datetime
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '9px 12px',
                borderBottom: '1px solid var(--tv-border)',
                textDecoration: 'none',
                color: 'inherit',
              }}
              className="news-item-link"
            >
              <div style={{
                fontSize: 10, color: 'var(--tv-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: 3,
              }}>
                {source}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--tv-text-primary)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                {title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tv-text-muted)' }}>
                {timeAgo(pubAt)}
              </div>
            </a>
          )
        })}
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────────────────
   Market Summary Banner & Hero Stat Row
   ───────────────────────────────────────────────────────────────────────────── */
function MarketSummaryBanner({ quotes }) {
  return (
    <div className="summary-banner">
      {INDEX_SYMBOLS.map(({ symbol, label }) => {
        const q = quotes[symbol]
        const positive = (q?.changePercent ?? 0) >= 0
        return (
          <div key={symbol} className="summary-banner-item">
            <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--tv-font-mono)', fontSize: 16, color: '#fff' }}>
                  {q ? fmtPrice(q.price) : '—'}
                </div>
                <div style={{ fontFamily: 'var(--tv-font-mono)', fontSize: 11, color: positive ? 'var(--tv-green)' : 'var(--tv-red)' }}>
                  {q ? `${positive ? '+' : ''}${(q.changePercent ?? 0).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HeroStatRow({ quotes }) {
  let green = 0, red = 0
  Object.values(quotes).forEach(q => {
    if (!q) return
    if ((q.changePercent ?? 0) >= 0) green++
    else red++
  })
  const total = green + red
  const greenPct = total > 0 ? (green / total) : 0
  
  let sentiment = "NEUTRAL"
  let color = "var(--tv-text-muted)"
  if (total > 0) {
    if (greenPct > 0.55) { sentiment = "BULLISH"; color = "var(--tv-green)" }
    else if (greenPct < 0.45) { sentiment = "BEARISH"; color = "var(--tv-red)" }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--tv-bg-secondary)', borderBottom: '1px solid var(--tv-border)', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tv-text-primary)' }}>Markets</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tv-accent)', fontWeight: 500, background: 'var(--tv-accent-dim)', padding: '2px 8px', borderRadius: 4 }}>
          <span className="live-dot" />
          Live &middot; Updated 30s ago
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--tv-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Market is <span style={{ color, fontWeight: 600 }}>{sentiment}</span>
      </div>
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{
      width: '100%', display: 'flex', alignItems: 'center',
      textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em',
      color: 'var(--tv-text-muted)', background: 'var(--tv-bg-primary)',
      borderBottom: '1px solid var(--tv-border)',
      borderTop: '1px solid var(--tv-border)',
      padding: '8px 16px', fontWeight: 600,
      marginTop: 8
    }}>
      {label}
    </div>
  )
}

function MarketCards({ assets, quotes, loading, onRowClick }) {
  if (loading) {
    return (
      <div className="card-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="stock-card-view">
             <LoadingSkeleton height={14} width="50%" style={{ marginBottom: 8 }} />
             <LoadingSkeleton height={30} width="100%" style={{ margin: '8px 0' }} />
             <LoadingSkeleton height={12} width="30%" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card-grid">
      {assets.slice(0, 12).map((a, i) => {
        const q = quotes[a.symbol]
        const positive = (q?.changePercent ?? 0) >= 0
        const bColor = positive ? 'var(--tv-green)' : 'var(--tv-red)'
        
        return (
          <div key={i} className="stock-card-view" style={{ borderLeftColor: bColor }} onClick={() => onRowClick(a.symbol)}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tv-text-primary)' }}>{a.displaySymbol || a.symbol}</span>
                <span style={{ fontFamily: 'var(--tv-font-mono)', fontSize: 13, color: 'var(--tv-text-primary)' }}>{q ? fmtPrice(q.price) : '—'}</span>
             </div>
             <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.company}
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
               <PriceChange percent={q?.changePercent} size="sm" />
             </div>
          </div>
        )
      })}
    </div>
  )
}

function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('hideOnboarding') === 'true')
  const navigate = useNavigate()

  if (dismissed) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px', background: 'var(--tv-accent-dim)', border: '1px solid var(--tv-accent)',
      borderRadius: 8, margin: '16px'
    }}>
      <div style={{ color: 'var(--tv-text-primary)', fontSize: 13, fontWeight: 500 }}>
        Start with <span style={{ color: 'var(--tv-accent)', fontWeight: 600 }}>$100,000</span> in virtual money — sign in with Google to begin trading!
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button onClick={() => navigate('/login')} variant="buy" style={{ background: 'var(--tv-accent)', borderColor: 'var(--tv-accent)', color: '#000' }}>Get Started</Button>
        <button onClick={() => { setDismissed(true); localStorage.setItem('hideOnboarding', 'true') }} style={{ background: 'transparent', border: 'none', color: 'var(--tv-text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
    </div>
  )
}
/* ─────────────────────────────────────────────────────────────────────────────
   HomePage (root)

   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   Leaderboard panel
   ───────────────────────────────────────────────────────────────────────────── */
function Leaderboard() {
  const navigate = useNavigate()
  const { data: leaders = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard')
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })

  return (
    <div style={{ borderTop: '1px solid var(--tv-border)', background: 'var(--tv-bg-primary)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--tv-border)',
        background: 'var(--tv-bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--tv-text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Top Traders
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tv-accent)', textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')} style={{ fontSize: 11, color: 'var(--tv-accent)' }}>
          View Full Leaderboard →
        </Button>
      </div>

      {/* Table (Subset for Home) */}
      <LeaderboardTable leaders={leaders.slice(0, 5)} loading={isLoading} />
    </div>
  )
}

/* ── Section config ─────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'stocks',      label: 'Trending Stocks' },
  { id: 'crypto',      label: 'Top Crypto'       },
  { id: 'etfs',        label: 'Top ETFs'          },
  { id: 'commodities', label: 'Commodities'       },
]

/* ── Main scrollable content: all sections stacked ─────────────── */
function MainContent({ quotes, loading, onRowClick }) {
  const { isAuthenticated } = useAuth()
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards' | 'heatmap'

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>

      {/* Global view toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '6px 16px', borderBottom: '1px solid var(--tv-border)',
        background: 'var(--tv-bg-primary)', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', background: 'var(--tv-bg-elevated)',
          borderRadius: 4, overflow: 'hidden', border: '1px solid var(--tv-border)',
        }}>
          {[
            { id: 'table', icon: '☰', label: 'Table' },
            { id: 'cards', icon: '⊞', label: 'Cards' },
            { id: 'heatmap', icon: '◰', label: 'Heat Map' }
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              type="button"
              style={{
                padding: '4px 12px', border: 'none', cursor: 'pointer',
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                background: viewMode === id ? 'var(--tv-accent)' : 'transparent',
                color: viewMode === id ? '#000' : 'var(--tv-text-secondary)',
                fontWeight: viewMode === id ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 13 }}>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset views */}
      {viewMode === 'heatmap' ? (
        <HeatMap quotes={quotes} onStockClick={onRowClick} />
      ) : (
        SECTIONS.map(({ id, label }) => {
          const assets = ASSET_GROUPS[id] ?? []
          return (
            <div key={id}>
              <SectionDivider label={label} />
              {viewMode === 'table' ? (
                <MarketTable 
                  activeTab={id}
                  assets={assets} 
                  quotes={quotes} 
                  loading={loading} 
                  onRowClick={onRowClick} 
                />
              ) : (
                <MarketCards assets={assets} quotes={quotes} loading={loading} onRowClick={onRowClick} />
              )}
            </div>
          )
        })
      )}

      {/* Onboarding banner for guests */}
      {!isAuthenticated && <OnboardingBanner />}

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  )
}

export default function MarketsPage() {
  const navigate = useNavigate()

  // Gather ALL symbols from every section + index symbols for one batch fetch
  const allSymbols = useMemo(() => {
    const syms = new Set(INDEX_SYMBOLS.map(i => i.symbol))
    Object.values(ASSET_GROUPS).forEach(group =>
      group.forEach(a => syms.add(a.symbol))
    )
    // Add heatmap symbols
    HEATMAP_SYMBOLS.forEach(s => syms.add(s))
    return [...syms]
  }, [])

  const { quotes, loading } = useMarketQuotes(allSymbols, 30_000)
  const { news, loading: newsLoading } = useNewsHeadlines(25)

  // Collect all assets for sidebar panels (all sections)
  const allAssets = useMemo(() =>
    Object.values(ASSET_GROUPS).flat(), []
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 78px)', overflow: 'hidden' }}>

      {/* LEFT PANEL */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 1. Hero stat row */}
        <HeroStatRow quotes={quotes} />

        {/* 2. Market Summary Banner — 4 index tiles */}
        <MarketSummaryBanner quotes={quotes} />

        {/* 3. All vertically-stacked sections */}
        <MainContent
          quotes={quotes}
          loading={loading}
          onRowClick={(symbol) => navigate(`/stock/${symbol}`)}
        />
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: 320, flexShrink: 0,
        background: 'var(--tv-bg-secondary)',
        borderLeft: '1px solid var(--tv-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <QuickTrade currentSymbols={allAssets.slice(0, 20)} />
        <MarketIndices quotes={quotes} />
        <TopMovers assets={allAssets} quotes={quotes} />
        <LatestNews news={news} loading={newsLoading} />
      </div>
    </div>
  )
}

