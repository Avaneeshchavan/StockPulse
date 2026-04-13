import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LeaderboardPreview = () => {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase.rpc('get_leaderboard')
        if (error) {
          console.error('Leaderboard error:', error)
          setLeaders([])
          return
        }
        setLeaders(data?.slice(0, 5) || [])
      } catch (err) {
        console.error('Leaderboard fetch failed:', err)
        setLeaders([])
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center', 
      color: 'var(--tv-text-muted)', fontSize: '13px' }}>
      Loading leaderboard...
    </div>
  )

  if (leaders.length === 0) return (
    <div style={{ padding: '24px', textAlign: 'center',
      color: 'var(--tv-text-muted)', fontSize: '13px' }}>
      No traders yet — be the first to make a trade!
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto w-full px-4">
      {/* Card Wrapper */}
      <div style={{
        background: 'var(--tv-bg-secondary)',
        borderRadius: 8,
        border: '1px solid var(--tv-border)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tv-border)', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between' }}>
          <span>Trader</span>
          <span>Return</span>
        </div>
        {leaders.map((trader, index) => {
          const returnPct = Number(trader.total_return_percent || 0)
          const isPositive = returnPct >= 0
          const rankColors = ['#d29922', '#7d8590', '#cd7f32', 
            'var(--tv-text-muted)', 'var(--tv-text-muted)']
          const isLast = index === leaders.length - 1
          
          return (
            <div key={trader.user_id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              minHeight: 0,
              borderBottom: isLast ? 'none' : '1px solid var(--tv-border)',
              transition: 'background 0.15s',
              cursor: 'default'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--tv-bg-elevated)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Left: Rank + Avatar/Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '700',
                  color: rankColors[index],
                  minWidth: '24px'
                }}>
                  {index + 1}
                </span>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--tv-bg-elevated)',
                  border: '1px solid var(--tv-border)',
                  display: 'flex', alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '14px', fontWeight: '500',
                  color: 'var(--tv-text-primary)',
                  overflow: 'hidden'
                }}>
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt="" 
                      style={{ width: '100%', height: '100%', 
                        objectFit: 'cover' }} />
                  ) : (
                    (trader.display_name || 'U')[0].toUpperCase()
                  )}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tv-text-primary)', letterSpacing: '0.01em' }}>
                  {(trader.display_name || 'Trader').split(' ')[0]}
                </span>
              </div>
              
              {/* Right: % Change */}
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'var(--tv-font-mono)',
                color: isPositive ? 'var(--tv-green)' : 'var(--tv-red)'
              }}>
                {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
      
      {/* View Full Button */}
      <div style={{ padding: '10px 16px' }}>
        <button
          onClick={() => navigate('/leaderboard')}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid var(--tv-border)',
            borderRadius: '8px',
            color: 'var(--tv-text-secondary)',
            padding: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = 'var(--tv-accent)'
            e.currentTarget.style.color = 'var(--tv-accent)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = 'var(--tv-border)'
            e.currentTarget.style.color = 'var(--tv-text-secondary)'
          }}
        >
          View Full Leaderboard
        </button>
      </div>
    </div>
  )
}

export default LeaderboardPreview
