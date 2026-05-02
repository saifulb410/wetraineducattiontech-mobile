import { supabase } from '../supabase'
import type { UserWithRoles, PrimaryModule } from './types'

export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, crmRes, hrmRes, storeRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('crm_users').select('crm_role').eq('id', user.id).maybeSingle(),
    supabase.from('hrm_users').select('hrm_role').eq('id', user.id).maybeSingle(),
    supabase.from('store_users').select('store_role').eq('id', user.id).maybeSingle(),
  ])

  const profileRole = profileRes.data?.role ?? null
  const crmRole = crmRes.data?.crm_role ?? null
  const hrmRole = hrmRes.data?.hrm_role ?? null
  const storeRole = storeRes.data?.store_role ?? null

  return {
    userId: user.id,
    email: user.email ?? '',
    profileRole,
    crmRole,
    hrmRole,
    storeRole,
    hasEducationAccess: !!profileRole,
    hasCrmAccess: !!crmRole,
    hasHrmAccess: !!hrmRole,
    hasStoreAccess: !!storeRole,
    canAccessCrmAdmin: crmRole === 'ADMIN',
  }
}

export function getPrimaryModule(roles: UserWithRoles): PrimaryModule | null {
  if (roles.hasEducationAccess) return 'education'
  if (roles.hasCrmAccess) return 'crm'
  if (roles.hasHrmAccess) return 'hrm'
  if (roles.hasStoreAccess) return 'store'
  return null
}
