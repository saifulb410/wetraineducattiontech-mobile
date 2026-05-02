import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

const STATUS_COLORS: Record<string, string> = { new: colors.blue, contacted: colors.amber, qualified: colors.purple, converted: colors.green, lost: colors.red }

export default function CrmDashboard() {
  const { roles, signOut } = useAuthContext()
  const [stats, setStats] = useState<{ status: string; count: number }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    const { data } = await supabase.from('crm_leads').select('status')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1 })
      setStats(Object.entries(counts).map(([status, count]) => ({ status, count })))
      setTotal(data.length)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchStats() }, [])
  const onRefresh = () => { setRefreshing(true); fetchStats() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.header}>
          <View>
            <Text style={s.sub}>CRM Dashboard</Text>
            <Text style={s.role}>{roles?.crmRole ?? 'Agent'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>
        <Card style={s.totalCard}>
          <Text style={s.totalNum}>{total}</Text>
          <Text style={s.totalLabel}>Total Leads</Text>
        </Card>
        <Text style={s.sectionTitle}>Leads by Status</Text>
        {stats.map(({ status, count }) => (
          <Card key={status} style={s.statRow}>
            <View style={[s.dot, { backgroundColor: STATUS_COLORS[status] ?? colors.slate400 }]} />
            <Text style={s.statusText}>{status}</Text>
            <Text style={s.countText}>{count}</Text>
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
  sub: { color: colors.slate400, fontSize: 13 },
  role: { color: colors.white, fontSize: 20, fontWeight: 'bold', textTransform: 'capitalize' },
  totalCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 24 },
  totalNum: { color: colors.gold, fontSize: 48, fontWeight: 'bold' },
  totalLabel: { color: colors.slate400, marginTop: 4 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  statusText: { color: colors.white, textTransform: 'capitalize', fontWeight: '500', flex: 1 },
  countText: { color: colors.gold, fontWeight: 'bold', fontSize: 18 },
})
