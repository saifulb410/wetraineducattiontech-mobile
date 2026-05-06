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

/* ── types ── */
interface Order {
  id: string; status: string; created_at: string
  profiles?: { full_name: string | null } | null
  services?: { name: string }[] | null
  amount?: number | null
}
interface Payment {
  id: string; status: string; amount: number | null; created_at: string
  profiles?: { full_name: string | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  completed: colors.green, confirmed: colors.green,
  pending: colors.amber, cancelled: colors.red, paid: colors.green,
}

/* ── Admin section nav cards ── */
const adminSections = [
  { label: 'Customers', icon: 'people-outline',   color: colors.blue,   route: '/(app)/education/customers' },
  { label: 'Payments',  icon: 'card-outline',      color: colors.green,  route: '/(app)/education/payments'  },
  { label: 'Orders',    icon: 'cart-outline',      color: colors.amber,  route: '/(app)/education/orders'    },
  { label: 'Services',  icon: 'storefront-outline',color: colors.purple, route: '/(app)/education/services'  },
  { label: 'Projects',  icon: 'briefcase-outline', color: colors.red,    route: '/(app)/education/projects'  },
  { label: 'Certs',     icon: 'ribbon-outline',    color: colors.gold,   route: '/(app)/education/certificates' },
] as const

/* ══════════════════════════════════════════════════════ */
export default function EducationDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.profileRole === 'admin'

  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)

  /* Admin stats */
  const [customerCount, setCustomerCount]   = useState(0)
  const [totalRevenue, setTotalRevenue]     = useState(0)
  const [orderCount, setOrderCount]         = useState(0)
  const [pendingCount, setPendingCount]     = useState(0)
  const [latestOrders, setLatestOrders]     = useState<Order[]>([])
  const [latestPayments, setLatestPayments] = useState<Payment[]>([])

  /* Student stats */
  const [myName, setMyName]     = useState<string | null>(null)
  const [myOrders, setMyOrders] = useState<Order[]>([])

  const fetchData = async () => {
    if (!user) return

    if (isAdmin) {
      const [custRes, ordersRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).limit(1),
        supabase.from('orders').select('id,status,created_at,profiles(full_name),services(name),amount').order('created_at', { ascending: false }).limit(5),
        supabase.from('payments').select('id,status,amount,created_at,profiles(full_name)').order('created_at', { ascending: false }).limit(5),
      ])
      setCustomerCount(custRes.count ?? 0)
      const orders = (ordersRes.data as Order[]) ?? []
      const payments = (paymentsRes.data as Payment[]) ?? []
      setLatestOrders(orders)
      setLatestPayments(payments)
      setOrderCount(orders.length)
      const revenue = payments.filter(p => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + (p.amount ?? 0), 0)
      setTotalRevenue(revenue)
      setPendingCount(payments.filter(p => p.status === 'pending').length)
    } else {
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('id,status,created_at,services(name),amount').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setMyName(profileRes.data?.full_name ?? null)
      setMyOrders((ordersRes.data as Order[]) ?? [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  /* ── ADMIN VIEW ── */
  if (isAdmin) {
    return (
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>

          {/* Header */}
          <View style={s.titleRow}>
            <View>
              <Text style={s.pageTitle}>Admin Dashboard</Text>
              <Text style={s.pageSub}>Education module overview</Text>
            </View>
            <Button title="Sign Out" onPress={signOut} variant="ghost" />
          </View>

          {/* Stats row */}
          <View style={s.statsGrid}>
            {[
              { label: 'Customers',   value: customerCount,          icon: 'people-outline',   color: colors.blue  },
              { label: 'Revenue',     value: `৳${totalRevenue}`,     icon: 'cash-outline',      color: colors.green },
              { label: 'Orders',      value: orderCount,             icon: 'cart-outline',      color: colors.amber },
              { label: 'Pending Pay', value: pendingCount,           icon: 'time-outline',      color: colors.red   },
            ].map(stat => (
              <Card key={stat.label} style={s.statCard}>
                <View style={s.statTop}>
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                </View>
                <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
              </Card>
            ))}
          </View>

          {/* Admin section grid */}
          <Text style={s.sectionLabel}>MANAGE</Text>
          <View style={s.sectionGrid}>
            {adminSections.map(sec => (
              <TouchableOpacity
                key={sec.label}
                style={s.sectionCard}
                onPress={() => router.push(sec.route as any)}
                activeOpacity={0.75}
              >
                <View style={[s.sectionIconWrap, { backgroundColor: sec.color + '22', borderColor: sec.color + '40' }]}>
                  <Ionicons name={sec.icon} size={22} color={sec.color} />
                </View>
                <Text style={s.sectionCardLabel}>{sec.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Latest Orders */}
          <Card style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={s.tableTitle}>Latest Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/education/orders' as any)}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {latestOrders.length === 0
              ? <Text style={s.empty}>No orders found.</Text>
              : latestOrders.map(o => (
                <View key={o.id} style={s.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cell} numberOfLines={1}>{o.profiles?.full_name ?? '—'}</Text>
                    <Text style={s.cellSub} numberOfLines={1}>{o.services?.[0]?.name ?? '—'}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLOR[o.status] ?? colors.slate400) + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLOR[o.status] ?? colors.slate400 }]}>{o.status}</Text>
                  </View>
                </View>
              ))}
          </Card>

          {/* Latest Payments */}
          <Card style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={s.tableTitle}>Latest Payments</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/education/payments' as any)}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {latestPayments.length === 0
              ? <Text style={s.empty}>No payments found.</Text>
              : latestPayments.map(p => (
                <View key={p.id} style={s.tableRow}>
                  <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>{p.profiles?.full_name ?? '—'}</Text>
                  <Text style={s.cell}>৳{p.amount ?? 0}</Text>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLOR[p.status] ?? colors.slate400) + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLOR[p.status] ?? colors.slate400 }]}>{p.status}</Text>
                  </View>
                </View>
              ))}
          </Card>

        </View>
      </ScrollView>
    )
  }

  /* ── STUDENT VIEW ── */
  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.titleRow}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.pageTitle}>{myName ?? user?.email ?? 'Student'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        <View style={s.statsGrid}>
          <Card style={s.statCard}>
            <Text style={[s.statNum, { color: colors.blue }]}>{myOrders.length}</Text>
            <Text style={s.statLabel}>Enrollments</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={[s.statNum, { color: colors.green }]}>{myOrders.filter(o => o.status === 'completed').length}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={[s.statNum, { color: colors.amber }]}>{myOrders.filter(o => o.status === 'pending').length}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </Card>
        </View>

        <Text style={s.sectionLabel}>MY ENROLLMENTS</Text>
        {myOrders.length === 0
          ? <Card><Text style={s.empty}>No enrollments yet.</Text></Card>
          : myOrders.map(o => (
            <Card key={o.id} style={s.orderCard}>
              <Text style={s.orderName}>{o.services?.[0]?.name ?? 'Service'}</Text>
              <View style={s.orderRow}>
                <Text style={s.date}>{new Date(o.created_at).toLocaleDateString()}</Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLOR[o.status] ?? colors.slate400) + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[o.status] ?? colors.slate400 }]}>{o.status}</Text>
                </View>
              </View>
            </Card>
          ))}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { color: colors.slate400, fontSize: 13 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 13, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', paddingVertical: 14 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: colors.slate400, fontSize: 12 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: colors.white },

  sectionLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  sectionCard: {
    width: '30.5%', backgroundColor: colors.navyLight,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.slate700 + '60',
  },
  sectionIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  sectionCardLabel: { color: colors.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  tableCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  tableTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44', gap: 8 },
  cell: { color: colors.white, fontSize: 13, fontWeight: '500' },
  cellSub: { color: colors.slate400, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16, paddingHorizontal: 14 },

  orderCard: { marginBottom: 12 },
  orderName: { color: colors.white, fontWeight: '600', marginBottom: 8 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.slate400, fontSize: 12 },
})
