/**
 * PriceChange
 * -----------
 * Renders a signed price + percent pair in TradingView style.
 *
 * Props
 *   value        {number}  absolute dollar change (can be negative)
 *   percent      {number}  percentage change      (can be negative)
 *   size         {'sm'|'md'|'lg'}  default 'md'
 *   showArrow    {boolean} default true
 *   className    {string}
 */
export default function PriceChange({
  value,
  percent,
  size = 'md',
  showArrow = true,
  className = '',
}) {
  const isPositive = (value ?? percent ?? 0) >= 0
  const isNeutral  = value === 0 && percent === 0

  const color = isNeutral
    ? 'var(--tv-text-secondary)'
    : isPositive
    ? 'var(--tv-green)'
    : 'var(--tv-red)'

  const arrow = isNeutral ? '' : isPositive ? '▲' : '▼'

  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13

  const fmtAbs = (v) =>
    v == null
      ? '—'
      : `${isPositive ? '+' : ''}$${Math.abs(v).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`

  const fmtPct = (p) =>
    p == null
      ? ''
      : `(${isPositive ? '+' : ''}${p.toFixed(2)}%)`

  return (
    <span
      className={`price-change ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontFamily: 'var(--tv-font-mono)',
        fontSize,
        fontWeight: 500,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {showArrow && !isNeutral && (
        <span
          style={{ fontSize: fontSize - 2, lineHeight: 1 }}
          aria-hidden="true"
        >
          {arrow}
        </span>
      )}
      {value != null && <span>{fmtAbs(value)}</span>}
      {percent != null && (
        <span style={{ opacity: 0.85 }}>{fmtPct(percent)}</span>
      )}
    </span>
  )
}
