import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthContext } from '@/context/AuthContext'
import { colors } from '@/lib/theme'

const MODULES = [
  { key: 'education', label: 'Education', sub: 'Dashboard & Certificates', icon: 'school-outline', access: 'hasEducationAccess' },
  { key: 'crm', label: 'CRM', sub: 'Leads & Sales', icon: 'bar-chart-outline', access: 'hasCrmAccess' },
  { key: 'hrm', label: 'HRM', sub: 'Staff & Tasks', icon: 'people-circle-outline', access: 'hasHrmAccess' },
  { key: 'store', label: 'Store', sub: 'Products & Inventory', icon: 'storefront-outline', access: 'hasStoreAccess' },
] as const

export default function ModuleSwitcher() {
  const { roles, signOut } = useAuthContext()
  const router = useRouter()

  const accessible = MODULES.filter(m => roles?.[m.access])
  const isAdmin = roles?.profileRole === 'admin'

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>Switch Module</Text>
      <Text style={s.sub}>Select a module to open</Text>

      {accessible.map(m => (
        <TouchableOpacity key={m.key} style={s.card} onPress={() => router.replace(`/(app)/${m.key}` as any)}>
          <View style={s.iconBox}>
            <Ionicons name={m.icon} size={26} color={colors.gold} />
          </View>
          <View style={s.cardText}>
            <Text style={s.cardLabel}>{m.label}</Text>
            <Text style={s.cardSub}>{m.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
        </TouchableOpacity>
      ))}

      {isAdmin && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Platform Admin</Text>
          <TouchableOpacity style={[s.card, s.adminCard]} onPress={() => router.push('/(app)/admin' as any)}>
            <View style={[s.iconBox, { backgroundColor: colors.purple + '22' }]}>
              <Ionicons name="shield-checkmark-outline" size={26} color={colors.purple} />
            </View>
            <View style={s.cardText}>
              <Text style={[s.cardLabel, { color: colors.purple }]}>User Management</Text>
              <Text style={s.cardSub}>Assign module roles to employees</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.red} />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 24, paddingTop: 40 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: colors.slate400, fontSize: 14, marginBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navyLight, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f' },
  adminCard: { borderColor: colors.purple + '55' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.slate700, marginVertical: 16 },
  sectionLabel: { color: colors.slate500, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 8 },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
})
