import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from './ui/Toast.jsx'
import { fetchWithAuth } from '../lib/api.js'
import { apiUrl } from '../config'
import Button from './ui/Button.jsx'
import PriceChange from './ui/PriceChange.jsx'
import LoadingSkeleton from './ui/LoadingSkeleton.jsx'
import { checkAchievements } from '../lib/achievementService.js'

/* ── helpers ──────────────────────────────────────────────────────── */
const fmt = (n, dec = 2) =>
  n != null && Number.isFinite(n)
    ? `$${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })}`
    : '—'

/* ── Qty stepper input ────────────────────────────────────────────── */
function QtyInput({ id, value, onChange, max, isCrypto = false }) {
  const step = isCrypto ? 0.000001 : 1
  const min = isCrypto ? 0.001 : 1
  
  const inc = () => onChange(v => Number((v + (isCrypto ? 0.1 : 1)).toFixed(6)))
  const dec = () => onChange(v => Math.max(min, Number((v - (isCrypto ? 0.1 : 1)).toFixed(6))))

  const handleChange = (e) => {
    const v = e.target.value === '' ? min : parseFloat(e.target.value)
    if (!isNaN(v)) onChange(v)
  }

  return (
    <div style={{
      display: 'flex', height: 34,
      background: 'var(--tv-bg-secondary)',
      border: '1px solid var(--tv-border)',
      borderRadius: 4, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={dec}
        aria-label="Decrease"
        style={{
          width: 34, flexShrink: 0,
          background: 'var(--tv-bg-elevated)',
          border: 'none', borderRight: '1px solid var(--tv-border)',
          color: 'var(--tv-text-primary)', fontSize: 16, lineHeight: 1,
          cursor: value <= min ? 'not-allowed' : 'pointer',
          opacity: value <= min ? 0.4 : 1,
        }}
        disabled={value <= min}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          flex: 1, textAlign: 'center',
          background: 'var(--tv-bg-input, #0f1219)',
          border: 'none',
          color: 'var(--tv-text-primary)',
          fontFamily: 'var(--tv-font-mono)',
          fontSize: 14, fontWeight: 600,
          padding: '6px 4px',
          MozAppearance: 'textfield',
        }}
      />
      <button
        type="button"
        onClick={inc}
        aria-label="Increase"
        style={{
          width: 34, flexShrink: 0,
          background: 'var(--tv-bg-elevated)',
          border: 'none', borderLeft: '1px solid var(--tv-border)',
          color: 'var(--tv-text-primary)', fontSize: 16, lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </div>
  )
}

/* ── Position summary card ────────────────────────────────────────── */
function PositionCard({ holding, currentPrice }) {
  if (!holding) return null

  const qty      = Number(holding.quantity ?? 0)
  const avgPrice = Number(holding.average_price ?? holding.avg_buy_price ?? 0)
  const costBasis = qty * avgPrice
  const mktValue  = qty * (currentPrice ?? avgPrice)
  const gainLoss  = mktValue - costBasis
  const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
  const isPos = gainLoss >= 0

  const isCrypto = holding?.asset_type === 'crypto' || holding?.symbol?.includes(':') // fallback check

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 4,
      }}
    >
      {/* Section title */}
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--tv-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
      }}>
        Your Position
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 0' }}>
        {[
          { label: isCrypto ? 'Units Owned' : 'Shares Owned',  value: isCrypto ? qty.toFixed(6) : `${qty.toLocaleString()} sh` },
          { label: 'Avg Buy Price', value: fmt(avgPrice) },
          { label: 'Market Value',  value: fmt(mktValue) },
          { label: 'Cost Basis',    value: fmt(costBasis) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--tv-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--tv-font-mono)', color: 'var(--tv-text-primary)', fontWeight: 600 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Gain / Loss row */}
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: '1px solid var(--tv-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Unrealised P&L
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'block',
            fontFamily: 'var(--tv-font-mono)', fontSize: 13, fontWeight: 700,
            color: isPos ? 'var(--tv-green)' : 'var(--tv-red)',
          }}>
            {isPos ? '+' : ''}{fmt(Math.abs(gainLoss))}
          </span>
          <PriceChange value={null} percent={gainLossPct} size="sm" />
        </div>
      </div>
    </div>
  )
}

