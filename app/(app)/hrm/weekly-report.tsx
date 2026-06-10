import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { colors } from '@/lib/theme'

interface Week { id: string; label: string | null; start_date: string; end_date: string }

const REPORT_TYPES = [
  { key: 'BD_STAFF',  label: 'BD Staff',  sub: 'With KPI tracking' },
  { key: 'BD_LEADER', label: 'BD Leader', sub: 'No KPI required'   },
] as const

const MARKETS  = ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', 'Rajshahi', 'Other']
const REGIONS  = ['North', 'South', 'East', 'West', 'Central']

export default function WeeklyReport() {
  const router = useRouter()
  const { user } = useAuthContext()

  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [reportType, setReportType] = useState<'BD_STAFF' | 'BD_LEADER'>('BD_STAFF')
  const [employeeId, setEmployeeId] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [market, setMarket] = useState('')
  const [region, setRegion] = useState('')
  const [keyAchievements, setKeyAchievements] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingWeeks, setLoadingWeeks] = useState(true)
  const [showMarketPicker, setShowMarketPicker] = useState(false)
  const [showRegionPicker, setShowRegionPicker] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const [weeksRes, userRes] = await Promise.all([
        supabase.from('hrm_weeks').select('id,label,start_date,end_date').order('start_date', { ascending: false }).limit(4),
        supabase.from('hrm_users').select('full_name,employee_id').eq('id', user.id).maybeSingle(),
      ])
      const w = (weeksRes.data as Week[]) ?? []
      setWeeks(w)
      if (w.length > 0) setSelectedWeekId(w[0].id)
      if (userRes.data?.full_name) setFullName(userRes.data.full_name)
      if (userRes.data?.employee_id) setEmployeeId(userRes.data.employee_id)
      setLoadingWeeks(false)
    }
    load()
  }, [user])

  const weekLabel = (w: Week, index: number) => {
    if (index === 0) return 'Current Week'
    if (index === 1) return 'Last Week'
    return `${index} Weeks Ago`
  }

  const handleSubmit = async () => {
    if (!selectedWeekId) return Alert.alert('Error', 'Please select a reporting week.')
    if (!fullName.trim()) return Alert.alert('Error', 'Full name is required.')
    if (!roleTitle.trim()) return Alert.alert('Error', 'Role / Title is required.')
    if (!keyAchievements.trim()) return Alert.alert('Error', 'Key Achievements cannot be empty.')

    setSubmitting(true)
    const { error } = await supabase.from('hrm_weekly_reports').insert({
      user_id: user!.id,
      week_id: selectedWeekId,
      report_type: reportType,
      employee_id: employeeId.trim() || null,
      full_name: fullName.trim(),
      role_title: roleTitle.trim(),
      market: market.trim() || null,
      region: region.trim() || null,
      key_achievements: keyAchievements.trim(),
    })
    setSubmitting(false)

    if (error) {
      Alert.alert('Submit Failed', error.message)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <View style={s.successContainer}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={colors.green} />
        </View>
        <Text style={s.successTitle}>Report Submitted!</Text>
        <Text style={s.successSub}>Your weekly report has been recorded successfully.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
          <Text style={s.doneBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

      {/* Report Type */}
      <Text style={s.sectionLabel}>REPORT TYPE</Text>
      <View style={s.typeRow}>
        {REPORT_TYPES.map(rt => (
          <TouchableOpacity
            key={rt.key}
            style={[s.typeCard, reportType === rt.key && s.typeCardActive]}
            onPress={() => setReportType(rt.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={rt.key === 'BD_STAFF' ? 'person-outline' : 'briefcase-outline'}
              size={20}
              color={reportType === rt.key ? colors.navy : colors.gold}
            />
            <Text style={[s.typeLabel, reportType === rt.key && s.typeLabelActive]}>{rt.label}</Text>
            <Text style={[s.typeSub, reportType === rt.key && s.typeSubActive]}>{rt.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reporting Week */}
      <Text style={s.sectionLabel}>REPORTING WEEK</Text>
      {loadingWeeks ? (
        <ActivityIndicator color={colors.gold} style={{ marginBottom: 16 }} />
      ) : weeks.length === 0 ? (
        <Card style={s.noWeekCard}>
          <Text style={s.noWeekText}>No weeks configured. Contact admin.</Text>
        </Card>
      ) : (
        <View style={s.weekList}>
          {weeks.map((w, i) => (
            <TouchableOpacity
              key={w.id}
              style={[s.weekChip, selectedWeekId === w.id && s.weekChipActive]}
              onPress={() => setSelectedWeekId(w.id)}
            >
              <Text style={[s.weekChipLabel, selectedWeekId === w.id && s.weekChipLabelActive]}>
                {weekLabel(w, i)}
              </Text>
              <Text style={[s.weekChipDate, selectedWeekId === w.id && s.weekChipDateActive]}>
                {new Date(w.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                {' – '}
                {new Date(w.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Personal Information */}
      <Text style={s.sectionLabel}>PERSONAL INFORMATION</Text>
      <Card style={s.formCard}>
        <View style={s.field}>
          <Text style={s.label}>Employee ID</Text>
          <TextInput
            style={s.input}
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="e.g. WMT-001"
            placeholderTextColor={colors.slate600}
          />
        </View>
        <View style={s.divider} />
        <View style={s.field}>
          <Text style={s.label}>Full Name *</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.slate600}
          />
        </View>
        <View style={s.divider} />
        <View style={s.field}>
          <Text style={s.label}>Role / Title *</Text>
          <TextInput
            style={s.input}
            value={roleTitle}
            onChangeText={setRoleTitle}
            placeholder="e.g. Business Developer"
            placeholderTextColor={colors.slate600}
          />
        </View>
        <View style={s.divider} />
        {/* Market picker */}
        <View style={s.field}>
          <Text style={s.label}>Market</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => { setShowMarketPicker(v => !v); setShowRegionPicker(false) }}>
            <Text style={[s.pickerText, !market && s.pickerPlaceholder]}>{market || 'Select market'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.slate400} />
          </TouchableOpacity>
          {showMarketPicker && (
            <View style={s.dropdownList}>
              {MARKETS.map(m => (
                <TouchableOpacity key={m} style={s.dropdownItem} onPress={() => { setMarket(m); setShowMarketPicker(false) }}>
                  <Text style={[s.dropdownText, market === m && s.dropdownTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={s.divider} />
        {/* Region picker */}
        <View style={s.field}>
          <Text style={s.label}>Region</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => { setShowRegionPicker(v => !v); setShowMarketPicker(false) }}>
            <Text style={[s.pickerText, !region && s.pickerPlaceholder]}>{region || 'Select region'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.slate400} />
          </TouchableOpacity>
          {showRegionPicker && (
            <View style={s.dropdownList}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r} style={s.dropdownItem} onPress={() => { setRegion(r); setShowRegionPicker(false) }}>
                  <Text style={[s.dropdownText, region === r && s.dropdownTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Card>

      {/* Key Achievements */}
      <Text style={s.sectionLabel}>KEY ACHIEVEMENTS *</Text>
      <Card style={s.achieveCard}>
        <TextInput
          style={s.textarea}
          value={keyAchievements}
          onChangeText={setKeyAchievements}
          placeholder={"Describe your key achievements this week...\n\n• Achievement 1\n• Achievement 2"}
          placeholderTextColor={colors.slate600}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </Card>

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, submitting && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color={colors.navy} size="small" />
        ) : (
          <>
            <Ionicons name="send-outline" size={18} color={colors.navy} />
            <Text style={s.submitText}>Submit Weekly Report</Text>
          </>
        )}
      </TouchableOpacity>

    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 48 },
  sectionLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 6 },

  // Report type
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeCard: { flex: 1, backgroundColor: colors.navyLight, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.slate700 + '60' },
  typeCardActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  typeLabelActive: { color: colors.navy },
  typeSub: { color: colors.slate500, fontSize: 10, textAlign: 'center' },
  typeSubActive: { color: colors.navy + 'bb' },

  // Week
  weekList: { marginBottom: 20, gap: 8 },
  weekChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.navyLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700 },
  weekChipActive: { backgroundColor: colors.gold + '22', borderColor: colors.gold },
  weekChipLabel: { color: colors.white, fontSize: 13, fontWeight: '700' },
  weekChipLabelActive: { color: colors.gold },
  weekChipDate: { color: colors.slate500, fontSize: 11 },
  weekChipDateActive: { color: colors.gold + 'cc' },
  noWeekCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 20 },
  noWeekText: { color: colors.slate400, fontSize: 13 },

  // Form
  formCard: { marginBottom: 20, padding: 0, overflow: 'hidden' },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { color: colors.slate400, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input: { color: colors.white, fontSize: 14, paddingVertical: 0 },
  divider: { height: 1, backgroundColor: colors.slate700 + '55' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { color: colors.white, fontSize: 14 },
  pickerPlaceholder: { color: colors.slate600 },
  dropdownList: { marginTop: 8, backgroundColor: colors.navy, borderRadius: 10, borderWidth: 1, borderColor: colors.slate700, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '55' },
  dropdownText: { color: colors.slate300, fontSize: 13 },
  dropdownTextActive: { color: colors.gold, fontWeight: '700' },

  // Achievements
  achieveCard: { marginBottom: 24, padding: 14 },
  textarea: { color: colors.white, fontSize: 13, lineHeight: 22, minHeight: 130 },

  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.navy, fontSize: 16, fontWeight: '800' },

  // Success
  successContainer: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { marginBottom: 20 },
  successTitle: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  successSub: { color: colors.slate400, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: colors.navy, fontSize: 15, fontWeight: '800' },
})
