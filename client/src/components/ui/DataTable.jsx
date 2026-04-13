import { useState, useMemo, useCallback } from 'react'

/**
 * DataTable
 * ---------
 * Reusable, sortable TradingView-style table.
 *
 * Props
 *   columns   {Column[]}         column definitions
 *   data      {object[]}         row objects
 *   rowKey    {string|Function}  key extractor (default 'id')
 *   onRowClick {Function}        (row) => void
 *   loading   {boolean}
 *   emptyText {string}           shown when data is empty
 *   stickyHeader {boolean}       default true
 *
 * Column shape
 *   {
 *     key       : string          — data key
 *     label     : string          — header text
 *     sortable  : boolean         — default false
 *     align     : 'left'|'right'|'center' — default based on type
 *     render    : (value, row) => ReactNode  — custom cell renderer
 *     numeric   : boolean         — forces monospace + right-align
 *     width     : string          — optional CSS width
 *   }
 */
export default function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  onRowClick,
  loading = false,
  emptyText = 'No data',
  stickyHeader = true,
}) {
  const [sortKey,  setSortKey]  = useState(null)
  const [sortDir,  setSortDir]  = useState('asc') // 'asc' | 'desc'

  const handleSort = useCallback(
    (col) => {
      if (!col.sortable) return
      if (sortKey === col.key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(col.key)
        setSortDir('asc')
      }
    },
    [sortKey]
  )

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp =
        typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const getKey = (row, i) =>
    typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] ?? i)

  const colAlign = (col) =>
    col.align ?? (col.numeric ? 'right' : 'left')

  const sortIndicator = (col) => {
    if (!col.sortable) return null
    if (sortKey !== col.key)
      return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
    return (
      <span style={{ marginLeft: 4 }}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div
      className="data-table-wrapper"
      style={{
        width: '100%',
        overflowX: 'auto',
        border: '1px solid var(--tv-border)',
        borderRadius: 4,
        background: 'var(--tv-bg-primary)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
        role="grid"
      >
        {/* ── Header ── */}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--tv-text-muted)',  // ← muted, not secondary
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: colAlign(col),
                  borderBottom: '1px solid var(--tv-border)',
                  background: 'var(--tv-bg-secondary)',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: col.width ?? undefined,
                  position: stickyHeader ? 'sticky' : undefined,
                  top: stickyHeader ? 0 : undefined,
                  zIndex: stickyHeader ? 1 : undefined,
                }}
              >
                {col.label}
                {sortIndicator(col)}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--tv-text-muted)',
                  fontSize: 12,
                }}
              >
                Loading…
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--tv-text-secondary)',
                  fontSize: 12,
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={getKey(row, i)}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : undefined,
                  borderBottom: '1px solid var(--tv-border)',
                }}
                className="data-table-row"
                role={onRowClick ? 'button' : 'row'}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          onRowClick(row)
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      color: 'var(--tv-text-primary)',
                      textAlign: colAlign(col),
                      fontFamily: col.numeric
                        ? 'var(--tv-font-mono)'
                        : 'var(--tv-font)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
