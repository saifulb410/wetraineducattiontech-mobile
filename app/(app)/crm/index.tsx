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
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Lead { id: string; status: string; name: string | null; phone: string | null; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  NEW: colors.slate400, CONTACTED: colors.blue, INTERESTED: colors.amber,
  NO_RESPONSE: colors.red, SOLD: colors.green, QUALIFIED: colors.purple,
  CONVERTED: colors.green, LOST: colors.red,
}

// Display-friendly label for uppercase status values
const statusLabel = (s: string) =>
  s ? s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ') : s

const adminSections = [
  { label: 'Users',         icon: 'people-circle-outline', color: colors.blue,   route: '/(app)/crm/users'         },
  { label: 'Lead Requests', icon: 'document-text-outline', color: colors.amber,  route: '/(app)/crm/lead-requests' },
] as const

export default function CrmDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalLeads, setTotalLeads]     = useState(0)
  const [soldDeals, setSoldDeals]       = useState(0)
  const [activeLeads, setActiveLeads]   = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [recentLeads, setRecentLeads]   = useState<Lead[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([])

  const fetchData = async () => {
    let leadsQuery = supabase.from('crm_leads').select('id,status,name,phone,created_at').order('created_at', { ascending: false })
    // non-admin: filter by owner_id
    if (!isAdmin && user) leadsQuery = leadsQuery.eq('owner_id', user.id)

    const { data: leadsData } = await leadsQuery
    const leads = (leadsData as Lead[]) ?? []

    setTotalLeads(leads.length)
    setSoldDeals(leads.filter(l => l.status === 'SOLD' || l.status === 'CONVERTED').length)
    setActiveLeads(leads.filter(l => !['LOST', 'SOLD', 'CONVERTED'].includes(l.status)).length)
    const total = leads.length
    const sold = leads.filter(l => l.status === 'SOLD' || l.status === 'CONVERTED').length
    setConversionRate(total > 0 ? Math.round((sold / total) * 100) : 0)
    setRecentLeads(leads.slice(0, 5))

    const statusMap: Record<string, number> = {}
    leads.forEach(l => { statusMap[l.status] = (statusMap[l.status] ?? 0) + 1 })
    setStatusBreakdown(Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => ({ status, count })))

    if (isAdmin) {
      const { count } = await supabase.from('crm_lead_requests').select('id', { count: 'exact' }).eq('status', 'PENDING')
      setPendingRequests(count ?? 0)
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>

        {/* Header */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.pageTitle}>CRM Dashboard</Text>
            <Text style={s.pageSub}>Welcome back, {roles?.crmRole ?? 'User'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          {[
            { label: 'Total Leads',     value: totalLeads,      color: colors.white,  icon: 'people-outline'            },
            { label: 'Sold Deals',      value: soldDeals,       color: colors.green,  icon: 'checkmark-circle-outline'  },
            { label: 'Active Leads',    value: activeLeads,     color: colors.blue,   icon: 'trending-up-outline'       },
            { label: 'Conversion',      value: `${conversionRate}%`, color: colors.purple, icon: 'bar-chart-outline'   },
          ].map(st => (
            <Card key={st.label} style={s.statCard}>
              <View style={s.statTop}>
                <Text style={s.statLabel}>{st.label}</Text>
                <Ionicons name={st.icon as any} size={15} color={st.color} />
              </View>
              <Text style={[s.statNum, { color: st.color }]}>{st.value}</Text>
            </Card>
          ))}
        </View>

        {/* Admin sections */}
        {isAdmin && (
          <>
            <Text style={s.sectionLabel}>ADMIN PANEL</Text>
            <View style={s.adminGrid}>
              {adminSections.map(sec => (
                <TouchableOpacity
                  key={sec.label}
                  style={s.adminCard}
                  onPress={() => router.push(sec.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[s.adminIcon, { backgroundColor: sec.color + '22', borderColor: sec.color + '40' }]}>
                    <Ionicons name={sec.icon} size={22} color={sec.color} />
                  </View>
                  <Text style={s.adminLabel}>{sec.label}</Text>
                  {sec.label === 'Lead Requests' && pendingRequests > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{pendingRequests}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recent leads */}
        <Card style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={s.tableTitle}>{isAdmin ? 'All Recent Leads' : 'My Recent Leads'}</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/crm/leads' as any)}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentLeads.length === 0
            ? <Text style={s.empty}>No leads yet.</Text>
            : recentLeads.map(l => (
              <TouchableOpacity key={l.id} onPress={() => router.push(`/(app)/crm/leads/${l.id}` as any)} style={s.leadRow}>
                <View style={s.leadLeft}>
                  <Text style={s.leadPhone}>{l.phone ?? '—'}</Text>
                  <Text style={s.leadName}>{l.name ?? 'Unknown'}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[l.status] ?? colors.slate400) + '22' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLORS[l.status] ?? colors.slate400 }]}>{statusLabel(l.status)}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </Card>

        {/* Status breakdown */}
        {statusBreakdown.length > 0 && (
          <Card style={s.breakdownCard}>
            <Text style={s.tableTitle}>Leads by Status</Text>
            {statusBreakdown.map(({ status, count }) => (
              <View key={status} style={s.breakRow}>
                <View style={[s.dot, { backgroundColor: STATUS_COLORS[status] ?? colors.slate400 }]} />
                <Text style={s.breakLabel}>{statusLabel(status)}</Text>
                <View style={s.barWrap}>
                  <View style={[s.bar, { width: `${Math.min((count / totalLeads) * 100, 100)}%` as any, backgroundColor: STATUS_COLORS[status] ?? colors.slate400 }]} />
                </View>
                <Text style={s.breakCount}>{count}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', paddingVertical: 14 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: colors.slate400, fontSize: 12 },
  statNum: { fontSize: 26, fontWeight: 'bold' },
  sectionLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  adminGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  adminCard: { flex: 1, backgroundColor: colors.navyLight, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.slate700 + '60', position: 'relative' },
  adminIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  adminLabel: { color: colors.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  tableCard: { marginBottom: 14, padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  tableTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '40' },
  leadLeft: { flex: 1 },
  leadPhone: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  leadName: { color: colors.white, fontSize: 13, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 20, paddingHorizontal: 14 },
  breakdownCard: { marginBottom: 14 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakLabel: { color: colors.white, fontSize: 12, width: 90, textTransform: 'capitalize' },
  barWrap: { flex: 1, height: 6, backgroundColor: colors.slate700, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  breakCount: { color: colors.gold, fontWeight: 'bold', width: 24, textAlign: 'right' },
})
