import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, Alert, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface TaskReport {
  id: string
  content: string
  submitted_at: string
}

export default function Tasks() {
  const { user, roles } = useAuthContext()
  const [reports, setReports] = useState<TaskReport[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isEmployee = roles?.hrmRole === 'EMPLOYEE'

  const fetchReports = async () => {
    if (!user) return
    const { data } = await supabase
      .from('hrm_task_reports')
      .select('id, content, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(20)
    setReports((data as TaskReport[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchReports() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchReports() }

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please describe your tasks.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('hrm_task_reports').insert({
      user_id: user!.id,
      content: content.trim(),
      submitted_at: new Date().toISOString(),
    })
    setSubmitting(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setContent('')
      fetchReports()
      Alert.alert('Success', 'Task report submitted.')
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        {isEmployee && (
          <Card className="mb-6">
            <Text className="text-white font-bold text-base mb-3">Submit Task Report</Text>
            <TextInput
              className="bg-brand-navy text-white rounded-xl px-4 py-3 border border-slate-700 min-h-24 text-base"
              placeholder="Describe what you worked on today…"
              placeholderTextColor="#64748b"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <Button
              title="Submit Report"
              onPress={handleSubmit}
              loading={submitting}
              className="mt-3"
            />
          </Card>
        )}

        <Text className="text-white text-lg font-bold mb-3">Recent Reports</Text>
        {reports.length === 0 ? (
          <Card>
            <Text className="text-slate-400 text-center py-4">No reports submitted yet.</Text>
          </Card>
        ) : (
          reports.map(r => (
            <Card key={r.id} className="mb-3">
              <Text className="text-white text-sm mb-2">{r.content}</Text>
              <Text className="text-slate-500 text-xs">
                {new Date(r.submitted_at).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}
