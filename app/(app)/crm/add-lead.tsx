import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors } from '@/lib/theme'

const SOURCES = ['website', 'referral', 'social_media', 'email', 'phone', 'walk_in', 'other']
const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost']

export default function AddLead() {
  const { roles } = useAuthContext()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    notes: '',
  })

  if (!roles?.canAccessCrmAdmin) {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.gold} />
        <Text style={s.noAccess}>Admin access required to add leads.</Text>
      </View>
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('crm_leads').insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source,
      status: form.status,
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Lead added successfully.', [
        { text: 'Add Another', onPress: () => setForm({ name: '', email: '', phone: '', source: 'website', status: 'new', notes: '' }) },
        { text: 'View Leads', onPress: () => router.replace('/(app)/crm/leads' as any) },
      ])
    }
  }

  return (
    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.container}>
        <Card style={s.formCard}>
          <Text style={s.sectionTitle}>Lead Information</Text>

          <Text style={s.label}>Full Name *</Text>
          <TextInput
            style={s.input}
            placeholder="Enter lead name"
            placeholderTextColor={colors.slate500}
            value={form.name}
            onChangeText={v => setForm({ ...form, name: v })}
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="email@example.com"
            placeholderTextColor={colors.slate500}
            value={form.email}
            onChangeText={v => setForm({ ...form, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            placeholder="+1 234 567 8900"
            placeholderTextColor={colors.slate500}
            value={form.phone}
            onChangeText={v => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
          />
        </Card>

        <Card style={s.formCard}>
          <Text style={s.sectionTitle}>Lead Details</Text>

          <Text style={s.label}>Status</Text>
          <View style={s.chipRow}>
            {STATUSES.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.chip, form.status === st && s.chipActive]}
                onPress={() => setForm({ ...form, status: st })}
              >
                <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Source</Text>
          <View style={s.chipRow}>
            {SOURCES.map(src => (
              <TouchableOpacity
                key={src}
                style={[s.chip, form.source === src && s.chipActive]}
                onPress={() => setForm({ ...form, source: src })}
              >
                <Text style={[s.chipText, form.source === src && s.chipTextActive]}>{src.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Notes</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Any additional notes..."
            placeholderTextColor={colors.slate500}
            value={form.notes}
            onChangeText={v => setForm({ ...form, notes: v })}
            multiline
            textAlignVertical="top"
          />
        </Card>

        <Button title="Add Lead" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess: { color: colors.slate400, fontSize: 15, marginTop: 12, textAlign: 'center' },
  formCard: { marginBottom: 16 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navy, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 15, marginBottom: 16 },
  textArea: { minHeight: 80 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.slate700, backgroundColor: colors.navyLight },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: colors.navy },
})
