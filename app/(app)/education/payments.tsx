import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TextInput, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Payment {
  id: string
  amount: number | null
  method: string | null
  status: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  paid: colors.green,
  completed: colors.green,
  pending: colors.amber,
  failed: colors.red,
  cancelled: colors.red,
}

const FILTERS = ['All', 'pending', 'paid', 'completed', 'failed']

export default function Payments() {
  const router = useRouter()
  const [all, setAll] = useState<Payment[]>([])
  const [filtered, setFiltered] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('payments')
      .select('id,amount,method,status,created_at,profiles(full_name,email)')
      .order('created_at', { ascending: false })
    setAll((data as Payment[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      all.filter(p => {
        const matchStatus = statusFilter === 'All' || p.status === statusFilter
        const matchSearch = !q ||
          p.profiles?.full_name?.toLowerCase().includes(q) ||
          p.profiles?.email?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        return matchStatus && matchSearch
      })
    )
  }, [search, statusFilter, all])

  const onRefresh = () => { setRefreshing(true); fetchData() }
  if (loading) return <LoadingScreen />

  const totalAmount = filtered.reduce((s, p) => s + (p.amount ?? 0), 0)

  return (
    <ScrollView
      style={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <View style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Payments</Text>
            <Text style={s.pageSub}>{filtered.length} records · ৳{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or payment ID..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[s.filterChip, statusFilter === f && s.filterChipActive]}
            >
              <Text style={[s.filterText, statusFilter === f && s.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No payments found</Text>
          </Card>
        ) : (
          filtered.map(p => (
            <Card key={p.id} style={s.card}>
              <View style={s.topRow}>
                <View style={s.customerInfo}>
                  <Text style={s.customerName}>{p.profiles?.full_name || '—'}</Text>
                  <Text style={s.customerEmail} numberOfLines={1}>{p.profiles?.email || '—'}</Text>
                </View>
                <Text style={[s.amount, { color: STATUS_COLORS[p.status] ?? colors.slate300 }]}>
                  ৳{(p.amount ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={s.bottomRow}>
                <Text style={s.idText}>#{p.id.slice(0, 8).toUpperCase()}</Text>
                {p.method ? <Text style={s.method}>{p.method}</Text> : null}
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[p.status] ?? colors.slate500) + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLORS[p.status] ?? colors.slate500 }]}>
                    {p.status}
                  </Text>
                </View>
                <Text style={s.date}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { padding: 4 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.navyLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10, borderWidth: 1, borderColor: colors.slate700,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  filterRow: { marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.navy },
  card: { marginBottom: 10, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  customerInfo: { flex: 1, marginRight: 8 },
  customerName: { color: colors.white, fontWeight: '600', fontSize: 14 },
  customerEmail: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  idText: { color: colors.slate500, fontSize: 11, fontFamily: 'monospace' },
  method: { color: colors.slate400, fontSize: 11, backgroundColor: colors.slate700 + '50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  date: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
