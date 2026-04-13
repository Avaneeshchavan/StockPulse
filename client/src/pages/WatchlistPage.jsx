import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import DataTable from '../components/ui/DataTable.jsx'
import Button from '../components/ui/Button.jsx'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'
import PriceChange from '../components/ui/PriceChange.jsx'
import WatchlistToggle from '../components/WatchlistToggle.jsx'
import { STATIC_STOCK } from '../constants/stocks'
import { fmtPrice } from '../constants/marketData.js'

export default function WatchlistPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 1. Fetch watchlist rows from Supabase (full objects, not just symbols)
  const { data: watchlistData, isLoading: isWatchlistLoading, isError: isWatchlistError, error: watchlistError, refetch: refetchWatchlist } = useQuery({
    queryKey: ['watchlistSymbols', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
      if (error) {
        console.warn('watchlist table not ready:', error.message)
        throw error
      }
      return data  // full row objects: { id, user_id, symbol, company_name, added_at }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => console.error('Watchlist symbols error:', err)
  })

  // 2. Fetch live quotes for those symbols
  const symbols = (watchlistData || []).map(r => r.symbol)
  const { data: quotes = {}, isLoading: isQuotesLoading, isError: isQuotesError, error: quotesError, refetch: refetchQuotes } = useQuery({
    queryKey: ['watchlistQuotes', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return {}
      const res = await fetch(`/api/market/quotes/batch?symbols=${symbols.join(',')}`)
      if (!res.ok) throw new Error('Failed to fetch quotes')
      return res.json()
    },
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => console.error('Watchlist quotes error:', err)
  })

  const isLoading = isWatchlistLoading || (isQuotesLoading && symbols.length > 0)
  const isError = isWatchlistError || isQuotesError
  const errorMsg = watchlistError?.message || quotesError?.message

  // Build rows from the full watchlist row objects — use company_name from DB
  const rows = (watchlistData || []).map(row => {
    const q = quotes[row.symbol] || {}
    const staticInfo = STATIC_STOCK[row.symbol] || {}
    return {
      symbol: row.symbol,
      company: row.company_name || staticInfo.name || row.symbol,
      price: q.price ?? staticInfo.price ?? null,
      chgPct: q.changePercent ?? null,
    }
  })

  // Sort by Chg% descending by default
  const sortedRows = [...rows].sort((a, b) => (b.chgPct || 0) - (a.chgPct || 0))

  const columns = [
    {
      key: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WatchlistToggle symbol={v} size={14} />
          <span style={{ fontWeight: 700 }}>{v}</span>
        </div>
      )
    },
    {
      key: 'company',
      label: 'Company',
      sortable: true,
      render: (v) => <span style={{ color: 'var(--tv-text-muted)', fontSize: 12 }}>{v}</span>
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      numeric: true,
      render: (v) => fmtPrice(v)
    },
    {
      key: 'chgPct',
      label: 'Chg %',
      sortable: true,
      numeric: true,
      render: (v) => <PriceChange percent={v} size="sm" />
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/stock/${row.symbol}`)}
            style={{ fontSize: 11 }}
          >
            Trade
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={async () => {
               await supabase
                .from('watchlist')
                .delete()
                .eq('user_id', user.id)
                .eq('symbol', row.symbol)
               queryClient.invalidateQueries({ queryKey: ['watchlistSymbols'] })
               queryClient.invalidateQueries({ queryKey: ['watchlistCount'] })
               queryClient.invalidateQueries({ queryKey: ['inWatchlist', row.symbol] })
               queryClient.invalidateQueries({ queryKey: ['watchlist'] })
            }}
            style={{ color: 'var(--tv-red)', fontSize: 11 }}
          >
            Remove
          </Button>
        </div>
      )
    }
  ]

  return (
    <section style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)' }}>Your Watchlist</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tv-accent)', fontWeight: 500 }}>
          <span className="live-dot" /> Live &middot; Updates every 60s
        </div>
      </div>

      {isError && (
        <div style={{ padding: '40px', background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 4, textAlign: 'center', marginBottom: 24 }}>
          <p style={{ color: 'var(--tv-red)', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Error: {errorMsg}</p>
          <Button onClick={() => { refetchWatchlist(); refetchQuotes(); }} variant="outline">Retry</Button>
        </div>
      )}

      {!isError && watchlistData?.length === 0 && !isLoading ? (
        <div style={{ 
          padding: '60px 20px', 
          textAlign: 'center', 
          background: 'var(--tv-bg-secondary)', 
          border: '1px solid var(--tv-border)', 
          borderRadius: 4 
        }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tv-text-muted)" strokeWidth="1.5" opacity="0.6">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--tv-text-primary)' }}>No stocks in your watchlist yet</h2>
          <p style={{ color: 'var(--tv-text-muted)', marginBottom: 24 }}>Browse Markets and click the star icon to add stocks to your personal list.</p>
          <Link to="/markets">
            <Button variant="accent">Browse Markets →</Button>
          </Link>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sortedRows}
          loading={isLoading}
          rowKey="symbol"
        />
      )}
    </section>
  )
}
