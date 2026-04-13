import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketQuotes } from '../hooks/useMarketData.js'
import { STOCK_UNIVERSE, ALL_SYMBOLS } from '../data/stockUniverse.js'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'
import PriceChange from '../components/ui/PriceChange.jsx'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { apiUrl } from '../config'

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fmt(n) {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtCap(cat) {
  const map = { nano: '<$50M', micro: '<$300M', small: '<$2B', mid: '<$10B', large: '<$200B', mega: '>$200B' }
  return map[cat] ?? cat
}
function fmtVol(v) {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

/* ── Default filters ───────────────────────────────────────────────────────── */
const DEFAULT_FILTERS = {
  assetType: 'all',
  exchange: 'all',
  priceMin: '',
  priceMax: '',
  marketCap: 'all',
  changeFilter: 'all',
  volume: 'all',
  sector: 'all',
}

/* ── Preset saved screens ──────────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'gainers',
    label: 'Top Gainers',
    filters: { ...DEFAULT_FILTERS, changeFilter: 'gainers' },
  },
  {
    id: 'highvol',
    label: 'High Volume',
    filters: { ...DEFAULT_FILTERS, volume: 'high' },
  },
  {
    id: 'tech',
    label: 'Tech Stocks',
    filters: { ...DEFAULT_FILTERS, sector: 'Technology' },
  },
]

/* ── Sector color map ──────────────────────────────────────────────────────── */
const SECTOR_COLORS = {
  Technology:  '#58a6ff',
  Finance:     '#79c0ff',
  Healthcare:  '#56d364',
  Consumer:    '#f0883e',
  Energy:      '#d29922',
  Industrial:  '#bd93f9',
  Crypto:      '#ffdf5d',
  ETF:         '#7d8590',
}

/* ── Filter sidebar ────────────────────────────────────────────────────────── */
function FilterRow({ label, children, onClear, active }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </label>
        {active && (
          <button onClick={onClear} type="button" style={{
            background: 'none', border: 'none', color: 'var(--tv-accent)', fontSize: 16,
            cursor: 'pointer', lineHeight: 1, padding: '0 4px',
          }} title="Clear filter">×</button>
        )}
      </div>
      {children}
    </div>
  )
}

const SELECT_STYLE = {
  width: '100%', padding: '7px 10px',
  background: 'var(--tv-bg-input, #0f1219)',
  border: '1px solid var(--tv-border)',
  borderRadius: 4, fontSize: 12,
  color: 'var(--tv-text-primary, #d1d4dc)',
  cursor: 'pointer', outline: 'none',
  transition: 'border-color 0.15s',
}

const INPUT_STYLE = {
  width: '100%', padding: '7px 10px',
  background: 'var(--tv-bg-input, #0f1219)',
  border: '1px solid var(--tv-border)',
  borderRadius: 4, fontSize: 12,
  color: 'var(--tv-text-primary, #d1d4dc)',
  fontFamily: 'var(--tv-font-mono)',
  outline: 'none',
}

function FilterPanel({ filters, onChange, onReset, activeCount }) {
  const set = (key) => (e) => onChange(key, e.target.value)

  return (
    <div style={{
      width: 260, flexShrink: 0,
      borderRight: '1px solid var(--tv-border)',
      background: 'var(--tv-bg-secondary)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--tv-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tv-text-primary)' }}>Filters</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: 'var(--tv-accent)', color: '#000',
              borderRadius: 10, padding: '1px 6px', lineHeight: 1.6,
            }}>
              {activeCount}
            </span>
          )}
        </div>
        <button onClick={onReset} type="button" className="tv-link-ghost" style={{
          fontSize: 11, fontWeight: 600, color: 'var(--tv-accent)',
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
          Reset All
        </button>
      </div>

      {/* Scrollable filters */}
      <div style={{ padding: '16px 16px 32px', overflowY: 'auto', flex: 1 }}>

        {/* 1. Asset Type */}
        <FilterRow label="Asset Type" active={filters.assetType !== 'all'} onClear={() => onChange('assetType', 'all')}>
          <select value={filters.assetType} onChange={set('assetType')} style={SELECT_STYLE}>
            <option value="all">All Assets</option>
            <option value="stocks">Stocks</option>
            <option value="etfs">ETFs</option>
            <option value="crypto">Crypto</option>
          </select>
        </FilterRow>

        {/* 2. Exchange */}
        <FilterRow label="Exchange" active={filters.exchange !== 'all'} onClear={() => onChange('exchange', 'all')}>
          <select value={filters.exchange} onChange={set('exchange')} style={SELECT_STYLE}>
            <option value="all">All Exchanges</option>
            <option value="NASDAQ">NASDAQ</option>
            <option value="NYSE">NYSE</option>
            <option value="AMEX">AMEX</option>
            <option value="Crypto">Crypto</option>
          </select>
        </FilterRow>

        {/* 3. Price Range */}
        <FilterRow
          label="Price Range"
          active={filters.priceMin !== '' || filters.priceMax !== ''}
          onClear={() => { onChange('priceMin', ''); onChange('priceMax', '') }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" placeholder="Min $" value={filters.priceMin}
              onChange={set('priceMin')} style={{ ...INPUT_STYLE, width: '50%' }}
            />
            <span style={{ color: 'var(--tv-text-muted)', fontSize: 11 }}>–</span>
            <input
              type="number" placeholder="Max $" value={filters.priceMax}
              onChange={set('priceMax')} style={{ ...INPUT_STYLE, width: '50%' }}
            />
          </div>
        </FilterRow>

        {/* 4. Market Cap */}
        <FilterRow label="Market Cap" active={filters.marketCap !== 'all'} onClear={() => onChange('marketCap', 'all')}>
          <select value={filters.marketCap} onChange={set('marketCap')} style={SELECT_STYLE}>
            <option value="all">Any Market Cap</option>
            <option value="nano">Nano (&lt;$50M)</option>
            <option value="micro">Micro (&lt;$300M)</option>
            <option value="small">Small (&lt;$2B)</option>
            <option value="mid">Mid (&lt;$10B)</option>
            <option value="large">Large (&lt;$200B)</option>
            <option value="mega">Mega (&gt;$200B)</option>
          </select>
        </FilterRow>

        {/* 5. % Change Today */}
        <FilterRow label="% Change Today" active={filters.changeFilter !== 'all'} onClear={() => onChange('changeFilter', 'all')}>
          <select value={filters.changeFilter} onChange={set('changeFilter')} style={SELECT_STYLE}>
            <option value="all">Any Change</option>
            <option value="gainers">Gainers (&gt;0%)</option>
            <option value="losers">Losers (&lt;0%)</option>
            <option value="bigmovers">Big Movers (&gt;3% or &lt;-3%)</option>
          </select>
        </FilterRow>

        {/* 6. Volume */}
        <FilterRow label="Volume" active={filters.volume !== 'all'} onClear={() => onChange('volume', 'all')}>
          <select value={filters.volume} onChange={set('volume')} style={SELECT_STYLE}>
            <option value="all">Any Volume</option>
            <option value="high">High (&gt;5M)</option>
            <option value="veryhigh">Very High (&gt;20M)</option>
          </select>
        </FilterRow>

        {/* 7. Sector */}
        <FilterRow label="Sector" active={filters.sector !== 'all'} onClear={() => onChange('sector', 'all')}>
          <select value={filters.sector} onChange={set('sector')} style={SELECT_STYLE}>
            <option value="all">All Sectors</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Energy">Energy</option>
            <option value="Consumer">Consumer</option>
            <option value="Industrial">Industrial</option>
            <option value="Crypto">Crypto</option>
          </select>
        </FilterRow>
      </div>
    </div>
  )
}

/* ── Results Table ─────────────────────────────────────────────────────────── */
const COL_HEADERS = [
  { key: 'symbol',     label: 'Symbol',    width: '9%',  align: 'left'  },
  { key: 'company',    label: 'Company',   width: '18%', align: 'left',  noSort: true },
  { key: 'price',      label: 'Price',     width: '9%',  align: 'right', numeric: true },
  { key: 'chgPct',     label: 'Chg %',     width: '8%',  align: 'right', numeric: true },
  { key: 'avgVolume',  label: 'Volume',    width: '9%',  align: 'right', numeric: true },
  { key: 'marketCap',  label: 'Mkt Cap',   width: '8%',  align: 'right', noSort: true  },
  { key: 'sector',     label: 'Sector',    width: '11%', align: 'left',  noSort: true  },
  { key: 'peRatio',    label: 'P/E',       width: '6%',  align: 'right', numeric: true },
  { key: 'week52High', label: '52W High',  width: '9%',  align: 'right', numeric: true },
  { key: 'week52Low',  label: '52W Low',   width: '9%',  align: 'right', numeric: true },
  { key: 'action',     label: 'Action',    width: '7%',  align: 'center', noSort: true  },
]

function SortArrow({ col, sortKey, sortDir }) {
  if (col.noSort) return null
  if (sortKey !== col.key) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 9 }}>↕</span>
  return <span style={{ color: 'var(--tv-accent)', marginLeft: 4, fontSize: 9 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function ScreenerTable({ rows, loading }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const [sortKey, setSortKey] = useState('avgVolume')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = useCallback((key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const toggleWatchlist = async (e, symbol) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast({ title: 'Sign in Required', message: 'You must be logged in to manage your watchlist.', type: 'info' })
      return
    }
    
    try {
      const res = await fetch(apiUrl('/watchlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update watchlist')
      }
      toast({ title: 'Added to Watchlist', message: `${symbol} added successfully.`, type: 'success' })
    } catch (e) {
      toast({ title: 'Error', message: e.message, type: 'error' })
    }
  }

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

  if (loading) return (
    <div style={{ padding: 24 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <LoadingSkeleton key={i} height={38} style={{ marginBottom: 1 }} />
      ))}
    </div>
  )

  if (sorted.length === 0) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: 16, color: 'var(--tv-text-muted)',
      padding: 64,
    }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tv-text-primary)', marginBottom: 4 }}>No results match filters</div>
        <div style={{ fontSize: 13 }}>Try adjusting your criteria or resetting all filters</div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('reset-screener'))}>
        Reset All Filters
      </Button>
    </div>
  )

  return (
    <div style={{ overflowX: 'auto', flex: 1, background: 'var(--tv-bg-primary)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1000 }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--tv-bg-primary)' }}>
            {COL_HEADERS.map(col => (
              <th
                key={col.key}
                onClick={() => !col.noSort && handleSort(col.key)}
                style={{
                  width: col.width,
                  padding: '0 12px', height: 40,
                  fontSize: 10, fontWeight: 700,
                  color: sortKey === col.key ? 'var(--tv-accent)' : 'var(--tv-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  textAlign: col.align,
                  borderBottom: '1px solid var(--tv-border)',
                  borderTop: '1px solid var(--tv-border)',
                  cursor: col.noSort ? 'default' : 'pointer',
                  userSelect: 'none', whiteSpace: 'nowrap',
                }}
              >
                {col.label}<SortArrow col={col} sortKey={sortKey} sortDir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.symbol}
              onClick={() => navigate(`/stock/${row.symbol}`)}
              className="market-table-row"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/stock/${row.symbol}`) }}
              style={{ borderBottom: '1px solid var(--tv-border)', cursor: 'pointer' }}
            >
              {/* Symbol */}
              <td style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tv-accent)' }}>{row.symbol}</span>
              </td>

              {/* Company */}
              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tv-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.company}
              </td>

              {/* Price */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 13, color: 'var(--tv-text-primary)' }}>
                {row.price != null ? fmt(row.price) : <LoadingSkeleton height={12} width={55} />}
              </td>

              {/* Chg% */}
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                {row.chgPct != null
                  ? <PriceChange percent={row.chgPct} size="sm" />
                  : <LoadingSkeleton height={12} width={45} />}
              </td>

              {/* Volume */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 12, color: 'var(--tv-text-secondary)' }}>
                {fmtVol(row.avgVolume)}
              </td>

              {/* Mkt Cap Category */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--tv-text-muted)' }}>
                {row.marketCapCat ? fmtCap(row.marketCapCat) : '—'}
              </td>

              {/* Sector */}
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: SECTOR_COLORS[row.sector] ?? 'var(--tv-text-muted)',
                  background: `${SECTOR_COLORS[row.sector] ?? '#7d8590'}15`,
                  padding: '3px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.02em'
                }}>
                  {row.sector}
                </span>
              </td>

              {/* P/E */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 12, color: 'var(--tv-text-secondary)' }}>
                {row.peRatio != null ? row.peRatio.toFixed(1) : '—'}
              </td>

              {/* 52W High */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 12, color: 'var(--tv-green)' }}>
                {fmt(row.week52High)}
              </td>

              {/* 52W Low */}
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 12, color: 'var(--tv-red)' }}>
                {fmt(row.week52Low)}
              </td>

              {/* Action */}
              <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                   <button
                    onClick={(e) => toggleWatchlist(e, row.symbol)}
                    title="Add to Watchlist"
                    style={{
                      background: 'none', border: 'none', color: 'var(--tv-text-muted)',
                      cursor: 'pointer', fontSize: 18, padding: 0,
                      transition: 'color 0.15s'
                    }}
                    className="watchlist-btn"
                  >
                    ☆
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/stock/${row.symbol}`)}
                    style={{ padding: '3px 10px', fontSize: 11, height: 26 }}
                  >
                    Trade
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Screener Page ─────────────────────────────────────────────────────────── */
export default function ScreenerPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const { quotes, loading } = useMarketQuotes(ALL_SYMBOLS)

  // Register global reset listener
  useMemo(() => {
    const handleReset = () => setFilters(DEFAULT_FILTERS)
    window.addEventListener('reset-screener', handleReset)
    return () => window.removeEventListener('reset-screener', handleReset)
  }, [])

  // Count active filters
  const activeCount = useMemo(() =>
    Object.entries(filters).filter(([k, v]) => {
      if (k === 'assetType' || k === 'exchange' || k === 'marketCap' || k === 'changeFilter' || k === 'volume' || k === 'sector') return v !== 'all'
      if (k === 'priceMin' || k === 'priceMax') return v !== ''
      return false
    }).length,
  [filters])

  const handleChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  // Apply filters client-side
  const filteredRows = useMemo(() => {
    return STOCK_UNIVERSE.map(stock => {
      const q = quotes[stock.symbol]
      return { ...stock, price: q?.price ?? null, chgPct: q?.changePercent ?? null }
    }).filter(row => {
      const { assetType, exchange, priceMin, priceMax, marketCap, changeFilter, volume, sector } = filters

      // Asset type
      if (assetType === 'stocks' && (row.sector === 'ETF' || row.sector === 'Crypto')) return false
      if (assetType === 'etfs' && row.sector !== 'ETF') return false
      if (assetType === 'crypto' && row.sector !== 'Crypto') return false

      // Exchange
      if (exchange !== 'all' && row.exchange !== exchange) return false

      // Price range
      if (priceMin !== '' && (row.price == null || row.price < Number(priceMin))) return false
      if (priceMax !== '' && (row.price == null || row.price > Number(priceMax))) return false

      // Market Cap
      if (marketCap !== 'all' && row.marketCapCat !== marketCap) return false

      // % Change
      const pct = row.chgPct ?? 0
      if (changeFilter === 'gainers' && pct <= 2) return false // User requested >2%
      if (changeFilter === 'losers' && pct >= 0) return false
      if (changeFilter === 'bigmovers' && Math.abs(pct) <= 3) return false

      // Volume
      const vol = row.avgVolume ?? 0
      if (volume === 'high' && vol < 5_000_000) return false
      if (volume === 'veryhigh' && vol < 20_000_000) return false

      // Sector
      if (sector !== 'all' && row.sector !== sector) return false

      return true
    })
  }, [filters, quotes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Top Bar: Saved Screens ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--tv-border)',
        background: 'var(--tv-bg-secondary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Saved Screens
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--tv-border)' }} />
        </div>
        
        {PRESETS.map(preset => {
          // Check if this preset is active
          const isActive = JSON.stringify(preset.filters) === JSON.stringify(filters)
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFilters(preset.filters)}
              style={{
                fontSize: 12, fontWeight: 600,
                padding: '6px 14px', cursor: 'pointer',
                background: isActive ? 'var(--tv-accent-dim)' : 'transparent',
                border: isActive ? '1px solid var(--tv-accent)' : '1px solid var(--tv-border)',
                color: isActive ? 'var(--tv-accent)' : 'var(--tv-text-secondary)',
                borderRadius: 6,
                transition: 'all 0.15s',
              }}
              className="screener-preset-btn"
            >
              {preset.label}
            </button>
          )
        })}

        {/* Results count badge */}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--tv-text-muted)', fontWeight: 500 }}>
          Showing <span style={{ color: 'var(--tv-text-primary)', fontWeight: 700 }}>{filteredRows.length}</span> of {STOCK_UNIVERSE.length} symbols
        </div>
      </div>

      {/* ── Main Area ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Filter Sidebar */}
        <FilterPanel
          filters={filters}
          onChange={handleChange}
          onReset={handleReset}
          activeCount={activeCount}
        />

        {/* Results Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ScreenerTable rows={filteredRows} loading={loading} />
        </div>
      </div>
    </div>
  )
}
