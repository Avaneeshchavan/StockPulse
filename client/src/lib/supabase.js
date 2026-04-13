import { createClient } from '@supabase/supabase-js'

// No-op lock — bypasses navigator.locks to prevent deadlocks when
// multiple React Query hooks concurrently trigger supabase.auth.getSession()
const noOpLock = async (_name, _acquireTimeout, fn) => {
  return await fn()
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: noOpLock,
    },
  }
)
