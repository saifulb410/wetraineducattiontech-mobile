import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, RefreshControl, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Product { id: string; name: string; category: string | null; price?: number | null; description?: string | null }

export default function StoreDashboard() {
  const { signOut } = useAuthContext()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const fetchData = async () => {
    const { data, count } = await supabase
      .from('store_products')
      .select('id,name,category,price,description', { count: 'exact' })
      .order('name')
    setProducts((data as Product[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean) as string[]
    return ['All', ...Array.from(new Set(cats)).sort()]
  }, [products])

  const filtered = useMemo(() => {
    let list = products
    if (selectedCategory && selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
    }
    return list
  }, [products, search, selectedCategory])

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Store</Text>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        <Card style={s.totalCard}>
          <Ionicons name="storefront" size={32} color={colors.gold} />
          <Text style={s.totalNum}>{total}</Text>
          <Text style={s.totalLabel}>Total Products</Text>
        </Card>

        <TextInput
          style={s.search}
          placeholder="Search products…"
          placeholderTextColor={colors.slate500}
          value={search}
          onChangeText={setSearch}
        />

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catChip, (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && s.catChipActive]}
                onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
              >
                <Text style={[s.catChipText, (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && s.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.titleRow}>
          <Text style={s.sectionTitle}>Products</Text>
          <Text style={s.countText}>{filtered.length}</Text>
        </View>

        {filtered.length === 0
          ? <Card><Text style={s.empty}>No products found.</Text></Card>
          : filtered.map(p => (
            <Card key={p.id} style={s.productRow}>
              <Ionicons name="cube-outline" size={22} color={colors.gold} />
              <View style={s.productInfo}>
                <Text style={s.productName}>{p.name}</Text>
                {p.category && <Text style={s.productCat}>{p.category}</Text>}
                {p.description && <Text style={s.productDesc} numberOfLines={2}>{p.description}</Text>}
              </View>
              {p.price != null && (
                <Text style={s.price}>${p.price}</Text>
              )}
            </Card>
          ))}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold' },
  totalCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  totalNum: { color: colors.gold, fontSize: 40, fontWeight: 'bold', marginTop: 8 },
  totalLabel: { color: colors.slate400, marginTop: 4 },
  search: { backgroundColor: colors.navyLight, color: colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, marginBottom: 12, fontSize: 15 },
  catScroll: { marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.slate700, backgroundColor: colors.navyLight, marginRight: 8 },
  catChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  catChipText: { color: colors.slate400, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  catChipTextActive: { color: colors.navy },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
  countText: { color: colors.gold, fontWeight: 'bold' },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  productInfo: { flex: 1 },
  productName: { color: colors.white, fontWeight: '600', fontSize: 15 },
  productCat: { color: colors.slate400, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  productDesc: { color: colors.slate500, fontSize: 12, marginTop: 4 },
  price: { color: colors.gold, fontWeight: 'bold', fontSize: 15 },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16 },
})
