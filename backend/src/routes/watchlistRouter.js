import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createUserSupabase } from '../lib/supabaseUser.js'

const router = express.Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const sb = createUserSupabase(req.accessToken)
    const { data, error } = await sb
      .from('watchlist')
      .select('*')
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false })

    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    return res.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error("watchlistRouter get / failed:", e)
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const sym = req.body?.symbol
    if (!sym || typeof sym !== 'string') {
      return res.status(400).json({ success: false, error: 'symbol is required' })
    }
    const symbol = sym.trim().toUpperCase()
    const sb = createUserSupabase(req.accessToken)
    const { data, error } = await sb
      .from('watchlist')
      .insert({ user_id: req.user.id, symbol })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    return res.status(201).json({ success: true, data })
  } catch (e) {
    console.error("watchlistRouter POST / failed:", e)
    res.status(500).json({ success: false, error: e.message })
  }
})

router.delete('/:symbol', requireAuth, async (req, res, next) => {
  try {
    const symbol = String(req.params.symbol || '')
      .trim()
      .toUpperCase()
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol is required' })
    }
    const sb = createUserSupabase(req.accessToken)
    const { data, error } = await sb
      .from('watchlist')
      .delete()
      .eq('user_id', req.user.id)
      .eq('symbol', symbol)
      .select()

    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!data?.length) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    return res.json({ success: true })
  } catch (e) {
    console.error("watchlistRouter DELETE /:symbol failed:", e)
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
