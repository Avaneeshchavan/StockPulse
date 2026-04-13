/**
 * StockChart — TradingView-style candlestick / line chart
 * =========================================================
 * Uses lightweight-charts v5 (already installed).
 *
 * Props
 *   symbol  {string}   — ticker, e.g. "AAPL"
 *   height  {number}   — chart canvas height in px (default 400)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts'
import { useQuery } from '@tanstack/react-query'
import LoadingSkeleton from './ui/LoadingSkeleton.jsx'

/* ─────────────────────────────────────────────────────────────────
   Time-range config
   ───────────────────────────────────────────────────────────────── */
const RANGES = [
  { label: '1D', resolution: '5',  days: 1    },
  { label: '1W', resolution: '30', days: 7    },
  { label: '1M', resolution: '60', days: 30   },
  { label: '3M', resolution: 'D',  days: 90   },
  { label: '1Y', resolution: 'D',  days: 365  },
  { label: 'ALL',resolution: 'W',  days: 1825 },
]

/* ─────────────────────────────────────────────────────────────────
   Theme detection
   ───────────────────────────────────────────────────────────────── */
function isDark() {
  return !window.matchMedia('(prefers-color-scheme: light)').matches
}

function buildTheme(dark) {
  return dark ? {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: '#787b86',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: '#2a2e39', style: LineStyle.Dotted },
      horzLines: { color: '#2a2e39', style: LineStyle.Dotted },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#758696', labelBackgroundColor: '#2a2e3966' },
      horzLine: { color: '#758696', labelBackgroundColor: '#2a2e3966' },
    },
    rightPriceScale: {
      borderColor: '#2a2e39',
      textColor: '#787b86',
    },
    timeScale: {
      borderColor: '#2a2e39',
      textColor: '#787b86',
      timeVisible: true,
      secondsVisible: false,
    },
  } : {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: '#363A45',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: '#E6E9EE', style: LineStyle.Dotted },
      horzLines: { color: '#E6E9EE', style: LineStyle.Dotted },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#758696', labelBackgroundColor: '#9598A1' },
      horzLine: { color: '#758696', labelBackgroundColor: '#9598A1' },
    },
    rightPriceScale: { borderColor: '#E6E9EE' },
    timeScale: {
      borderColor: '#E6E9EE',
      timeVisible: true,
      secondsVisible: false,
    },
  }
}

/* ─────────────────────────────────────────────────────────────────
   Formatters
   ───────────────────────────────────────────────────────────────── */
