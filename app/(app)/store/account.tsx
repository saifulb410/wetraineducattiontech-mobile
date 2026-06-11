import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface AccountEntry {
  id: string
  category: string
  amount: number
  reason: string | null
  created_at: string
}

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  DEPOSIT:    { color: colors.green, icon: 'arrow-down-circle-outline' },
  REFUND:     { color: colors.green, icon: 'refresh-circle-outline'    },
  PURCHASE:   { color: colors.red,   icon: 'cart-outline'              },
  PENALTY:    { color: colors.red,   icon: 'alert-circle-outline'      },
  WITHDRAWAL: { color: colors.red,   icon: 'arrow-up-circle-outline'   },
  ADJUSTMENT: { color: colors.amber, icon: 'swap-horizontal-outline'   },
}

const FILTERS = ['All', 'DEPOSIT', 'PURCHASE', 'WITHDRAWAL', 'PENALTY', 'REFUND', 'ADJUSTMENT']

export default function Account() {
  const { user } = useAuthContext()

  const [balance, setBalance] = useState(0)
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    const { data } = await supabase
      .from('store_account_entries')
      .select('id,category,amount,reason,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    const rows = (data as AccountEntry[]) ?? []
    setEntries(rows)
    // Compute balance from all entries (not just the 100 shown)
    const { data: allData } = await supabase
      .from('store_account_entries')
      .select('amount')
      .eq('user_id', user.id)
    setBalance((allData ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0))

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = filter === 'All' ? entries : entries.filter(e => e.category === filter)
  const totalIn  = filtered.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalOut = filtered.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)
  const balanceColor = balance >= 0 ? colors.green : colors.red

  const filterLabel = (f: string) => {
    if (f === 'All') return 'All'
    return f.charAt(0) + f.slice(1).toLowerCase()
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Balance card */}
        <Card style={s.balanceCard}>
          <View style={s.balanceRow}>
            <View style={s.balanceIconWrap}>
              <Ionicons name="wallet-outline" size={24} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.balanceLabel}>My Account Balance</Text>
              <Text style={[s.balanceAmount, { color: balanceColor }]}>
                ৳{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Ionicons name="arrow-down-circle-outline" size={14} color={colors.green} />
              <Text style={[s.summaryVal, { color: colors.green }]}>৳{totalIn.toLocaleString()}</Text>
              <Text style={s.summaryLabel}>Money In</Text>
            </View>
            <View style={s.divider} />
            <View style={s.summaryItem}>
              <Ionicons name="arrow-up-circle-outline" size={14} color={colors.red} />
              <Text style={[s.summaryVal, { color: colors.red }]}>৳{totalOut.toLocaleString()}</Text>
              <Text style={s.summaryLabel}>Money Out</Text>
            </View>
            <View style={s.divider} />
            <View style={s.summaryItem}>
              <Ionicons name="swap-horizontal-outline" size={14} color={colors.gold} />
              <Text style={[s.summaryVal, { color: colors.gold }]}>{filtered.length}</Text>
              <Text style={s.summaryLabel}>Entries</Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {filterLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ledger entries */}
        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="book-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No {filter === 'All' ? '' : filterLabel(filter)} entries found</Text>
          </Card>
        ) : (
          filtered.map(entry => {
            const cfg = CATEGORY_CONFIG[entry.category] ?? { color: colors.slate400, icon: 'ellipse-outline' }
            const isPositive = entry.amount >= 0
            return (
              <Card key={entry.id} style={s.entryCard}>
                <View style={s.entryRow}>
                  <View style={[s.iconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.entryType}>{filterLabel(entry.category)}</Text>
                    {entry.reason ? <Text style={s.entryNotes} numberOfLines={1}>{entry.reason}</Text> : null}
                    <Text style={s.entryDate}>
                      {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                    </Text>
                  </View>
                  <Text style={[s.entryAmount, { color: cfg.color }]}>
                    {isPositive ? '+' : ''}৳{Math.abs(entry.amount ?? 0).toLocaleString()}
                  </Text>
                </View>
              </Card>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  balanceCard: { marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  balanceIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold + '40' },
  balanceLabel: { color: colors.slate400, fontSize: 12 },
  balanceAmount: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.slate700, paddingTop: 12 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryVal: { fontSize: 14, fontWeight: '800' },
  summaryLabel: { color: colors.slate500, fontSize: 10, fontWeight: '600' },
  divider: { width: 1, height: 36, backgroundColor: colors.slate700 },
  filterRow: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  entryCard: { marginBottom: 8, padding: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryType: { color: colors.white, fontSize: 13, fontWeight: '600' },
  entryNotes: { color: colors.slate400, fontSize: 11, marginTop: 1 },
  entryDate: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  entryAmount: { fontSize: 15, fontWeight: '800' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
