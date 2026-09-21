import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(user) {
    const { data } = await supabase.from('bg_users').select('*').eq('id', user.id).maybeSingle()
    if (data) {
      setProfile(data)
      return
    }

    // Fyrste gong ein sesjon finst for denne brukaren (t.d. rett etter registrering,
    // eller etter stadfesta e-post viss "Confirm email" er på): profilrada kunne ikkje
    // opprettast under signUp (ingen aktiv sesjon = RLS avviste innsettinga). Rett opp her.
    const { data: created } = await supabase
      .from('bg_users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        role: 'tenant',
      })
      .select()
      .maybeSingle()
    setProfile(created ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) await loadProfile(session.user)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) return { error }

    // Viss Supabase-prosjektet krev e-poststadfesting, finst det ingen aktiv sesjon
    // enno (data.session er null), og profilrada vert oppretta fyrste gong brukaren
    // faktisk loggar inn (sjå loadProfile). Elles hentar/opprettar vi profilen med ein gong.
    if (data.session?.user) await loadProfile(data.session.user)

    return { error: null, needsEmailConfirmation: !data.session }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile: () => session?.user && loadProfile(session.user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth må brukast inni AuthProvider')
  return ctx
}
