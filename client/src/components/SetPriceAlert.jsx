import { useState } from 'react'
import { supabase } from '../config/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from './ui/Toast.jsx'
import Button from './ui/Button.jsx'

export default function SetPriceAlert({ symbol, companyName, currentPrice }) {
  const { user, isAuthenticated } = useAuth()
  const { success, error: toastError } = useToast()
  
  const [isOpen, setIsOpen] = useState(false)
  const [targetPrice, setTargetPrice] = useState(currentPrice?.toString() || '')
  const [direction, setDirection] = useState('above')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSetAlert = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toastError('Please sign in to set price alerts')
      return
    }

    if (!targetPrice || isNaN(Number(targetPrice))) {
      toastError('Please enter a valid target price')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          symbol,
          company_name: companyName,
          target_price: Number(targetPrice),
          direction,
          triggered: false
        })

      if (error) throw error

      success(`Alert set for ${symbol} at $${Number(targetPrice).toLocaleString()}`)
      setIsOpen(false)
    } catch (err) {
      console.error('Error setting alert:', err)
      toastError('Failed to set alert. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div style={{ marginTop: 12 }}>
      {!isOpen ? (
        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => setIsOpen(true)}
          style={{ 
            fontSize: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 6,
            height: 38,
            borderColor: 'var(--tv-border)',
            color: 'var(--tv-text-secondary)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Set Price Alert
        </Button>
      ) : (
        <div style={{
          background: 'var(--tv-bg-secondary)',
          border: '1px solid var(--tv-border)',
          borderRadius: 4,
          padding: 12,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 10
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase' }}>
              Set Price Alert
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--tv-text-muted)', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSetAlert}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--tv-text-muted)', marginBottom: 4 }}>
                Target Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: 'var(--tv-bg-primary)',
                  border: '1px solid var(--tv-border)',
                  borderRadius: 4,
                  padding: '8px 10px',
                  color: 'var(--tv-text-primary)',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--tv-text-muted)', marginBottom: 4 }}>
                Alert me when price goes
              </label>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setDirection('above')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: '4px 0 0 4px',
                    border: '1px solid var(--tv-border)',
                    background: direction === 'above' ? 'var(--tv-accent)' : 'var(--tv-bg-primary)',
                    color: direction === 'above' ? '#fff' : 'var(--tv-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                >
                  Above ▲
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('below')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: '0 4px 4px 0',
                    border: '1px solid var(--tv-border)',
                    borderLeft: 'none',
                    background: direction === 'below' ? 'var(--tv-accent)' : 'var(--tv-bg-primary)',
                    color: direction === 'below' ? '#fff' : 'var(--tv-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                >
                  Below ▼
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              fullWidth 
              size="sm" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Setting...' : 'Set Alert'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
