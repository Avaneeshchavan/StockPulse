import { supabase } from '../lib/supabase.js'

/**
 * Fetch with Supabase auth token attached.
 *
 * IMPORTANT: `url` must be a fully-resolved URL (i.e. already run through
 * apiUrl()). This function does NOT apply apiUrl() — callers are responsible
 * for that.
 *
 * @param {string} url – Fully-resolved URL (from apiUrl())
 * @param {RequestInit} [options]
 * @returns {Promise<Response>} – The raw fetch Response (callers decide how to handle errors)
 */
export const fetchWithAuth = async (url, options = {}) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new Error('No active session — user must be logged in')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, { ...options, headers })
}
