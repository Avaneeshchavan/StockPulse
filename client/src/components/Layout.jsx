import { useEffect, useState, useCallback, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth.js'

import { useMarketQuotes } from '../hooks/useMarketData.js'
import SearchOverlay from './SearchOverlay.jsx'
import { supabase } from '../lib/supabase.js'

// ─── Candlestick SVG icon ────────────────────────────────────────────────────
function CandlestickIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}
    >
      {/* Wick lines */}
      <line x1="3"  y1="2"  x2="3"  y2="14" stroke="var(--tv-accent)" strokeWidth="1" />
      <line x1="8"  y1="1"  x2="8"  y2="15" stroke="var(--tv-accent)" strokeWidth="1" />
      <line x1="13" y1="3"  x2="13" y2="13" stroke="var(--tv-accent)" strokeWidth="1" />
      {/* Candle bodies */}
      <rect x="1.5"  y="4"  width="3" height="5"  rx="0.5" fill="var(--tv-green)" />
      <rect x="6.5"  y="2"  width="3" height="7"  rx="0.5" fill="var(--tv-red)"   />
      <rect x="11.5" y="6"  width="3" height="4"  rx="0.5" fill="var(--tv-green)" />
    </svg>
  )
}

// ─── User avatar (Google photo or initials) ───────────────────────────────────
function UserAvatar({ user }) {
  const photoUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const name     = user?.user_metadata?.full_name || user?.email || 'U'
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      className="nav-avatar"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="nav-avatar nav-avatar--initials">{initials}</span>
  )
}

// ─── Ticker tape ─────────────────────────────────────────────────────────────
const TICKER_SYMBOLS = ['AAPL','MSFT','GOOGL','TSLA','NVDA','META','AMZN','BTC','ETH','SPY','QQQ','GLD']
const TICKER_REFRESH_MS = 45_000  // 45 s — slow enough to avoid blank-flash on refetch

function TickerItem({ symbol, price, changePercent }) {
  const isPositive = (changePercent ?? 0) >= 0
  return (
    <span className="ticker-item">
      <span className="ticker-symbol">{symbol}</span>
      <span className="ticker-price">
        {`$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </span>
      <span className={`ticker-change ${isPositive ? 'ticker-change--pos' : 'ticker-change--neg'}`}>
        {changePercent != null
          ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`
          : '—'}
      </span>
    </span>
  )
}

function TickerTape() {
  const [paused, setPaused] = useState(false)
  // Holds the last set of valid tickers — never reset to empty on refetch
  const [displayTickers, setDisplayTickers] = useState([])

  const { quotes, loading: quotesLoading } = useMarketQuotes(TICKER_SYMBOLS, TICKER_REFRESH_MS)

  useEffect(() => {
    // Build candidates from the latest quotes
    const fresh = TICKER_SYMBOLS
      .map((sym) => {
        const q = quotes[sym]
        return {
          symbol: sym,
          price: q?.price ?? null,
          changePercent: q?.changePercent ?? null,
        }
      })
      // Only keep symbols with a real price — filter out null / undefined / 0
      .filter(t => t.price != null && Number(t.price) > 0)

    // Only swap display data once we actually have valid items.
    // On a background refetch the old list stays visible until new data arrives.
    if (fresh.length > 0) {
      setDisplayTickers(fresh)
    }
  }, [quotes])

  // Don't render anything until we have at least one valid ticker price
  if (displayTickers.length === 0) return null

  return (
    <div
      className="ticker-tape"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Live stock ticker"
    >
      {/* Inner track — duplicated for seamless -50% loop */}
      <div
        className={`ticker-track${paused ? ' ticker-track--paused' : ''}`}
        style={{ display: 'flex', width: 'max-content' }}
      >
        {/* First copy */}
        <span className="ticker-pass">
          {displayTickers.map((t) => (
            <TickerItem key={`a-${t.symbol}`} {...t} />
          ))}
        </span>
        {/* Second copy — aria-hidden so screen-readers don't double-read */}
        <span className="ticker-pass" aria-hidden="true">
          {displayTickers.map((t) => (
            <TickerItem key={`b-${t.symbol}`} {...t} />
          ))}
        </span>
      </div>
    </div>
  )
}


