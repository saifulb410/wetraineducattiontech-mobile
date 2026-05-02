import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface HrmUser {
  hrm_role: string
  full_name: string | null
}

interface Week {
  id: string
  label: string | null
  start_date: string
  end_date: string
  is_locked: boolean
}

export default function HrmDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const [hrmUser, setHrmUser] = useState<HrmUser | null>(null)
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    const [userRes, weekRes, taskRes] = await Promise.all([
      supabase
        .from('hrm_users')
        .select('hrm_role, full_name')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('hrm_weeks')
        .select('id, label, start_date, end_date, is_locked')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('hrm_task_reports')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id),
    ])
    setHrmUser(userRes.data)
    setCurrentWeek(weekRes.data)
    setTaskCount(taskRes.count ?? 0)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm">HRM Portal</Text>
            <Text className="text-white text-xl font-bold">
              {hrmUser?.full_name ?? user?.email ?? 'Employee'}
            </Text>
            <Text className="text-brand-gold text-xs mt-0.5 capitalize">
              {hrmUser?.hrm_role?.replace('_', ' ') ?? roles?.hrmRole ?? ''}
            </Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" className="px-2" />
        </View>

        {currentWeek && (
          <Card className="mb-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-white font-bold">Current Week</Text>
              <View className={`rounded-full px-2 py-0.5 ${currentWeek.is_locked ? 'bg-red-900' : 'bg-green-900'}`}>
                <Text className={`text-xs font-semibold ${currentWeek.is_locked ? 'text-red-400' : 'text-green-400'}`}>
                  {currentWeek.is_locked ? 'Locked' : 'Open'}
                </Text>
              </View>
            </View>
            <Text className="text-slate-400 text-sm mt-1">
              {new Date(currentWeek.start_date).toLocaleDateString()} –{' '}
              {new Date(currentWeek.end_date).toLocaleDateString()}
            </Text>
            {currentWeek.label && (
              <Text className="text-brand-gold text-xs mt-1">{currentWeek.label}</Text>
            )}
          </Card>
        )}

        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 items-center py-4">
            <Text className="text-brand-gold text-2xl font-bold">{taskCount}</Text>
            <Text className="text-slate-400 text-xs mt-1">Reports Submitted</Text>
          </Card>
        </View>

        <Card>
          <Text className="text-slate-400 text-center text-sm py-2">
            Go to Tasks tab to submit or review task reports.
          </Text>
        </Card>
      </View>
    </ScrollView>
  )
}
