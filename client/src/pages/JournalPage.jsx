import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import DataTable from '../components/ui/DataTable.jsx'
import PriceChange from '../components/ui/PriceChange.jsx'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.jsx'
import { fmtPrice } from '../constants/marketData.js'

export default function JournalPage() {
  const { user, isAuthenticated } = useAuth()
  const [filter, setFilter] = useState('all') // all, buy, sell, notes, profitable, unprofitable
  const [search, setSearch] = useState('')
  const [expandedNotes, setExpandedNotes] = useState(new Set())

  // 1. Fetch all transactions
  const { data: transactions = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['journalTransactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('id, symbol, company_name, type, quantity, price, total, created_at, notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }) // chronological order for P&L calc
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => console.error('Journal query error:', err)
  })

  // 2. Process transactions for P&L and derived state
  const processedData = useMemo(() => {
    const symbolState = {} // { AAPL: { qty: 0, costBasis: 0, avgPrice: 0 } }
    
    const enriched = transactions.map(t => {
      const sym = t.symbol
      if (!symbolState[sym]) symbolState[sym] = { qty: 0, costBasis: 0, avgPrice: 0 }
      
      const state = symbolState[sym]
      const qty = Number(t.quantity)
      const price = Number(t.price)
      let pnl = null
      let pnlPct = null

      if (t.type === 'buy') {
        state.qty += qty
        state.costBasis += (qty * price)
        state.avgPrice = state.costBasis / state.qty
      } else if (t.type === 'sell') {
        // Calculate P&L vs average buy price
        if (state.qty > 0) {
          pnl = qty * (price - state.avgPrice)
          pnlPct = ((price - state.avgPrice) / state.avgPrice) * 100
          
          // Update state (cost basis reduces proportionally)
          state.qty -= qty
          state.costBasis = state.qty * state.avgPrice
          if (state.qty <= 0) {
            state.qty = 0
            state.costBasis = 0
            state.avgPrice = 0
          }
        }
      }

      return {
        ...t,
        pnl,
        pnlPct,
        total: qty * price,
        formattedDate: new Date(t.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      }
    })

    // Reverse for display (newest first)
    return enriched.reverse()
  }, [transactions])

  // 3. Filtering and Searching
  const filteredData = useMemo(() => {
    let data = processedData
    
    if (search.trim()) {
      const s = search.toLowerCase()
      data = data.filter(t => t.symbol.toLowerCase().includes(s))
    }

    if (filter === 'buy') data = data.filter(t => t.type === 'buy')
    else if (filter === 'sell') data = data.filter(t => t.type === 'sell')
    else if (filter === 'notes') data = data.filter(t => !!t.notes)
    else if (filter === 'profitable') data = data.filter(t => t.pnl > 0)
    else if (filter === 'unprofitable') data = data.filter(t => t.pnl < 0)

    return data
  }, [processedData, filter, search])

  // 4. Stats Calculation
  const stats = useMemo(() => {
    const sells = processedData.filter(t => t.type === 'sell')
    const totalPnl = sells.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const wins = sells.filter(t => (t.pnl || 0) > 0).length
    const winRate = sells.length > 0 ? (wins / sells.length) * 100 : 0
    
    let best = null, worst = null
    sells.forEach(t => {
      if (!best || t.pnl > best.pnl) best = t
      if (!worst || t.pnl < worst.pnl) worst = t
    })

    return {
      totalTrades: processedData.length,
      winRate,
      totalPnl,
      bestTrade: best?.pnl || 0,
      worstTrade: worst?.pnl || 0
    }
  }, [processedData])

  const toggleNote = (id) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (_, row) => <span style={{ fontSize: 12, color: 'var(--tv-text-secondary)' }}>{row.formattedDate}</span>
    },
    {
      key: 'symbol',
      label: 'Symbol',
      render: (v) => <span style={{ fontWeight: 700 }}>{v}</span>
    },
    {
      key: 'type',
      label: 'Type',
      render: (v) => (
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          background: v === 'buy' ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
          color: v === 'buy' ? 'var(--tv-green)' : 'var(--tv-red)'
        }}>
          {v}
        </span>
      )
    },
    {
      key: 'quantity',
      label: 'Shares',
      numeric: true,
      render: (v) => <span style={{ fontFamily: 'var(--tv-font-mono)' }}>{v}</span>
    },
    {
      key: 'price',
      label: 'Price',
      numeric: true,
      render: (v) => fmtPrice(v)
    },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      render: (v) => <span style={{ fontWeight: 600 }}>{fmtPrice(v)}</span>
    },
    {
      key: 'pnl',
      label: 'Realized P&L',
      numeric: true,
      render: (_, row) => {
        if (row.type === 'buy') return <span style={{ color: 'var(--tv-text-muted)' }}>—</span>
        const isPos = (row.pnl || 0) >= 0
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontWeight: 700, fontSize: 13,
              color: isPos ? 'var(--tv-green)' : 'var(--tv-red)'
            }}>
              {isPos ? '+' : ''}{fmtPrice(row.pnl)}
            </div>
            <PriceChange percent={row.pnlPct} size="xs" />
          </div>
        )
      }
    },
    {
      key: 'notes',
      label: 'Note',
      width: '30%',
      render: (v, row) => {
        if (!v) return <span style={{ color: 'var(--tv-text-muted)', fontSize: 11 }}>No note</span>
        const isExpanded = expandedNotes.has(row.id)
        const summary = v.length > 60 ? v.substring(0, 60) + '...' : v
        
        return (
          <div 
            style={{ fontSize: 12, cursor: v.length > 60 ? 'pointer' : 'default', lineHeight: 1.4 }}
            onClick={() => v.length > 60 && toggleNote(row.id)}
          >
            {isExpanded ? v : summary}
            {v.length > 60 && (
              <span style={{ color: 'var(--tv-accent)', marginLeft: 6, fontSize: 11, fontWeight: 600 }}>
                {isExpanded ? 'Show less' : 'Expand'}
              </span>
            )}
          </div>
        )
      }
    }
  ]

  if (isLoading && !transactions.length) {
    return <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <LoadingSkeleton height={300} width="100%" />
    </div>
  }

  if (isError) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--tv-red)' }}>
        <p>Error: {error?.message}</p>
        <button onClick={() => refetch()} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', color: 'var(--tv-text-primary)' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <section style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)', marginBottom: 4 }}>Trading Journal</h1>
        <p style={{ color: 'var(--tv-text-secondary)', fontSize: 14 }}>Your trade history with notes and performance tracking</p>
      </div>

      {/* Stats Row */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: 12, marginBottom: 24 
      }}>
        {[
          { label: 'Total Trades', value: stats.totalTrades, sub: 'All transactions' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, sub: 'Realized profitable sells', color: stats.winRate > 50 ? 'var(--tv-green)' : 'var(--tv-red)' },
          { label: 'Total P&L', value: fmtPrice(stats.totalPnl), sub: 'Cumulative realized', color: stats.totalPnl >= 0 ? 'var(--tv-green)' : 'var(--tv-red)' },
          { label: 'Best Trade', value: fmtPrice(stats.bestTrade), sub: 'Highest profit', color: 'var(--tv-green)' },
          { label: 'Worst Trade', value: fmtPrice(stats.worstTrade), sub: 'Deepest loss', color: 'var(--tv-red)' }
        ].map(s => (
          <div key={s.label} style={{ 
            padding: '16px', background: 'var(--tv-bg-secondary)', 
            border: '1px solid var(--tv-border)', borderRadius: 4 
          }}>
            <div style={{ fontSize: 11, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color || 'var(--tv-text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--tv-text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ 
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, 
        padding: '12px', background: 'var(--tv-bg-secondary)', 
        border: '1px solid var(--tv-border)', borderRadius: 4 
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'buy', 'sell', 'notes', 'profitable', 'unprofitable'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                background: filter === f ? 'var(--tv-accent)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--tv-text-secondary)',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize'
              }}
            >
              {f.replace('profitable', 'Profit').replace('unprofitable', 'Loss')}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '6px 12px',
              background: 'var(--tv-bg-input, #0f1219)',
              border: '1px solid var(--tv-border)', borderRadius: 4,
              fontSize: 12, color: 'var(--tv-text-primary)'
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={isLoading}
        rowKey="id"
      />
    </section>
  )
}
