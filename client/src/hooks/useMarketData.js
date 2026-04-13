import { useQuery } from '@tanstack/react-query'

/**
 * useMarketQuotes
 * ---------------
 * Fetches /api/market/quotes/batch for an array of symbols.
 * Returns { quotes: Object, loading, error, refresh }
 */
export function useMarketQuotes(symbols, refreshMs = null) {
  const symKey = symbols?.join(',') ?? ''

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quotes', symKey],
    queryFn: async () => {
      if (!symKey) return {}
      const res = await fetch(`/api/market/quotes/batch?symbols=${symKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!symKey,
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
 * useNewsHeadlines
 * ----------------
 * Fetches /api/news and returns a trimmed array.
 */
export function useNewsHeadlines(limit = 20) {
  const { data, isLoading } = useQuery({
    queryKey: ['news', limit],
    queryFn: async () => {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error('Failed to fetch news')
      const json = await res.json()
      const articles = Array.isArray(json) ? json : (json.articles ?? [])
      return articles.slice(0, limit)
    }
  })

  return { news: data || [], loading: isLoading }
}
