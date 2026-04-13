import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'

export default function WatchlistToggle({ symbol, companyName, size = 18, style = {} }) {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  // Real state from Supabase
  const { data: watchlisted = false, isLoading } = useQuery({
    queryKey: ['inWatchlist', symbol, user?.id],
    queryFn: async () => {
      if (!user?.id) return false
      const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle()
      
      if (error) {
        console.warn('watchlist table not ready:', error.message)
        return false
      }
      return !!data
    },
    enabled: !!user?.id
  })

  // Optimistic state for instant feedback
  const [isStarred, setIsStarred] = useState(watchlisted)

  useEffect(() => {
    setIsStarred(watchlisted)
  }, [watchlisted])

  const toggleWatchlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated) return

    const previousValue = isStarred
    setIsStarred(!previousValue) // Optimistic update

    try {
      if (!previousValue) {
        // Add — include company_name so WatchlistPage can display it
        const { error } = await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            symbol,
            company_name: companyName || symbol,
          })
        if (error) throw error
      } else {
        // Remove
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol)
        if (error) throw error
      }

      // Invalidate all watchlist-related caches
      queryClient.invalidateQueries({ queryKey: ['inWatchlist', symbol] })
      queryClient.invalidateQueries({ queryKey: ['watchlistCount'] })
      queryClient.invalidateQueries({ queryKey: ['watchlistSymbols'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    } catch (err) {
      console.error('Watchlist toggle failed:', err)
      setIsStarred(previousValue) // Rollback on error
    }
  }

  if (!isAuthenticated) return null

  return (
    <button
      onClick={toggleWatchlist}
      disabled={isLoading}
      title={isStarred ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      style={{
        background: 'none',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        color: isStarred ? '#fadb14' : 'var(--tv-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.1s, color 0.1s',
        ...style
      }}
      className="watchlist-toggle-btn"
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={isStarred ? '#fadb14' : 'none'} stroke={isStarred ? '#fadb14' : 'currentColor'} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  )
}
