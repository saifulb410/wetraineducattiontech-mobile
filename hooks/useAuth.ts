import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getCurrentUserWithRoles } from '@/lib/auth/roles'
import type { UserWithRoles } from '@/lib/auth/types'

export interface AuthState {
  loading: boolean
  session: Session | null
  user: User | null
  roles: UserWithRoles | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    roles: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const roles = await getCurrentUserWithRoles().catch(() => null)
        setState({ loading: false, session, user: session.user, roles })
      } else {
        setState({ loading: false, session: null, user: null, roles: null })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const roles = await getCurrentUserWithRoles().catch(() => null)
          setState({ loading: false, session, user: session.user, roles })
        } else {
          setState({ loading: false, session: null, user: null, roles: null })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { ...state, signOut }
}
