import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createUserSupabase } from '../lib/supabaseUser.js'
import { takeSnapshot } from '../services/portfolioService.js'

const router = express.Router()

/* ── GET /api/portfolio ─────────────────────────────────────────────────────
   Returns the authenticated user's holdings.
   Schema: holdings(id, user_id, symbol, quantity, avg_buy_price, updated_at)
   Frontend expects: { success, data: [{ symbol, quantity, avg_buy_price, updated_at, ... }] }
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const sb = createUserSupabase(req.accessToken)
    const { data, error } = await sb
      .from('holdings')
      .select('id, user_id, symbol, quantity, avg_buy_price, updated_at')
      .eq('user_id', req.user.id)
      .order('symbol', { ascending: true })

    if (error) {
      console.error('Supabase Error:', error)
      return res.status(400).json({ success: false, error: error.message })
    }

    // Map avg_buy_price to average_price for frontend compatibility
    const mappedData = (data ?? []).map(h => ({
      ...h,
      average_price: h.avg_buy_price
    }))

    return res.json({ success: true, data: mappedData })
  } catch (e) {
    console.error('[portfolioRouter GET /] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

/* ── GET /api/portfolio/summary ─────────────────────────────────────────────
   Returns balance + full portfolio list + total cost basis.
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const sb = createUserSupabase(req.accessToken)
    
    // Try to fetch user, create if not exists
    let { data: user, error: ue } = await sb.from('users')
      .select('balance')
      .eq('id', req.user.id)
      .maybeSingle()
    
    // If user not found, create with default balance
    if (!user && !ue) {
      console.log(`[portfolioRouter] User ${req.user.id} not found, creating new user row...`)
      const { data: newUser, error: insertError } = await sb
        .from('users')
        .insert({
          id: req.user.id,
          email: req.user.email,
          balance: 100000
        })
        .select('balance')
        .maybeSingle()
      
      if (insertError) {
        console.error('[portfolioRouter] Error creating user row:', insertError)
        return res.status(500).json({ success: false, error: insertError.message })
      }
      
      console.log(`[portfolioRouter] Created new user row with $100,000 balance for ${req.user.id}`)
      user = newUser
    }
    
    if (ue) {
      console.error('Supabase Error:', ue)
      return res.status(400).json({ success: false, error: ue.message })
    }
    
    const { data: holdings, error: pe } = await sb
      .from('holdings')
      .select('id, user_id, symbol, quantity, avg_buy_price, updated_at')
      .eq('user_id', req.user.id)
    if (pe) {
      console.error('Supabase Error:', pe)
      return res.status(400).json({ success: false, error: pe.message })
    }

    const list = (holdings ?? []).map(h => ({
      ...h,
      average_price: h.avg_buy_price
    }))
    let totalCostBasis = 0
    for (const row of list) {
      const q = Number(row.quantity)
      const avg = Number(row.average_price)
      if (Number.isFinite(q) && Number.isFinite(avg)) {
        totalCostBasis += q * avg
      }
    }

    return res.json({
      success: true,
      data: {
        balance: Number(user?.balance ?? 0),
        portfolio: list,
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
      },
    })
  } catch (e) {
    console.error('[portfolioRouter GET /summary] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

/* ── GET /api/portfolio/transactions ────────────────────────────────────────
   Returns paginated transaction history for the authenticated user.
   Schema: transactions(id, user_id, symbol, side, quantity, price, created_at)
   Frontend maps: side → type, created_at → created_at
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page),  10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20))
    const offset = (page - 1) * limit
    const end    = offset + limit - 1

    const sb = createUserSupabase(req.accessToken)
    const { data, error, count } = await sb
      .from('transactions')
      // Explicit column list — matches schema exactly; 'created_at' and 'price'
      .select('id, user_id, symbol, side, quantity, price, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, end)

    if (error) {
      console.error('Supabase Error:', error)
      return res.status(400).json({ success: false, error: error.message })
    }

    return res.json({
      success: true,
      data:  data ?? [],
      page,
      limit,
      total: count ?? 0,
    })
  } catch (e) {
    console.error('[portfolioRouter GET /transactions] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

/* ── POST /api/portfolio/snapshot ───────────────────────────────────────────
   Saves a point-in-time portfolio value snapshot.
   ─────────────────────────────────────────────────────────────────────────── */
router.post('/snapshot', requireAuth, async (req, res) => {
  try {
    const sb = createUserSupabase(req.accessToken)
    const result = await takeSnapshot(req.user.id, sb, req.user.email)

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error })
    }

    return res.json({ success: true, data: result.data })
  } catch (e) {
    console.error('[portfolioRouter POST /snapshot] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

/* ── GET /api/portfolio/history ─────────────────────────────────────────────
   Returns time-series portfolio value for charting.
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { range } = req.query
    const sb = createUserSupabase(req.accessToken)

    let query = sb
      .from('portfolio_snapshots')
      .select('recorded_at, total_value')
      .eq('user_id', req.user.id)
      .order('recorded_at', { ascending: true })

    if (range && range !== 'ALL') {
      const days = range === '1W' ? 7 : range === '1M' ? 30 : 90
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
      query = query.gte('recorded_at', cutoff)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase Error:', error)
      return res.status(400).json({ success: false, error: error.message })
    }

    const formattedData = data.map(row => ({
      date:  row.recorded_at,
      value: Number(row.total_value),
    }))

    return res.json({ success: true, data: formattedData })
  } catch (e) {
    console.error('[portfolioRouter GET /history] Unexpected error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
