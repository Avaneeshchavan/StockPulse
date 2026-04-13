import { useAuth } from '../hooks/useAuth.js'
import LoadingSkeleton from './ui/LoadingSkeleton.jsx'

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fmtPrice(n) {
  return n?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) ?? '—'
}

function getBadge(ret) {
  if (ret > 20) return { label: 'Whale', color: '#00d4aa', bg: 'rgba(0, 212, 170, 0.15)' }
  if (ret > 10) return { label: 'Bull', color: '#3fb950', bg: 'rgba(63, 185, 80, 0.15)' }
  if (ret > 0) return { label: 'Trader', color: 'var(--tv-text-secondary)', bg: 'var(--tv-bg-elevated)' }
  return { label: 'Bearish', color: '#f85149', bg: 'rgba(248, 81, 73, 0.1)' }
}

function RankBadge({ rank }) {
  const colors = {
    1: '#d29922', // Gold
    2: '#7d8590', // Silver
    3: '#cd7f32', // Bronze
  }
  const color = colors[rank] || 'transparent'
  const isTop3 = !!colors[rank]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: '50%',
      background: isTop3 ? color : 'transparent',
      color: isTop3 ? '#000' : 'var(--tv-text-muted)',
      fontWeight: 700, fontSize: 11
    }}>
      {rank}
    </div>
  )
}

function UserAvatar({ user_id, display_name, avatar_url }) {
  const name = display_name || 'U'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return avatar_url ? (
    <img
      src={avatar_url}
      alt={name}
      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: 'var(--tv-bg-elevated)', border: '1px solid var(--tv-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600, color: 'var(--tv-text-secondary)'
    }}>
      {initials}
    </div>
  )
}

/* ── LeaderboardTable ───────────────────────────────────────────────────────── */
export default function LeaderboardTable({ leaders = [], loading = false }) {
  const { user } = useAuth()

  if (loading) {
    return (
      <div style={{ padding: '0 16px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingSkeleton key={i} height={42} style={{ marginBottom: 1 }} />
        ))}
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--tv-text-muted)' }}>
        No ranking data available yet.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 700 }}>
        <thead>
          <tr style={{ background: 'var(--tv-bg-primary)', position: 'sticky', top: 0, zIndex: 2 }}>
            <th style={{ width: '8%', padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Rank</th>
            <th style={{ width: '25%', padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Trader</th>
            <th style={{ width: '15%', padding: '12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Return %</th>
            <th style={{ width: '20%', padding: '12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Portfolio Value</th>
            <th style={{ width: '15%', padding: '12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Total Trades</th>
            <th style={{ width: '17%', padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--tv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06rem', borderBottom: '1px solid var(--tv-border)' }}>Badge</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((row, i) => {
            const isMe = user && user.id === row.user_id
            const ret = Number(row.total_return_percent || 0)
            const isPos = ret >= 0
            const badge = getBadge(ret)
            const firstName = (row.display_name || 'Anonymous').split(' ')[0]

            return (
              <tr
                key={row.user_id}
                style={{
                  borderBottom: '1px solid var(--tv-border)',
                  background: isMe ? 'var(--tv-accent-dim)' : 'transparent',
                  borderLeft: isMe ? '3px solid var(--tv-accent)' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}
              >
                {/* Rank */}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <RankBadge rank={i + 1} />
                </td>

                {/* Trader */}
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserAvatar {...row} />
                    <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: 'var(--tv-text-primary)' }}>
                      {firstName} {isMe && '(You)'}
                    </span>
                  </div>
                </td>

                {/* Return % */}
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'var(--tv-font-mono)', fontSize: 15, fontWeight: 700,
                    color: isPos ? 'var(--tv-green)' : 'var(--tv-red)'
                  }}>
                    {isPos ? '▲' : '▼'} {Math.abs(ret).toFixed(2)}%
                  </span>
                </td>

                {/* Portfolio Value */}
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 13, color: 'var(--tv-text-primary)' }}>
                  {fmtPrice(row.portfolio_value)}
                </td>

                {/* Total Trades */}
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--tv-font-mono)', fontSize: 13, color: 'var(--tv-text-secondary)' }}>
                  {row.total_trades || 0}
                </td>

                {/* Badge */}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                    padding: '3px 8px', borderRadius: 4,
                    color: badge.color, background: badge.bg
                  }}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
