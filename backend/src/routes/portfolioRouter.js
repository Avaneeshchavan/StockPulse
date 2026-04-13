import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createUserSupabase } from '../lib/supabaseUser.js'
import { takeSnapshot } from '../services/portfolioService.js'

const router = express.Router()

/* ── GET /api/portfolio ─────────────────────────────────────────────────────
   Returns the authenticated user's holdings and cash balance.
   Frontend expects: { holdings: [], cash: number }
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const token =
      req.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      })
    }

    const sb = createUserSupabase(token)

    const { data: holdings, error } =
      await sb
        .from('holdings')
        .select('*')
        .eq('user_id', req.user.id)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }

    const { data: profile } =
      await sb
        .from('profiles')
        .select('virtual_balance')
        .eq('id', req.user.id)
        .single()

    return res.json({
      holdings: holdings ?? [],
      cash: profile?.virtual_balance ?? 100000
    })
  } catch (err) {
    console.error('[portfolio route error]', err)
    return res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/* ── GET /api/portfolio/summary ─────────────────────────────────────────────
   Returns balance + full portfolio list + total cost basis.
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const token =
      req.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    const sb = createUserSupabase(token)

    // Fetch balance from profiles table (same source as the rest of the app)
    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('virtual_balance')
      .eq('id', req.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[portfolioRouter /summary] Profile error:', profileError)
      return res.status(400).json({ success: false, error: profileError.message })
    }

    const balance = Number(profile?.virtual_balance ?? 100000)

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
        balance,
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
   Schema: transactions(id, user_id, symbol, type, quantity, price, created_at, ...)
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page),  10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20))
    const offset = (page - 1) * limit
    const end    = offset + limit - 1

    const token =
      req.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    const sb = createUserSupabase(token)
    const { data, error, count } = await sb
      .from('transactions')
      // Explicit column list — matches schema exactly; 'created_at' and 'price'
      .select('id, user_id, symbol, type, quantity, price, created_at, company_name, asset_type, total, notes', { count: 'exact' })
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
    const token =
      req.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    const sb = createUserSupabase(token)
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
    const token =
      req.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    const sb = createUserSupabase(token)

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
