import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Week { id: string; label: string | null; start_date: string; end_date: string; is_locked: boolean }

export default function HrmDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const [fullName, setFullName] = useState<string | null>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    const [userRes, weekRes, taskRes] = await Promise.all([
      supabase.from('hrm_users').select('full_name').eq('id', user.id).maybeSingle(),
      supabase.from('hrm_weeks').select('id,label,start_date,end_date,is_locked').order('start_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('hrm_task_reports').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])
    setFullName(userRes.data?.full_name ?? null)
    setWeek(weekRes.data)
    setTaskCount(taskRes.count ?? 0)
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.header}>
          <View>
            <Text style={s.sub}>HRM Portal</Text>
            <Text style={s.name}>{fullName ?? user?.email ?? 'Employee'}</Text>
            <Text style={s.role}>{roles?.hrmRole?.replace('_', ' ') ?? ''}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {week && (
          <Card style={s.weekCard}>
            <View style={s.row}>
              <Text style={s.weekTitle}>Current Week</Text>
              <View style={[s.badge, { backgroundColor: week.is_locked ? '#7f1d1d' : '#14532d' }]}>
                <Text style={[s.badgeText, { color: week.is_locked ? colors.red : colors.green }]}>{week.is_locked ? 'Locked' : 'Open'}</Text>
              </View>
            </View>
            <Text style={s.weekDates}>{new Date(week.start_date).toLocaleDateString()} – {new Date(week.end_date).toLocaleDateString()}</Text>
            {week.label && <Text style={s.weekLabel}>{week.label}</Text>}
          </Card>
        )}

        <Card style={s.statCard}>
          <Text style={s.statNum}>{taskCount}</Text>
          <Text style={s.statLabel}>Reports Submitted</Text>
        </Card>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  sub: { color: colors.slate400, fontSize: 13 },
  name: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  role: { color: colors.gold, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  weekCard: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekTitle: { color: colors.white, fontWeight: 'bold' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  weekDates: { color: colors.slate400, fontSize: 13 },
  weekLabel: { color: colors.gold, fontSize: 12, marginTop: 4 },
  statCard: { alignItems: 'center', paddingVertical: 24 },
  statNum: { color: colors.gold, fontSize: 40, fontWeight: 'bold' },
  statLabel: { color: colors.slate400, marginTop: 4 },
})
