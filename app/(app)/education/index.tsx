import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface Profile {
  full_name: string | null
  role: string
}

interface Order {
  id: string
  status: string
  created_at: string
  services?: { name: string }[] | null
}

export default function EducationDashboard() {
  const { user, signOut } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    const [profileRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
      supabase
        .from('orders')
        .select('id, status, created_at, services(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    setProfile(profileRes.data)
    setOrders((ordersRes.data as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  const statusColor: Record<string, string> = {
    completed: '#22c55e',
    pending: '#f59e0b',
    cancelled: '#ef4444',
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm">Welcome back,</Text>
            <Text className="text-white text-xl font-bold">
              {profile?.full_name ?? user?.email ?? 'Student'}
            </Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" className="px-2" />
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 items-center py-4">
            <Text className="text-brand-gold text-2xl font-bold">{orders.length}</Text>
            <Text className="text-slate-400 text-xs mt-1">Enrollments</Text>
          </Card>
          <Card className="flex-1 items-center py-4">
            <Text className="text-brand-gold text-2xl font-bold">
              {orders.filter(o => o.status === 'completed').length}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Completed</Text>
          </Card>
        </View>

        {/* Recent Orders */}
        <Text className="text-white text-lg font-bold mb-3">Recent Enrollments</Text>
        {orders.length === 0 ? (
          <Card>
            <Text className="text-slate-400 text-center py-4">No enrollments yet.</Text>
          </Card>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="mb-3">
              <Text className="text-white font-semibold mb-1">
                {order.services?.[0]?.name ?? 'Service'}
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-400 text-xs">
                  {new Date(order.created_at).toLocaleDateString()}
                </Text>
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: statusColor[order.status] + '22' }}
                >
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{ color: statusColor[order.status] ?? '#94a3b8' }}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}
