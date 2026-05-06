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

interface Order {
  id: string
  amount: number | null
  status: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
  services?: { name: string }[] | null
}

const STATUS_COLORS: Record<string, string> = {
  completed: colors.green,
  confirmed: colors.green,
  pending: colors.amber,
  cancelled: colors.red,
  failed: colors.red,
}

const FILTERS = ['All', 'pending', 'confirmed', 'completed', 'cancelled']

export default function Orders() {
  const router = useRouter()
  const [all, setAll] = useState<Order[]>([])
  const [filtered, setFiltered] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id,amount,status,created_at,profiles(full_name,email),services(name)')
      .order('created_at', { ascending: false })
    setAll((data as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      all.filter(o => {
        const matchStatus = statusFilter === 'All' || o.status === statusFilter
        const matchSearch = !q ||
          o.profiles?.full_name?.toLowerCase().includes(q) ||
          o.profiles?.email?.toLowerCase().includes(q) ||
          o.services?.[0]?.name?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        return matchStatus && matchSearch
      })
    )
  }, [search, statusFilter, all])

  const onRefresh = () => { setRefreshing(true); fetchData() }
  if (loading) return <LoadingScreen />

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
            <Text style={s.pageTitle}>Orders</Text>
            <Text style={s.pageSub}>{filtered.length} of {all.length} orders</Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by customer, service or ID..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
        </View>

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
            <Ionicons name="cart-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No orders found</Text>
          </Card>
        ) : (
          filtered.map(o => (
            <Card key={o.id} style={s.card}>
              <View style={s.topRow}>
                <View style={s.left}>
                  <Text style={s.customerName}>{o.profiles?.full_name || '—'}</Text>
                  <Text style={s.service} numberOfLines={1}>
                    {o.services?.[0]?.name || 'No service'}
                  </Text>
                </View>
                {o.amount != null && (
                  <Text style={s.amount}>৳{o.amount.toLocaleString()}</Text>
                )}
              </View>
              <View style={s.bottomRow}>
                <Text style={s.idText}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[o.status] ?? colors.slate500) + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLORS[o.status] ?? colors.slate500 }]}>
                    {o.status}
                  </Text>
                </View>
                <Text style={s.date}>
                  {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
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
  left: { flex: 1, marginRight: 8 },
  customerName: { color: colors.white, fontWeight: '600', fontSize: 14 },
  service: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  amount: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idText: { color: colors.slate500, fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  date: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
