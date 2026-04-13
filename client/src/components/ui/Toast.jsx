import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

/* ─────────────────────────────────────────────────────────
   Toast Context + Hook
   ───────────────────────────────────────────────────────── */
const ToastContext = createContext(null)

let _toastId = 0

/**
 * useToast()
 * Returns { toast, success, error, info }
 *
 * toast({ title, message, type, duration })
 * success(title, message?)
 * error(title, message?)
 * info(title, message?)
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ─────────────────────────────────────────────────────────
   Individual Toast item
   ───────────────────────────────────────────────────────── */
const ACCENT = {
  success     : 'var(--tv-green)',
  error       : 'var(--tv-red)',
  info        : 'var(--tv-accent)',
  achievement : '#ffd700', // Gold
}

function ToastItem({ id, title, message, type = 'info', duration = 4000, onDismiss }) {
  const [progress, setProgress] = useState(100)
  const [exiting, setExiting]   = useState(false)
  const startRef      = useRef(Date.now())
  const rafRef        = useRef(null)
  const dismissTimer  = useRef(null)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismiss(id), 220) // wait for exit animation
  }, [id, onDismiss])

  // Progress bar
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    dismissTimer.current = setTimeout(dismiss, duration)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(dismissTimer.current)
    }
  }, [duration, dismiss])

  const accent = ACCENT[type] ?? ACCENT.info

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'relative',
        width: type === 'achievement' ? 320 : 280,
        background: type === 'achievement' 
          ? 'linear-gradient(135deg, var(--tv-bg-secondary) 0%, #1a1500 100%)' 
          : 'var(--tv-bg-secondary)',
        border: type === 'achievement' ? '2px solid #ffd700' : '1px solid var(--tv-border)',
        borderLeft: type === 'achievement' ? '2px solid #ffd700' : `3px solid ${accent}`,
        borderRadius: 4,
        padding: '12px 14px',
        overflow: 'hidden',
        transform: exiting ? 'translateX(110%)' : 'translateX(0)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 0.22s ease, opacity 0.22s ease',
        animation: exiting ? undefined : 'toastSlideIn 0.22s ease',
        boxShadow: type === 'achievement' 
          ? '0 8px 32px rgba(255, 215, 0, 0.15)' 
          : '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      {type === 'achievement' && (
        <div style={{
          position: 'absolute', top: -10, right: -10, fontSize: 40, opacity: 0.1, pointerEvents: 'none'
        }}></div>
      )}
      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--tv-text-muted)',
          fontSize: 14,
          cursor: 'pointer',
          lineHeight: 1,
          padding: '0 2px',
        }}
      >
        ×
      </button>

      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--tv-text-primary)',
            paddingRight: 20,
            marginBottom: message ? 4 : 0,
          }}
        >
          {title}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--tv-text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 2,
          width: `${progress}%`,
          background: accent,
          opacity: 0.7,
          transition: 'width 0.1s linear',
          borderRadius: '0 0 0 0',
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Toast container (portal)
   ───────────────────────────────────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  return createPortal(
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  )
}

/* ─────────────────────────────────────────────────────────
   ToastProvider
   ───────────────────────────────────────────────────────── */
/**
 * Wrap your app (or a subtree) with <ToastProvider>.
 * Then call useToast() anywhere inside.
 *
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((opts) => {
    const id = ++_toastId
    setToasts((prev) => [...prev, { id, ...opts }])
    return id
  }, [])

  const success = useCallback(
    (title, message) => toast({ title, message, type: 'success' }),
    [toast]
  )
  const error = useCallback(
    (title, message) => toast({ title, message, type: 'error' }),
    [toast]
  )
  const info = useCallback(
    (title, message) => toast({ title, message, type: 'info' }),
    [toast]
  )
  const achievement = useCallback(
    (title, message, icon = '') => toast({ 
      title: `${icon} ${title}`, 
      message, 
      type: 'achievement',
      duration: 6000 
    }),
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, info, achievement }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
