import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useMarketQuotes, useNewsHeadlines } from '../hooks/useMarketData.js'
import Button from '../components/ui/Button.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import LeaderboardPreview from '../components/LeaderboardPreview.jsx'
import { ASSET_GROUPS, fmtPrice, timeAgo } from '../constants/marketData.js'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'

/* ─────────────────────────────────────────────────────────────────────────────
   Mock Data & Constants
   ───────────────────────────────────────────────────────────────────────────── */
const MOVERS_SYMBOLS = ASSET_GROUPS.stocks.map(s => s.symbol).slice(0, 20)
const FEATURED_SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'BTC', 'SPY', 'GOOGL']
const STAT_SYMBOLS = ['SPY', 'BTC', 'GLD', 'VIXY']
const EXTRA_SYMBOLS = ['ETH', 'MSFT', 'QQQ', 'VTI', 'SLV']
const MOOD_SYMBOLS = [...new Set([...MOVERS_SYMBOLS, ...FEATURED_SYMBOLS, ...STAT_SYMBOLS, ...EXTRA_SYMBOLS])]

/* ─────────────────────────────────────────────────────────────────────────────
   Market Status & Clock
   ───────────────────────────────────────────────────────────────────────────── */
function MarketStatusIndicator() {
  const [marketStatus, setMarketStatus] = useState({ status: 'CLOSED', color: 'var(--tv-red)' })

  useEffect(() => {
    const getMarketStatus = () => {
      const now = new Date()
      // Use local time but logic is based on NYSE (ET) which is roughly UTC-4/5
      // Simplification: use UTC hours for range
      const day = now.getUTCDay()
      const hours = now.getUTCHours()
      const minutes = now.getUTCMinutes()
      const timeInMinutes = hours * 60 + minutes

      const isWeekday = day >= 1 && day <= 5
      const isMarketHours = timeInMinutes >= 870 && timeInMinutes < 1260

      if (isWeekday && isMarketHours) return { status: 'OPEN', color: 'var(--tv-green)' }
      if (isWeekday && timeInMinutes >= 840 && timeInMinutes < 870)
        return { status: 'PRE-MARKET', color: 'var(--tv-amber)' }
      if (isWeekday && timeInMinutes >= 1260 && timeInMinutes < 1320)
        return { status: 'AFTER-HOURS', color: 'var(--tv-amber)' }
      return { status: 'CLOSED', color: 'var(--tv-red)' }
    }

    setMarketStatus(getMarketStatus())
    const timer = setInterval(() => setMarketStatus(getMarketStatus()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--tv-bg-primary)', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--tv-border)' }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: marketStatus.color,
        animation: marketStatus.status === 'OPEN' ? 'pulse 2s ease-in-out infinite' : 'none',
        boxShadow: marketStatus.status === 'OPEN' ? `0 0 8px ${marketStatus.color}` : 'none'
      }} />
      <span style={{
        fontSize: '11px',
        color: marketStatus.color,
        fontWeight: '700',
        letterSpacing: '0.04em'
      }}>
        NYSE {marketStatus.status}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Fear & Greed Meter
   ───────────────────────────────────────────────────────────────────────────── */
function FearGreedMeter({ quotes }) {
  const score = useMemo(() => {
    const qList = Object.values(quotes).filter(q => q.changePercent != null)
    if (!qList.length) return 50
    const gainers = qList.filter(q => Number(q.changePercent) > 0).length
    const bigMovers = qList.filter(q => Math.abs(Number(q.changePercent)) > 2).length
    const avgChange = qList.reduce((sum, q) => sum + Number(q.changePercent || 0), 0) / qList.length

    let s = 50
    s += (gainers / qList.length - 0.5) * 60
    s += avgChange * 5
    s += bigMovers * 2
    return Math.max(0, Math.min(100, Math.round(s)))
  }, [quotes])

  const gaugeColor = useMemo(() => {
    if (score <= 25) return 'var(--tv-red)'
    if (score <= 45) return '#f97316' // Fear
    if (score <= 55) return 'var(--tv-amber)'
    if (score <= 75) return '#84cc16' // Greed
    return 'var(--tv-green)'
  }, [score])

  const moodLabel = useMemo(() => {
    if (score <= 25) return 'Extreme Fear'
    if (score <= 45) return 'Fear'
    if (score <= 55) return 'Neutral'
    if (score <= 75) return 'Greed'
    return 'Extreme Greed'
  }, [score])

  const radius = 60
  const circumference = Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ background: 'var(--tv-bg-primary)', padding: '16px', borderRadius: 8, border: '1px solid var(--tv-border)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--tv-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12, width: '100%', textAlign: 'left' }}>
        Fear & Greed Index
      </div>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="var(--tv-bg-elevated)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="80" y="72" textAnchor="middle" fill="white" fontSize="24" fontFamily="monospace" fontWeight="700">
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color: gaugeColor, marginTop: 4 }}>
        {moodLabel}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Portfolio Snapshot (Auth)
   ───────────────────────────────────────────────────────────────────────────── */
