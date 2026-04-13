import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AssetTypeBadge from './AssetTypeBadge'
import PriceChange from './PriceChange'

/**
 * Inline SVG sparkline — 60×24px
 *
 * data     {number[]}  array of price points
 * positive {boolean}   green if true, red if false
 */
function Sparkline({ data, positive }) {
  const W = 60
  const H = 24

  const path = useMemo(() => {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const xStep = W / (data.length - 1)
    const pts = data.map((v, i) => {
      const x = (i * xStep).toFixed(2)
      const y = (H - ((v - min) / range) * (H - 2) - 1).toFixed(2)
      return `${x},${y}`
    })
    return `M${pts.join('L')}`
  }, [data])

  if (!path) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: W,
          height: H,
          background: 'var(--tv-bg-elevated)',
          borderRadius: 2,
          verticalAlign: 'middle',
        }}
      />
    )
  }

  const color = positive ? 'var(--tv-green)' : 'var(--tv-red)'

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * StockRow
 * --------
 * Table row for markets / watchlist tables.
 *
 * Props
 *   symbol        {string}   ticker, e.g. "AAPL"
 *   companyName   {string}   full name
 *   price         {number}
 *   change        {number}   absolute $
 *   changePercent {number}   %
 *   volume        {number}
 *   sparklineData {number[]} array of ~20 price points
 *   assetType     {'stock'|'crypto'|'etf'|'commodity'}
 *   loading       {boolean}  renders skeleton state
 */
export default function StockRow({
  symbol,
  companyName,
  price,
  change,
  changePercent,
  volume,
  sparklineData,
  assetType = 'stock',
  loading = false,
}) {
  const navigate = useNavigate()
  const isPositive = (changePercent ?? 0) >= 0

  const fmtPrice = (v) =>
    v == null
      ? '—'
      : `$${Number(v).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`

  const fmtVolume = (v) => {
    if (v == null) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
    if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}K`
    return String(v)
  }

  return (
    <tr
      className="stock-row"
      style={{ cursor: 'pointer' }}
      onClick={() => !loading && navigate(`/stock/${symbol}`)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/stock/${symbol}`)
      }}
    >
      {/* Symbol + Name */}
      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--tv-text-primary)',
              fontFamily: 'var(--tv-font)',
            }}
          >
            {symbol}
          </span>
          <AssetTypeBadge type={assetType} />
        </div>
        {companyName && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--tv-text-muted)',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200,
            }}
          >
            {companyName}
          </div>
        )}
      </td>

      {/* Sparkline */}
      <td
        style={{
          padding: '8px 12px',
          verticalAlign: 'middle',
          textAlign: 'center',
        }}
      >
        <Sparkline data={sparklineData} positive={isPositive} />
      </td>

      {/* Price */}
      <td
        style={{
          padding: '8px 12px',
          verticalAlign: 'middle',
          textAlign: 'right',
          fontFamily: 'var(--tv-font-mono)',
          fontSize: 13,
          color: 'var(--tv-text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtPrice(price)}
      </td>

      {/* Change */}
      <td
        style={{
          padding: '8px 12px',
          verticalAlign: 'middle',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        <PriceChange value={change} percent={changePercent} size="sm" />
      </td>

      {/* Volume */}
      <td
        style={{
          padding: '8px 12px',
          verticalAlign: 'middle',
          textAlign: 'right',
          fontFamily: 'var(--tv-font-mono)',
          fontSize: 12,
          color: 'var(--tv-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtVolume(volume)}
      </td>
    </tr>
  )
}
