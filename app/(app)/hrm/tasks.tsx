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

const CATEGORIES = [
  'Client Call', 'Follow Up', 'Meeting', 'Documentation',
  'Marketing', 'Sales', 'Training', 'Support', 'Other',
]

interface TaskReport {
  id: string
  task_title: string | null
  category: string | null
  notes: string | null
  submitted_at: string
  author_user_id: string | null
  profiles?: { full_name: string | null } | null
}

export default function Tasks() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.hrmRole === 'SUPER_ADMIN' || roles?.hrmRole === 'ADMIN'

  const [reports, setReports] = useState<TaskReport[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({ title: '', category: CATEGORIES[0], notes: '' })

  const fetchReports = async () => {
    if (!user) return
    if (isAdmin) {
      const { data } = await supabase
        .from('hrm_task_reports')
        .select('id,task_title,category,notes,submitted_at,author_user_id')
        .order('submitted_at', { ascending: false })
        .limit(50)
      const rows = (data as TaskReport[]) ?? []
      // Fetch profile names for the authors
      const authorIds = [...new Set(rows.map(r => r.author_user_id).filter(Boolean))]
      if (authorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id,full_name')
          .in('id', authorIds as string[])
        const profileMap: Record<string, string | null> = {}
        ;(profileData ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name })
        setReports(rows.map(r => ({ ...r, profiles: r.author_user_id ? { full_name: profileMap[r.author_user_id] ?? null } : null })))
      } else {
        setReports(rows)
      }
    } else {
      const { data } = await supabase
        .from('hrm_task_reports')
        .select('id,task_title,category,notes,submitted_at,author_user_id')
        .eq('author_user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(30)
      setReports((data as TaskReport[]) ?? [])
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchReports() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchReports() }

  const handleSubmit = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Task title is required.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('hrm_task_reports').insert({
      author_user_id: user!.id,
      task_title: form.title.trim(),
      category: form.category,
      notes: form.notes.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    setSubmitting(false)
    if (error) Alert.alert('Error', error.message)
    else {
      setForm({ title: '', category: CATEGORIES[0], notes: '' })
      setShowForm(false)
      fetchReports()
      Alert.alert('Submitted', 'Task report logged successfully.')
    }
  }

  if (loading) return <LoadingScreen />

  const CATEGORY_COLORS: Record<string, string> = {
    'Client Call': colors.blue, 'Follow Up': colors.amber, Meeting: colors.purple,
    Documentation: colors.slate400, Marketing: colors.green, Sales: colors.gold,
    Training: '#06b6d4', Support: colors.red, Other: colors.slate500,
  }

  return (
    <ScrollView
      style={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.pageTitle}>{isAdmin ? 'All Task Reports' : 'My Task Reports'}</Text>
            <Text style={s.pageSub}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(v => !v)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={22} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Add form */}
        {showForm && (
          <Card style={s.formCard}>
            <Text style={s.formTitle}>New Task Report</Text>

            <Text style={s.label}>Task Title *</Text>
            <TextInput
              style={s.input}
              placeholder="What did you work on?"
              placeholderTextColor={colors.slate500}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
            />

            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, form.category === cat && { backgroundColor: CATEGORY_COLORS[cat] ?? colors.gold, borderColor: CATEGORY_COLORS[cat] ?? colors.gold }]}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                >
                  <Text style={[s.chipText, form.category === cat && s.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.label, { marginTop: 12 }]}>Notes</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Additional details..."
              placeholderTextColor={colors.slate500}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              multiline
              textAlignVertical="top"
            />

            <Button title="Submit Report" onPress={handleSubmit} loading={submitting} />
          </Card>
        )}

        {/* Reports list */}
        {reports.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No task reports yet</Text>
            <Text style={s.emptyHint}>Tap + to log your first report</Text>
          </Card>
        ) : (
          reports.map(r => {
            const catColor = CATEGORY_COLORS[r.category ?? ''] ?? colors.slate500
            const displayTitle = r.task_title || 'Untitled'
            return (
              <Card key={r.id} style={s.reportCard}>
                <View style={s.reportTop}>
                  <View style={[s.catBadge, { backgroundColor: catColor + '22' }]}>
                    <Text style={[s.catText, { color: catColor }]}>{r.category ?? 'Other'}</Text>
                  </View>
                  <Text style={s.reportDate}>
                    {new Date(r.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </Text>
                </View>

                {isAdmin && r.profiles?.full_name && (
                  <View style={s.employeeRow}>
                    <Ionicons name="person-outline" size={12} color={colors.gold} />
                    <Text style={s.employeeName}>{r.profiles.full_name}</Text>
                  </View>
                )}

                <Text style={s.reportTitle}>{displayTitle}</Text>

                {r.notes ? (
                  <Text style={s.reportNotes} numberOfLines={2}>{r.notes}</Text>
                ) : null}
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: colors.gold, borderRadius: 10, padding: 8 },
  formCard: { marginBottom: 16 },
  formTitle: { color: colors.white, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navy, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 15, marginBottom: 14 },
  textArea: { minHeight: 80 },
  chipScroll: { marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.slate700, backgroundColor: colors.navyLight, marginRight: 6 },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  reportCard: { marginBottom: 10 },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 10, fontWeight: '700' },
  reportDate: { color: colors.slate500, fontSize: 11 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  employeeName: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  reportTitle: { color: colors.white, fontWeight: '600', fontSize: 14, marginBottom: 4 },
  reportNotes: { color: colors.slate400, fontSize: 12, lineHeight: 17 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  emptyHint: { color: colors.slate600, fontSize: 12 },
})
