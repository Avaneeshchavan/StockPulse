import { supabase } from '../lib/supabase.js'
import { apiUrl } from '../config.js'

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
export const fetchWithAuth = async (path, options = {}) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new Error('No active session — user must be logged in')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), { ...options, headers })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response
}
