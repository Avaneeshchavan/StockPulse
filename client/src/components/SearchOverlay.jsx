import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── constants ──────────────────────────────────────────────────── */
const POPULAR = [
  { symbol: 'AAPL',  company: 'Apple Inc.',          exchange: 'NASDAQ' },
  { symbol: 'MSFT',  company: 'Microsoft Corp.',      exchange: 'NASDAQ' },
  { symbol: 'TSLA',  company: 'Tesla Inc.',           exchange: 'NASDAQ' },
  { symbol: 'BTC',   company: 'Bitcoin',              exchange: 'CRYPTO' },
  { symbol: 'ETH',   company: 'Ethereum',             exchange: 'CRYPTO' },
  { symbol: 'NVDA',  company: 'NVIDIA Corp.',         exchange: 'NASDAQ' },
  { symbol: 'SPY',   company: 'SPDR S&P 500 ETF',    exchange: 'NYSE'   },
]

// Known symbol → { company, exchange } map for local search fallback
const SYMBOL_MAP = Object.fromEntries(
  POPULAR.map(p => [p.symbol, { company: p.company, exchange: p.exchange }])
)

const LS_KEY = 'sp_recent_searches'

function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}

function saveRecent(symbol) {
  const prev = getRecent().filter(s => s !== symbol)
  const next = [symbol, ...prev].slice(0, 5)
  localStorage.setItem(LS_KEY, JSON.stringify(next))
}

/* ─── Exchange badge ──────────────────────────────────────────────── */
function ExchangeBadge({ label }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '1px 4px',
      background: 'var(--tv-bg-elevated)',
      border: '1px solid var(--tv-border)',
      borderRadius: 2, color: 'var(--tv-text-muted)',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

/* ─── Section header inside results ──────────────────────────────── */
function ResultsHeader({ children }) {
  return (
    <div style={{
      padding: '8px 16px 4px',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--tv-text-muted)',
      borderBottom: '1px solid var(--tv-border)',
    }}>
      {children}
    </div>
  )
}

/* ─── Single result row ───────────────────────────────────────────── */
function ResultRow({ symbol, company, exchange, isActive, onSelect, onHover }) {
  return (
    <div
      role="option"
      aria-selected={isActive}
      onClick={() => onSelect(symbol)}
      onMouseEnter={onHover}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 48, padding: '0 16px', cursor: 'pointer',
        background: isActive ? 'var(--tv-bg-elevated)' : 'transparent',
        borderBottom: '1px solid var(--tv-border)',
        borderLeft: isActive ? '4px solid #f5a623' : '4px solid transparent',
        transition: 'all 0.08s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 14, fontWeight: 'bold', color: '#f5a623',
          fontFamily: 'var(--tv-font-mono)',
        }}>
          {symbol}
        </span>
        {exchange && <ExchangeBadge label={exchange} />}
      </div>
      <span style={{
        fontSize: 12, color: 'var(--tv-text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 240, textAlign: 'right',
      }}>
        {company}
      </span>
    </div>
  )
}

/* ─── SearchOverlay ───────────────────────────────────────────────── */
/**
 * Props:
 *   open    {boolean}
 *   onClose {Function}
 */
