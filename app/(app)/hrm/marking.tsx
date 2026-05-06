import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert, RefreshControl,
  StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Week { id: string; label: string | null; start_date: string; end_date: string; is_locked: boolean }
interface HrmUser { id: string; full_name: string | null; email: string | null; hrm_role: string }
interface Subject { id: string; name: string }
interface Submission { id: string; user_id: string; subject_id: string; marks: number | null; week_id: string }

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: colors.purple,
  ADMIN: colors.gold,
  EMPLOYEE: colors.blue,
}

export default function MarkingScreen() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.hrmRole === 'SUPER_ADMIN' || roles?.hrmRole === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [week, setWeek] = useState<Week | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [users, setUsers] = useState<HrmUser[]>([])
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])

  const [markingUser, setMarkingUser] = useState<HrmUser | null>(null)
  const [markInputs, setMarkInputs] = useState<Record<string, string>>({})

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
    setSubjects((subjectsData as Subject[]) ?? [])

    if (isAdmin) {
      const { data: usersData } = await supabase
        .from('hrm_users')
        .select('id,full_name,email,hrm_role')
        .order('full_name')
      setUsers((usersData as HrmUser[]) ?? [])

      if (weekData?.id) {
        const { data: subsData } = await supabase
          .from('hrm_kpi_submissions')
          .select('id,user_id,subject_id,marks,week_id')
          .eq('week_id', weekData.id)
        setAllSubmissions((subsData as Submission[]) ?? [])
      }
    } else {
      if (weekData?.id) {
        const { data: subsData } = await supabase
          .from('hrm_kpi_submissions')
          .select('id,user_id,subject_id,marks,week_id')
          .eq('user_id', user.id)
          .eq('week_id', weekData.id)
        setMySubmissions((subsData as Submission[]) ?? [])
      }
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const openMarkingModal = (u: HrmUser) => {
    const existing: Record<string, string> = {}
    allSubmissions.filter(s => s.user_id === u.id).forEach(s => {
      existing[s.subject_id] = String(s.marks ?? '')
    })
    setMarkInputs(existing)
    setMarkingUser(u)
  }

  const handleSaveMarks = async () => {
    if (!markingUser || !week || !user) return
    if (week.is_locked) { Alert.alert('Locked', 'This week is locked.'); return }

    const entries = subjects.map(s => ({
      user_id: markingUser.id,
      subject_id: s.id,
      week_id: week.id,
      marks: parseInt(markInputs[s.id] ?? '0') || 0,
      marked_by: user.id,
      submitted_at: new Date().toISOString(),
    }))

    setSaving(true)
    await supabase.from('hrm_kpi_submissions')
      .delete()
      .eq('user_id', markingUser.id)
      .eq('week_id', week.id)
    const { error } = await supabase.from('hrm_kpi_submissions').insert(entries)
    setSaving(false)

    if (error) Alert.alert('Error', error.message)
    else {
      Alert.alert('Saved', `Marks saved for ${markingUser.full_name}.`)
      setMarkingUser(null)
      fetchData()
    }
  }

  if (loading) return <LoadingScreen />

  // ─── Employee view ───
  if (!isAdmin) {
    const avg = mySubmissions.length > 0
      ? Math.round(mySubmissions.reduce((a, b) => a + (b.marks ?? 0), 0) / mySubmissions.length)
      : null
    const avgColor = avg != null
      ? avg >= 70 ? colors.green : avg >= 40 ? colors.amber : colors.red
      : colors.slate400

    return (
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>
          <Text style={s.pageTitle}>My KPI Scores</Text>
          <Text style={s.pageSub}>
            {week
              ? `Week: ${week.label ?? new Date(week.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
              : 'No active week'}
          </Text>

          {avg != null && (
            <Card style={s.avgCard}>
              <Text style={s.avgLabel}>Overall Average</Text>
              <Text style={[s.avgNum, { color: avgColor }]}>{avg}%</Text>
              <View style={s.avgBarWrap}>
                <View style={[s.avgBarFill, { width: `${avg}%` as any, backgroundColor: avgColor }]} />
              </View>
            </Card>
          )}

          {mySubmissions.length === 0 ? (
            <Card style={s.emptyCard}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.slate600} />
              <Text style={s.emptyText}>No scores yet</Text>
              <Text style={s.emptyHint}>Your admin hasn't marked your KPI this week yet.</Text>
            </Card>
          ) : (
            subjects
              .filter(sub => mySubmissions.some(ms => ms.subject_id === sub.id))
              .map(sub => {
                const ms = mySubmissions.find(m => m.subject_id === sub.id)
                const score = ms?.marks ?? 0
                const scoreColor = score >= 70 ? colors.green : score >= 40 ? colors.amber : colors.red
                return (
                  <Card key={sub.id} style={s.scoreCard}>
                    <View style={s.scoreRow}>
                      <Text style={s.scoreName}>{sub.name}</Text>
                      <Text style={[s.scoreVal, { color: scoreColor }]}>{score}/100</Text>
                    </View>
                    <View style={s.scoreBarWrap}>
                      <View style={[s.scoreBarFill, { width: `${score}%` as any, backgroundColor: scoreColor }]} />
                    </View>
                  </Card>
                )
              })
          )}
        </View>
      </ScrollView>
    )
  }

  // ─── Admin view ───
  const isLocked = week?.is_locked ?? false
  const getStatus = (uid: string) => {
    const count = allSubmissions.filter(s => s.user_id === uid).length
    if (count === 0) return 'pending'
    if (count >= subjects.length) return 'done'
    return 'partial'
  }

  const pendingCount = users.filter(u => getStatus(u.id) === 'pending').length

  return (
    <>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>
          {/* Week banner */}
          <Card style={s.weekCard}>
            <View style={s.weekRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.pageTitle}>Marking List</Text>
                <Text style={s.pageSub}>
                  {week
                    ? `${week.label ?? new Date(week.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} • ${users.length} people`
                    : 'No active week'}
                </Text>
              </View>
              {week && (
                <View style={[s.lockBadge, { backgroundColor: isLocked ? colors.red + '22' : colors.green + '22' }]}>
                  <Ionicons name={isLocked ? 'lock-closed' : 'lock-open'} size={13} color={isLocked ? colors.red : colors.green} />
                  <Text style={[s.lockText, { color: isLocked ? colors.red : colors.green }]}>
                    {isLocked ? 'Locked' : 'Open'}
                  </Text>
                </View>
              )}
            </View>
            {!isLocked && pendingCount > 0 && (
              <View style={s.pendingBanner}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.amber} />
                <Text style={s.pendingBannerText}>{pendingCount} employee{pendingCount > 1 ? 's' : ''} still pending</Text>
              </View>
            )}
          </Card>

          {users.length === 0 ? (
            <Card style={s.emptyCard}>
              <Ionicons name="people-outline" size={40} color={colors.slate600} />
              <Text style={s.emptyText}>No users in HRM system</Text>
            </Card>
          ) : (
            users.map(u => {
              const status = getStatus(u.id)
              const roleColor = ROLE_COLORS[u.hrm_role] ?? colors.slate400
              const userSubs = allSubmissions.filter(sub => sub.user_id === u.id)
              const avg = userSubs.length > 0
                ? Math.round(userSubs.reduce((a, b) => a + (b.marks ?? 0), 0) / userSubs.length)
                : null
              const avgColor = avg != null
                ? avg >= 70 ? colors.green : avg >= 40 ? colors.amber : colors.red
                : colors.slate400
              const initials = u.full_name
                ? u.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                : '??'
              const isDone = status === 'done'

              return (
                <Card key={u.id} style={s.userCard}>
                  <View style={s.userRow}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userName}>{u.full_name || '—'}</Text>
                      <Text style={s.userEmail} numberOfLines={1}>{u.email || '—'}</Text>
                    </View>
                    <View style={[s.rolePill, { backgroundColor: roleColor + '22' }]}>
                      <Text style={[s.roleText, { color: roleColor }]}>{u.hrm_role}</Text>
                    </View>
                  </View>

                  <View style={s.userFooter}>
                    <View style={s.statusRow}>
                      <View style={[s.statusDot, {
                        backgroundColor: isDone ? colors.green : status === 'partial' ? colors.amber : colors.slate600,
                      }]} />
                      <Text style={s.statusLabel}>
                        {isDone
                          ? `Marked (${userSubs.length}/${subjects.length})`
                          : status === 'partial'
                          ? `Partial (${userSubs.length}/${subjects.length})`
                          : 'Pending'}
                      </Text>
                      {avg != null && (
                        <Text style={[s.avgPill, { color: avgColor }]}>{avg}%</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[s.markBtn, { backgroundColor: isDone ? colors.navyLight : colors.gold, borderWidth: isDone ? 1 : 0, borderColor: colors.slate700 }]}
                      onPress={() => openMarkingModal(u)}
                    >
                      <Ionicons name={isDone ? 'create-outline' : 'add-circle-outline'} size={14} color={isDone ? colors.slate300 : colors.navy} />
                      <Text style={[s.markBtnText, { color: isDone ? colors.slate300 : colors.navy }]}>
                        {isLocked ? 'Locked' : isDone ? 'Edit' : 'Mark Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Marking modal */}
      <Modal visible={!!markingUser} animationType="slide" transparent onRequestClose={() => setMarkingUser(null)}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />

              <View style={s.sheetHeader}>
                <View>
                  <Text style={s.sheetTitle}>Mark KPI — {markingUser?.full_name}</Text>
                  <Text style={s.sheetSub}>{subjects.length} criteria • score 0–100 each</Text>
                </View>
                <TouchableOpacity onPress={() => setMarkingUser(null)}>
                  <Ionicons name="close-circle" size={26} color={colors.slate600} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {subjects.map((sub, idx) => {
                  const val = markInputs[sub.id] ?? ''
                  const numVal = parseInt(val)
                  const hasVal = val !== '' && !isNaN(numVal)
                  const barColor = hasVal
                    ? numVal >= 70 ? colors.green : numVal >= 40 ? colors.amber : colors.red
                    : colors.slate600
                  return (
                    <View key={sub.id} style={[s.criteriaRow, idx === subjects.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.criteriaName}>{sub.name}</Text>
                        {hasVal && (
                          <View style={s.criteriaMiniBar}>
                            <View style={[s.criteriaMiniBarFill, { width: `${numVal}%` as any, backgroundColor: barColor }]} />
                          </View>
                        )}
                      </View>
                      <View style={s.criteriaRight}>
                        <TextInput
                          style={[s.criteriaInput, { borderColor: hasVal ? barColor : colors.slate700, color: hasVal ? barColor : colors.white }]}
                          value={val}
                          onChangeText={v => {
                            const n = parseInt(v)
                            if (v === '' || (!isNaN(n) && n >= 0 && n <= 100))
                              setMarkInputs(prev => ({ ...prev, [sub.id]: v }))
                          }}
                          placeholder="—"
                          placeholderTextColor={colors.slate600}
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>
                  )
                })}
                <View style={{ height: 16 }} />
              </ScrollView>

              <View style={s.sheetFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setMarkingUser(null)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ flex: 2 }}>
                  <Button title="Save Marks" onPress={handleSaveMarks} loading={saving} />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  weekCard: { marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  lockText: { fontSize: 12, fontWeight: '700' },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.amber + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pendingBannerText: { color: colors.amber, fontSize: 12, fontWeight: '600' },
  userCard: { marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold + '22', borderWidth: 1.5, borderColor: colors.gold + '50', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  userName: { color: colors.white, fontWeight: '600', fontSize: 14 },
  userEmail: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  rolePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: '800' },
  userFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { color: colors.slate400, fontSize: 12 },
  avgPill: { fontSize: 12, fontWeight: '800' },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  markBtnText: { fontSize: 12, fontWeight: '700' },
  // Employee view
  avgCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  avgLabel: { color: colors.slate400, fontSize: 13, marginBottom: 4 },
  avgNum: { fontSize: 52, fontWeight: '900', marginBottom: 10 },
  avgBarWrap: { width: '100%', height: 8, backgroundColor: colors.slate700, borderRadius: 4, overflow: 'hidden' },
  avgBarFill: { height: 8, borderRadius: 4 },
  scoreCard: { marginBottom: 10 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  scoreName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  scoreVal: { fontSize: 13, fontWeight: '800' },
  scoreBarWrap: { height: 4, backgroundColor: colors.slate700, borderRadius: 2, overflow: 'hidden' },
  scoreBarFill: { height: 4, borderRadius: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  emptyHint: { color: colors.slate600, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  // Modal
  overlay: { flex: 1, backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.slate700, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  sheetTitle: { color: colors.white, fontWeight: '700', fontSize: 16 },
  sheetSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  sheetScroll: { paddingHorizontal: 20 },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '40' },
  criteriaName: { color: colors.white, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  criteriaMiniBar: { height: 3, backgroundColor: colors.slate700, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  criteriaMiniBarFill: { height: 3, borderRadius: 2 },
  criteriaRight: { alignItems: 'center' },
  criteriaInput: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 1, fontSize: 18, fontWeight: '800', width: 68, textAlign: 'center' },
  sheetFooter: { flexDirection: 'row', gap: 10, padding: 20, paddingTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.slate700 },
  cancelText: { color: colors.slate400, fontWeight: '600' },
})
