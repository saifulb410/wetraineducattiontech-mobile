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

interface Invoice {
  id: string
  amount: number
  status: string
  notes: string | null
  confirmed_at: string | null
  created_at: string
  store_accounts?: { profiles?: { full_name: string | null } | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: colors.green,
  pending: colors.amber,
  cancelled: colors.red,
  rejected: colors.red,
}

const FILTERS = ['All', 'pending', 'confirmed', 'cancelled']

export default function Invoices() {
  const router = useRouter()
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.profileRole === 'admin'

  const [all, setAll] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    let q = supabase
      .from('store_invoices')
      .select('id,amount,status,notes,confirmed_at,created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!isAdmin) q = q.eq('user_id', user.id)

    const { data } = await q
    setAll((data as Invoice[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = filter === 'All' ? all : all.filter(i => i.status === filter)

  const totalAmount = filtered.reduce((s, i) => s + (i.amount ?? 0), 0)

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Summary */}
        <Card style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View>
              <Text style={s.summaryLabel}>{filter === 'All' ? 'Total Invoices' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Invoices`}</Text>
              <Text style={s.summaryCount}>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.summaryRight}>
              <Text style={s.summaryAmountLabel}>Total Amount</Text>
              <Text style={s.summaryAmount}>৳{totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No {filter === 'All' ? '' : filter} invoices</Text>
          </Card>
        ) : (
          filtered.map(inv => {
            const statusColor = STATUS_COLORS[inv.status] ?? colors.slate400
            const date = new Date(inv.created_at)
            return (
              <Card key={inv.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invoiceId}>INV-{inv.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={s.invoiceDate}>
                      {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.invoiceAmount}>৳{(inv.amount ?? 0).toLocaleString()}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>{inv.status}</Text>
                    </View>
                  </View>
                </View>

                {inv.notes ? (
                  <Text style={s.notes} numberOfLines={2}>{inv.notes}</Text>
                ) : null}

                {inv.confirmed_at && inv.status === 'confirmed' && (
                  <View style={s.confirmedRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                    <Text style={s.confirmedText}>
                      Confirmed {new Date(inv.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
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
  summaryCard: { marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.slate400, fontSize: 12 },
  summaryCount: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryAmountLabel: { color: colors.slate400, fontSize: 12 },
  summaryAmount: { color: colors.gold, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  filterRow: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  invoiceId: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  invoiceDate: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  invoiceAmount: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  notes: { color: colors.slate400, fontSize: 12, marginBottom: 6 },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedText: { color: colors.green, fontSize: 11 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
