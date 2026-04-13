import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { timeAgo } from '../constants/marketData.js'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'

/* ─── constants ──────────────────────────────────────────────────── */

const CATEGORIES = [
  { id: 'all',     label: 'All'      },
  { id: 'stocks',  label: 'Stocks'   },
  { id: 'crypto',  label: 'Crypto'   },
  { id: 'forex',   label: 'Forex'    },
  { id: 'mergers', label: 'Mergers'  },
]

// Keyword → category mapping: used to classify articles without explicit tags
const CATEGORY_KEYWORDS = {
  crypto:  ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'btc', 'eth', 'web3', 'defi', 'nft', 'solana', 'binance'],
  forex:   ['forex', 'currency', 'usd', 'eur', 'gbp', 'jpy', 'yuan', 'exchange rate', 'fed', 'ecb'],
  mergers: ['merger', 'acquisition', 'takeover', 'ipo', 'buyout', 'deal', 'm&a', 'acquired'],
  stocks:  ['stock', 'equity', 'earnings', 'nasdaq', 'nyse', 's&p', 'wall street', 'dividend', 'share'],
}

// All known symbols for inline linking inside headlines
const KNOWN_SYMBOLS = [
  'AAPL','MSFT','GOOGL','AMZN','TSLA','META','NVDA','JPM','V','WMT',
  'NFLX','DIS','PYPL','INTC','AMD','BA','NKE','COST','SBUX','PFE',
  'BTC','ETH','SOL','BNB','XRP','DOGE','ADA',
  'SPY','QQQ','GLD','VTI','DIA',
]

// Symbol regex
const SYMBOL_RE = new RegExp(
  `\\b(${KNOWN_SYMBOLS.join('|')})\\b`,
  'g'
)

/* ─── helpers ────────────────────────────────────────────────────── */

function classifyArticle(article) {
  const text = [article.title, article.description, article.category]
    .filter(Boolean).join(' ').toLowerCase()

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) return cat
  }
  return 'stocks'
}

function extractMentionedSymbols(articles) {
  const counts = {}
  for (const a of articles) {
    const text = [a.title, a.description].filter(Boolean).join(' ')
    const matches = text.match(SYMBOL_RE) ?? []
    for (const sym of matches) {
      counts[sym] = (counts[sym] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sym]) => sym)
}

/**
 * Parses headline text and wraps known stock symbols as blue links.
 * e.g. "AAPL hits ATH"  →  <Link to="/stock/AAPL">AAPL</Link> hits ATH
 */
function HeadlineWithLinks({ text }) {
  const parts = []
  let lastIdx = 0
  let match

  // Reset regex state
  SYMBOL_RE.lastIndex = 0

  while ((match = SYMBOL_RE.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    parts.push(
      <Link
        key={match.index}
        to={`/stock/${match[0]}`}
        onClick={e => e.stopPropagation()}
        style={{ color: 'var(--tv-accent)', textDecoration: 'none' }}
      >
        {match[0]}
      </Link>
    )
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))

  return <>{parts}</>
}

/* ─── CategoryBadge ──────────────────────────────────────────────── */
function CategoryBadge({ cat }) {
  const colors = {
    crypto:  { bg: 'rgba(247,82,95,0.12)',  color: '#f7525f' },
    forex:   { bg: 'rgba(240,180,41,0.12)', color: '#f0b429' },
    mergers: { bg: 'rgba(171,71,188,0.12)', color: '#ab47bc' },
    stocks:  { bg: 'rgba(41,98,255,0.12)',  color: 'var(--tv-accent)' },
  }
  const style = colors[cat] ?? colors.stocks
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', padding: '1px 5px',
      borderRadius: 2, flexShrink: 0,
      background: style.bg, color: style.color,
    }}>
      {cat}
    </span>
  )
}

