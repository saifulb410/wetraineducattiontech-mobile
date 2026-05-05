import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Customer { id: string; full_name: string | null; email: string | null }
interface Order { id: string; status: string; created_at: string; user_id: string; profiles?: { full_name: string | null; email: string | null } | null; services?: { name: string }[] | null; amount?: number | null }
interface Payment { id: string; status: string; amount: number | null; created_at: string; profiles?: { full_name: string | null; email: string | null } | null }

const STATUS_COLOR: Record<string, string> = {
  completed: colors.green, pending: colors.amber, cancelled: colors.red, confirmed: colors.green, paid: colors.green,
}

export default function EducationDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.profileRole === 'admin'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customerCount, setCustomerCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [orderCount, setOrderCount] = useState(0)
  const [pendingPayments, setPendingPayments] = useState(0)
  const [latestCustomers, setLatestCustomers] = useState<Customer[]>([])
  const [latestOrders, setLatestOrders] = useState<Order[]>([])
  const [latestPayments, setLatestPayments] = useState<Payment[]>([])
  // Non-admin
  const [myName, setMyName] = useState<string | null>(null)
  const [myOrders, setMyOrders] = useState<Order[]>([])

  const fetchData = async () => {
    if (!user) return

    if (isAdmin) {
      const [custRes, ordersRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email', { count: 'exact' }).limit(5).order('created_at', { ascending: false }),
        supabase.from('orders').select('id,status,created_at,user_id,profiles(full_name,email),services(name),amount').order('created_at', { ascending: false }).limit(5),
        supabase.from('payments').select('id,status,amount,created_at,profiles(full_name,email)').order('created_at', { ascending: false }).limit(5),
      ])
      setCustomerCount(custRes.count ?? 0)
      setLatestCustomers((custRes.data as Customer[]) ?? [])
      const orders = (ordersRes.data as Order[]) ?? []
      setLatestOrders(orders)
      setOrderCount(orders.length)
      const payments = (paymentsRes.data as Payment[]) ?? []
      setLatestPayments(payments)
      const revenue = payments.filter(p => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + (p.amount ?? 0), 0)
      setTotalRevenue(revenue)
      setPendingPayments(payments.filter(p => p.status === 'pending').length)
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

  // ─── ADMIN VIEW ───
  if (isAdmin) {
    return (
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>
          <View style={s.titleRow}>
            <View>
              <Text style={s.pageTitle}>Admin Dashboard</Text>
              <Text style={s.pageSub}>Overview of customers, payments, and orders</Text>
            </View>
            <Button title="Sign Out" onPress={signOut} variant="ghost" />
          </View>

          {/* Stats */}
          <View style={s.statsGrid}>
            <Card style={s.statCard}>
              <View style={s.statRow}><Text style={s.statLabel}>Total Customers</Text><Ionicons name="people-outline" size={18} color={colors.slate400} /></View>
              <Text style={s.statNum}>{customerCount}</Text>
            </Card>
            <Card style={s.statCard}>
              <View style={s.statRow}><Text style={s.statLabel}>Total Revenue</Text><Ionicons name="receipt-outline" size={18} color={colors.slate400} /></View>
              <Text style={s.statNum}>৳{totalRevenue}</Text>
            </Card>
            <Card style={s.statCard}>
              <View style={s.statRow}><Text style={s.statLabel}>Orders</Text><Ionicons name="cart-outline" size={18} color={colors.slate400} /></View>
              <Text style={s.statNum}>{orderCount}</Text>
            </Card>
            <Card style={s.statCard}>
              <View style={s.statRow}><Text style={s.statLabel}>Pending Payments</Text><Ionicons name="time-outline" size={18} color={colors.slate400} /></View>
              <Text style={s.statNum}>{pendingPayments}</Text>
            </Card>
          </View>

          {/* Latest Customers */}
          <Card style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={s.tableTitle}>Latest Customers</Text>
              <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.colHead, { flex: 2 }]}>Customer</Text>
              <Text style={[s.colHead, { flex: 3 }]}>Email</Text>
            </View>
            {latestCustomers.length === 0
              ? <Text style={s.empty}>No customers yet.</Text>
              : latestCustomers.map(c => (
                <View key={c.id} style={s.tableRow}>
                  <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{c.full_name ?? '—'}</Text>
                  <Text style={[s.cellSub, { flex: 3 }]} numberOfLines={1}>{c.email ?? '—'}</Text>
                </View>
              ))}
          </Card>

          {/* Latest Payments */}
          <Card style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={s.tableTitle}>Latest Payments</Text>
              <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.colHead, { flex: 2 }]}>Customer</Text>
              <Text style={[s.colHead, { flex: 2 }]}>Amount</Text>
              <Text style={[s.colHead, { flex: 1 }]}>Status</Text>
            </View>
            {latestPayments.length === 0
              ? <Text style={s.empty}>No payments found.</Text>
              : latestPayments.map(p => (
                <View key={p.id} style={s.tableRow}>
                  <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{p.profiles?.full_name ?? '—'}</Text>
                  <Text style={[s.cell, { flex: 2 }]}>৳{p.amount ?? 0}</Text>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLOR[p.status] ?? colors.slate400) + '22', flex: 1 }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLOR[p.status] ?? colors.slate400 }]}>{p.status}</Text>
                  </View>
                </View>
              ))}
          </Card>

          {/* Latest Orders */}
          <Card style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={s.tableTitle}>Latest Orders</Text>
              <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.colHead, { flex: 2 }]}>Customer</Text>
              <Text style={[s.colHead, { flex: 2 }]}>Service</Text>
              <Text style={[s.colHead, { flex: 1 }]}>Status</Text>
            </View>
            {latestOrders.length === 0
              ? <Text style={s.empty}>No orders found.</Text>
              : latestOrders.map(o => (
                <View key={o.id} style={s.tableRow}>
                  <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{o.profiles?.full_name ?? '—'}</Text>
                  <Text style={[s.cellSub, { flex: 2 }]} numberOfLines={1}>{o.services?.[0]?.name ?? '—'}</Text>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLOR[o.status] ?? colors.slate400) + '22', flex: 1 }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLOR[o.status] ?? colors.slate400 }]}>{o.status}</Text>
                  </View>
                </View>
              ))}
          </Card>
        </View>
      </ScrollView>
    )
  }

  // ─── CUSTOMER VIEW ───
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
            <Text style={s.statNum}>{myOrders.length}</Text>
            <Text style={s.statLabel}>Enrollments</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{myOrders.filter(o => o.status === 'completed').length}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{myOrders.filter(o => o.status === 'pending').length}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </Card>
        </View>

        <Text style={s.sectionTitle}>All Enrollments</Text>
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
  statCard: { width: '47%', paddingVertical: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { color: colors.slate400, fontSize: 12 },
  statNum: { color: colors.white, fontSize: 26, fontWeight: 'bold' },
  tableCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  tableTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44' },
  colHead: { color: colors.slate400, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cell: { color: colors.white, fontSize: 13, fontWeight: '500' },
  cellSub: { color: colors.slate400, fontSize: 13 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16, paddingHorizontal: 14 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  orderCard: { marginBottom: 12 },
  orderName: { color: colors.white, fontWeight: '600', marginBottom: 8 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.slate400, fontSize: 12 },
})
