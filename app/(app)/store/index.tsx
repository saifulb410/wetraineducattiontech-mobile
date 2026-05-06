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

interface Invoice { id: string; amount: number; status: string; confirmed_at: string | null; created_at: string }
interface ActivityEntry { id: string; type: string; amount: number; notes: string | null; created_at: string }

const ACTIVITY_COLORS: Record<string, string> = {
  purchase: colors.red, penalty: colors.red, debit: colors.red,
  credit: colors.green, deposit: colors.green, refund: colors.green,
}
const ACTIVITY_SIGN: Record<string, string> = {
  purchase: '-', penalty: '-', debit: '-',
  credit: '+', deposit: '+', refund: '+',
}

export default function StoreDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.profileRole === 'admin'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [balance, setBalance] = useState(0)
  const [monthPurchases, setMonthPurchases] = useState(0)
  const [monthPurchaseCount, setMonthPurchaseCount] = useState(0)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [recentPurchases, setRecentPurchases] = useState<Invoice[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])

  const fetchData = async () => {
    if (!user) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [balanceRes, purchasesRes, activityRes] = await Promise.all([
      supabase.from('store_accounts').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('store_invoices').select('id,amount,status,confirmed_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('store_ledger').select('id,type,amount,notes,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    setBalance(balanceRes.data?.balance ?? 0)

    const purchases = (purchasesRes.data as Invoice[]) ?? []
    setRecentPurchases(purchases)
    setTotalInvoices(purchases.length)
    setPendingInvoices(purchases.filter(p => p.status === 'pending').length)
    const thisMonth = purchases.filter(p => p.created_at >= monthStart && p.status === 'confirmed')
    setMonthPurchases(thisMonth.reduce((s, p) => s + (p.amount ?? 0), 0))
    setMonthPurchaseCount(thisMonth.length)

    setRecentActivity((activityRes.data as ActivityEntry[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  const balanceColor = balance >= 0 ? colors.green : colors.red

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.pageTitle}>My Store</Text>
            <Text style={s.pageSub}>Balance, purchases & account activity</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {/* Balance card */}
        <Card style={s.balanceCard}>
          <View style={s.balanceTop}>
            <View style={s.balanceIconWrap}>
              <Ionicons name="wallet-outline" size={22} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.balanceLabel}>Current Balance</Text>
              <Text style={[s.balanceAmount, { color: balanceColor }]}>
                ৳{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={s.balanceMeta}>
              <Text style={s.metaVal}>{pendingInvoices}</Text>
              <Text style={s.metaLabel}>Pending</Text>
            </View>
          </View>

          {/* Month summary */}
          <View style={s.monthRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.slate400} />
            <Text style={s.monthText}>
              This month: <Text style={{ color: colors.white, fontWeight: '700' }}>৳{monthPurchases.toLocaleString()}</Text>
              {' '}from {monthPurchaseCount} purchase{monthPurchaseCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </Card>

        {/* Quick links */}
        <View style={s.quickGrid}>
          <TouchableOpacity style={s.quickCard} onPress={() => router.push('/(app)/store/invoices' as any)} activeOpacity={0.8}>
            <View style={[s.quickIcon, { backgroundColor: colors.blue + '22' }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.blue} />
            </View>
            <Text style={s.quickLabel}>Invoices</Text>
            <Text style={s.quickSub}>View all purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => router.push('/(app)/store/ledger' as any)} activeOpacity={0.8}>
            <View style={[s.quickIcon, { backgroundColor: colors.green + '22' }]}>
              <Ionicons name="book-outline" size={22} color={colors.green} />
            </View>
            <Text style={s.quickLabel}>Ledger</Text>
            <Text style={s.quickSub}>Account history</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Invoices */}
        <Card style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={s.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/store/invoices' as any)}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentPurchases.length === 0 ? (
            <Text style={s.empty}>No invoices yet.</Text>
          ) : (
            recentPurchases.map(p => {
              const statusColors: Record<string, string> = { confirmed: colors.green, pending: colors.amber, cancelled: colors.red }
              const sc = statusColors[p.status] ?? colors.slate400
              return (
                <View key={p.id} style={s.row}>
                  <View style={s.rowLeft}>
                    <Text style={s.rowId}>INV-{p.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={s.rowDate}>
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={s.rowRight}>
                    <Text style={s.rowAmount}>৳{(p.amount ?? 0).toLocaleString()}</Text>
                    <View style={[s.badge, { backgroundColor: sc + '22' }]}>
                      <Text style={[s.badgeText, { color: sc }]}>{p.status}</Text>
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </Card>

        {/* Recent Account Activity */}
        <Card style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/store/ledger' as any)}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length === 0 ? (
            <Text style={s.empty}>No account activity yet.</Text>
          ) : (
            recentActivity.map(a => {
              const color = ACTIVITY_COLORS[a.type] ?? colors.slate400
              const sign = ACTIVITY_SIGN[a.type] ?? ''
              return (
                <View key={a.id} style={s.row}>
                  <View style={s.rowLeft}>
                    <Text style={s.rowId}>{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</Text>
                    <Text style={s.rowDate} numberOfLines={1}>{a.notes ?? '—'}</Text>
                  </View>
                  <Text style={[s.activityAmount, { color }]}>
                    {sign}৳{(a.amount ?? 0).toLocaleString()}
                  </Text>
                </View>
              )
            })
          )}
        </Card>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  balanceCard: { marginBottom: 16 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  balanceIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold + '40' },
  balanceLabel: { color: colors.slate400, fontSize: 12 },
  balanceAmount: { fontSize: 30, fontWeight: '900', marginTop: 2 },
  balanceMeta: { alignItems: 'center', backgroundColor: colors.amber + '18', borderRadius: 10, padding: 10 },
  metaVal: { color: colors.amber, fontSize: 20, fontWeight: 'bold' },
  metaLabel: { color: colors.amber, fontSize: 10, fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate700 },
  monthText: { color: colors.slate400, fontSize: 12 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: colors.navyLight, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.slate700 + '60' },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.white, fontSize: 13, fontWeight: '700' },
  quickSub: { color: colors.slate400, fontSize: 11 },
  tableCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  sectionTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '33' },
  rowLeft: { flex: 1 },
  rowId: { color: colors.white, fontSize: 13, fontWeight: '600' },
  rowDate: { color: colors.slate400, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { color: colors.white, fontWeight: '700', fontSize: 14 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  activityAmount: { fontSize: 14, fontWeight: '800' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 20, paddingHorizontal: 14 },
})
