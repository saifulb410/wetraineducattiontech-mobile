import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, Alert, RefreshControl, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface TaskReport { id: string; content: string; submitted_at: string }

export default function Tasks() {
  const { user, roles } = useAuthContext()
  const [reports, setReports] = useState<TaskReport[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReports = async () => {
    if (!user) return
    const { data } = await supabase.from('hrm_task_reports').select('id,content,submitted_at').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(20)
    setReports((data as TaskReport[]) ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { fetchReports() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchReports() }

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert('Error', 'Please describe your tasks.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('hrm_task_reports').insert({ user_id: user!.id, content: content.trim(), submitted_at: new Date().toISOString() })
    setSubmitting(false)
    if (error) Alert.alert('Error', error.message)
    else { setContent(''); fetchReports(); Alert.alert('Success', 'Task report submitted.') }
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {roles?.hrmRole === 'EMPLOYEE' && (
          <Card style={s.submitCard}>
            <Text style={s.submitTitle}>Submit Task Report</Text>
            <TextInput style={s.textArea} placeholder="Describe what you worked on today…" placeholderTextColor={colors.slate500} value={content} onChangeText={setContent} multiline textAlignVertical="top" />
            <Button title="Submit Report" onPress={handleSubmit} loading={submitting} />
          </Card>
        )}
        <Text style={s.sectionTitle}>Recent Reports</Text>
        {reports.length === 0
          ? <Card><Text style={s.empty}>No reports submitted yet.</Text></Card>
          : reports.map(r => (
            <Card key={r.id} style={s.reportCard}>
              <Text style={s.reportContent}>{r.content}</Text>
              <Text style={s.reportDate}>{new Date(r.submitted_at).toLocaleString()}</Text>
            </Card>
          ))}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  submitCard: { marginBottom: 24 },
  submitTitle: { color: colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  textArea: { backgroundColor: colors.navy, color: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.slate700, minHeight: 96, fontSize: 15, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  reportCard: { marginBottom: 12 },
  reportContent: { color: colors.white, fontSize: 14, marginBottom: 8 },
  reportDate: { color: colors.slate500, fontSize: 11 },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16 },
})
