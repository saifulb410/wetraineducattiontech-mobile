import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Product { id: string; name: string; category: string | null }

export default function StoreDashboard() {
  const { signOut } = useAuthContext()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data, count } = await supabase.from('store_products').select('id,name,category', { count: 'exact' }).order('name').limit(10)
    setProducts((data as Product[]) ?? []); setTotal(count ?? 0)
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

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
        <Text style={s.sectionTitle}>Products</Text>
        {products.map(p => (
          <Card key={p.id} style={s.productRow}>
            <Ionicons name="cube-outline" size={20} color={colors.gold} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={s.productName}>{p.name}</Text>
              {p.category && <Text style={s.productCat}>{p.category}</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold' },
  totalCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 24 },
  totalNum: { color: colors.gold, fontSize: 40, fontWeight: 'bold', marginTop: 8 },
  totalLabel: { color: colors.slate400, marginTop: 4 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productName: { color: colors.white, fontWeight: '600' },
  productCat: { color: colors.slate400, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
})
