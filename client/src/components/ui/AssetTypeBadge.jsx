/**
 * AssetTypeBadge
 * --------------
 * Renders a tiny pill for non-stock asset types.
 * Returns null for 'stock' (default).
 *
 * Props
 *   type  {'stock'|'crypto'|'etf'|'commodity'}
 */
const BADGE_MAP = {
  crypto: {
    label: 'CRYPTO',
    color: '#f7525f',
    background: 'var(--tv-bg-elevated)',
    border: '1px solid rgba(247,82,95,0.25)',
  },
  etf: {
    label: 'ETF',
    color: 'var(--tv-green)',
    background: 'var(--tv-bg-elevated)',
    border: '1px solid rgba(38,166,154,0.25)',
  },
  commodity: {
    label: 'CMDTY',
    color: '#f0b429',
    background: 'var(--tv-bg-elevated)',
    border: '1px solid rgba(240,180,41,0.25)',
  },
}

export default function AssetTypeBadge({ type }) {
  if (!type || type === 'stock') return null
  const cfg = BADGE_MAP[type.toLowerCase()]
  if (!cfg) return null

  return (
    <span
      style={{
        display: 'inline-block',
        background: cfg.background,
        color: cfg.color,
        border: cfg.border,
        borderRadius: 2,
        fontSize: 9,
        fontWeight: 600,
        fontFamily: 'var(--tv-font)',
        letterSpacing: '0.08em',
        padding: '1px 5px',
        verticalAlign: 'middle',
        lineHeight: 1.6,
        textTransform: 'uppercase',
        userSelect: 'none',
      }}
    >
      {cfg.label}
    </span>
  )
}
