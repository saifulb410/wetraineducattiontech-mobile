import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface LeadStats {
  status: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  converted: '#22c55e',
  lost: '#ef4444',
}

export default function CrmDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const [stats, setStats] = useState<LeadStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    const { data } = await supabase
      .from('crm_leads')
      .select('status')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(row => {
        counts[row.status] = (counts[row.status] ?? 0) + 1
      })
      const statsArr = Object.entries(counts).map(([status, count]) => ({ status, count }))
      setStats(statsArr)
      setTotal(data.length)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchStats() }, [])
  const onRefresh = () => { setRefreshing(true); fetchStats() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm">CRM Dashboard</Text>
            <Text className="text-white text-xl font-bold capitalize">
              {roles?.crmRole?.toLowerCase() ?? 'Agent'}
            </Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" className="px-2" />
        </View>

        <Card className="mb-6 items-center py-5">
          <Text className="text-brand-gold text-5xl font-bold">{total}</Text>
          <Text className="text-slate-400 mt-1">Total Leads</Text>
        </Card>

        <Text className="text-white text-lg font-bold mb-3">Leads by Status</Text>
        {stats.map(({ status, count }) => (
          <Card key={status} className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] ?? '#94a3b8' }}
              />
              <Text className="text-white capitalize font-medium">{status}</Text>
            </View>
            <Text className="text-brand-gold font-bold text-lg">{count}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}
