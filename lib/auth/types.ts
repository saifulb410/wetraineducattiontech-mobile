export type ProfileRole = 'customer' | 'admin'
export type CrmRole = 'ADMIN' | 'MARKETER'
export type HrmRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
export type StoreRole = 'USER' | 'ADMIN'

export interface UserWithRoles {
  userId: string
  email: string
  profileRole: ProfileRole | null
  crmRole: CrmRole | null
  hrmRole: HrmRole | null
  storeRole: StoreRole | null
  hasEducationAccess: boolean
  hasCrmAccess: boolean
  hasHrmAccess: boolean
  hasStoreAccess: boolean
  canAccessCrmAdmin: boolean
}

export type PrimaryModule = 'education' | 'crm' | 'hrm' | 'store'
