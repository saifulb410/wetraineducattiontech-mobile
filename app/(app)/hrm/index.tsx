import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Week { id: string; label: string | null; start_date: string; end_date: string; is_locked: boolean }
interface KpiSubject { id: string; name: string }
interface KpiSubmission { id: string; subject_id: string; submitted_at: string }

export default function HrmDashboard() {
  const { user, roles, signOut } = useAuthContext()
  const router = useRouter()

  const isAdmin = roles?.hrmRole === 'SUPER_ADMIN' || roles?.hrmRole === 'ADMIN'
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear] = useState(now.getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fullName, setFullName] = useState<string | null>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [totalAssigned, setTotalAssigned] = useState(0)
  const [submitted, setSubmitted] = useState(0)
  const [pending, setPending] = useState(0)
  const [taskCount, setTaskCount] = useState(0)

  const fetchData = async () => {
    if (!user) return

    const [userRes, weekRes] = await Promise.all([
      supabase.from('hrm_users').select('full_name').eq('id', user.id).maybeSingle(),
      supabase.from('hrm_weeks').select('id,label,start_date,end_date,is_locked').order('start_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    setFullName(userRes.data?.full_name ?? null)
    setWeek(weekRes.data)

    // KPI subjects & submissions
    const [subjectsRes, submissionsRes, taskRes] = await Promise.all([
      supabase.from('hrm_kpi_subjects').select('id,name'),
      supabase.from('hrm_kpi_submissions').select('id,subject_id,submitted_at').eq('user_id', user.id),
      supabase.from('hrm_task_reports').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])

    const subjects = (subjectsRes.data as KpiSubject[]) ?? []
    const subs = (submissionsRes.data as KpiSubmission[]) ?? []
    setTotalAssigned(subjects.length)
    setSubmitted(subs.length)
    setPending(Math.max(subjects.length - subs.length, 0))
    setTaskCount(taskRes.count ?? 0)

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user, selectedMonth])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.pageTitle}>{isAdmin ? 'Admin Dashboard' : 'My KPI Dashboard'}</Text>
            <Text style={s.pageSub}>Weekly KPI marking and submission tracking</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {/* Week Information */}
        <Card style={s.weekCard}>
          <View style={s.weekHeader}>
            <View style={s.weekTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.gold} />
              <Text style={s.weekTitle}>Week Information</Text>
            </View>
            {/* Month Picker */}
            <TouchableOpacity style={s.monthBtn} onPress={() => setShowMonthPicker(!showMonthPicker)}>
              <Text style={s.monthText}>{MONTHS[selectedMonth]} {selectedYear}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.gold} />
            </TouchableOpacity>
          </View>

          {showMonthPicker && (
            <View style={s.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity key={m} style={[s.monthChip, selectedMonth === i && s.monthChipActive]} onPress={() => { setSelectedMonth(i); setShowMonthPicker(false) }}>
                  <Text style={[s.monthChipText, selectedMonth === i && s.monthChipTextActive]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {week ? (
            <>
              <Text style={s.weekDate}>
                {new Date(week.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <View style={[s.weekBadge, { backgroundColor: week.is_locked ? '#7f1d1d' : '#14532d' }]}>
                <Ionicons name={week.is_locked ? 'lock-closed-outline' : 'lock-open-outline'} size={13} color={week.is_locked ? colors.red : colors.green} />
                <Text style={[s.weekBadgeText, { color: week.is_locked ? colors.red : colors.green }]}>
                  {week.is_locked ? 'Locked' : 'Open'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={s.noWeek}>No week configured yet.</Text>
          )}
        </Card>

        {/* KPI Stats */}
        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <View style={s.statIconRow}>
              <Ionicons name="time-outline" size={20} color={colors.slate400} />
            </View>
            <Text style={s.statNum}>{totalAssigned}</Text>
            <Text style={s.statLabel}>Total Assigned</Text>
            <Text style={s.statSub}>Subjects to mark this week</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.green} />
            </View>
            <Text style={[s.statNum, { color: colors.green }]}>{submitted}</Text>
            <Text style={s.statLabel}>Submitted</Text>
            <Text style={s.statSub}>Completed submissions</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconRow}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.amber} />
            </View>
            <Text style={[s.statNum, { color: colors.amber }]}>{pending}</Text>
            <Text style={s.statLabel}>Pending</Text>
            <Text style={s.statSub}>Awaiting your marks</Text>
          </Card>
        </View>

        {/* Task Reporting */}
        <Card style={s.taskCard}>
          <View style={s.taskHeader}>
            <View>
              <View style={s.taskTitleRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.gold} />
                <Text style={s.taskTitle}>Task Reporting</Text>
              </View>
              <Text style={s.taskSub}>Log your own regular tasks and review entries from employees assigned to you.</Text>
            </View>
          </View>
          <Button title="Open Task Reporting" onPress={() => router.push('/(app)/hrm/tasks' as any)} variant="secondary" />
        </Card>

        {/* Pending Action Button */}
        {pending > 0 && (
          <TouchableOpacity style={s.pendingBtn}>
            <Text style={s.pendingBtnText}>Complete {pending} Pending Mark(s)</Text>
          </TouchableOpacity>
        )}

        {/* Task Reports Count */}
        <Card style={s.reportCountCard}>
          <Text style={s.statNum}>{taskCount}</Text>
          <Text style={s.statLabel}>Total Reports Submitted</Text>
        </Card>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 13, marginTop: 2 },
  weekCard: { marginBottom: 16 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.slate700 },
  monthText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  monthChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.slate700 },
  monthChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  monthChipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  monthChipTextActive: { color: colors.navy },
  weekDate: { color: colors.white, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  weekBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  weekBadgeText: { fontSize: 12, fontWeight: '700' },
  noWeek: { color: colors.slate400, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statIconRow: { marginBottom: 6 },
  statNum: { color: colors.white, fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  statLabel: { color: colors.white, fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statSub: { color: colors.slate500, fontSize: 10, textAlign: 'center', marginTop: 2 },
  taskCard: { marginBottom: 16 },
  taskHeader: { marginBottom: 12 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  taskTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  taskSub: { color: colors.slate400, fontSize: 12, lineHeight: 18 },
  pendingBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  pendingBtnText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  reportCountCard: { alignItems: 'center', paddingVertical: 20 },
})
