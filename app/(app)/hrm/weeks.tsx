import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

// New schema: week_key (text), friday_date (date), status (OPEN | CLOSED)
interface Week {
  id: string
  week_key: string
  friday_date: string
  status: string
  // derived
  label: string
  start_date: string
  end_date: string
  is_locked: boolean
}

function deriveWeek(raw: any): Week {
  const friday = new Date(raw.friday_date)
  const monday = new Date(friday)
  monday.setDate(friday.getDate() - 4)
  return {
    id: raw.id,
    week_key: raw.week_key,
    friday_date: raw.friday_date,
    status: raw.status,
    label: raw.week_key,
    start_date: monday.toISOString().slice(0, 10),
    end_date: raw.friday_date,
    is_locked: raw.status !== 'OPEN',
  }
}

export default function HrmWeeks() {
  const router = useRouter()
  const { roles } = useAuthContext()
  const isAdmin = roles?.hrmRole === 'SUPER_ADMIN' || roles?.hrmRole === 'ADMIN'

  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  // form: week_key (label) and friday_date (YYYY-MM-DD, the end of the week)
  const [form, setForm] = useState({ week_key: '', friday_date: '' })

  const fetchWeeks = async () => {
    const { data } = await supabase
      .from('hrm_weeks')
      .select('id,week_key,friday_date,status')
      .order('friday_date', { ascending: false })
    setWeeks(((data ?? []) as any[]).map(deriveWeek))
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchWeeks() }, [])
  const onRefresh = () => { setRefreshing(true); fetchWeeks() }

  const toggleLock = async (w: Week) => {
    setToggling(w.id)
    const newStatus = w.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    const { error } = await supabase.from('hrm_weeks').update({ status: newStatus }).eq('id', w.id)
    setToggling(null)
    if (error) Alert.alert('Error', error.message)
    else setWeeks(prev => prev.map(x => x.id === w.id ? deriveWeek({ ...x, status: newStatus }) : x))
  }

  const handleAdd = async () => {
    if (!form.week_key.trim()) {
      Alert.alert('Error', 'Week key / label is required (e.g. "W22-2026").')
      return
    }
    if (!form.friday_date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.friday_date.trim())) {
      Alert.alert('Error', 'Friday date is required in YYYY-MM-DD format.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('hrm_weeks').insert({
      week_key: form.week_key.trim(),
      friday_date: form.friday_date.trim(),
      status: 'OPEN',
    })
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else {
      setShowAdd(false)
      setForm({ week_key: '', friday_date: '' })
      fetchWeeks()
    }
  }

  if (!isAdmin) {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.gold} />
        <Text style={s.noAccess}>Admin access required.</Text>
      </View>
    )
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Week Management</Text>
            <Text style={s.pageSub}>{weeks.length} weeks configured</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(v => !v)}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={22} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {showAdd && (
          <Card style={s.addForm}>
            <Text style={s.formTitle}>Create New Week</Text>

            <Text style={s.label}>Week Key / Label *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. W22-2026 or Week 22"
              placeholderTextColor={colors.slate500}
              value={form.week_key}
              onChangeText={v => setForm(f => ({ ...f, week_key: v }))}
            />

            <Text style={s.label}>Friday Date * (end of week)</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.slate500}
              value={form.friday_date}
              onChangeText={v => setForm(f => ({ ...f, friday_date: v }))}
            />
            <Text style={s.hint}>The week span Monday–Friday will be computed automatically.</Text>

            <View style={s.formBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button title="Create Week" onPress={handleAdd} loading={saving} />
            </View>
          </Card>
        )}

        {weeks.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No weeks created yet</Text>
            <Text style={s.emptyHint}>Tap + above to create the first week</Text>
          </Card>
        ) : (
          weeks.map(w => {
            const isLocked = w.is_locked
            const start = new Date(w.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
            const end = new Date(w.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
            return (
              <Card key={w.id} style={s.weekCard}>
                <View style={s.weekTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.weekLabel}>{w.label}</Text>
                    <Text style={s.weekDates}>{start} — {end}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.lockBtn, {
                      backgroundColor: isLocked ? colors.red + '22' : colors.green + '22',
                      borderColor: isLocked ? colors.red + '44' : colors.green + '44',
                    }]}
                    onPress={() => toggleLock(w)}
                    disabled={toggling === w.id}
                  >
                    <Ionicons name={isLocked ? 'lock-closed' : 'lock-open'} size={14} color={isLocked ? colors.red : colors.green} />
                    <Text style={[s.lockText, { color: isLocked ? colors.red : colors.green }]}>
                      {toggling === w.id ? '...' : isLocked ? 'Locked' : 'Open'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noAccess: { color: colors.slate400, fontSize: 15, marginTop: 12, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: colors.gold, borderRadius: 10, padding: 8 },
  addForm: { marginBottom: 16 },
  formTitle: { color: colors.white, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navy, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 15, marginBottom: 14 },
  hint: { color: colors.slate500, fontSize: 11, marginTop: -10, marginBottom: 14 },
  formBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.slate700 },
  cancelText: { color: colors.slate400, fontWeight: '600' },
  weekCard: { marginBottom: 10 },
  weekTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekLabel: { color: colors.white, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  weekDates: { color: colors.slate400, fontSize: 12 },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  lockText: { fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  emptyHint: { color: colors.slate600, fontSize: 12 },
})