const fmtPrice  = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—'
const fmtVol    = (n) => {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

/* ─────────────────────────────────────────────────────────────────
   OHLCV tooltip bar  (shown in the floating header on crosshair)
   ───────────────────────────────────────────────────────────────── */
function OHLCVBar({ ohlcv }) {
  if (!ohlcv) return null
  const { open, high, low, close, volume } = ohlcv
  const isUp = close >= open
  const color = isUp ? 'var(--tv-green)' : 'var(--tv-red)'

  const items = [
    { label: 'O', value: fmtPrice(open)  },
    { label: 'H', value: fmtPrice(high)  },
    { label: 'L', value: fmtPrice(low)   },
    { label: 'C', value: fmtPrice(close), accent: true },
    { label: 'V', value: fmtVol(volume)  },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {items.map(({ label, value, accent }) => (
        <span key={label} style={{ fontSize: 11, fontFamily: 'var(--tv-font-mono)' }}>
          <span style={{ color: 'var(--tv-text-muted)', marginRight: 3 }}>{label}</span>
          <span style={{ color: accent ? color : 'var(--tv-text-primary)', fontWeight: accent ? 700 : 400 }}>
            {value}
          </span>
        </span>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Floating price label  (live quote, shown in top-left)
   ───────────────────────────────────────────────────────────────── */
function PriceLabel({ price, change, changePct }) {
  if (price == null) return null
  const isPos = (change ?? 0) >= 0
  const color = isPos ? 'var(--tv-green)' : 'var(--tv-red)'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        fontSize: 18, fontWeight: 700,
        fontFamily: 'var(--tv-font-mono)',
        color: 'var(--tv-text-primary)',
      }}>
        {fmtPrice(price)}
      </span>
      {change != null && (
        <span style={{ fontSize: 12, fontFamily: 'var(--tv-font-mono)', color }}>
          {isPos ? '+' : ''}{fmtPrice(change)} ({isPos ? '+' : ''}{Number(changePct).toFixed(2)}%)
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Range tab row
   ───────────────────────────────────────────────────────────────── */
function RangeSelector({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {RANGES.map(r => (
        <button
          key={r.label}
          type="button"
          onClick={() => onChange(r)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: active === r.label
              ? '2px solid var(--tv-accent)'
              : '2px solid transparent',
            color: active === r.label
              ? 'var(--tv-text-primary)'
              : 'var(--tv-text-muted)',
            fontSize: 11, fontWeight: 600,
            padding: '4px 8px',
            cursor: 'pointer',
            transition: 'color 0.1s',
            letterSpacing: '0.02em',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Chart type toggle
   ───────────────────────────────────────────────────────────────── */
function TypeToggle({ type, onChange }) {
  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--tv-border)',
      borderRadius: 4, overflow: 'hidden',
    }}>
      {['candle', 'line'].map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          title={t === 'candle' ? 'Candlestick chart' : 'Line chart'}
          style={{
            padding: '4px 10px',
            background: type === t ? 'var(--tv-bg-elevated)' : 'transparent',
            border: 'none',
            color: type === t ? 'var(--tv-text-primary)' : 'var(--tv-text-muted)',
            fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          {t === 'candle' ? (
            // Candlestick icon
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="3"  y="4" width="3" height="5" fill="currentColor" rx="0.5"/>
              <line x1="4.5" y1="2"  x2="4.5" y2="4"  stroke="currentColor" strokeWidth="1"/>
              <line x1="4.5" y1="9"  x2="4.5" y2="12" stroke="currentColor" strokeWidth="1"/>
              <rect x="8"  y="5" width="3" height="4" fill="currentColor" rx="0.5" opacity="0.6"/>
              <line x1="9.5" y1="3"  x2="9.5" y2="5"  stroke="currentColor" strokeWidth="1"/>
              <line x1="9.5" y1="9"  x2="9.5" y2="11" stroke="currentColor" strokeWidth="1"/>
            </svg>
          ) : (
            // Line icon
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <polyline points="1,11 4,7 7,8 10,4 13,3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   StockChart (main export)
   ───────────────────────────────────────────────────────────────── */
export default function StockChart({ symbol, height = 400, price, change, changePercent }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const mainRef      = useRef(null)    // main series (candle or line)
  const volRef       = useRef(null)    // volume histogram
  const roRef        = useRef(null)    // ResizeObserver

  const [chartType,  setChartType]  = useState('candle')
  const [range,      setRange]      = useState(RANGES[3])   // default 3M
  const [ohlcv,      setOhlcv]      = useState(null)        // crosshair hover data

  /* ── Fetch candle data via React Query ────────────────────────── */
  const { data: candles = [], isLoading: loading, error: queryError, refetch: fetchCandles } = useQuery({
    queryKey: ['candles', symbol, range.label],
    queryFn: async () => {
      const now    = Math.floor(Date.now() / 1000)
      const from   = now - range.days * 86_400
      const url    = `/api/market/candles?symbol=${symbol}&resolution=${range.resolution}&from=${from}&to=${now}`
      const res    = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { candles: data } = await res.json()

      if (!data?.length) {
        throw new Error('No data available for this period.')
      }
      return data
    },
    enabled: !!symbol,
    refetchInterval: false, // don't aggressively poll historical chart data
  })
  
  const error = queryError?.message || null

  /* ── Create chart on mount ────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return
    const dark  = isDark()
    const theme = buildTheme(dark)

    const chart = createChart(containerRef.current, {
      ...theme,
      width:  containerRef.current.clientWidth,
      height: height - 48,   // subtract toolbar height
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { axisPressedMouseMove: true, mouseWheel: true },
    })

    chartRef.current = chart

    // Subscribe to theme changes
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const themeHandler = () => chart.applyOptions(buildTheme(isDark()))
    mq.addEventListener('change', themeHandler)

    // ResizeObserver
    roRef.current = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    roRef.current.observe(containerRef.current)

    return () => {
      mq.removeEventListener('change', themeHandler)
      roRef.current?.disconnect()
      chart.remove()
      chartRef.current = null
      mainRef.current  = null
      volRef.current   = null
    }
  }, [height])

  /* ── (Re)create series whenever chart type changes ────────────── */
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Remove old series
    if (mainRef.current) { try { chart.removeSeries(mainRef.current) } catch { /* ok */ } }
    if (volRef.current)  { try { chart.removeSeries(volRef.current)  } catch { /* ok */ } }

    const isDarkMode = isDark()

    if (chartType === 'candle') {
      mainRef.current = chart.addSeries(CandlestickSeries, {
        upColor:          '#26a69a',
        downColor:        '#ef5350',
        borderUpColor:    '#26a69a',
        borderDownColor:  '#ef5350',
        wickUpColor:      '#26a69a',
        wickDownColor:    '#ef5350',
        priceLineVisible: true,
        lastValueVisible: true,
      })
    } else {
      mainRef.current = chart.addSeries(LineSeries, {
        color:            '#00d4aa',
        lineWidth:        2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      })
    }

    // Volume histogram (always shown below)
    volRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: isDarkMode ? 'rgba(38,166,154,0.25)' : 'rgba(38,166,154,0.35)',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })
  }, [chartType])

  /* ── Update series data when candles change ───────────────────── */
  useEffect(() => {
    if (!mainRef.current || !volRef.current || !candles.length) return

    if (chartType === 'candle') {
      // Candle: pass full OHLC
      mainRef.current.setData(
        candles.map(c => ({
          time:  c.time,
          open:  c.open,
          high:  c.high,
          low:   c.low,
          close: c.close,
        }))
      )
    } else {
      // Line: only close price
      mainRef.current.setData(
        candles.map(c => ({ time: c.time, value: c.close }))
      )
    }

    // Volume histogram — color by bar direction
    volRef.current.setData(
      candles.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open
          ? 'rgba(38,166,154,0.4)'
          : 'rgba(239,83,80,0.4)',
      }))
    )

    chartRef.current?.timeScale().fitContent()
  }, [candles, chartType])

  /* ── Crosshair listener → update OHLCV tooltip ───────────────── */
  useEffect(() => {
    const chart = chartRef.current
    const main  = mainRef.current
    if (!chart || !main) return

    const handler = (param) => {
      if (!param?.time || !param.seriesData) { setOhlcv(null); return }
      const d = param.seriesData.get(main)
      if (!d) { setOhlcv(null); return }

      // Find matching candle for volume
      const candle = candles.find(c => c.time === param.time)
      setOhlcv({
        open:   d.open  ?? null,
        high:   d.high  ?? null,
        low:    d.low   ?? null,
        close:  d.close ?? d.value ?? null,
        volume: candle?.volume ?? null,
      })
    }

    chart.subscribeCrosshairMove(handler)
    return () => { try { chart.unsubscribeCrosshairMove(handler) } catch { /* ok */ } }
  }, [candles])

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        height: 40, paddingBottom: 6,
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* Left: price label OR crosshair OHLCV */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {ohlcv ? (
            <OHLCVBar ohlcv={ohlcv} />
          ) : (
            <PriceLabel price={price} change={change} changePct={changePercent} />
          )}
        </div>

        {/* Right: range + type controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <RangeSelector active={range.label} onChange={(r) => setRange(r)} />
          <TypeToggle type={chartType} onChange={setChartType} />
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: height - 48 }}>
        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'var(--tv-bg-secondary)',
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 12,
          }}>
            {[100, 70, 85, 60, 90, 75, 55, 80].map((w, i) => (
              <LoadingSkeleton
                key={i}
                height={Math.floor((height - 48 - 80) / 8)}
                width={`${w}%`}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
            background: 'var(--tv-bg-secondary)',
          }}>
            <span style={{ fontSize: 20, opacity: 0.3 }}>📉</span>
            <p style={{ fontSize: 12, color: 'var(--tv-text-muted)', textAlign: 'center', maxWidth: 260 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchCandles()}
              style={{
                fontSize: 11, padding: '4px 12px',
                background: 'var(--tv-bg-elevated)',
                border: '1px solid var(--tv-border)',
                borderRadius: 4, color: 'var(--tv-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* The lightweight-charts canvas target */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            visibility: loading ? 'hidden' : 'visible',
          }}
        />
      </div>
    </div>
  )
}
