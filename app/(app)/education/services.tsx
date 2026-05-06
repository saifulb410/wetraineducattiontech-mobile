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

interface Service {
  id: string
  name: string
  category: string | null
  price: number | null
  discounted_price: number | null
  updated_at: string | null
  created_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Course: colors.blue,
  Software: colors.purple,
  Marketing: colors.amber,
}

export default function Services() {
  const router = useRouter()
  const [all, setAll] = useState<Service[]>([])
  const [filtered, setFiltered] = useState<Service[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('services')
      .select('id,name,category,price,discounted_price,updated_at,created_at')
      .order('created_at', { ascending: false })
    const list = (data as Service[]) ?? []
    setAll(list)
    const cats = [...new Set(list.map(s => s.category).filter(Boolean))] as string[]
    setCategories(cats)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      all.filter(s => {
        const matchCat = catFilter === 'All' || s.category === catFilter
        const matchSearch = !q || s.name.toLowerCase().includes(q)
        return matchCat && matchSearch
      })
    )
  }, [search, catFilter, all])

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
            <Text style={s.pageTitle}>Services</Text>
            <Text style={s.pageSub}>{filtered.length} of {all.length}</Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search services..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {['All', ...categories].map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setCatFilter(c)}
              style={[s.filterChip, catFilter === c && s.filterChipActive]}
            >
              <Text style={[s.filterText, catFilter === c && s.filterTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="storefront-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No services found</Text>
          </Card>
        ) : (
          filtered.map(sv => {
            const catColor = CATEGORY_COLORS[sv.category ?? ''] ?? colors.slate400
            return (
              <Card key={sv.id} style={s.card}>
                <View style={s.topRow}>
                  <Text style={s.serviceName} numberOfLines={2}>{sv.name}</Text>
                  <View style={[s.catBadge, { backgroundColor: catColor + '22' }]}>
                    <Text style={[s.catText, { color: catColor }]}>{sv.category ?? '—'}</Text>
                  </View>
                </View>
                <View style={s.priceRow}>
                  {sv.discounted_price != null ? (
                    <>
                      <Text style={s.discountedPrice}>৳{sv.discounted_price.toLocaleString()}</Text>
                      <Text style={s.originalPrice}>৳{sv.price?.toLocaleString() ?? '—'}</Text>
                    </>
                  ) : sv.price != null ? (
                    <Text style={s.discountedPrice}>৳{sv.price.toLocaleString()}</Text>
                  ) : (
                    <Text style={s.customPrice}>Custom</Text>
                  )}
                  <Text style={s.updatedDate}>
                    {new Date(sv.updated_at ?? sv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  serviceName: { color: colors.white, fontWeight: '700', fontSize: 14, flex: 1, lineHeight: 20 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountedPrice: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  originalPrice: { color: colors.slate500, fontSize: 12, textDecorationLine: 'line-through' },
  customPrice: { color: colors.slate400, fontSize: 13, fontStyle: 'italic' },
  updatedDate: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
