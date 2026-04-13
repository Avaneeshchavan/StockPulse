import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from '../components/ui/Toast.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Button from '../components/ui/Button.jsx'

export default function AlertsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Alerts fetch error:', error.message)
        setAlerts([])
        setLoading(false)
        return
      }
      setAlerts(data || [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
      toastError('Failed to load alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [user?.id])

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id)

      if (error) throw error
      success('Alert deleted')
      fetchAlerts()
    } catch (err) {
      console.error('Delete failed:', err)
      toastError('Failed to delete alert')
    }
  }

  const columns = [
    {
      key: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (v) => <span style={{ fontWeight: 700 }}>{v}</span>
    },
    {
      key: 'target_price',
      label: 'Target Price',
      sortable: true,
      numeric: true,
      render: (v) => `$${Number(v).toLocaleString()}`
    },
    {
      key: 'direction',
      label: 'Direction',
      sortable: true,
      render: (v) => (
        <span style={{ 
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          color: v === 'above' ? 'var(--tv-green)' : 'var(--tv-red)'
        }}>
          {v === 'above' ? 'Above ▲' : 'Below ▼'}
        </span>
      )
    },
    {
      key: 'triggered',
      label: 'Status',
      sortable: true,
      render: (v) => (
        <span style={{ 
          fontSize: '10px', 
          fontWeight: 700, 
          padding: '2px 8px', 
          borderRadius: '2px',
          background: v ? 'var(--tv-green-bg)' : 'transparent',
          color: v ? 'var(--tv-green)' : 'var(--tv-text-muted)',
          border: v ? '1px solid var(--tv-green)' : '1px solid var(--tv-border)',
          textTransform: 'uppercase'
        }}>
          {v ? 'HIT' : 'ACTIVE'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (v) => new Date(v).toLocaleDateString()
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/stock/${row.symbol}`)}
            style={{
              background: 'transparent',
              border: '1px solid var(--tv-border)',
              borderRadius: '4px',
              color: 'var(--tv-text-secondary)',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => {
              e.target.style.borderColor = 'var(--tv-accent)'
              e.target.style.color = 'var(--tv-accent)'
            }}
            onMouseOut={e => {
              e.target.style.borderColor = 'var(--tv-border)'
              e.target.style.color = 'var(--tv-text-secondary)'
            }}
          >
            Trade {row.symbol}
          </button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDelete(row.id)}
            style={{ color: 'var(--tv-red)', fontSize: 11 }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <section style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)' }}>Price Alerts</h1>
      </div>

      <DataTable
        columns={columns}
        data={alerts}
        loading={loading}
        rowKey="id"
        emptyText="You haven't set any price alerts yet."
      />
    </section>
  )
}