/* ── TradePanel (main export) ─────────────────────────────────────── */
/**
 * Props
 *   symbol       {string}  ticker symbol
 *   companyName  {string}
 *   currentPrice {number}
 *   assetType    {string}  'stock'|'crypto'|'etf'|'commodity'
 *   holding      {object|null}  from /api/portfolio — { quantity, avg_buy_price }
 *   onTradeSuccess {Function}  called after successful trade
 */
export default function TradePanel({
  symbol,
  companyName,
  currentPrice,
  assetType = 'stock',
  holding = null,
  onTradeSuccess,
}) {
  const navigate         = useNavigate()
  const queryClient      = useQueryClient()
  const { isAuthenticated, profile, user, fetchProfile } = useAuth()
  const { toast, success: successToast, error: errorToast, achievement: achievementToast } = useToast()

  // Log profile for debugging
  console.log('TradePanel user:', user?.id)
  console.log('TradePanel profile:', profile)

  /* ── Fetch existing achievements to avoid double-toast ─────────── */
  const { data: unlockedKeys = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase.from('achievements').select('achievement_key').eq('user_id', user.id)
      if (error) {
        console.warn('achievements table not ready:', error.message)
        return []
      }
      return data?.map(a => a.achievement_key) || []
    },
    enabled: !!user?.id
  })

  const [side,       setSide]       = useState('buy')   // 'buy' | 'sell'
  const isCrypto     = assetType === 'crypto'
  const [qty,        setQty]        = useState(isCrypto ? 0.1 : 1)
  const [notes,      setNotes]      = useState('')

  /* ── Derived values ─────────────────────────────────────────────── */
  const sharesOwned    = Number(holding?.quantity ?? 0)
  // Get balance from profile (virtual_balance field from Supabase)
  const balance = Number(profile?.virtual_balance ?? 0)
  console.log('TradePanel profile:', profile)
  console.log('TradePanel balance:', balance)
  const estimatedTotal = (Number(qty) || 0) * (currentPrice ?? 0)

  const maxBuyQty = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null
    return Math.floor(balance / currentPrice)
  }, [balance, currentPrice])

  /* ── Validation ─────────────────────────────────────────────────── */
  const validationError = useMemo(() => {
    const n = Number(qty)
    if (!n || n <= 0) return 'Enter a valid quantity'
    if (!isCrypto && !Number.isInteger(n)) return 'Shares must be a whole number'
    if (n < (isCrypto ? 0.001 : 1)) return `Minimum is ${isCrypto ? 0.001 : 1} ${isCrypto ? 'units' : 'shares'}`
    if (side === 'buy') {
      if (!isAuthenticated) return null // sign-in prompt shown separately
      if (estimatedTotal > balance) return 'Insufficient balance'
    }
    if (side === 'sell') {
      if (sharesOwned <= 0) return `You don't own any ${symbol}`
      if (n > sharesOwned) return `You only own ${sharesOwned} shares`
    }
    return null
  }, [qty, side, estimatedTotal, balance, sharesOwned, symbol, isAuthenticated])

  /* ── Submit (Optimistic Update via React Query) ─────────────────── */
  const tradeMutation = useMutation({
    mutationFn: async ({ type, symbol, quantity, price, companyName, assetType, notes }) => {
      console.log('Sending trade:', { symbol, quantity: Number(quantity), price: Number(price) })
      
      const res = await fetchWithAuth(apiUrl(`/trade/${type}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, quantity, price, notes, companyName, assetType })
      })
      
      const data = await res.json()
      console.log('Trade response:', data)
      
      if (!res.ok) {
        // Throw with exact backend error message
        throw new Error(data.error || `Trade failed (HTTP ${res.status})`)
      }
      return data
    },
    onMutate: async ({ type, quantity, price }) => {
      // Immediately update the displayed balance before server confirms
      const estimatedTotal = quantity * price
      queryClient.setQueryData(['profile'], old => old ? ({
        ...old,
        virtual_balance: type === 'buy'
          ? (old.virtual_balance || 0) - estimatedTotal
          : (old.virtual_balance || 0) + estimatedTotal
      }) : undefined)
    },
    onSuccess: async (_, { type, quantity, price }) => {
      // Refetch the real values from server after success
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['holdings', symbol] })
      
      const totalStr = fmt(quantity * price)
      successToast(
        `${type === 'buy' ? 'Bought' : 'Sold'} ${quantity} × ${symbol}`,
        `${type === 'buy' ? 'Paid' : 'Received'} ${totalStr} · ${companyName}`
      )
      setQty(1)
      setNotes('')
      if (user?.id) await fetchProfile(user.id)
      
      // -- Achievement Check --
      try {
        const { data: txHistory } = await supabase.from('transactions').select('*').eq('user_id', user.id)
        const { data: holdingsData } = await supabase.from('holdings').select('*').eq('user_id', user.id)
        
        // Calculate totals for checker
        const cash = Number(profile?.virtual_balance ?? 0)
        const holdVal = (holdingsData ?? []).reduce((s, h) => {
          const q = Number(h.quantity || 0)
          const p = Number(h.avg_buy_price || h.average_price || 0)
          return s + (q * p)
        }, 0)
        
        const totals = { 
          portfolioValue: cash + holdVal,
          totalReturn: (cash + holdVal) - 100000 // assuming 100k start
        }

        const newUnlocks = await checkAchievements(txHistory ?? [], holdingsData ?? [], totals, unlockedKeys, user.id)
        newUnlocks.forEach(ach => {
          achievementToast(ach.title, ach.description, ach.icon)
        })
        if (newUnlocks.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['achievements', user.id] })
        }
      } catch (err) {
        console.error('Achievement check failed:', err)
      }

      onTradeSuccess?.()
    },
    onError: (error) => {
      // Roll back optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      errorToast('Trade failed', error.message || 'Network error')
    }
  })

  const handleTrade = useCallback(() => {
    // Debug logging
    console.log('Trade attempt:', {
      symbol,
      quantity: qty,
      price: currentPrice,
      quantityType: typeof qty,
      priceType: typeof currentPrice,
      cost: Number(qty) * Number(currentPrice)
    })

    // Ensure price and quantity are always numbers
    const qtyNum = Number(qty)
    const priceNum = Number(currentPrice)

    if (!qtyNum || qtyNum <= 0) {
      errorToast('Invalid quantity', 'Please enter a valid quantity')
      return
    }
    if (!priceNum || priceNum <= 0) {
      errorToast('Price unavailable', 'Price data unavailable — please refresh')
      return
    }

    const estimatedCost = qtyNum * priceNum
    console.log('Estimated cost:', estimatedCost)

    if (!isAuthenticated) {
      toast({ title: 'Sign in to trade', message: 'Create a free account to start virtual trading.', type: 'info' })
      navigate('/login')
      return
    }

    if (validationError) {
      errorToast('Cannot place order', validationError)
      return
    }

    // Send numbers not strings to API
    tradeMutation.mutate({ 
      type: side, 
      symbol, 
      quantity: qtyNum,  // Number, not string
      price: priceNum,   // Number, not string
      companyName, 
      assetType, 
      notes 
    })
  }, [
    isAuthenticated, validationError, side, qty, symbol,
    currentPrice, companyName, assetType, tradeMutation, toast, errorToast, navigate,
  ])

  /* ── Render ─────────────────────────────────────────────────────── */
  const priceLoaded = currentPrice != null && currentPrice > 0

  return (
    <div
      className="trade-panel"
      style={{
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* ── Buy / Sell tab toggle ──────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--tv-border)' }}>
        {['buy', 'sell'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setSide(s); setQty(1) }}
            style={{
              flex: 1,
              height: 40,
              background: side === s
                ? (s === 'buy' ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)')
                : 'transparent',
              border: 'none',
              borderBottom: side === s
                ? `2px solid ${s === 'buy' ? 'var(--tv-green)' : 'var(--tv-red)'}`
                : '2px solid transparent',
              color: side === s
                ? (s === 'buy' ? 'var(--tv-green)' : 'var(--tv-red)')
                : 'var(--tv-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 14px 16px' }}>
        {/* ── Balance / Shares context line ─────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 12,
        }}>
          <span style={{ fontSize: 11, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {side === 'buy' ? 'Available Cash' : (isCrypto ? 'Units Owned' : 'Shares Owned')}
          </span>
          <span style={{
            fontSize: 12, fontFamily: 'var(--tv-font-mono)', fontWeight: 600,
            color: side === 'buy' ? 'var(--tv-green)' : 'var(--tv-text-primary)',
          }}>
            {side === 'buy'
              ? (isAuthenticated ? fmt(balance) : '—')
              : (isCrypto ? sharesOwned.toFixed(6) : `${sharesOwned.toLocaleString()} sh`)}
          </span>
        </div>

        {/* ── Quantity ─────────────────────────────────────────────── */}
        <label
          htmlFor={`qty-${side}`}
          style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'block', marginBottom: 6 }}
        >
          Quantity ({isCrypto ? 'units' : 'shares'})
        </label>
        <QtyInput
          id={`qty-${side}`}
          value={qty}
          onChange={setQty}
          isCrypto={isCrypto}
          max={side === 'sell' ? (sharesOwned || undefined) : undefined}
        />

        {/* ── Quick-fill buttons for buy ──────────────────────────── */}
        {side === 'buy' && isAuthenticated && maxBuyQty !== null && maxBuyQty > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const rawVal = maxBuyQty * frac
              const n = isCrypto 
                ? Number(rawVal.toFixed(6))
                : Math.max(1, Math.floor(rawVal))
              return (
                <button
                  key={frac}
                  type="button"
                  onClick={() => setQty(n)}
                  style={{
                    flex: 1, padding: '3px 0', fontSize: 10, fontWeight: 500,
                    background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)',
                    color: 'var(--tv-text-muted)', borderRadius: 3, cursor: 'pointer',
                  }}
                >
                  {Math.round(frac * 100)}%
                </button>
              )
            })}
          </div>
        )}

        {/* ── Order summary ─────────────────────────────────────────── */}
        <div style={{
          marginTop: 14, marginBottom: 14,
          padding: '10px 12px',
          background: 'var(--tv-bg-primary)',
          border: '1px solid var(--tv-border)',
          borderRadius: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>Price per {isCrypto ? 'unit' : 'share'}</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--tv-font-mono)', color: 'var(--tv-text-primary)' }}>
              {priceLoaded ? fmt(currentPrice) : <LoadingSkeleton width={60} height={12} />}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>
              Estimated {side === 'buy' ? 'cost' : 'proceeds'}
            </span>
            <span style={{
              fontSize: 15, fontFamily: 'var(--tv-font-mono)', fontWeight: 700,
              color: 'var(--tv-text-primary)',
            }}>
              {priceLoaded ? fmt(estimatedTotal) : '—'}
            </span>
          </div>
        </div>

        {/* ── Validation error ─────────────────────────────────────── */}
        {validationError && (
          <div style={{
            marginBottom: 10, padding: '6px 10px',
            background: 'rgba(239,83,80,0.08)',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 4,
            fontSize: 11, color: 'var(--tv-red)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {validationError}
            </span>
          </div>
        )}

        {/* ── Journaling Notes ──────────────────────────────────────── */}
        <div style={{ marginTop: 14, position: 'relative' }}>
          <label 
            htmlFor="trade-notes" 
            style={{ fontSize: 11, color: 'var(--tv-text-muted)', display: 'block', marginBottom: 6 }}
          >
            Trade note (optional)
          </label>
          <textarea
            id="trade-notes"
            placeholder="Why are you making this trade? e.g. 'Breaking out above resistance'"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 280))}
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--tv-bg-input, #0f1219)',
              border: '1px solid var(--tv-border)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--tv-text-primary)',
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: 1.4,
              marginBottom: 4
            }}
          />
          <div style={{ 
            fontSize: 9, 
            color: notes.length >= 280 ? 'var(--tv-red)' : 'var(--tv-text-muted)', 
            textAlign: 'right',
            fontWeight: 500
          }}>
            {notes.length}/280
          </div>
        </div>

        {/* ── Action button ─────────────────────────────────────────── */}
        <Button
          variant={side === 'buy' ? 'buy' : 'sell'}
          fullWidth
          disabled={tradeMutation.isPending || (!isAuthenticated ? false : !!validationError)}
          onClick={handleTrade}
          style={{ height: 40, fontSize: 14, letterSpacing: '0.04em' }}
        >
          {tradeMutation.isPending
            ? 'Executing...'
            : !isAuthenticated
            ? 'Sign In to Trade'
            : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
        </Button>

        {/* ── Market order label ───────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: 'var(--tv-text-muted)' }}>
          Market order · Virtual balance only
        </div>
      </div>

      {/* ── Current position ─────────────────────────────────────────── */}
      {sharesOwned > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <PositionCard holding={holding} currentPrice={currentPrice} />
        </div>
      )}
    </div>
  )
}
