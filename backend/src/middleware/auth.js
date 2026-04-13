import { supabase } from '../config/supabase.js'

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }
    req.user = user
    req.accessToken = token.trim()
    next()
  } catch (err) {
    console.error("Auth middleware error:", err)
    return res.status(500).json({ success: false, error: 'Auth check failed' })
  }
}
