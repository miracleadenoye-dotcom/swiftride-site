import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'customer' | 'rider' | 'staff' | null

interface AuthState {
  session: Session | null
  role: Role
  staffRole: string | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState>(null as unknown as AuthState)
export const useAuth = () => useContext(Ctx)

// Role comes from the DB (my_role()), never from client state.
async function loadRole(session: Session): Promise<{ role: Role; staffRole: string | null }> {
  const { data } = await supabase.rpc('my_role')
  let r = data as string | null
  if (!r) {
    // First login after sign-up: register chosen role (RLS only allows customer/rider for self).
    const meta = session.user.user_metadata ?? {}
    const chosen = meta.role === 'rider' ? 'rider' : 'customer'
    await supabase.from('user_roles').insert({ user_id: session.user.id, role: chosen })
    await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: meta.full_name ?? '',
      phone: meta.phone ?? '',
      email: session.user.email,
    })
    if (chosen === 'rider') await supabase.from('riders').upsert({ id: session.user.id })
    r = chosen
  }
  if (r.startsWith('staff:')) return { role: 'staff', staffRole: r.slice(6) }
  return { role: r as Role, staffRole: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [staffRole, setStaffRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = async (s: Session | null) => {
    setSession(s)
    if (s) {
      try {
        const x = await loadRole(s)
        setRole(x.role); setStaffRole(x.staffRole)
      } catch { setRole(null) }
    } else { setRole(null); setStaffRole(null) }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void apply(s) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    session, role, staffRole, loading,
    refresh: async () => apply((await supabase.auth.getSession()).data.session),
    signOut: async () => { sessionStorage.clear(); await supabase.auth.signOut() },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
