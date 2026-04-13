/**
 * LoadingSkeleton
 * ---------------
 * Animated shimmer placeholder block.
 *
 * Props
 *   width     {string|number}  default '100%'
 *   height    {string|number}  default 16
 *   borderRadius {string|number} default 2
 *   className {string}
 *   style     {object}
 *
 * Usage
 *   <LoadingSkeleton height={14} width={120} />
 *   <LoadingSkeleton height="1em" width="60%" />
 *
 *   // Multiple rows
 *   <LoadingSkeleton rows={4} gap={8} />
 */
export default function LoadingSkeleton({
  width = '100%',
  height = 16,
  borderRadius = 2,
  rows,
  gap = 8,
  className = '',
  style = {},
}) {
  if (rows && rows > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {Array.from({ length: rows }).map((_, i) => (
          <LoadingSkeleton
            key={i}
            width={i === rows - 1 ? '72%' : width} // last row shorter — natural feel
            height={height}
            borderRadius={borderRadius}
            className={className}
            style={style}
          />
        ))}
      </div>
    )
  }

  return (
    <span
      className={`loading-skeleton ${className}`}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius,
        background: `linear-gradient(
          90deg,
          var(--tv-bg-secondary) 25%,
          var(--tv-bg-elevated)  50%,
          var(--tv-bg-secondary) 75%
        )`,
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.5s ease-in-out infinite',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  )
}
