/**
 * API origin for HTTP requests. Empty string = same origin (e.g. Vite dev proxy).
 */
const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
export const API_BASE = String(rawBase).replace(/\/$/, '')

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`

  const withApiPrefix = normalized.startsWith('/api')
    ? normalized
    : `/api${normalized}`

  return API_BASE
    ? `${API_BASE}${withApiPrefix}`
    : withApiPrefix
}

/**
 * WebSocket origin for Finnhub relay. Falls back from HTTP(S) base or localhost:3001.
 */
export function getWsBaseUrl() {
  const explicit = import.meta.env.VITE_WS_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  if (API_BASE.startsWith('https://')) {
    return `wss://${API_BASE.slice('https://'.length)}`
  }
  if (API_BASE.startsWith('http://')) {
    return `ws://${API_BASE.slice('http://'.length)}`
  }
  return `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`
}
