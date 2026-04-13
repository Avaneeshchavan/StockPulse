import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import LeaderboardTable from '../components/LeaderboardTable.jsx'

export default function LeaderboardPage() {
  const { data: leaders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard')
      if (error) {
        console.error('Leaderboard RPC Error:', error.message)
        throw error
      }
      return data
    },
    refetchInterval: 60000, // 60s refresh
    retry: 1,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => console.error('Leaderboard query error:', err)
  })

  if (isError) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--tv-red)' }}>
        <p>Error: {error?.message || 'Failed to load leaderboard'}</p>
        <button onClick={() => refetch()} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)', color: 'var(--tv-text-primary)' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 16px', maxWidth: 1000, margin: '0 auto', minHeight: 'unset', height: 'fit-content' }}>
      {/* Header section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tv-text-primary)', margin: 0 }}>Top Traders</h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0, 212, 170, 0.1)', border: '1px solid rgba(0, 212, 170, 0.2)',
            borderRadius: 4, padding: '3px 8px'
          }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--tv-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Updated Live
            </span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--tv-text-secondary)', maxWidth: 500, lineHeight: 1.5 }}>
          Rankings based on portfolio return from <span style={{ color: 'var(--tv-text-primary)', fontWeight: 600 }}>$100,000</span> starting virtual balance.
        </p>
      </div>

      {/* Table section */}
      <div style={{
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <LeaderboardTable leaders={leaders} loading={isLoading} />
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>
          Trade daily to climb the ranks. Performance badges are updated in real-time.
        </p>
      </div>
    </div>
  )
}
