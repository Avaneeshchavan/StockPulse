import PriceChange from './PriceChange'

/**
 * StatCard
 * --------
 * Portfolio summary tile and market index number card.
 *
 * Props
 *   label         {string}  — small caps label
 *   value         {string|number}  — primary display value
 *   valueMono     {boolean} — render value in monospace (default true)
 *   change        {number}  — optional absolute change
 *   changePercent {number}  — optional % change
 *   prefix        {string}  — optional prefix for value, e.g. '$'
 *   suffix        {string}  — optional suffix for value
 *   size          {'sm'|'md'|'lg'} — default 'md'
 *   onClick       {Function}
 *   className     {string}
 */
export default function StatCard({
  label,
  value,
  valueMono = true,
  change,
  changePercent,
  prefix = '',
  suffix = '',
  size = 'md',
  onClick,
  className = '',
  style = {},
}) {
  const valueFontSize = size === 'sm' ? 14 : size === 'lg' ? 26 : 20

  return (
    <div
      className={`stat-card ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 4,
        padding: 12,
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'background 0.1s' : undefined,
        ...style,
      }}
    >
      {/* Label */}
      {label && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--tv-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 500,
            marginBottom: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}

      {/* Value */}
      <div
        style={{
          fontSize: valueFontSize,
          fontFamily: valueMono ? 'var(--tv-font-mono)' : 'var(--tv-font)',
          fontWeight: 600,
          color: 'var(--tv-text-primary)',
          lineHeight: 1.2,
          marginBottom: (change != null || changePercent != null) ? 4 : 0,
        }}
      >
        {prefix}
        {value ?? '—'}
        {suffix}
      </div>

      {/* Change row */}
      {(change != null || changePercent != null) && (
        <PriceChange
          value={change}
          percent={changePercent}
          size="sm"
        />
      )}
    </div>
  )
}
