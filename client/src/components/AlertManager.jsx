import { useEffect } from 'react'
import { apiUrl } from '../config'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from './ui/Toast.jsx'

const CHECK_INTERVAL = 60000 // 60 seconds

export default function AlertManager() {
  const { user, isAuthenticated } = useAuth()
  const { success: toastSuccess } = useToast()

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    let timer = null


    const checkAlerts = async () => {
      try {
        // 1. Fetch untriggered alerts
        const { data: alerts, error: alertsError } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('triggered', false)

        if (alertsError) {
          console.warn('price_alerts table not ready:', alertsError.message)
          if (timer) clearInterval(timer)
          return
        }
        if (!alerts || alerts.length === 0) return

        // 2. Fetch current prices for these symbols
        const symbols = [...new Set(alerts.map(a => a.symbol))]
        const res = await fetch(
  apiUrl(`/market/quotes/batch?symbols=${symbols.join(',')}`)
)
        if (!res.ok) return
        const quotes = await res.json()

        // 3. Check each alert
        for (const alert of alerts) {
          const quote = quotes[alert.symbol]
          if (!quote) continue

          const currentPrice = quote.price
          let hit = false

          if (alert.direction === 'above' && currentPrice >= alert.target_price) {
            hit = true
          } else if (alert.direction === 'below' && currentPrice <= alert.target_price) {
            hit = true
          }

          if (hit) {
            // Triggered!
            toastSuccess(`${alert.symbol} hit your target of $${Number(alert.target_price).toLocaleString()} ${alert.direction === 'above' ? '▲' : '▼'}`)
            
            // Update in Supabase
            await supabase
              .from('price_alerts')
              .update({ triggered: true })
              .eq('id', alert.id)
          }
        }
      } catch (err) {
        console.error('AlertManager check failed:', err)
      }
    }

    // Run immediately and then every interval
    checkAlerts()
    timer = setInterval(checkAlerts, CHECK_INTERVAL)

    return () => { if (timer) clearInterval(timer) }
  }, [isAuthenticated, user?.id, toastSuccess])

  return null // This component doesn't render anything
}
