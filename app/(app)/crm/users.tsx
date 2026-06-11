import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface CrmUser {
  id: string
  full_name: string | null
  email: string | null
  crm_role: string
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: colors.gold,
  MARKETER: colors.blue,
}

export default function CrmUsers() {
  const router = useRouter()
  const { roles } = useAuthContext()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUsers = async () => {
    const { data: crmData } = await supabase
      .from('crm_users')
      .select('id,crm_role,created_at')
      .order('created_at', { ascending: false })

    const rows = crmData ?? []
    if (rows.length > 0) {
      const ids = (rows as any[]).map(r => r.id)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id,full_name,email')
        .in('id', ids)
      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {}
      ;(profileData ?? []).forEach((p: any) => { profileMap[p.id] = { full_name: p.full_name, email: p.email } })
      setUsers((rows as any[]).map(r => ({
        id: r.id,
        crm_role: r.crm_role,
        created_at: r.created_at,
        full_name: profileMap[r.id]?.full_name ?? null,
        email: profileMap[r.id]?.email ?? null,
      })))
    } else {
      setUsers([])
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchUsers() }, [])
  const onRefresh = () => { setRefreshing(true); fetchUsers() }

  if (!isAdmin) {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.gold} />
        <Text style={s.noAccess}>Admin access required.</Text>
      </View>
    )
  }

  if (loading) return <LoadingScreen />

  const admins = users.filter(u => u.crm_role === 'ADMIN')
  const marketers = users.filter(u => u.crm_role !== 'ADMIN')

  const initials = (name: string | null, email: string | null) => {
    if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    return (email ?? '??').slice(0, 2).toUpperCase()
  }

  const renderUser = (u: CrmUser) => {
    const roleColor = ROLE_COLORS[u.crm_role] ?? colors.slate400
    return (
      <Card key={u.id} style={s.card}>
        <View style={s.row}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(u.full_name, u.email)}</Text>
          </View>
          <View style={s.info}>
            <Text style={s.name}>{u.full_name || '—'}</Text>
            <Text style={s.email} numberOfLines={1}>{u.email || '—'}</Text>
          </View>
          <View style={[s.roleBadge, { backgroundColor: roleColor + '22' }]}>
            <Text style={[s.roleText, { color: roleColor }]}>{u.crm_role}</Text>
          </View>
        </View>
        <Text style={s.joinDate}>
          Joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </Card>
    )
  }

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>User Management</Text>
            <Text style={s.pageSub}>{users.length} total CRM users</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>ADMINS ({admins.length})</Text>
        {admins.map(renderUser)}

        <Text style={[s.sectionLabel, { marginTop: 8 }]}>MARKETERS ({marketers.length})</Text>
        {marketers.length === 0
          ? <Card><Text style={s.emptyText}>No marketers yet.</Text></Card>
          : marketers.map(renderUser)}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noAccess: { color: colors.slate400, fontSize: 15, marginTop: 12, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  card: { marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold + '22', borderWidth: 1.5,
    borderColor: colors.gold + '50', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { color: colors.white, fontWeight: '600', fontSize: 14 },
  email: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: '800' },
  joinDate: { color: colors.slate500, fontSize: 11, marginLeft: 56 },
  emptyText: { color: colors.slate400, textAlign: 'center', paddingVertical: 12 },
})
