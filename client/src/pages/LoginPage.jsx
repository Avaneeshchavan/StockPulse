import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/portfolio'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, from, navigate])

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  // Google SVG logo
  const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--tv-bg-primary)',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 4,
        padding: '40px 48px',
        width: '100%',
        maxWidth: 400
      }}>
        {/* Logo / App Name */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            margin: 0
          }}>
            StockPulse
          </h1>
          <div style={{
            width: 40,
            height: 3,
            background: 'var(--tv-accent)',
            margin: '8px auto 0'
          }} />
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 13,
          color: 'var(--tv-text-secondary)',
          textAlign: 'center',
          margin: '0 0 32px'
        }}>
          Practice trading with $100,000 virtual money
        </p>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            height: 44,
            background: '#fff',
            color: '#1a1a1a',
            borderRadius: 4,
            border: 'none',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = '#f5f5f5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff'
          }}
        >
          <GoogleLogo />
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '24px 0',
          gap: 12
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--tv-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--tv-text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--tv-border)' }} />
        </div>

        {/* Feature Bullets */}
        <div style={{ marginBottom: 24 }}>
          {[
            'Real-time market data from global exchanges',
            'Zero risk — all trades use virtual money',
            'Track your portfolio and compete on the leaderboard'
          ].map((text, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: i < 2 ? 10 : 0
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--tv-accent)',
                flexShrink: 0
              }} />
              <span style={{
                fontSize: 12,
                color: 'var(--tv-text-secondary)',
                lineHeight: 1.4
              }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p style={{
          fontSize: 11,
          color: 'var(--tv-text-muted)',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5
        }}>
          By signing in you agree to our terms.<br />
          Not a real trading platform.
        </p>
      </div>
    </div>
  )
}
