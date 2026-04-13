import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createUserSupabase } from '../lib/supabaseUser.js'
import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { getQuotes } from '../services/marketService.js'
import { takeSnapshot } from '../services/portfolioService.js'

const router = express.Router()

/**
 * POST /api/trade/:side   (side = 'buy' | 'sell')
 *
 * TradePanel.jsx calls:
 *   fetch(`/api/trade/${type}`, { body: JSON.stringify({ symbol, quantity, price }) })
 * So 'side' comes from the URL param, NOT the request body.
 *
 * Body: { symbol: string, quantity: number, price: number }
 */
router.post('/:side', requireAuth, async (req, res) => {
  // ── Top of handler logging ───────────────────────────────────────────────
  console.log('=== BUY REQUEST ===')
  console.log('=== PROFILE FETCH DEBUG ===')
  console.log('req.user:', JSON.stringify(req.user, null, 2))
  console.log('req.user.id:', req.user?.id)
  console.log('req.user.sub:', req.user?.sub)
  console.log('req.body:', req.body)
  console.log('Authorization header present:', !!req.headers.authorization)

  // ── Check req.user exists ─────────────────────────────────────────────────
  // Supabase JWTs store user ID in 'sub' field, not always 'id'
  const userId = req.user?.id || req.user?.sub
  console.log('Using userId:', userId)
  
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  // ── Extract & normalise side from URL param ───────────────────────────────
  const side = req.params.side?.toLowerCase()   // 'buy' | 'sell'
  const { symbol, quantity, price: clientPrice, notes, companyName, assetType } = req.body

  console.log('Trade request body:', { symbol, quantity, price: clientPrice, side, userId })

  // ── Input validation ──────────────────────────────────────────────────────
  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ error: `Invalid trade side: "${side}". Must be 'buy' or 'sell'.` })
  }
  if (!symbol || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Invalid trade parameters: symbol and quantity are required.' })
  }

  try {
    // ── 1. Resolve current market price ───────────────────────────────────
    let price = Number(clientPrice)
    try {
      const quotes = await getQuotes([symbol.toUpperCase()])
      const livePx = Number(quotes?.[0]?.price)
      if (livePx > 0) price = livePx
    } catch (mktErr) {
      console.error('[tradeRouter] Market price fetch failed, using client price:', mktErr.message)
    }

    if (!price || price <= 0) {
      return res.status(400).json({ error: `Could not resolve a valid price for ${symbol}` })
    }

    const costCalc = Number(quantity) * price
    const totalValue = costCalc

    // ── 2. Fetch user balance ─────────────────────────────────────────────
    console.log('Fetching profile for userId:', userId)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('virtual_balance, display_name, avatar_url')
      .eq('id', userId)
      .single()

    console.log('Profile result:', profile)
    console.log('Profile error:', profileError)

    if (profileError || !profile) {
      console.error('Supabase Error:', profileError)
      return res.status(400).json({ error: 'Could not fetch user profile' })
    }

    const balance = Number(profile.virtual_balance)
    const qty = Number(quantity)
    const priceNum = Number(price)

    console.log(`Balance: ${balance}, Qty: ${qty}, Price: ${priceNum}, Cost: ${costCalc}`)

    if (isNaN(balance) || isNaN(costCalc)) {
      return res.status(400).json({ error: 'Invalid balance or price data' })
    }

    // ── 3. Execute the correct trade branch ───────────────────────────────
    if (side === 'buy') {
      if (balance < costCalc) {
        return res.status(400).json({ error: `Insufficient balance. Available: $${balance.toFixed(2)}, Required: $${costCalc.toFixed(2)}` })
      }

      // Deduct balance
      const newBalance = balance - costCalc
      const { error: balanceError } = await supabaseAdmin
        .from('profiles')
        .update({ virtual_balance: newBalance })
        .eq('id', userId)
      if (balanceError) {
        console.error('Balance update error:', balanceError)
        return res.status(500).json({ error: 'Failed to update balance', details: balanceError.message })
      }

      // Upsert holdings position
      const { data: existing } = await supabaseAdmin
        .from('holdings')
        .select('id, quantity, avg_buy_price')
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle()

      let newQuantity, newAvgPrice
      if (existing) {
        const existingQty = Number(existing.quantity)
        const existingAvg = Number(existing.avg_buy_price)
        newQuantity = existingQty + Number(quantity)
        newAvgPrice = ((existingQty * existingAvg) + (Number(quantity) * price)) / newQuantity
      } else {
        newQuantity = Number(quantity)
        newAvgPrice = price
      }

      const { error: holdingError } = await supabaseAdmin
        .from('holdings')
        .upsert({
          user_id: userId,
          symbol: symbol.toUpperCase(),
          company_name: companyName,
          asset_type: assetType || 'stock',
          quantity: newQuantity,
          avg_buy_price: newAvgPrice,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,symbol' })

      if (holdingError) {
        console.error('Holdings upsert error:', holdingError)
        return res.status(500).json({ error: 'Failed to create portfolio position', details: holdingError.message })
      }

    } else {
      // SELL
      const { data: position, error: posErr } = await supabaseAdmin
        .from('holdings')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle()

      if (posErr) {
        console.error('Holdings select error:', posErr)
        return res.status(500).json({ error: 'Failed to read portfolio position', details: posErr.message })
      }
      if (!position || Number(position.quantity) < Number(quantity)) {
        return res.status(400).json({ error: 'Insufficient shares to sell' })
      }

      // Add proceeds to balance
      const newBalance = balance + costCalc
      const { error: balanceError } = await supabaseAdmin
        .from('profiles')
        .update({ virtual_balance: newBalance })
        .eq('id', userId)
      if (balanceError) {
        console.error('Balance update error:', balanceError)
        return res.status(500).json({ error: 'Failed to update balance', details: balanceError.message })
      }

      // Remove / reduce position
      const remainingQty = Number(position.quantity) - Number(quantity)
      if (remainingQty === 0) {
        const { error: delErr } = await supabaseAdmin
          .from('holdings')
          .delete()
          .eq('id', position.id)
        if (delErr) {
          console.error('Holdings delete error:', delErr)
          return res.status(500).json({ error: 'Failed to remove portfolio position', details: delErr.message })
        }
      } else {
        const { error: updErr } = await supabaseAdmin
          .from('holdings')
          .update({ quantity: remainingQty, updated_at: new Date().toISOString() })
          .eq('id', position.id)
        if (updErr) {
          console.error('Holdings update error:', updErr)
          return res.status(500).json({ error: 'Failed to update portfolio position', details: updErr.message })
        }
      }
    }

    // ── 4. Record transaction ───────
    // Explicitly set type to 'buy' or 'sell' based on side
    const tradeType = side === 'buy' ? 'buy' : 'sell'
    const buyQuantity = Number(quantity)
    const buyPrice = Number(price)
    const buyTotal = buyQuantity * buyPrice

    console.log('Inserting transaction:', { 
      type: tradeType, 
      quantity: buyQuantity, 
      price: buyPrice, 
      total: buyTotal 
    })

    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        symbol: symbol.toUpperCase(),
        company_name: companyName,
        asset_type: assetType || 'stock',
        type: tradeType,
        quantity: buyQuantity,
        price: buyPrice,
        total: buyTotal,
        notes: notes || null
      })

    if (txError) {
      console.error('Transaction insert error:', txError)
      return res.status(500).json({ error: 'Failed to record transaction' })
    }

    // ── 5. Background portfolio snapshot ─────────────────────────────────
    const sb = createUserSupabase(req.accessToken)
    takeSnapshot(userId, sb).catch(e =>
      console.error('[tradeRouter] Background snapshot failed:', e.message)
    )

    return res.json({
      success: true,
      trade: { symbol: symbol.toUpperCase(), quantity: Number(quantity), price, total: totalValue, side },
    })

  } catch (err) {
    console.error('[tradeRouter] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error during trade' })
  }
})

// ── Compatibility alias: also accept unified POST /api/trade with side in body ──
router.post('/', requireAuth, async (req, res) => {
  // Rewrite the request to the /:side handler by redirecting internally
  req.params.side = req.body.side
  router.handle(req, res, () => {})
})

export default router