function PortfolioSnapshot() {
  const { user } = useAuth()
  const { quotes } = useMarketQuotes(MOOD_SYMBOLS)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      try {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (error) throw error
        return data
      } catch (err) {
        console.error('[HomePage] Profile fetch/create error:', err)
        throw err
      }
    },
    enabled: !!user
  })

  const { data: holdings = [] } = useQuery({
    queryKey: ['holdings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolio').select('*').eq('user_id', user.id)
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  const snapshot = useMemo(() => {
    if (!profile) return null
    let holdingsValue = 0
    let todayPnL = 0

    holdings.forEach(h => {
      const q = quotes[h.symbol]
      if (q) {
        holdingsValue += h.quantity * q.price
        todayPnL += h.quantity * q.change
      }
    })

    const totalBalance = Number(profile.virtual_balance || 100000) + holdingsValue
    return { balance: totalBalance, holdingsCount: holdings.length, todayPnL }
  }, [profile, holdings, quotes])

  if (!user || !snapshot) return null

  const isUp = snapshot.todayPnL >= 0

  return (
    <div style={{ background: 'var(--tv-bg-secondary)', padding: '20px', borderRadius: 8, border: '1px solid rgba(0, 212, 170, 0.2)', width: '100%' }}>
      <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
        Portfolio Snapshot
      </div>
      <div style={{ fontSize: 24, fontFamily: 'var(--tv-font-mono)', fontWeight: 700, color: 'var(--tv-accent)', marginBottom: 4 }}>
        {fmtPrice(snapshot.balance)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tv-text-secondary)', marginBottom: 16 }}>
        {snapshot.holdingsCount} active positions
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isUp ? 'var(--tv-green)' : 'var(--tv-red)' }}>
          {isUp ? '▲' : '▼'} {fmtPrice(Math.abs(snapshot.todayPnL))} today
        </div>
        <a href="/portfolio" style={{ fontSize: 11, fontWeight: 700, color: 'var(--tv-accent)', textTransform: 'uppercase' }}>
          Analyze →
        </a>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Trending Searches
   ───────────────────────────────────────────────────────────────────────────── */
function TrendingSearches() {
  const navigate = useNavigate()
  const trendingByDay = {
    0: ['TSLA', 'BTC', 'NVDA', 'SPY', 'AAPL', 'META'],    // Sunday
    1: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA'], // Monday
    2: ['NVDA', 'META', 'NFLX', 'BTC', 'ETH', 'SPY'],     // Tuesday
    3: ['TSLA', 'AAPL', 'MSFT', 'BTC', 'QQQ', 'GOOGL'],   // Wednesday
    4: ['SPY', 'QQQ', 'NVDA', 'META', 'AMZN', 'NFLX'],    // Thursday
    5: ['BTC', 'ETH', 'TSLA', 'AAPL', 'NVDA', 'GLD'],     // Friday
    6: ['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', 'SPY'],      // Saturday
  }
  const today = new Date().getDay()
  const trending = trendingByDay[today]

  return (
    <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '16px 0', borderBottom: '1px solid var(--tv-border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>Trending</span>
        {trending.map(sym => (
          <button
            key={sym}
            onClick={() => navigate(`/stock/${sym}`)}
            style={{
              background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', borderRadius: '4px',
              color: 'var(--tv-text-primary)', padding: '5px 14px', fontSize: '11px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--tv-font-mono)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--tv-accent)'
              e.currentTarget.style.color = 'var(--tv-accent)'
              e.currentTarget.style.background = 'var(--tv-accent-dim)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--tv-border)'
              e.currentTarget.style.color = 'var(--tv-text-primary)'
              e.currentTarget.style.background = 'var(--tv-bg-elevated)'
            }}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Asset Class Performance
   ───────────────────────────────────────────────────────────────────────────── */
function AssetClassPerformance({ quotes }) {
  const navigate = useNavigate()
  const assetClasses = [
    { name: 'US Stocks', symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'], tab: 'stocks' },
    { name: 'Crypto', symbols: ['BTC', 'ETH'], tab: 'crypto' },
    { name: 'ETFs', symbols: ['SPY', 'QQQ', 'VTI'], tab: 'etfs' },
    { name: 'Commodities', symbols: ['GLD', 'SLV'], tab: 'commodities' },
  ]

  return (
    <div style={{ padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
        {assetClasses.map(ac => {
          const qList = ac.symbols.map(s => quotes[s]).filter(Boolean)
          const avgChange = qList.length > 0 ? qList.reduce((sum, q) => sum + q.changePercent, 0) / qList.length : 0
          const bestPerformer = qList.length > 0 ? [...qList].sort((a, b) => b.changePercent - a.changePercent)[0] : null
          const isUp = avgChange >= 0

          return (
            <div
              key={ac.name}
              onClick={() => navigate(`/markets?tab=${ac.tab}`)}
              style={{
                background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderTop: `2px solid ${isUp ? 'var(--tv-green)' : 'var(--tv-red)'}`,
                padding: 16, borderRadius: 4, cursor: 'pointer', transition: 'transform 0.2s'
              }}
              className="market-card-hover"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{ac.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isUp ? 'var(--tv-green)' : 'var(--tv-red)' }}>
                  {isUp ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
              </div>

              {/* Mini Bar Chart SVG */}
              <div style={{ height: 32, marginBottom: 12, width: '100%' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 32" preserveAspectRatio="none">
                  {ac.symbols.map((sym, i) => {
                    const q = quotes[sym]
                    const h = q ? Math.max(4, Math.min(32, Math.abs(q.changePercent) * 6)) : 2
                    const color = q?.changePercent >= 0 ? 'var(--tv-green)' : 'var(--tv-red)'
                    // leave a 2 unit gap between bars
                    const barWidth = (100 / ac.symbols.length) - 2
                    const x = i * (100 / ac.symbols.length)
                    const y = 32 - h
                    return (
                      <rect key={sym} x={x} y={y} width={barWidth} height={h} fill={color} rx="1" opacity="0.8">
                        <title>{`${sym}: ${q?.changePercent?.toFixed(2)}%`}</title>
                      </rect>
                    )
                  })}
                </svg>
              </div>

              <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Top: {bestPerformer?.symbol || '—'}</span>
                <span style={{ color: bestPerformer?.changePercent >= 0 ? 'var(--tv-green)' : 'var(--tv-red)', fontWeight: 600 }}>
                  {bestPerformer?.changePercent >= 0 ? '+' : ''}{bestPerformer?.changePercent?.toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────────────────
   Feature Cards (Static)
   ───────────────────────────────────────────────────────────────────────────── */
function FeatureCards() {
  const cards = [
    {
      title: 'Real Market Data',
      subtitle: 'Live prices from global exchanges',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" />
          <path d="M18 9l-5 5-4-4-6 6" />
        </svg>
      )
    },
    {
      title: '$100,000 Virtual Capital',
      subtitle: 'Start trading instantly, no risk',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      title: '50+ Assets',
      subtitle: 'Stocks, crypto, ETFs and commodities',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    }
  ]

  return (
    <div style={{ padding: '40px 16px', background: 'var(--tv-bg-primary)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 24, maxWidth: 1000, width: '100%', flexWrap: 'wrap' }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            flex: '1 1 280px',
            background: 'var(--tv-bg-secondary)',
            border: '1px solid var(--tv-border)',
            borderRadius: 8,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <div style={{ color: 'var(--tv-accent)', marginBottom: 16 }}>{card.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tv-text-primary)', marginBottom: 6 }}>
              {card.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tv-text-secondary)', lineHeight: 1.4 }}>
              {card.subtitle}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────────────────
   Top Movers
   ───────────────────────────────────────────────────────────────────────────── */
function TopMovers() {
  const navigate = useNavigate()
  const { quotes, loading } = useMarketQuotes(MOVERS_SYMBOLS)

  const ranked = useMemo(() => {
    const arr = MOVERS_SYMBOLS.map(sym => ({
      symbol: sym,
      ...quotes[sym]
    })).filter(q => q.changePercent != null)

    arr.sort((a, b) => b.changePercent - a.changePercent)
    return {
      gainers: arr.slice(0, 5),
      losers: arr.slice(-5).reverse()
    }
  }, [quotes])

  const MoverList = ({ title, items, isGainer }) => (
    <div style={{ flex: 1, minWidth: 300 }}>
      <h3 style={{ fontSize: 16, color: 'var(--tv-text-primary)', marginBottom: 16 }}>{title}</h3>
      <div style={{ background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--tv-border)' : 'none' }}>
              <LoadingSkeleton height={20} width="60%" />
            </div>
          ))
        ) : (
          items.map((item, i) => (
            <div
              key={item.symbol}
              onClick={() => navigate(`/stock/${item.symbol}`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--tv-border)' : 'none',
                cursor: 'pointer'
              }}
              className="market-table-row"
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tv-text-primary)' }}>{item.symbol}</div>
                <div style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>
                  {ASSET_GROUPS.stocks.find(s => s.symbol === item.symbol)?.company || ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--tv-font-mono)', color: 'var(--tv-text-primary)' }}>
                  ${item.price?.toFixed(2)}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--tv-font-mono)', fontWeight: 600, color: isGainer ? 'var(--tv-green)' : 'var(--tv-red)' }}>
                  {isGainer ? '+' : ''}{item.changePercent?.toFixed(2)}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 16px 40px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>Today's Top Movers</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <MoverList title="Top Gainers" items={ranked.gainers} isGainer={true} />
          <MoverList title="Top Losers" items={ranked.losers} isGainer={false} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Latest News
   ───────────────────────────────────────────────────────────────────────────── */
function MarketNews() {
  const { news, loading } = useNewsHeadlines(6)

  return (
    <div style={{ padding: '0 16px 40px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%', overflow: 'hidden' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>Market News</h2>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'thin' }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ flex: '0 0 280px', height: 120, background: 'var(--tv-bg-secondary)', borderRadius: 8, padding: 16 }}>
                <LoadingSkeleton height={14} width="40%" style={{ marginBottom: 12 }} />
                <LoadingSkeleton height={16} rows={3} gap={6} />
              </div>
            ))
          ) : (
            news.map((item, i) => (
              <a
                key={i}
                href={item.url || item.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: '0 0 280px',
                  background: 'var(--tv-bg-secondary)',
                  border: '1px solid var(--tv-border)',
                  borderRadius: 8,
                  padding: '16px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--tv-accent)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--tv-border)'}
              >
                <div style={{ fontSize: 10, color: 'var(--tv-accent)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                  {item.source?.name || item.source || 'News'}
                </div>
                <div style={{
                  fontSize: 14, color: 'var(--tv-text-primary)', fontWeight: 500, lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1
                }}>
                  {item.title || item.headline}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', marginTop: 12 }}>
                  {timeAgo(item.publishedAt || item.datetime)}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Market Mood Indicator
   ───────────────────────────────────────────────────────────────────────────── */
function MarketMoodIndicator({ quotes }) {
  const { gainers, losers, moodPercent, moodText, moodColor } = useMemo(() => {
    const qList = Object.values(quotes).filter(q => q.changePercent != null)
    const g = qList.filter(q => q.changePercent > 0).length
    const l = qList.filter(q => q.changePercent < 0).length
    const total = g + l
    const p = total > 0 ? Math.round((g / total) * 100) : 50

    let text = "Market is Neutral"
    let color = "var(--tv-amber)"
    if (p > 60) {
      text = "Market is Bullish"
      color = "var(--tv-green)"
    } else if (p < 40) {
      text = "Market is Bearish"
      color = "var(--tv-red)"
    }

    return { gainers: g, losers: l, moodPercent: p, moodText: text, moodColor: color }
  }, [quotes])

  return (
    <div style={{ marginTop: 24, maxWidth: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
        <span style={{ color: 'var(--tv-red)' }}>Bearish</span>
        <span style={{ color: moodColor }}>{moodText}</span>
        <span style={{ color: 'var(--tv-green)' }}>Bullish</span>
      </div>
      <div style={{ height: 6, width: '100%', background: 'var(--tv-bg-elevated)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${moodPercent}%`,
          background: `linear-gradient(90deg, var(--tv-red), var(--tv-amber), var(--tv-green))`,
          backgroundSize: '400px 6px', // Maintain gradient scale
          transition: 'width 0.5s ease-out'
        }} />
        {/* Fill color overlay based on status */}
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${moodPercent}%`,
          backgroundColor: moodColor, opacity: 0.3
        }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Quick Stats Bar
   ───────────────────────────────────────────────────────────────────────────── */
function QuickStatsBar() {
  const { quotes, loading } = useMarketQuotes(STAT_SYMBOLS)

  const stats = [
    { label: 'S&P 500', sym: 'SPY' },
    { label: 'BTC', sym: 'BTC' },
    { label: 'Gold (GLD)', sym: 'GLD' },
    { label: 'VIX', sym: 'VIXY', isVix: true }
  ]

  return (
    <div style={{ borderBottom: '1px solid var(--tv-border)', background: 'var(--tv-bg-primary)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap' }}>
        {stats.map((s, i) => {
          const q = quotes[s.sym]
          const isUp = q?.changePercent > 0
          return (
            <div key={s.label} style={{
              flex: 1, minWidth: 200, padding: '20px 24px',
              borderRight: i < stats.length - 1 ? '1px solid var(--tv-border)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontFamily: 'var(--tv-font-mono)', fontWeight: 700, color: '#fff' }}>
                {loading ? '...' : (s.isVix ? '14.28' : fmtPrice(q?.price))}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: isUp ? 'var(--tv-green)' : 'var(--tv-red)',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                {isUp ? '▲' : '▼'} {Math.abs(q?.changePercent || 0).toFixed(2)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   How It Works Section
   ───────────────────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      id: '01', title: 'Sign In Free',
      desc: 'Create your account with Google in one click. No credit card, no personal info required.',
      footer: '30 sec setup'
    },
    {
      id: '02', title: 'Get $100,000',
      desc: 'Start with $100,000 in virtual money. Browse real stocks, crypto, ETFs and commodities.',
      footer: 'Zero risk'
    },
    {
      id: '03', title: 'Trade & Learn',
      desc: 'Execute trades with live market prices. Track your portfolio and compete on the leaderboard.',
      footer: 'Live competition'
    }
  ]

  return (
    <div style={{ padding: '80px 16px', background: 'var(--tv-bg-primary)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 48, letterSpacing: '-0.02em' }}>How StockPulse Works</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {steps.map(step => (
            <div key={step.id}
              style={{
                background: 'var(--tv-bg-secondary)',
                border: '1px solid var(--tv-border)',
                borderLeft: '3px solid var(--tv-accent)',
                borderTop: 'none',
                borderRadius: 4,
                padding: '32px',
                flex: 1,
                minWidth: 280,
                cursor: 'default',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.borderLeftColor = 'var(--tv-accent)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderLeftColor = 'var(--tv-accent)'
              }}
            >
              <div style={{ fontSize: 42, fontFamily: 'var(--tv-font-mono)', fontWeight: 700, color: 'var(--tv-accent)', opacity: 1, marginBottom: 16, lineHeight: 1 }}>
                {step.id}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: 'var(--tv-text-secondary)', lineHeight: 1.7 }}>{step.desc}</div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--tv-border)', fontSize: 11, fontWeight: 700, color: 'var(--tv-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {step.footer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Featured Stocks Strip
   ───────────────────────────────────────────────────────────────────────────── */
function FeaturedStocksStrip() {
  const navigate = useNavigate()
  const { quotes, loading } = useMarketQuotes(FEATURED_SYMBOLS)

  return (
    <div style={{ padding: '40px 16px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%' }}>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }} className="no-scrollbar">
          {FEATURED_SYMBOLS.map(sym => {
            const q = quotes[sym]
            const isUp = q?.changePercent > 0
            return (
              <div
                key={sym}
                onClick={() => navigate(`/stock/${sym}`)}
                style={{
                  minWidth: 160, flex: 1, background: 'var(--tv-bg-secondary)',
                  border: '1px solid var(--tv-border)', borderLeft: `3px solid ${isUp ? 'var(--tv-green)' : 'var(--tv-red)'}`,
                  padding: 16, cursor: 'pointer', borderRadius: 2,
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--tv-bg-elevated)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--tv-bg-secondary)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{sym}</div>
                  <div style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 10,
                    background: isUp ? 'var(--tv-green-bg)' : 'var(--tv-red-bg)',
                    color: isUp ? 'var(--tv-green)' : 'var(--tv-red)', fontWeight: 600
                  }}>
                    {isUp ? '+' : ''}{q?.changePercent?.toFixed(2)}%
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', marginBottom: 8 }}>
                  {ASSET_GROUPS.stocks.find(s => s.symbol === sym)?.company || ASSET_GROUPS.etfs.find(e => e.symbol === sym)?.company || sym}
                </div>
                <div style={{ fontSize: 16, fontFamily: 'var(--tv-font-mono)', fontWeight: 600, color: '#fff' }}>
                  {fmtPrice(q?.price)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Recent Activity
   ───────────────────────────────────────────────────────────────────────────── */
function RecentActivity() {
  const { user } = useAuth()
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  if (!user) return null

  return (
    <div style={{ padding: '0 16px 60px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, width: '100%' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>Your Recent Activity</h2>
        <div style={{ background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 8, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 24 }}><LoadingSkeleton height={20} rows={5} gap={12} /></div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ color: 'var(--tv-text-secondary)', marginBottom: 20 }}>No trades yet. Browse the markets to make your first trade.</div>
              <Button onClick={() => window.location.href = '/markets'}>Go to Markets</Button>
            </div>
          ) : (
            activities.map((act, i) => (
              <div key={act.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', borderBottom: i < activities.length - 1 ? '1px solid var(--tv-border)' : 'none'
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    background: act.type === 'BUY' ? 'var(--tv-green-bg)' : 'var(--tv-red-bg)',
                    color: act.type === 'BUY' ? 'var(--tv-green)' : 'var(--tv-red)'
                  }}>
                    {act.type}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{act.symbol}</div>
                    <div style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>{act.company_name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{act.quantity} shares @ {fmtPrice(act.price)}</div>
                  <div style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>{timeAgo(act.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        {activities.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <a href="/journal" style={{ fontSize: 13, color: 'var(--tv-accent)', fontWeight: 500 }}>View full history &rarr;</a>
          </div>
        )}
      </div>
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────────────────
   Main HomePage
   ───────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const { quotes: moodQuotes } = useMarketQuotes(MOOD_SYMBOLS)

  return (
    <div style={{ background: 'var(--tv-bg-primary)', overflowY: 'auto', height: '100%' }}>
      {/* SECTION 1: HERO */}
      <div style={{
        minHeight: 420,
        background: 'var(--tv-bg-secondary)',
        padding: '60px 16px',
        borderBottom: '1px solid var(--tv-border)'
      }}>
        <div className="px-4 w-full" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
          maxWidth: 1000,
          margin: '0 auto'
        }}>
          {/* Left Column: Title, subtitle, buttons */}
          <div>
            <div style={{
              display: 'inline-block',
              border: '1px solid var(--tv-accent)',
              color: 'var(--tv-accent)',
              fontSize: 11,
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 4,
              fontWeight: 600,
              marginBottom: 16
            }}>
              Virtual Trading Platform
            </div>

            <h1 style={{
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 48,
              color: '#fff',
              lineHeight: 1.1,
              margin: '0 0 16px 0'
            }}>
              <div style={{ display: 'block' }}>Trade Smarter.</div>
              <div style={{ display: 'block' }}>Start Risk-Free.</div>
            </h1>

            <p style={{
              fontSize: 16,
              color: 'var(--tv-text-secondary)',
              maxWidth: 480,
              lineHeight: 1.5,
              margin: '0 0 24px 0'
            }}>
              Practice investing with $100,000 in virtual money.
              Real market data, zero real risk. Learn, trade, and build
              your strategy before investing real money.
            </p>

            <div style={{ marginBottom: 24 }}>
              <MarketMoodIndicator quotes={moodQuotes} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <Button
                onClick={() => navigate('/markets')}
                style={{
                  background: 'var(--tv-accent)',
                  color: '#0d1117',
                  fontWeight: 700,
                  padding: '12px 28px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 15
                }}
              >
                Start Trading
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/leaderboard')}
                style={{ padding: '12px 28px', borderRadius: 4, fontSize: 15 }}
              >
                View Leaderboard
              </Button>
            </div>

            <div style={{ fontSize: 10, color: 'var(--tv-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>100K Starting Balance</span>
              <span>&middot;</span>
              <span>Live Market Data</span>
              <span>&middot;</span>
              <span>Free Forever</span>
            </div>
          </div>

          {/* Right Column: Widgets */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            width: '100%'
          }}>
            {/* 1st: NYSE Status Badge */}
            <div style={{ width: '100%', maxWidth: '320px' }}>
              <MarketStatusIndicator />
            </div>

            {/* 2nd: Fear & Greed Meter */}
            <div style={{ width: '100%', maxWidth: '320px' }}>
              <FearGreedMeter quotes={moodQuotes} />
            </div>

            {/* 3rd: Portfolio Snapshot */}
            {isAuthenticated && (
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <PortfolioSnapshot />
              </div>
            )}

          </div>
        </div>
      </div>

      <QuickStatsBar />

      <HowItWorks />

      <FeaturedStocksStrip />

      <TrendingSearches />

      <AssetClassPerformance quotes={moodQuotes} />

      {/* SECTION 4: TOP MOVERS */}
      <TopMovers />

      <RecentActivity />

      {/* SECTION 5: LATEST NEWS */}
      <MarketNews />

      {/* SECTION 6: LEADERBOARD PREVIEW */}
      <div style={{ padding: '0 16px 60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 1000, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Top Traders</h2>
            <a href="/leaderboard" style={{ fontSize: 13, color: 'var(--tv-accent)', fontWeight: 500 }}>View all →</a>
          </div>
          <LeaderboardPreview />
        </div>
      </div>

      {/* SECTION 7: CTA BANNER */}
      {!isAuthenticated && (
        <div style={{
          background: 'var(--tv-accent-dim)',
          borderTop: '1px solid var(--tv-accent)',
          padding: '40px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)', marginBottom: 8 }}>
            Ready to start? Get $100,000 in virtual money instantly.
          </h2>
          <p style={{ color: 'var(--tv-text-secondary)', marginBottom: 24, fontSize: 15 }}>
            Join thousands of traders leveling up their trading skills for free.
          </p>
          <Button onClick={() => navigate('/login')} style={{ background: 'var(--tv-accent)', color: '#0d1117', fontWeight: 700, padding: '12px 32px', fontSize: 16 }}>
            Sign In with Google
          </Button>
        </div>
      )}
    </div>
  )
}
