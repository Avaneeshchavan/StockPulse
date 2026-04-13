import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWithAuth } from '../lib/api.js'
import { apiUrl } from '../config'

export default function TransactionHistoryPage() {
  const [filterType, setFilterType] = useState('all')
  const [filterSymbol, setFilterSymbol] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch up to 10000 for robust client-side filtering and CSV export
        const res = await fetchWithAuth(apiUrl('/portfolio/transactions?limit=10000&page=1'))
        const json = await res.json().catch((err) => { console.error(err); return {} })
        if (!res.ok) throw new Error(json.error || res.statusText)
        if (!cancelled) {
          const formatted = (json.data ?? [])
          setRows(formatted)
        }
      } catch (e) {
        console.error("TransactionHistory fetch failed:", e)
        if (!cancelled) {
          setError(e.message || 'Could not load transactions')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredTransactions = useMemo(() => {
    let list = rows
    if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType)
    }
    if (filterSymbol.trim()) {
      const s = filterSymbol.trim().toUpperCase()
      list = list.filter((t) => t.symbol.toUpperCase().includes(s))
    }
    list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return list
  }, [rows, filterType, filterSymbol])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))
  
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredTransactions.slice(start, start + itemsPerPage)
  }, [filteredTransactions, page])

  const handleExportCSV = () => {
    if (!filteredTransactions.length) return
    const headers = ['Date', 'Type', 'Symbol', 'Company', 'Quantity', 'Price', 'Total']
    const csvRows = [headers.join(',')]
    
    for (const tx of filteredTransactions) {
      const date = new Date(tx.created_at).toISOString()
      const type = tx.type
      const symbol = tx.symbol
      const company = `"${tx.company_name || ''}"`
      const qty = tx.quantity
      const price = tx.price
      const total = tx.total
      csvRows.push([date, type, symbol, company, qty, price, total].join(','))
    }
    
    const csvData = csvRows.join('\n')
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const empty = filteredTransactions.length === 0

  if (loading) {
    return (
      <section className="transactions">
        <div className="container" style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ color: 'var(--tv-text-muted)' }}>Loading transactions…</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="transactions">
        <div className="container" style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ color: 'var(--tv-red)' }}>{error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="transactions">
      <div className="container" style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--tv-text-primary)' }}>Transaction History</h1>
          <button 
            onClick={handleExportCSV}
            style={{
              padding: '6px 12px', background: 'var(--tv-bg-elevated)',
              border: '1px solid var(--tv-border)', borderRadius: 4,
              color: 'var(--tv-text-primary)', fontSize: 13, cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Export to CSV
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px', background: 'var(--tv-bg-input, #0f1219)',
              border: '1px solid var(--tv-border)', borderRadius: 4,
              color: 'var(--tv-text-primary)', fontSize: 13
            }}
          >
            <option value="all">All Types</option>
            <option value="buy">Buys Only</option>
            <option value="sell">Sells Only</option>
          </select>

          <input
            type="text"
            placeholder="Filter by Symbol (e.g. AAPL)"
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            style={{
              padding: '8px 12px', background: 'var(--tv-bg-input, #0f1219)',
              border: '1px solid var(--tv-border)', borderRadius: 4,
              color: 'var(--tv-text-primary)', fontSize: 13, width: 200, flex: 1, maxWidth: 300
            }}
          />
        </div>

        {!empty ? (
          <>
            <div style={{ overflowX: 'auto', border: '1px solid var(--tv-border)', borderRadius: 4, background: 'var(--tv-bg-secondary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)' }}>Date</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)' }}>Type</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)' }}>Symbol</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)' }}>Company</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)', textAlign: 'right' }}>Shares</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--tv-text-muted)', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction) => {
                    const date = new Date(transaction.created_at)
                    const formattedDate = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const qty = Number(transaction.quantity)
                    const pr = Number(transaction.price)
                    // Fix: Handle null/NaN total with fallback calculation
                    const rawTotal = Number(transaction.total)
                    const calculatedTotal = qty * pr
                    const total = (!isNaN(rawTotal) && rawTotal > 0) ? rawTotal : calculatedTotal
                    const isBuy = transaction.type === 'buy'
                    // Fix: Handle null company_name with fallback to symbol
                    const displayCompany = transaction.company_name || transaction.symbol
                    
                    return (
                      <tr key={transaction.id} style={{ borderBottom: '1px solid var(--tv-border)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--tv-text-primary)' }}>{formattedDate}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                            background: isBuy ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
                            color: isBuy ? 'var(--tv-green)' : 'var(--tv-red)'
                          }}>
                            {isBuy ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--tv-text-primary)' }}>{transaction.symbol}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--tv-text-secondary)' }}>{displayCompany}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--tv-font-mono)', textAlign: 'right', color: 'var(--tv-text-primary)' }}>{qty}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--tv-font-mono)', textAlign: 'right', color: 'var(--tv-text-primary)' }}>${pr.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--tv-font-mono)', textAlign: 'right', fontWeight: 600, color: 'var(--tv-text-primary)' }}>
                          {!isNaN(total) ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '6px 12px', background: page === 1 ? 'transparent' : 'var(--tv-bg-elevated)',
                    border: '1px solid var(--tv-border)', borderRadius: 4,
                    color: page === 1 ? 'var(--tv-text-muted)' : 'var(--tv-text-primary)',
                    cursor: page === 1 ? 'default' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 13, color: 'var(--tv-text-secondary)' }}>
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '6px 12px', background: page === totalPages ? 'transparent' : 'var(--tv-bg-elevated)',
                    border: '1px solid var(--tv-border)', borderRadius: 4,
                    color: page === totalPages ? 'var(--tv-text-muted)' : 'var(--tv-text-primary)',
                    cursor: page === totalPages ? 'default' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--tv-bg-secondary)', border: '1px solid var(--tv-border)', borderRadius: 4 }}>
            <p style={{ color: 'var(--tv-text-muted)', marginBottom: 16 }}>No transactions found.</p>
            <Link to="/" style={{ padding: '8px 16px', background: 'var(--tv-accent)', color: '#fff', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              Start Trading
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
