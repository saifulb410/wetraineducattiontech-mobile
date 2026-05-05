import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Purchase { id: string; amount: number; status: string; confirmed_at: string | null; created_at: string }
interface ActivityEntry { id: string; type: string; amount: number; notes: string | null; created_at: string }

const ACTIVITY_COLORS: Record<string, string> = {
  purchase: colors.red,
  penalty: colors.red,
  refund: colors.red,
  credit: colors.green,
  deposit: colors.green,
}

export default function StoreDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [balance, setBalance] = useState(0)
  const [monthPurchases, setMonthPurchases] = useState(0)
  const [monthPurchaseCount, setMonthPurchaseCount] = useState(0)
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])

  const fetchData = async () => {
    if (!user) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [balanceRes, purchasesRes, activityRes] = await Promise.all([
      supabase.from('store_accounts').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('store_invoices').select('id,amount,status,confirmed_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('store_ledger').select('id,type,amount,notes,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ])

    setBalance(balanceRes.data?.balance ?? 0)

    const purchases = (purchasesRes.data as Purchase[]) ?? []
    setRecentPurchases(purchases)
    const thisMonthPurchases = purchases.filter(p => p.created_at >= monthStart && p.status === 'confirmed')
    setMonthPurchases(thisMonthPurchases.reduce((s, p) => s + (p.amount ?? 0), 0))
    setMonthPurchaseCount(thisMonthPurchases.length)

    setRecentActivity((activityRes.data as ActivityEntry[]) ?? [])
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
            <Text style={s.pageTitle}>Store Dashboard</Text>
            <Text style={s.pageSub}>Check your current balance, recent purchases, and account activity.</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <Card style={s.balanceCard}>
            <View style={s.balanceHeader}>
              <Text style={s.balanceLabel}>Current Balance</Text>
              <Ionicons name="wallet-outline" size={18} color={colors.slate400} />
            </View>
            <Text style={s.balanceAmount}>{balance.toFixed(2)} BDT</Text>
            <Text style={s.balanceSub}>Ledger-derived available balance</Text>
          </Card>

          <Card style={s.monthCard}>
            <View style={s.balanceHeader}>
              <Text style={s.balanceLabel}>This Month Purchases</Text>
              <Ionicons name="cart-outline" size={18} color={colors.slate400} />
            </View>
            <Text style={s.monthAmount}>{monthPurchases.toFixed(2)} BDT</Text>
            <Text style={s.balanceSub}>{monthPurchaseCount} confirmed purchases this month</Text>
          </Card>
        </View>

        {/* Quick Links */}
        <Card style={s.quickCard}>
          <View style={s.quickHeader}>
            <Text style={s.sectionTitle}>Quick Links</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.gold} />
          </View>
          <TouchableOpacity style={s.quickLink}>
            <Ionicons name="receipt-outline" size={15} color={colors.gold} />
            <Text style={s.quickLinkText}>View purchase history</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickLink}>
            <Ionicons name="book-outline" size={15} color={colors.gold} />
            <Text style={s.quickLinkText}>View account ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickLink}>
            <Ionicons name="add-circle-outline" size={15} color={colors.gold} />
            <Text style={s.quickLinkText}>Start a new invoice</Text>
          </TouchableOpacity>
        </Card>

        {/* Recent Purchases */}
        <Card style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={s.sectionTitle}>Recent Purchases</Text>
            <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
          </View>
          {recentPurchases.length === 0
            ? <Text style={s.empty}>No purchases found.</Text>
            : recentPurchases.map(p => (
              <View key={p.id} style={s.purchaseRow}>
                <View style={s.purchaseInfo}>
                  <Text style={s.purchaseDate}>
                    {new Date(p.confirmed_at ?? p.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={s.purchaseSub}>
                    Confirmed {new Date(p.confirmed_at ?? p.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={s.purchaseRight}>
                  <View style={s.confirmedBadge}>
                    <Text style={s.confirmedText}>{p.status.toUpperCase()}</Text>
                  </View>
                  <Text style={s.purchaseAmount}>{p.amount?.toFixed(2)} BDT</Text>
                </View>
              </View>
            ))}
        </Card>

        {/* Recent Account Activity */}
        <Card style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={s.sectionTitle}>Recent Account Activity</Text>
            <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
          </View>
          {recentActivity.length === 0
            ? <Text style={s.empty}>No account activity yet.</Text>
            : recentActivity.map(a => (
              <View key={a.id} style={s.activityRow}>
                <View style={s.activityInfo}>
                  <Text style={s.activityType}>{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</Text>
                  <Text style={s.activityNotes} numberOfLines={1}>{a.notes ?? 'No notes provided'}</Text>
                  <Text style={s.activityDate}>{new Date(a.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={[s.activityAmount, { color: ACTIVITY_COLORS[a.type] ?? colors.red }]}>
                  -{a.amount?.toFixed(2)} BDT
                </Text>
              </View>
            ))}
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
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2, flex: 1 },
  statsRow: { gap: 10, marginBottom: 12 },
  balanceCard: { marginBottom: 10 },
  monthCard: {},
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  balanceLabel: { color: colors.slate400, fontSize: 13 },
  balanceAmount: { color: colors.green, fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  monthAmount: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  balanceSub: { color: colors.slate500, fontSize: 12 },
  quickCard: { marginBottom: 16 },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44' },
  quickLinkText: { color: colors.gold, fontSize: 14 },
  tableCard: { marginBottom: 16, padding: 0 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  sectionTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  purchaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '33' },
  purchaseInfo: { flex: 1 },
  purchaseDate: { color: colors.white, fontSize: 13, fontWeight: '600' },
  purchaseSub: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  purchaseRight: { alignItems: 'flex-end', gap: 4 },
  confirmedBadge: { backgroundColor: colors.green + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  confirmedText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  purchaseAmount: { color: colors.white, fontWeight: '700', fontSize: 14 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '33' },
  activityInfo: { flex: 1 },
  activityType: { color: colors.white, fontSize: 14, fontWeight: '600' },
  activityNotes: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  activityDate: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  activityAmount: { fontWeight: '700', fontSize: 14 },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 20, paddingHorizontal: 14 },
})
