import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error(error)
        setProfile(null)
        return
      }
      setProfile(data ?? null)
    } catch (error) {
      console.error("fetchProfile failed:", error)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        const u = session?.user ?? null
        setUser(u)
        if (u) await fetchProfile(u.id)
        else setProfile(null)
      } catch (error) {
        console.error("AuthContext init failed:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const u = session?.user ?? null
        setUser(u)
        if (u) await fetchProfile(u.id)
        else setProfile(null)
      } catch (error) {
        console.error("onAuthStateChange failed:", error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const login = useCallback(
    () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      }),
    []
  )

  const logout = useCallback(() => supabase.auth.signOut(), [])

  const getAccessToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      return session?.access_token ?? null
    } catch (error) {
      console.error("getAccessToken failed:", error)
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      fetchProfile,
      getAccessToken,
    }),
    [user, profile, isLoading, login, logout, fetchProfile, getAccessToken]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
