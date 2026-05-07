import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Switch, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { colors } from '@/lib/theme'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

type EducationRole = 'customer' | 'admin' | null
type CrmRole = 'ADMIN' | 'MARKETER' | null
type HrmRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | null
type StoreRole = 'ADMIN' | 'USER' | null

interface UserRecord {
  id: string
  email: string | null
  full_name: string | null
  educationRole: EducationRole
  crmRole: CrmRole
  hrmRole: HrmRole
  storeRole: StoreRole
}

interface EditState {
  educationRole: EducationRole
  crmRole: CrmRole
  hrmRole: HrmRole
  storeRole: StoreRole
}

const MOD_COLOR = {
  education: colors.blue,
  crm: colors.purple,
  hrm: colors.green,
  store: colors.amber,
}

export default function AdminPanel() {
  const { roles } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<UserRecord | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const [profilesRes, crmRes, hrmRes, storeRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role').order('full_name'),
      supabase.from('crm_users').select('id, crm_role'),
      supabase.from('hrm_users').select('id, hrm_role'),
      supabase.from('store_users').select('id, store_role'),
    ])

    const crmMap: Record<string, string> = {}
    const hrmMap: Record<string, string> = {}
    const storeMap: Record<string, string> = {}
    ;(crmRes.data ?? []).forEach((r: any) => { crmMap[r.id] = r.crm_role })
    ;(hrmRes.data ?? []).forEach((r: any) => { hrmMap[r.id] = r.hrm_role })
    ;(storeRes.data ?? []).forEach((r: any) => { storeMap[r.id] = r.store_role })

    setUsers(
      (profilesRes.data ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        educationRole: (p.role ?? null) as EducationRole,
        crmRole: (crmMap[p.id] ?? null) as CrmRole,
        hrmRole: (hrmMap[p.id] ?? null) as HrmRole,
        storeRole: (storeMap[p.id] ?? null) as StoreRole,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openEdit = (user: UserRecord) => {
    setSelected(user)
    setEdit({
      educationRole: user.educationRole,
      crmRole: user.crmRole,
      hrmRole: user.hrmRole,
      storeRole: user.storeRole,
    })
  }

  const handleSave = async () => {
    if (!selected || !edit) return
    setSaving(true)
    const uid = selected.id
    try {
      await supabase.from('profiles').update({ role: edit.educationRole }).eq('id', uid)

      if (edit.crmRole) {
        await supabase.from('crm_users').upsert({ id: uid, crm_role: edit.crmRole }, { onConflict: 'id' })
      } else {
        await supabase.from('crm_users').delete().eq('id', uid)
      }

      if (edit.hrmRole) {
        await supabase.from('hrm_users').upsert({ id: uid, hrm_role: edit.hrmRole }, { onConflict: 'id' })
      } else {
        await supabase.from('hrm_users').delete().eq('id', uid)
      }

      if (edit.storeRole) {
        await supabase.from('store_users').upsert({ id: uid, store_role: edit.storeRole }, { onConflict: 'id' })
      } else {
        await supabase.from('store_users').delete().eq('id', uid)
      }

      await fetchUsers()
      setSelected(null)
      setEdit(null)
      Alert.alert('Saved', 'Roles updated successfully.')
    } catch {
      Alert.alert('Error', 'Failed to save role changes.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
  })

  if (!roles || roles.profileRole !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.slate400} />
        <Text style={{ color: colors.slate400, marginTop: 12, fontSize: 16 }}>Admin access only</Text>
      </View>
    )
  }

  if (loading) return <LoadingScreen />

  return (
    <View style={s.root}>
      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatPill label="Total" value={users.length} color={colors.white} />
        <StatPill label="EDU" value={users.filter(u => u.educationRole).length} color={MOD_COLOR.education} />
        <StatPill label="CRM" value={users.filter(u => u.crmRole).length} color={MOD_COLOR.crm} />
        <StatPill label="HRM" value={users.filter(u => u.hrmRole).length} color={MOD_COLOR.hrm} />
        <StatPill label="STORE" value={users.filter(u => u.storeRole).length} color={MOD_COLOR.store} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.slate400} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.slate500}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.slate400} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.list}>
        {filtered.length === 0 && <Text style={s.empty}>No users found.</Text>}
        {filtered.map(user => (
          <TouchableOpacity key={user.id} style={s.userCard} onPress={() => openEdit(user)} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {((user.full_name || user.email || '?'))
                  .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </Text>
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{user.full_name || '(No name)'}</Text>
              <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
              <View style={s.badges}>
                {user.educationRole && <ModuleBadge label="EDU" color={MOD_COLOR.education} role={user.educationRole} />}
                {user.crmRole && <ModuleBadge label="CRM" color={MOD_COLOR.crm} role={user.crmRole} />}
                {user.hrmRole && <ModuleBadge label="HRM" color={MOD_COLOR.hrm} role={user.hrmRole} />}
                {user.storeRole && <ModuleBadge label="STORE" color={MOD_COLOR.store} role={user.storeRole} />}
                {!user.educationRole && !user.crmRole && !user.hrmRole && !user.storeRole && (
                  <Text style={s.noAccess}>No module access</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slate600} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={[s.modalCard, { maxHeight: SCREEN_HEIGHT * 0.88 }]}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalName}>{selected?.full_name || '(No name)'}</Text>
                <Text style={s.modalEmail}>{selected?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {edit && (
                <>
                  <ModuleSection
                    label="Education"
                    icon="school-outline"
                    color={MOD_COLOR.education}
                    enabled={!!edit.educationRole}
                    onToggle={on => setEdit({ ...edit, educationRole: on ? 'customer' : null })}
                    role={edit.educationRole}
                    roles={[{ value: 'customer', label: 'Employee' }, { value: 'admin', label: 'Admin' }]}
                    onRoleChange={r => setEdit({ ...edit, educationRole: r as EducationRole })}
                  />
                  <ModuleSection
                    label="CRM"
                    icon="bar-chart-outline"
                    color={MOD_COLOR.crm}
                    enabled={!!edit.crmRole}
                    onToggle={on => setEdit({ ...edit, crmRole: on ? 'MARKETER' : null })}
                    role={edit.crmRole}
                    roles={[{ value: 'MARKETER', label: 'Marketer' }, { value: 'ADMIN', label: 'Admin' }]}
                    onRoleChange={r => setEdit({ ...edit, crmRole: r as CrmRole })}
                  />
                  <ModuleSection
                    label="HRM"
                    icon="people-circle-outline"
                    color={MOD_COLOR.hrm}
                    enabled={!!edit.hrmRole}
                    onToggle={on => setEdit({ ...edit, hrmRole: on ? 'EMPLOYEE' : null })}
                    role={edit.hrmRole}
                    roles={[
                      { value: 'EMPLOYEE', label: 'Employee' },
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    ]}
                    onRoleChange={r => setEdit({ ...edit, hrmRole: r as HrmRole })}
                  />
                  <ModuleSection
                    label="Store"
                    icon="storefront-outline"
                    color={MOD_COLOR.store}
                    enabled={!!edit.storeRole}
                    onToggle={on => setEdit({ ...edit, storeRole: on ? 'USER' : null })}
                    role={edit.storeRole}
                    roles={[{ value: 'USER', label: 'Employee' }, { value: 'ADMIN', label: 'Admin' }]}
                    onRoleChange={r => setEdit({ ...edit, storeRole: r as StoreRole })}
                  />
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.navy} />
                : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={sp.pill}>
      <Text style={[sp.val, { color }]}>{value}</Text>
      <Text style={sp.lbl}>{label}</Text>
    </View>
  )
}

function ModuleBadge({ label, color, role }: { label: string; color: string; role: string }) {
  return (
    <View style={[mb.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[mb.lbl, { color }]}>{label}</Text>
      <Text style={[mb.role, { color }]}>{role}</Text>
    </View>
  )
}

function ModuleSection({
  label, icon, color, enabled, onToggle, role, roles, onRoleChange,
}: {
  label: string
  icon: any
  color: string
  enabled: boolean
  onToggle: (on: boolean) => void
  role: string | null
  roles: { value: string; label: string }[]
  onRoleChange: (r: string) => void
}) {
  return (
    <View style={ms.section}>
      <View style={ms.headerRow}>
        <View style={[ms.iconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={ms.label}>{label}</Text>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.slate700, true: color + '88' }}
          thumbColor={enabled ? color : colors.slate500}
        />
      </View>
      {enabled && (
        <View style={ms.chipRow}>
          {roles.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[ms.chip, role === r.value && { backgroundColor: color + '33', borderColor: color }]}
              onPress={() => onRoleChange(r.value)}
            >
              <Text style={[ms.chipText, { color: role === r.value ? color : colors.slate400 }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: colors.navyLight, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.slate700,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.navyLight, margin: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.slate700,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  list: { flex: 1 },
  empty: { color: colors.slate400, textAlign: 'center', marginTop: 40, fontSize: 14 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.navyLight, marginHorizontal: 12,
    marginBottom: 8, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.slate700 + '60',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold + '22', borderWidth: 1, borderColor: colors.gold + '55',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  userInfo: { flex: 1 },
  userName: { color: colors.white, fontWeight: '700', fontSize: 14 },
  userEmail: { color: colors.slate400, fontSize: 12, marginTop: 1, marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  noAccess: { color: colors.slate600, fontSize: 11, fontStyle: 'italic' },
  // Modal
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.navyLight,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.slate700,
  },
  modalName: { color: colors.white, fontSize: 17, fontWeight: '800' },
  modalEmail: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  saveBtn: {
    backgroundColor: colors.gold, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
})

const sp = StyleSheet.create({
  pill: { alignItems: 'center' },
  val: { fontSize: 18, fontWeight: '800' },
  lbl: { color: colors.slate400, fontSize: 10, fontWeight: '600', marginTop: 1 },
})

const mb = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 5, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2,
  },
  lbl: { fontSize: 9, fontWeight: '800' },
  role: { fontSize: 9, fontWeight: '600' },
})

const ms = StyleSheet.create({
  section: {
    backgroundColor: colors.navy, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.slate700 + '60',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.white, fontWeight: '700', fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.slate700 + '44', borderWidth: 1, borderColor: colors.slate700,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
})
