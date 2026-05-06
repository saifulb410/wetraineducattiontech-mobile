import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Week { id: string; label: string | null; start_date: string; end_date: string; is_locked: boolean }
interface Subject { id: string; name: string }
interface Submission { id: string; subject_id: string; marks: number | null; week_id: string; user_id: string; hrm_users?: { full_name: string | null } | null }

export default function KpiScreen() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.hrmRole === 'SUPER_ADMIN' || roles?.hrmRole === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [week, setWeek] = useState<Week | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [marks, setMarks] = useState<Record<string, string>>({})

  const fetchData = async () => {
    if (!user) return

    const { data: weekData } = await supabase
      .from('hrm_weeks')
      .select('id,label,start_date,end_date,is_locked')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setWeek(weekData)

    const { data: subjectsData } = await supabase
      .from('hrm_kpi_subjects')
      .select('id,name')
      .order('name')
    const subjectsList = (subjectsData as Subject[]) ?? []
    setSubjects(subjectsList)

    if (weekData?.id) {
      if (isAdmin) {
        const { data: allSubs } = await supabase
          .from('hrm_kpi_submissions')
          .select('id,subject_id,marks,week_id,user_id,hrm_users(full_name)')
          .eq('week_id', weekData.id)
          .order('user_id')
        setAllSubmissions((allSubs as Submission[]) ?? [])
      } else {
        const { data: mySubs } = await supabase
          .from('hrm_kpi_submissions')
          .select('id,subject_id,marks,week_id,user_id')
          .eq('user_id', user.id)
          .eq('week_id', weekData.id)
        const list = (mySubs as Submission[]) ?? []
        setMySubmissions(list)
        const marksInit: Record<string, string> = {}
        list.forEach(s => { marksInit[s.subject_id] = String(s.marks ?? '') })
        setMarks(marksInit)
      }
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleSubmitAll = async () => {
    if (!week || !user) return
    if (week.is_locked) { Alert.alert('Week Locked', 'This week is locked. Submission is closed.'); return }
    if (subjects.length === 0) return

    const entries = subjects.map(s => ({
      user_id: user.id,
      subject_id: s.id,
      week_id: week.id,
      marks: parseInt(marks[s.id] ?? '0') || 0,
      submitted_at: new Date().toISOString(),
    }))

    setSubmitting(true)
    await supabase.from('hrm_kpi_submissions').delete().eq('user_id', user.id).eq('week_id', week.id)
    const { error } = await supabase.from('hrm_kpi_submissions').insert(entries)
    setSubmitting(false)

    if (error) Alert.alert('Error', error.message)
    else { Alert.alert('Success', 'KPI marks submitted!'); fetchData() }
  }

  if (loading) return <LoadingScreen />

  if (isAdmin) {
    const byEmployee: Record<string, { name: string; subs: Submission[] }> = {}
    allSubmissions.forEach(s => {
      const name = s.hrm_users?.full_name ?? s.user_id.slice(0, 8)
      if (!byEmployee[s.user_id]) byEmployee[s.user_id] = { name, subs: [] }
      byEmployee[s.user_id].subs.push(s)
    })
    const employees = Object.entries(byEmployee)

    return (
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>
          <Text style={s.pageTitle}>KPI Overview</Text>
          <Text style={s.pageSub}>
            {week ? `Week: ${week.label ?? new Date(week.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}` : 'No active week'}
          </Text>

          {employees.length === 0 ? (
            <Card style={s.emptyCard}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.slate600} />
              <Text style={s.emptyText}>No KPI submissions yet</Text>
            </Card>
          ) : employees.map(([uid, { name, subs }]) => {
            const avg = subs.length > 0 ? Math.round(subs.reduce((a, b) => a + (b.marks ?? 0), 0) / subs.length) : 0
            const avgColor = avg >= 70 ? colors.green : avg >= 40 ? colors.amber : colors.red
            return (
              <Card key={uid} style={s.empCard}>
                <View style={s.empRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{name}</Text>
                    <Text style={s.empSub}>{subs.length} subjects marked</Text>
                  </View>
                  <View style={[s.scoreBadge, { backgroundColor: avgColor + '22' }]}>
                    <Text style={[s.scoreText, { color: avgColor }]}>{avg}%</Text>
                  </View>
                </View>
                {subs.map(sub => {
                  const subj = subjects.find(x => x.id === sub.subject_id)
                  return (
                    <View key={sub.id} style={s.subRow}>
                      <Text style={s.subName}>{subj?.name ?? '—'}</Text>
                      <Text style={s.subMarks}>{sub.marks ?? 0}/100</Text>
                    </View>
                  )
                })}
              </Card>
            )
          })}
        </View>
      </ScrollView>
    )
  }

  // Employee view
  const isLocked = week?.is_locked ?? false
  const submittedCount = subjects.filter(s => mySubmissions.some(sub => sub.subject_id === s.id)).length

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <Card style={s.weekCard}>
          <View style={s.weekRow}>
            <View>
              <Text style={s.pageTitle}>My KPI Marks</Text>
              <Text style={s.pageSub}>
                {week ? `Week: ${week.label ?? new Date(week.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : 'No active week'}
              </Text>
            </View>
            {week && (
              <View style={[s.lockBadge, { backgroundColor: isLocked ? colors.red + '22' : colors.green + '22' }]}>
                <Ionicons name={isLocked ? 'lock-closed' : 'lock-open'} size={14} color={isLocked ? colors.red : colors.green} />
                <Text style={[s.lockText, { color: isLocked ? colors.red : colors.green }]}>
                  {isLocked ? 'Locked' : 'Open'}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.progressLabel}>{submittedCount}/{subjects.length} subjects marked</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${subjects.length > 0 ? (submittedCount / subjects.length) * 100 : 0}%` as any }]} />
          </View>
        </Card>

        {subjects.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No KPI subjects assigned yet</Text>
          </Card>
        ) : (
          <>
            {subjects.map(subject => {
              const val = marks[subject.id] ?? ''
              const numVal = parseInt(val)
              const hasVal = val !== '' && !isNaN(numVal)
              const barColor = hasVal ? (numVal >= 70 ? colors.green : numVal >= 40 ? colors.amber : colors.red) : colors.slate400
              const isSubmitted = mySubmissions.some(sub => sub.subject_id === subject.id)
              return (
                <Card key={subject.id} style={s.subjectCard}>
                  <View style={s.subjectTop}>
                    <Text style={s.subjectName}>{subject.name}</Text>
                    {isSubmitted && (
                      <View style={s.submittedBadge}>
                        <Text style={s.submittedText}>Submitted</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.inputRow}>
                    <TextInput
                      style={[s.marksInput, { borderColor: hasVal ? barColor : colors.slate700, color: hasVal ? barColor : colors.white }]}
                      value={val}
                      onChangeText={v => {
                        const n = parseInt(v)
                        if (v === '' || (!isNaN(n) && n >= 0 && n <= 100))
                          setMarks(prev => ({ ...prev, [subject.id]: v }))
                      }}
                      placeholder="0–100"
                      placeholderTextColor={colors.slate500}
                      keyboardType="number-pad"
                      maxLength={3}
                      editable={!isLocked}
                    />
                    <View style={s.scoreWrap}>
                      <Text style={[s.scoreDisplay, { color: hasVal ? barColor : colors.slate500 }]}>
                        {val ? `${val}/100` : '—'}
                      </Text>
                      {hasVal && (
                        <View style={s.miniBar}>
                          <View style={[s.miniBarFill, { width: `${numVal}%` as any, backgroundColor: barColor }]} />
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              )
            })}

            <Button
              title={isLocked ? 'Week is Locked' : 'Submit All KPI Marks'}
              onPress={isLocked ? () => Alert.alert('Locked', 'This week is locked.') : handleSubmitAll}
              loading={submitting}
            />
          </>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  weekCard: { marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  lockText: { fontSize: 12, fontWeight: '700' },
  progressLabel: { color: colors.slate400, fontSize: 12, marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: colors.slate700, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.gold, borderRadius: 3 },
  subjectCard: { marginBottom: 10 },
  subjectTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectName: { color: colors.white, fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 },
  submittedBadge: { backgroundColor: colors.green + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  submittedText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marksInput: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, fontSize: 20, fontWeight: '800', width: 80, textAlign: 'center' },
  scoreWrap: { flex: 1 },
  scoreDisplay: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  miniBar: { height: 4, backgroundColor: colors.slate700, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: 4, borderRadius: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  // Admin styles
  empCard: { marginBottom: 12 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold + '22', borderWidth: 1.5, borderColor: colors.gold + '50', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  empName: { color: colors.white, fontWeight: '600', fontSize: 14 },
  empSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 16, fontWeight: '800' },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.slate700 + '40' },
  subName: { color: colors.slate300, fontSize: 12 },
  subMarks: { color: colors.white, fontSize: 12, fontWeight: '600' },
})
