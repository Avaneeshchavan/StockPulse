import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import StockChart from '../components/StockChart'
import TradePanel from '../components/TradePanel'
import SetPriceAlert from '../components/SetPriceAlert'
import WatchlistToggle from '../components/WatchlistToggle'
import { useAuth } from '../hooks/useAuth.js'
import { ASSET_GROUPS } from '../constants/marketData.js'
import { STATIC_STOCK } from '../constants/stocks'
import { fetchWithAuth } from '../lib/api.js'
import { apiUrl } from '../config'
import { supabase } from '../lib/supabase.js'
import { PEER_MAP } from '../constants/marketData.js'
import Button from '../components/ui/Button'

/* ── helpers ─────────────────────────────────────────────────────── */
const fmt = (n, isCrypto = false) =>
  n != null && Number.isFinite(n)
    ? `$${Number(n).toLocaleString('en-US', { 
        minimumFractionDigits: isCrypto && n < 1 ? 4 : 2, 
        maximumFractionDigits: isCrypto && n < 1 ? 6 : 2 
      })}`
    : '—'



/* ── Key stats row ───────────────────────────────────────────────── */
function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid var(--tv-border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--tv-font-mono)', color: 'var(--tv-text-primary)', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  )
}

/* ── StockDetailPage ─────────────────────────────────────────────── */
export default function StockDetailPage() {
  const { isAuthenticated, profile, user, fetchProfile } = useAuth()
  const { symbol: raw } = useParams()
  const symbol = (raw || 'AAPL').toUpperCase()
  const navigate = useNavigate()

  const [showCompareMenu, setShowCompareMenu] = useState(false)
  const peers = PEER_MAP[symbol] || []

  const staticRow  = STATIC_STOCK[symbol]
  const companyName = staticRow?.name ?? symbol

  const queryClient = useQueryClient()

  /* ── Price state via React Query ─────────────────────────────────── */
  const { data: q, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => fetch(apiUrl(`/market/quotes/batch?symbols=${symbol}`)).then(r => r.json()).then(d => d[symbol] || {})
  })

  const price     = q?.price ?? staticRow?.price ?? null
  const changePct = q?.changePercent ?? staticRow?.change ?? 0
  const changeAbs = q?.change ?? null
  const ohlc      = { o: q?.open ?? null, h: q?.high ?? null, l: q?.low ?? null, pc: q?.prevClose ?? null }

  /* ── Current holding via React Query ────────────────────────────── */
  const { data: holding } = useQuery({
    queryKey: ['holdings', symbol],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) return null
      const { data, error } = await supabase
        .from('holdings')
        .select('quantity, avg_buy_price, symbol')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle()
      if (error) {
        console.error('Error fetching holding:', error)
        return null
      }
      return data
    },
    enabled: isAuthenticated && !!user?.id
  })

  /* ── After successful trade, refresh holding + profile ─────────── */
  const handleTradeSuccess = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['holdings', symbol] })
      if (user?.id) await fetchProfile(user.id)
    } catch (error) {
      console.error("handleTradeSuccess failed:", error)
    }
  }, [queryClient, symbol, user, fetchProfile])

  /* ── Derived display values ─────────────────────────────────────── */
  const isPositive   = (changePct ?? 0) >= 0
  const changeColor  = isPositive ? 'var(--tv-green)' : 'var(--tv-red)'
  const changeArrow  = isPositive ? '▲' : '▼'
  const changePctStr = `${changeArrow} ${isPositive ? '+' : ''}${Number(changePct).toFixed(2)}%`

  // Look up asset metadata (type, market cap) from our constants
  const assetInfo = useMemo(() => {
    const all = Object.values(ASSET_GROUPS).flat()
    return all.find((a) => a.symbol === symbol) ?? null
  }, [symbol])

  return (
    <section style={{ padding: '0 0 40px' }}>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '20px 0 16px',
        borderBottom: '1px solid var(--tv-border)',
        marginBottom: 20,
        flexWrap: 'wrap', gap: 12,
      }}>
        {/* Left: symbol + name + badge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tv-text-primary)' }}>
              {symbol}
            </h1>
            <WatchlistToggle symbol={symbol} companyName={companyName} size={20} />
            {assetInfo?.assetType && assetInfo.assetType !== 'stock' && (
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
                  padding: '2px 6px', borderRadius: 2,
                  background: 'var(--tv-bg-elevated)',
                  color: assetInfo.assetType === 'crypto' ? '#f7525f'
                    : assetInfo.assetType === 'etf' ? 'var(--tv-green)'
                    : '#f0b429',
                }}>
                  {assetInfo.assetType.toUpperCase()}
                </span>
                {assetInfo.assetType === 'crypto' && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
                    padding: '2px 6px', borderRadius: 2,
                    background: 'var(--tv-bg-elevated)',
                    color: 'var(--tv-text-muted)',
                    border: '1px solid var(--tv-border)'
                  }}>
                    BINANCE
                  </span>
                )}
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--tv-text-secondary)' }}>{companyName}</p>

          <div style={{ position: 'relative', marginTop: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompareMenu(!showCompareMenu)}
              style={{
                fontSize: 11, padding: '4px 10px', height: 26,
                border: '1px solid var(--tv-border)',
                display: 'flex', alignItems: 'center', gap: 6,
                background: showCompareMenu ? 'var(--tv-bg-elevated)' : 'transparent'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <polyline points="1,11 4,7 7,8 10,4 13,3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Compare with...
            </Button>

            {showCompareMenu && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 10,
                background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)',
                borderRadius: 4, padding: 4, width: 140,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                <div style={{ fontSize: 9, color: 'var(--tv-text-muted)', padding: '4px 8px', fontWeight: 600 }}>SUGGESTED PEERS</div>
                {peers.map(p => (
                  <button
                    key={p}
                    onClick={() => navigate(`/compare?symbols=${symbol},${p}`)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '6px 8px',
                      background: 'transparent', border: 'none', color: 'var(--tv-text-primary)',
                      fontSize: 12, cursor: 'pointer', borderRadius: 2,
                      display: 'flex', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{p}</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>→</span>
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--tv-border)', margin: '4px 0' }} />
                <button
                  onClick={() => navigate(`/compare?symbols=${symbol}`)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 8px',
                    background: 'transparent', border: 'none', color: 'var(--tv-accent)',
                    fontSize: 11, cursor: 'pointer', fontWeight: 500
                  }}
                >
                  Advanced Compare
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: price + change */}
        <div style={{ textAlign: 'right' }}>
          {quoteLoading && price == null ? (
            <>
              <div style={{ height: 32, width: 140, background: 'var(--tv-bg-elevated)', borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 16, width: 100, background: 'var(--tv-bg-elevated)', borderRadius: 4, marginLeft: 'auto' }} />
            </>
          ) : (
            <>
              <div style={{
                fontSize: 28, fontWeight: 700,
                fontFamily: 'var(--tv-font-mono)',
                color: 'var(--tv-text-primary)',
                letterSpacing: '-0.02em',
              }}>
                {fmt(price, assetInfo?.assetType === 'crypto')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                {changeAbs != null && (
                  <span style={{ fontSize: 13, fontFamily: 'var(--tv-font-mono)', color: changeColor }}>
                    {isPositive ? '+' : ''}{fmt(changeAbs, assetInfo?.assetType === 'crypto')}
                  </span>
                )}
                <span style={{
                  fontSize: 13, fontFamily: 'var(--tv-font-mono)',
                  fontWeight: 600, color: changeColor,
                }}>
                  {changePctStr}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main two-column layout ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* ── LEFT: chart + stats ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Chart */}
          <div style={{
            background: 'var(--tv-bg-secondary)',
            border: '1px solid var(--tv-border)',
            borderRadius: 4,
            padding: '10px 12px 4px',
          }}>
            <StockChart
              symbol={symbol}
              height={460}
              price={price}
              change={changeAbs}
              changePercent={changePct}
            />
          </div>

          {/* Key Statistics */}
          <div style={{
            background: 'var(--tv-bg-secondary)',
            border: '1px solid var(--tv-border)',
            borderRadius: 4,
            padding: 14,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--tv-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              Key Statistics
            </div>
            <StatRow label="Open"         value={fmt(ohlc.o, assetInfo?.assetType === 'crypto')} />
            <StatRow label="High"         value={fmt(ohlc.h, assetInfo?.assetType === 'crypto')} />
            <StatRow label="Low"          value={fmt(ohlc.l, assetInfo?.assetType === 'crypto')} />
            <StatRow label="Prev Close"   value={fmt(ohlc.pc, assetInfo?.assetType === 'crypto')} />
            <StatRow label="Mkt Cap"      value={
              assetInfo?.marketCap
                ? (assetInfo.marketCap >= 1e12
                    ? `$${(assetInfo.marketCap / 1e12).toFixed(2)}T`
                    : `$${(assetInfo.marketCap / 1e9).toFixed(1)}B`)
                : '—'
            } />
            <StatRow label="Volume"       value="—" />
            <StatRow label="52-wk High"   value="—" />
            <StatRow label="52-wk Low"    value="—" />
          </div>
        </div>

        {/* ── RIGHT: TradePanel ───────────────────────────────────── */}
        <div>
          <TradePanel
            symbol={symbol}
            companyName={companyName}
            currentPrice={price}
            assetType={assetInfo?.assetType ?? 'stock'}
            holding={holding}
            onTradeSuccess={handleTradeSuccess}
          />

          <SetPriceAlert 
            symbol={symbol}
            companyName={companyName}
            currentPrice={price}
          />

          {/* Back link */}
          <div style={{ marginTop: 12 }}>
            <Link
              to="/markets"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--tv-text-secondary)',
                textDecoration: 'none',
              }}
            >
              ← Back to Market Overview
            </Link>
          </div>

          {/* Auth hint */}
          {!isAuthenticated && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--tv-bg-elevated)',
              border: '1px solid var(--tv-border)',
              borderRadius: 4,
              fontSize: 11, color: 'var(--tv-text-muted)',
              lineHeight: 1.5,
            }}>
              <Link to="/login" style={{ color: 'var(--tv-accent)', marginRight: 4 }}>Sign in</Link>
              to trade and track your virtual portfolio.
            </div>
          )}

          {/* Balance indicator when auth'd */}
          {isAuthenticated && profile?.virtual_balance != null && (
            <div style={{
              marginTop: 8,
              padding: '7px 12px',
              background: 'var(--tv-bg-elevated)',
              border: '1px solid var(--tv-border)',
              borderRadius: 4,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>Cash balance</span>
              <span style={{
                fontSize: 12, fontFamily: 'var(--tv-font-mono)',
                fontWeight: 600, color: 'var(--tv-green)',
              }}>
                {fmt(Number(profile.balance))}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
