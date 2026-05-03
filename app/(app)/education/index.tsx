import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Order {
  id: string
  status: string
  created_at: string
  services?: { name: string }[] | null
}

const STATUS_COLOR: Record<string, string> = {
  completed: colors.green,
  pending: colors.amber,
  cancelled: colors.red,
}

export default function EducationDashboard() {
  const { user, signOut } = useAuthContext()
  const [name, setName] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    const [profileRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      supabase.from('orders').select('id,status,created_at,services(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setName(profileRes.data?.full_name ?? null)
    setOrders((ordersRes.data as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.row}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.name}>{name ?? user?.email ?? 'Student'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{orders.length}</Text>
            <Text style={s.statLabel}>Enrollments</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{orders.filter(o => o.status === 'completed').length}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{orders.filter(o => o.status === 'pending').length}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </Card>
        </View>

        <Text style={s.sectionTitle}>All Enrollments</Text>
        {orders.length === 0
          ? <Card><Text style={s.empty}>No enrollments yet.</Text></Card>
          : orders.map(o => (
            <Card key={o.id} style={s.orderCard}>
              <Text style={s.orderName}>{o.services?.[0]?.name ?? 'Service'}</Text>
              <View style={s.row}>
                <Text style={s.date}>{new Date(o.created_at).toLocaleDateString()}</Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLOR[o.status] ?? colors.slate400) + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[o.status] ?? colors.slate400 }]}>{o.status}</Text>
                </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: colors.slate400, fontSize: 13 },
  name: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statNum: { color: colors.gold, fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: colors.slate400, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  orderCard: { marginBottom: 12 },
  orderName: { color: colors.white, fontWeight: '600', marginBottom: 8 },
  date: { color: colors.slate400, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16 },
})
