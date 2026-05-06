import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, ScrollView,
  Alert, StyleSheet, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors } from '@/lib/theme'

const SOURCES = ['ADMIN', 'website', 'referral', 'social_media', 'phone', 'walk_in', 'other']
const STATUSES = ['new', 'contacted', 'interested', 'no_response', 'sold', 'qualified']

interface Marketer { id: string; full_name: string | null; email: string | null }

export default function AddLead() {
  const { user, roles } = useAuthContext()
  const router = useRouter()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [saving, setSaving] = useState(false)
  const [marketers, setMarketers] = useState<Marketer[]>([])
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(null)
  const [showMarketerPicker, setShowMarketerPicker] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    source: 'ADMIN', status: 'new', notes: '',
  })

  useEffect(() => {
    if (isAdmin) {
      supabase.from('crm_users').select('id,full_name,email').neq('crm_role', 'ADMIN').then(({ data }) => {
        setMarketers((data as Marketer[]) ?? [])
      })
    }
  }, [isAdmin])

  // MARKETER: submit lead request
  const handleRequestLead = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Lead name is required.'); return }
    if (!form.phone.trim()) { Alert.alert('Error', 'Phone is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('crm_lead_requests').insert({
      requester_id: user?.id,
      lead_name: form.name.trim(),
      phone: form.phone.trim(),
      source: form.source,
      status: 'pending',
    })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Submitted', 'Your lead request has been sent to admin for approval.', [
        { text: 'OK', onPress: () => setForm({ name: '', phone: '', email: '', source: 'ADMIN', status: 'new', notes: '' }) },
      ])
    }
  }

  // ADMIN: add lead directly
  const handleAddLead = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('crm_leads').insert({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      source: form.source,
      status: form.status,
      notes: form.notes.trim() || null,
      assigned_to: selectedMarketer?.id ?? null,
    })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Lead Added', `Lead assigned to ${selectedMarketer?.full_name ?? 'unassigned'}.`, [
        { text: 'Add Another', onPress: () => { setForm({ name: '', phone: '', email: '', source: 'ADMIN', status: 'new', notes: '' }); setSelectedMarketer(null) } },
        { text: 'View Leads', onPress: () => router.replace('/(app)/crm/leads' as any) },
      ])
    }
  }

  return (
    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.container}>

        {/* Role header */}
        <View style={s.roleHeader}>
          <View style={[s.roleIcon, { backgroundColor: isAdmin ? colors.gold + '22' : colors.blue + '22' }]}>
            <Ionicons name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'} size={20} color={isAdmin ? colors.gold : colors.blue} />
          </View>
          <View>
            <Text style={s.roleTitle}>{isAdmin ? 'Add New Lead' : 'Request a Lead'}</Text>
            <Text style={s.roleSub}>{isAdmin ? 'Direct lead creation with marketer assignment' : 'Submit for admin approval'}</Text>
          </View>
        </View>

        <Card style={s.formCard}>
          <Text style={s.sectionTitle}>Lead Information</Text>

          <Text style={s.label}>Full Name *</Text>
          <TextInput style={s.input} placeholder="Lead full name" placeholderTextColor={colors.slate500} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />

          <Text style={s.label}>Phone Number *</Text>
          <TextInput style={s.input} placeholder="8801XXXXXXXXX" placeholderTextColor={colors.slate500} value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} keyboardType="phone-pad" />

          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="email@example.com" placeholderTextColor={colors.slate500} value={form.email} onChangeText={v => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />

          <Text style={s.label}>Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {SOURCES.map(src => (
              <TouchableOpacity key={src} style={[s.chip, form.source === src && s.chipActive]} onPress={() => setForm({ ...form, source: src })}>
                <Text style={[s.chipText, form.source === src && s.chipTextActive]}>{src.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Admin-only: status + marketer assignment */}
        {isAdmin && (
          <Card style={s.formCard}>
            <Text style={s.sectionTitle}>Admin Options</Text>

            <Text style={s.label}>Status</Text>
            <View style={s.chipRow}>
              {STATUSES.map(st => (
                <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => setForm({ ...form, status: st })}>
                  <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Assign to Marketer</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowMarketerPicker(!showMarketerPicker)}>
              <View style={s.pickerLeft}>
                <Ionicons name="person-circle-outline" size={18} color={selectedMarketer ? colors.gold : colors.slate400} />
                <Text style={selectedMarketer ? s.pickerValue : s.pickerPlaceholder}>
                  {selectedMarketer ? selectedMarketer.full_name : 'Unassigned'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.slate400} />
            </TouchableOpacity>
            {showMarketerPicker && (
              <View style={s.pickerList}>
                <TouchableOpacity style={s.pickerOption} onPress={() => { setSelectedMarketer(null); setShowMarketerPicker(false) }}>
                  <Text style={s.pickerOptName}>Unassigned</Text>
                </TouchableOpacity>
                {marketers.map(m => (
                  <TouchableOpacity key={m.id} style={s.pickerOption} onPress={() => { setSelectedMarketer(m); setShowMarketerPicker(false) }}>
                    <Text style={s.pickerOptName}>{m.full_name}</Text>
                    <Text style={s.pickerOptEmail}>{m.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[s.label, { marginTop: 16 }]}>Notes</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Any notes about this lead..." placeholderTextColor={colors.slate500} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline textAlignVertical="top" />
          </Card>
        )}

        <Button
          title={isAdmin ? 'Add Lead' : 'Submit Request'}
          onPress={isAdmin ? handleAddLead : handleRequestLead}
          loading={saving}
        />
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, padding: 14, backgroundColor: colors.navyLight, borderRadius: 12, borderWidth: 1, borderColor: colors.slate700 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  roleSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  formCard: { marginBottom: 16 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navy, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 15, marginBottom: 14 },
  textArea: { minHeight: 80 },
  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.slate700, backgroundColor: colors.navyLight, marginRight: 6, marginBottom: 4 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: colors.navy },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700 },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerValue: { color: colors.white, fontSize: 14 },
  pickerPlaceholder: { color: colors.slate500, fontSize: 14 },
  pickerList: { backgroundColor: colors.navy, borderRadius: 10, borderWidth: 1, borderColor: colors.slate700, marginTop: 4 },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44' },
  pickerOptName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  pickerOptEmail: { color: colors.slate400, fontSize: 12, marginTop: 2 },
})