export default function SearchOverlay({ open, onClose }) {
  const navigate   = useNavigate()
  const inputRef   = useRef(null)
  const listRef    = useRef(null)

  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])   // live search results
  const [loading,   setLoading]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef(null)

  const recent  = open ? getRecent() : []

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape / Cmd+K
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Debounced search
  const search = useCallback(async (q) => {
    const trimmed = q.trim().toUpperCase()
    if (!trimmed) { setResults([]); setLoading(false); return }

    // Fast local match first
    const local = POPULAR.filter(p =>
      p.symbol.startsWith(trimmed) ||
      p.company.toUpperCase().includes(trimmed)
    )

    // Try the finnhub symbol search endpoint via our proxy
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          // API returns array of { symbol, description, type, exchange }
          const apiResults = (Array.isArray(data) ? data : [])
            .slice(0, 12)
            .map(r => ({
              symbol:   r.symbol ?? r.displaySymbol,
              company:  r.description ?? r.company ?? '',
              exchange: r.type ?? r.exchange ?? '',
            }))

          // Merge: local first, then API-only results
          const merged = [...local]
          for (const r of apiResults) {
            if (!merged.find(m => m.symbol === r.symbol)) merged.push(r)
          }
          setResults(merged.slice(0, 15))
        } else {
          setResults(local)
        }
      } catch (error) {
        console.error("SearchOverlay search failed:", error)
        setResults(local)
      } finally {
        setLoading(false)
        setActiveIdx(-1)
      }
    }, 300)
  }, [])

  const handleChange = useCallback((e) => {
    const v = e.target.value
    setQuery(v)
    search(v)
  }, [search])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const displayList = query.trim()
      ? results
      : [...recent.map(s => ({ symbol: s, company: SYMBOL_MAP[s]?.company ?? '', exchange: SYMBOL_MAP[s]?.exchange ?? '' })), ...POPULAR]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, displayList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeIdx >= 0 ? displayList[activeIdx] : null
      if (target) {
        selectSymbol(target.symbol)
      } else if (query.trim()) {
        selectSymbol(query.trim().toUpperCase())
      }
    }
  }, [query, results, recent, activeIdx])

  const selectSymbol = useCallback((symbol) => {
    saveRecent(symbol)
    onClose()
    navigate(`/stock/${symbol}`)
  }, [navigate, onClose])

  if (!open) return null

  // What to show in the results panel
  const showSearch = query.trim().length > 0
  const recentItems = recent.map(s => ({
    symbol: s,
    company: SYMBOL_MAP[s]?.company ?? '',
    exchange: SYMBOL_MAP[s]?.exchange ?? '',
  }))

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        backdropFilter: 'blur(2px)',
        animation: 'searchFadeIn 0.12s ease',
      }}
    >
      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes searchSlideIn {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: 560, maxWidth: 'calc(100vw - 32px)',
          background: 'var(--tv-bg-secondary)',
          border: '2px solid #f5a623',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'searchSlideIn 0.16s ease',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10,
          borderBottom: '1px solid var(--tv-border)',
        }}>
          {/* Search icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" stroke="var(--tv-text-primary)" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="var(--tv-text-primary)" strokeWidth="2" strokeLinecap="round"/>
          </svg>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search symbol or company…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSearch}
            aria-controls="search-results"
            autoComplete="off"
            spellCheck="false"
            style={{
              flex: 1, height: 48, background: 'transparent',
              border: 'none', outline: 'none',
              fontSize: 16, color: 'var(--tv-text-primary)',
              fontFamily: 'var(--tv-font)',
            }}
          />

          {/* Kbd hint */}
          <kbd style={{
            fontSize: 10, color: 'var(--tv-text-muted)',
            background: 'var(--tv-bg-elevated)',
            border: '1px solid var(--tv-border)',
            borderRadius: 3, padding: '2px 5px', flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* Results panel */}
        <div
          id="search-results"
          role="listbox"
          ref={listRef}
          style={{ maxHeight: 400, overflowY: 'auto' }}
        >
          {showSearch ? (
            // ── Live search results ──────────────────────────────
            loading ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--tv-text-muted)' }}>
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--tv-text-muted)' }}>
                No results for «{query}»
              </div>
            ) : (
              results.map((r, i) => (
                <ResultRow
                  key={r.symbol}
                  {...r}
                  isActive={i === activeIdx}
                  onSelect={selectSymbol}
                  onHover={() => setActiveIdx(i)}
                />
              ))
            )
          ) : (
            // ── Default state ────────────────────────────────────
            <>
              {recentItems.length > 0 && (
                <>
                  <ResultsHeader>Recent Searches</ResultsHeader>
                  {recentItems.map((r, i) => (
                    <ResultRow
                      key={`recent-${r.symbol}`}
                      {...r}
                      isActive={i === activeIdx}
                      onSelect={selectSymbol}
                      onHover={() => setActiveIdx(i)}
                    />
                  ))}
                </>
              )}
              <ResultsHeader>Popular</ResultsHeader>
              {POPULAR.map((r, i) => (
                <ResultRow
                  key={`pop-${r.symbol}`}
                  {...r}
                  isActive={i + recentItems.length === activeIdx}
                  onSelect={selectSymbol}
                  onHover={() => setActiveIdx(i + recentItems.length)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
