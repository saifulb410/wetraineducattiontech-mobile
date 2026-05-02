import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface Product {
  id: string
  name: string
  category: string | null
}

export default function StoreDashboard() {
  const { signOut } = useAuthContext()
  const [products, setProducts] = useState<Product[]>([])
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data, count } = await supabase
      .from('store_products')
      .select('id, name, category', { count: 'exact' })
      .order('name')
      .limit(10)
    setProducts((data as Product[]) ?? [])
    setProductCount(count ?? 0)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-2xl font-bold">Store</Text>
          <Button title="Sign Out" onPress={signOut} variant="ghost" className="px-2" />
        </View>

        <Card className="mb-6 items-center py-5">
          <Ionicons name="storefront" size={32} color="#D4AF37" />
          <Text className="text-brand-gold text-4xl font-bold mt-2">{productCount}</Text>
          <Text className="text-slate-400 mt-1">Total Products</Text>
        </Card>

        <Text className="text-white text-lg font-bold mb-3">Products</Text>
        {products.map(p => (
          <Card key={p.id} className="mb-3 flex-row items-center">
            <Ionicons name="cube-outline" size={20} color="#D4AF37" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-white font-semibold">{p.name}</Text>
              {p.category && (
                <Text className="text-slate-400 text-xs mt-0.5 capitalize">{p.category}</Text>
              )}
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}
