/**
 * Button
 * ------
 * TradingView-style button with four variants.
 *
 * Props
 *   variant  {'primary'|'buy'|'sell'|'ghost'}  default 'primary'
 *   size     {'sm'|'md'|'lg'}                  default 'md'
 *   disabled {boolean}
 *   fullWidth {boolean}
 *   onClick  {Function}
 *   type     {'button'|'submit'|'reset'}        default 'button'
 *   children
 */

const VARIANT_STYLES = {
  primary: {
    background: 'var(--tv-accent)',
    color: '#fff',
    border: '1px solid transparent',
    fontWeight: 500,
    '--btn-hover-bg': 'var(--tv-accent-hover)',
  },
  buy: {
    background: 'var(--tv-green)',
    color: '#131722',
    border: '1px solid transparent',
    fontWeight: 600,
    '--btn-hover-bg': '#22968c',
  },
  sell: {
    background: 'var(--tv-red)',
    color: '#fff',
    border: '1px solid transparent',
    fontWeight: 600,
    '--btn-hover-bg': '#d94140',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--tv-text-secondary)',
    border: '1px solid var(--tv-border)',
    fontWeight: 500,
    '--btn-hover-bg': 'var(--tv-bg-elevated)',
  },
}

const SIZE_STYLES = {
  sm: { fontSize: 11, padding: '4px 10px' },
  md: { fontSize: 13, padding: '6px 14px' },
  lg: { fontSize: 14, padding: '8px 18px' },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  children,
  className = '',
  style = {},
  ...rest
}) {
  const v = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`tv-btn tv-btn--${variant} tv-btn--${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 4,
        fontFamily: 'var(--tv-font)',
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.1s, color 0.1s, border-color 0.1s',
        whiteSpace: 'nowrap',
        boxShadow: 'none',
        width: fullWidth ? '100%' : undefined,
        ...v,
        ...s,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
