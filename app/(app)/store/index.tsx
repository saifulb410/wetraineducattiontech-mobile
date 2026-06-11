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

interface Invoice { id: string; total_amount: number; status: string; confirmed_at: string | null; created_at: string }
interface ActivityEntry { id: string; category: string; amount: number; reason: string | null; created_at: string }

const ACTIVITY_COLORS: Record<string, string> = {
  PURCHASE: colors.red, PENALTY: colors.red, WITHDRAWAL: colors.red,
  DEPOSIT: colors.green, REFUND: colors.green, ADJUSTMENT: colors.green,
}
const ACTIVITY_SIGN: Record<string, string> = {
  PURCHASE: '-', PENALTY: '-', WITHDRAWAL: '-',
  DEPOSIT: '+', REFUND: '+', ADJUSTMENT: '+',
}

export default function StoreDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.storeRole === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [balance, setBalance] = useState(0)
  const [monthPurchases, setMonthPurchases] = useState(0)
  const [monthPurchaseCount, setMonthPurchaseCount] = useState(0)
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [recentPurchases, setRecentPurchases] = useState<Invoice[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])
  // Admin stats
  const [totalProducts, setTotalProducts] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [totalAccounts, setTotalAccounts] = useState(0)
  const [monthSales, setMonthSales] = useState(0)

  const fetchData = async () => {
    if (!user) return
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [entriesRes, purchasesRes, activityRes] = await Promise.all([
      supabase.from('store_account_entries').select('amount').eq('user_id', user.id),
      supabase.from('store_invoices').select('id,total_amount,status,confirmed_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('store_account_entries').select('id,category,amount,reason,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    // Compute balance from entries
    const bal = (entriesRes.data ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    setBalance(bal)

    const purchases = (purchasesRes.data as Invoice[]) ?? []
    setRecentPurchases(purchases)
    setPendingInvoices(purchases.filter(p => p.status === 'PENDING').length)
    const thisMonth = purchases.filter(p => p.created_at >= monthStart && p.status === 'CONFIRMED')
    setMonthPurchases(thisMonth.reduce((s, p) => s + (p.total_amount ?? 0), 0))
    setMonthPurchaseCount(thisMonth.length)
    setRecentActivity((activityRes.data as ActivityEntry[]) ?? [])

    if (isAdmin) {
      const [productsRes, stocksRes, accountsRes, salesRes] = await Promise.all([
        supabase.from('store_products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('store_stock_movements').select('product_id,quantity_delta'),
        supabase.from('store_account_entries').select('user_id'),
        supabase.from('store_invoices').select('total_amount').eq('status', 'CONFIRMED').gte('created_at', monthStart),
      ])
      setTotalProducts(productsRes.count ?? 0)

      // Compute low-stock by aggregating movements per product
      const movData = (stocksRes.data ?? []) as { product_id: string; quantity_delta: number }[]
      const onHandMap: Record<string, number> = {}
      movData.forEach(m => {
        onHandMap[m.product_id] = (onHandMap[m.product_id] ?? 0) + m.quantity_delta
      })
      setLowStockCount(Object.values(onHandMap).filter(v => v <= 5).length)

      // Distinct user IDs with any account entry
      const uniqueAccounts = new Set((accountsRes.data ?? []).map((r: any) => r.user_id)).size
      setTotalAccounts(uniqueAccounts)
      setMonthSales((salesRes.data ?? []).reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0))
    }

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
            <Text style={s.pageTitle}>{isAdmin ? 'Store Admin' : 'My Store'}</Text>
            <Text style={s.pageSub}>{isAdmin ? 'Products, stock & employee accounts' : 'Balance, purchases & account activity'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {isAdmin ? (
          /* ── ADMIN VIEW ── */
          <>
            {/* Personal balance card (same as employee) */}
            <Card style={s.balanceCard}>
              <View style={s.balanceTop}>
                <View style={s.balanceIconWrap}>
                  <Ionicons name="wallet-outline" size={22} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.balanceLabel}>Current Balance</Text>
                  <Text style={[s.balanceAmount, { color: balance >= 0 ? colors.green : colors.red }]}>
                    ৳{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={s.balanceMeta}>
                  <Text style={s.metaVal}>{pendingInvoices}</Text>
                  <Text style={s.metaLabel}>Pending</Text>
                </View>
              </View>
              <View style={s.monthRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.slate400} />
                <Text style={s.monthText}>
                  This month: <Text style={{ color: colors.white, fontWeight: '700' }}>৳{monthPurchases.toLocaleString()}</Text>
                  {' '}from {monthPurchaseCount} purchase{monthPurchaseCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </Card>

            {/* Admin stats grid */}
            <View style={s.statsGrid}>
              <Card style={s.statCard}>
                <Ionicons name="cube-outline" size={18} color={colors.blue} />
                <Text style={[s.statNum, { color: colors.blue }]}>{totalProducts}</Text>
                <Text style={s.statLabel}>Products</Text>
              </Card>
              <Card style={s.statCard}>
                <Ionicons name="warning-outline" size={18} color={colors.amber} />
                <Text style={[s.statNum, { color: lowStockCount > 0 ? colors.amber : colors.slate400 }]}>{lowStockCount}</Text>
                <Text style={s.statLabel}>Low Stock</Text>
              </Card>
              <Card style={s.statCard}>
                <Ionicons name="people-outline" size={18} color={colors.green} />
                <Text style={[s.statNum, { color: colors.green }]}>{totalAccounts}</Text>
                <Text style={s.statLabel}>Accounts</Text>
              </Card>
              <Card style={s.statCard}>
                <Ionicons name="trending-up-outline" size={18} color={colors.gold} />
                <Text style={[s.statNum, { color: colors.gold }]}>৳{monthSales.toLocaleString()}</Text>
                <Text style={s.statLabel}>Month Sales</Text>
              </Card>
            </View>

            {/* Admin quick links */}
            <Text style={s.sectionLabel}>Manage</Text>
            <View style={s.adminGrid}>
              <TouchableOpacity style={s.adminCard} onPress={() => router.push('/(app)/store/products' as any)} activeOpacity={0.8}>
                <View style={[s.adminIcon, { backgroundColor: colors.blue + '22' }]}>
                  <Ionicons name="cube-outline" size={24} color={colors.blue} />
                </View>
                <Text style={s.adminLabel}>Products</Text>
                <Text style={s.adminSub}>Add & manage catalog</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminCard} onPress={() => router.push('/(app)/store/stocks' as any)} activeOpacity={0.8}>
                <View style={[s.adminIcon, { backgroundColor: colors.amber + '22' }]}>
                  <Ionicons name="layers-outline" size={24} color={colors.amber} />
                </View>
                <Text style={s.adminLabel}>Stocks</Text>
                <Text style={s.adminSub}>Adjust on-hand qty</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminCard} onPress={() => router.push('/(app)/store/accounts-admin' as any)} activeOpacity={0.8}>
                <View style={[s.adminIcon, { backgroundColor: colors.green + '22' }]}>
                  <Ionicons name="wallet-outline" size={24} color={colors.green} />
                </View>
                <Text style={s.adminLabel}>Accounts</Text>
                <Text style={s.adminSub}>Employee balances</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminCard} onPress={() => router.push('/(app)/store/ledger' as any)} activeOpacity={0.8}>
                <View style={[s.adminIcon, { backgroundColor: colors.gold + '22' }]}>
                  <Ionicons name="book-outline" size={24} color={colors.gold} />
                </View>
                <Text style={s.adminLabel}>Ledger</Text>
                <Text style={s.adminSub}>All transactions</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ── EMPLOYEE VIEW ── */
          <>
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
              <TouchableOpacity style={s.quickCard} onPress={() => router.push('/(app)/store/create-invoice' as any)} activeOpacity={0.8}>
                <View style={[s.quickIcon, { backgroundColor: colors.gold + '22' }]}>
                  <Ionicons name="cart-outline" size={22} color={colors.gold} />
                </View>
                <Text style={s.quickLabel}>Shop</Text>
                <Text style={s.quickSub}>Browse & buy items</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.quickCard} onPress={() => router.push('/(app)/store/invoices' as any)} activeOpacity={0.8}>
                <View style={[s.quickIcon, { backgroundColor: colors.blue + '22' }]}>
                  <Ionicons name="receipt-outline" size={22} color={colors.blue} />
                </View>
                <Text style={s.quickLabel}>Invoices</Text>
                <Text style={s.quickSub}>View purchases</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.quickCard} onPress={() => router.push('/(app)/store/account' as any)} activeOpacity={0.8}>
                <View style={[s.quickIcon, { backgroundColor: colors.green + '22' }]}>
                  <Ionicons name="book-outline" size={22} color={colors.green} />
                </View>
                <Text style={s.quickLabel}>Account</Text>
                <Text style={s.quickSub}>Balance history</Text>
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
                  const statusColors: Record<string, string> = { CONFIRMED: colors.green, PENDING: colors.amber, CANCELLED: colors.red }
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
                        <Text style={s.rowAmount}>৳{(p.total_amount ?? 0).toLocaleString()}</Text>
                        <View style={[s.badge, { backgroundColor: sc + '22' }]}>
                          <Text style={[s.badgeText, { color: sc }]}>{p.status}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })
              )}
            </Card>

            {/* Recent Activity */}
            <Card style={s.tableCard}>
              <View style={s.tableHeader}>
                <Text style={s.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/store/account' as any)}>
                  <Text style={s.viewAll}>View all</Text>
                </TouchableOpacity>
              </View>
              {recentActivity.length === 0 ? (
                <Text style={s.empty}>No account activity yet.</Text>
              ) : (
                recentActivity.map(a => {
                  const color = ACTIVITY_COLORS[a.category] ?? colors.slate400
                  const sign = ACTIVITY_SIGN[a.category] ?? (a.amount >= 0 ? '+' : '')
                  return (
                    <View key={a.id} style={s.row}>
                      <View style={s.rowLeft}>
                        <Text style={s.rowId}>{a.category.charAt(0) + a.category.slice(1).toLowerCase()}</Text>
                        <Text style={s.rowDate} numberOfLines={1}>{a.reason ?? '—'}</Text>
                      </View>
                      <Text style={[s.activityAmount, { color }]}>{sign}৳{Math.abs(a.amount ?? 0).toLocaleString()}</Text>
                    </View>
                  )
                })
              )}
            </Card>
          </>
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
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: colors.slate400, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  // Admin stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum: { color: colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.slate400, fontSize: 10, fontWeight: '600' },
  // Admin grid
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminCard: { width: '47%', backgroundColor: colors.navyLight, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.slate700 + '60' },
  adminIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  adminLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  adminSub: { color: colors.slate400, fontSize: 11 },
  // Employee balance
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
  quickGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: colors.navyLight, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.slate700 + '60' },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.white, fontSize: 12, fontWeight: '700' },
  quickSub: { color: colors.slate400, fontSize: 10, textAlign: 'center' },
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