/* ─── Category tabs ──────────────────────────────────────────────── */
function CategoryTabs({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      height: 40, borderBottom: '1px solid var(--tv-border)',
      flexShrink: 0,
    }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.id)}
          style={{
            background: 'transparent', border: 'none',
            borderBottom: active === cat.id
              ? '2px solid var(--tv-accent)'
              : '2px solid transparent',
            color: active === cat.id
              ? 'var(--tv-text-primary)'
              : 'var(--tv-text-secondary)',
            fontSize: 12, padding: '0 14px',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'color 0.12s',
          }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

/* ─── News card (compact, text-first) ───────────────────────────── */
function NewsCard({ article }) {
  const source  = article.source?.name || article.source || 'Unknown'
  const title   = article.title   || article.headline || ''
  const summary = article.description || article.summary || ''
  const url     = article.url     || article.link || '#'
  const pubAt   = article.publishedAt || article.datetime
  const cat     = article._category

  return (
    <div
      onClick={() => window.open(url, '_blank')}
      className="news-card-tv"
      style={{
        display: 'block',
        cursor: 'pointer',
        color: 'inherit',
        borderBottom: '1px solid var(--tv-border)',
        padding: '14px 0',
      }}
    >
      {/* Source */}
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--tv-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 5,
      }}>
        {source}
      </div>

      {/* Headline */}
      <div
        className="news-headline-tv"
        style={{
          fontSize: 14, fontWeight: 500,
          color: 'var(--tv-text-primary)',
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: summary ? 5 : 8,
          transition: 'color 0.1s',
        }}
      >
        <HeadlineWithLinks text={title} />
      </div>

      {/* Summary */}
      {summary && (
        <div style={{
          fontSize: 12, color: 'var(--tv-text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          {summary}
        </div>
      )}

      {/* Footer row: time + category */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 10, color: 'var(--tv-text-muted)',
      }}>
        <span>{timeAgo(pubAt)}</span>
        {cat && <CategoryBadge cat={cat} />}
      </div>
    </div>
  )
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
function NewsCardSkeleton() {
  return (
    <div style={{ borderBottom: '1px solid var(--tv-border)', padding: '14px 0' }}>
      <LoadingSkeleton height={9}  width="30%" style={{ marginBottom: 6 }} />
      <LoadingSkeleton height={13} width="90%" style={{ marginBottom: 3 }} />
      <LoadingSkeleton height={13} width="75%" style={{ marginBottom: 8 }} />
      <LoadingSkeleton height={10} width="50%" style={{ marginBottom: 6 }} />
      <LoadingSkeleton height={10} width="60%" />
    </div>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
function Sidebar({ trendingSymbols, loading }) {
  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderLeft: '1px solid var(--tv-border)',
      paddingLeft: 20,
    }}>
      {/* Trending symbols */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--tv-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 10,
        }}>
          Trending Symbols
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <LoadingSkeleton key={i} height={28} width={52} style={{ borderRadius: 4 }} />
              ))
            : trendingSymbols.map(sym => (
                <Link
                  key={sym}
                  to={`/stock/${sym}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '5px 10px',
                    background: 'var(--tv-bg-elevated)',
                    border: '1px solid var(--tv-border)',
                    borderRadius: 4,
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--tv-text-primary)',
                    fontFamily: 'var(--tv-font-mono)',
                    textDecoration: 'none',
                    transition: 'border-color 0.1s, color 0.1s',
                  }}
                  className="trending-chip"
                >
                  {sym}
                </Link>
              ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--tv-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 10,
        }}>
          Quick Links
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { to: '/',           label: 'Markets'  },
            { to: '/portfolio',  label: 'Portfolio' },
            { to: '/screener',   label: 'Screener'  },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 10px',
                fontSize: 12, color: 'var(--tv-text-secondary)',
                textDecoration: 'none',
                borderRadius: 4,
                transition: 'background 0.1s, color 0.1s',
              }}
              className="quicklink-item"
            >
              <span style={{ fontSize: 10, opacity: 0.6 }}>→</span>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── NewsPage (root) ────────────────────────────────────────────── */
export default function NewsPage() {
  const [articles,  setArticles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res  = await fetch('/api/news')
        const data = await res.json()
        if (cancelled) return

        // Handle both NewsAPI ({ articles: [...] }) and flat array
        const raw = Array.isArray(data) ? data : (data.articles ?? [])

        // Attach computed category
        const enriched = raw
          .filter(a => a.title && a.url)
          .map(a => ({ ...a, _category: classifyArticle(a) }))

        setArticles(enriched)
      } catch (error) {
        console.error("News fetch failed:", error)
        if (!cancelled) setArticles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Filtered list
  const filtered = useMemo(() => {
    if (activeTab === 'all') return articles
    return articles.filter(a => a._category === activeTab)
  }, [articles, activeTab])

  // Trending symbols extracted from all articles
  const trending = useMemo(() => extractMentionedSymbols(articles), [articles])

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 78px)' }}>
      {/* ── Left: main feed ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
        {/* Page title */}
        <div style={{
          padding: '16px 0 0',
          marginBottom: 0,
        }}>
          <h1 style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--tv-text-primary)',
            marginBottom: 12,
          }}>
            Financial News
          </h1>

          {/* Tabs */}
          <CategoryTabs active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Article list */}
        <div>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : filtered.length === 0
            ? (
                <div style={{
                  padding: '40px 0', textAlign: 'center',
                  fontSize: 13, color: 'var(--tv-text-secondary)',
                }}>
                  No {activeTab === 'all' ? '' : activeTab + ' '}articles found.
                </div>
              )
            : filtered.map((a, i) => <NewsCard key={a.url ?? i} article={a} />)
          }
        </div>
      </div>

      {/* ── Right: sidebar ───────────────────────────────────────── */}
      <Sidebar trendingSymbols={trending} loading={loading} />
    </div>
  )
}