// ─── User dropdown ────────────────────────────────────────────────────────────
function UserDropdown({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: alerts = [] } = useQuery({
    queryKey: ['recentAlerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) {
        console.warn('price_alerts table not ready:', error.message)
        return []
      }
      return data
    },
    enabled: !!user?.id
  })

  return (
    <div className="nav-dropdown-wrapper" ref={ref}>
      <button
        type="button"
        className="nav-avatar-btn"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <UserAvatar user={user} />
      </button>
      {open && (
        <div className="nav-dropdown" role="menu">
          <div className="nav-dropdown-header">
            <span className="nav-dropdown-name">
              {user?.user_metadata?.full_name || user?.email || 'User'}
            </span>
            <span className="nav-dropdown-email">{user?.email}</span>
          </div>
          
          <div className="nav-dropdown-divider" />
          
          <div style={{ padding: '8px 0' }}>
            <div style={{ 
              fontSize: 10, fontWeight: 700, color: 'var(--tv-text-muted)', 
              padding: '0 16px 8px', textTransform: 'uppercase' 
            }}>
              Recent Alerts
            </div>
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <NavLink 
                  key={alert.id} 
                  to="/alerts" 
                  className="nav-dropdown-item" 
                  style={{ display: 'block', fontSize: 11, padding: '8px 16px' }}
                  onClick={() => setOpen(false)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{alert.symbol}</span>
                    <span style={{ 
                      fontSize: 9, padding: '1px 4px', borderRadius: 2,
                      background: alert.triggered ? 'rgba(38,166,154,0.1)' : 'rgba(120,123,134,0.1)',
                      color: alert.triggered ? 'var(--tv-green)' : 'var(--tv-text-muted)'
                    }}>
                      {alert.triggered ? 'HIT' : 'PENDING'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--tv-text-muted)', marginTop: 2 }}>
                    {alert.direction === 'above' ? 'Above' : 'Below'} ${Number(alert.target_price).toLocaleString()}
                  </div>
                </NavLink>
              ))
            ) : (
              <div style={{ padding: '4px 16px', fontSize: 11, color: 'var(--tv-text-muted)' }}>
                No alerts set
              </div>
            )}
            <NavLink 
              to="/alerts" 
              className="nav-dropdown-item" 
              style={{ fontSize: 11, color: 'var(--tv-accent)', fontWeight: 600 }}
              onClick={() => setOpen(false)}
            >
              View All Alerts
            </NavLink>
          </div>

          <div className="nav-dropdown-divider" />
          
          <button
            type="button"
            className="nav-dropdown-item nav-dropdown-item--danger"
            role="menuitem"
            onClick={() => { logout(); setOpen(false) }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Balance chip ─────────────────────────────────────────────────────────────
function BalanceChip({ balance }) {
  const formatted = balance != null
    ? `$${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$100,000.00'
  return (
    <span className="nav-balance-chip" title="Virtual balance">
      {formatted}
    </span>
  )
}

// ─── Search icon button ────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { isAuthenticated, logout, user, profile } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  const navLinks = [
    { to: '/',           label: 'Home',      end: true  },
    { to: '/markets',    label: 'Markets',   end: false },
    { to: '/screener',   label: 'Screener',  end: false },
    { to: '/learn',      label: 'Learn',     end: false },
    { to: '/leaderboard', label: 'Leaderboard', end: false },
    { to: '/portfolio',  label: 'Portfolio', end: false },
    { to: '/watchlist',  label: 'Watchlist', end: false },
    { to: '/journal',    label: 'Journal',   end: false },
    { to: '/news',       label: 'News',      end: false },
  ]

  // Global CMD+K / CTRL+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <nav className="tv-navbar" role="navigation" aria-label="Main navigation">
        <div className="tv-navbar__inner">
          {/* Logo */}
          <NavLink to="/" className="tv-navbar__logo" aria-label="StockPulse home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/favicon.svg" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tv-text-primary)', letterSpacing: '-0.02em', marginTop: 1 }}>StockPulse</span>
          </NavLink>

          {/* Separator */}
          <div className="tv-navbar__sep" />

          {/* Nav links */}
          <ul className="tv-navbar__links" role="list">
            {navLinks.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `tv-navbar__link${isActive ? ' tv-navbar__link--active' : ''}`
                  }
                >
                  {label}
                  {label === 'Watchlist' && <WatchlistNavBadge userId={user?.id} />}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="tv-navbar__right">
            {/* Search button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search (⌘K)"
              title="Search (⌘K)"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--tv-bg-elevated)',
                border: '1px solid var(--tv-border)',
                borderRadius: 4, padding: '4px 10px',
                color: 'var(--tv-text-muted)',
                fontSize: 11, cursor: 'pointer',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              className="nav-search-btn"
            >
              <SearchIcon />
              <span style={{ letterSpacing: '0.01em' }}>Search</span>
              <kbd style={{
                fontSize: 9, padding: '1px 4px',
                background: 'var(--tv-bg-primary)',
                border: '1px solid var(--tv-border)',
                borderRadius: 2, color: 'var(--tv-text-muted)',
              }}>⌘K</kbd>
            </button>

            <BalanceChip balance={profile?.virtual_balance} />

            {isAuthenticated && (
              <NavLink 
                to="/alerts" 
                style={{ position: 'relative', color: 'var(--tv-text-muted)', display: 'flex', alignItems: 'center' }}
                title="Price Alerts"
              >
                <BellIcon />
                <AlertBadge userId={user.id} />
              </NavLink>
            )}

            {isAuthenticated ? (
              <UserDropdown user={user} logout={logout} />
            ) : (
              <NavLink to="/login" className="tv-navbar__signin-btn">
                Sign In
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* Global search overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="tv-footer" role="contentinfo">
      StockPulse · Virtual Trading Simulator · Not financial advice · Prices delayed 15 min
    </footer>
  )
}

function AlertBadge({ userId }) {
  const { data: count = 0 } = useQuery({
    queryKey: ['alertCount', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('price_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('triggered', false)
      if (error) {
        console.warn('price_alerts table not ready:', error.message)
        return 0
      }
      return count || 0
    },
    refetchInterval: 60000 // refresh every 60s
  })

  if (count === 0) return null

  return (
    <span style={{
      position: 'absolute',
      top: -4,
      right: -6,
      background: 'var(--tv-red)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      padding: '1px 4px',
      borderRadius: 10,
      border: '2px solid var(--tv-bg-primary)',
      lineHeight: 1
    }}>
      {count}
    </span>
  )
}

function WatchlistNavBadge({ userId }) {
  const { data: count = 0 } = useQuery({
    queryKey: ['watchlistCount', userId],
    queryFn: async () => {
      if (!userId) return 0
      const { count, error } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (error) {
        console.warn('watchlist table not ready:', error.message)
        return 0
      }
      return count || 0
    },
    enabled: !!userId,
    refetchInterval: 60000
  })

  if (!userId || count === 0) return null

  return (
    <span style={{
      marginLeft: 4,
      fontSize: 10,
      fontWeight: 700,
      color: '#fadb14',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      {count}
    </span>
  )
}

// ─── Layout (root) ────────────────────────────────────────────────────────────
// Routes that manage their own full-width layout (no padded inner wrapper)
const FULL_BLEED_ROUTES = ['/']         // truly edge-to-edge
const WIDE_ROUTES       = ['/portfolio'] // full-width but with minimal side padding

export default function Layout() {
  const { pathname } = useLocation()
  const isFullBleed = FULL_BLEED_ROUTES.includes(pathname)
  const isWide      = WIDE_ROUTES.includes(pathname)

  return (
    <>
      <Navbar />
      <TickerTape />
      <main className="tv-page-wrapper">
        {isFullBleed ? (
          <Outlet />
        ) : isWide ? (
          <div style={{ padding: '0 16px', maxWidth: 1600, margin: '0 auto' }}>
            <Outlet />
          </div>
        ) : (
          <div className="tv-page-inner">
            <Outlet />
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
