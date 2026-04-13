import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiUrl } from '../config'

/**
 * useMarketQuotes
 * ---------------
 * Fetches /api/market/quotes/batch for an array of symbols.
 * Returns { quotes: Object, loading, error, refresh }
 *
 * Performance: staleTime 30s + cacheTime 5min ensures navigating
 * between pages shows cached data instantly — no loading flash.
 * placeholderData keeps previous data visible during refetch.
 */
export function useMarketQuotes(symbols, refreshMs = null) {
  const symKey = symbols?.join(',') ?? ''

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quotes', symKey],
    queryFn: async () => {
      if (!symKey) return {}
      const res = await fetch(apiUrl(`/market/quotes/batch?symbols=${symKey}`))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!symKey,
    staleTime: 30_000,             // data considered fresh for 30s
    gcTime: 5 * 60 * 1000,        // keep in cache for 5 min (React Query v5: gcTime)
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData, // show old data while refetching
    ...(refreshMs && { refetchInterval: refreshMs })
  })

  return { 
    quotes: data || {}, 
    loading: isLoading, 
    error: error?.message || null, 
    refresh: refetch 
  }
}

/**
 * useDashboardData
 * ----------------
 * Fetches /api/dashboard — aggregated endpoint that returns
 * quotes + news + leaderboard in ONE call.
 * Used only on the HomePage to eliminate 3 separate requests.
 */
export function useDashboardData(refreshMs = 30_000) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/dashboard'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    refetchInterval: refreshMs,
  })

  return {
    quotes: data?.quotes || {},
    news: data?.news || [],
    leaderboard: data?.leaderboard || [],
    loading: isLoading,
    error: error?.message || null,
    refresh: refetch,
  }
}

/**
 * useNewsHeadlines
 * ----------------
 * Fetches /api/news and returns a trimmed array.
 * 10 min staleTime since news changes slowly.
 */
export function useNewsHeadlines(limit = 20) {
  const { data, isLoading } = useQuery({
    queryKey: ['news', limit],
    queryFn: async () => {
      const res = await fetch(apiUrl('/news'))
      if (!res.ok) throw new Error('Failed to fetch news')
      const json = await res.json()
      const articles = Array.isArray(json) ? json : (json.articles ?? [])
      return articles.slice(0, limit)
    },
    staleTime: 10 * 60 * 1000,     // news is fresh for 10 min
    gcTime: 15 * 60 * 1000,        // keep in cache 15 min
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  return { news: data || [], loading: isLoading }
}
