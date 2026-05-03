import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Lead {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status: string
  source: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: colors.blue,
  contacted: colors.amber,
  qualified: colors.purple,
  converted: colors.green,
  lost: colors.red,
}

export default function LeadDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchLead()
  }, [id])

  const fetchLead = async () => {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', id as string)
      .maybeSingle()

    if (error) {
      Alert.alert('Error', 'Failed to load lead')
      router.back()
      return
    }

    setLead(data as Lead)
    setLoading(false)
  }

  const updateStatus = async (newStatus: string) => {
    if (!lead) return
    setUpdating(true)
    const { error } = await supabase
      .from('crm_leads')
      .update({ status: newStatus })
      .eq('id', lead.id)

    setUpdating(false)
    if (error) {
      Alert.alert('Error', 'Failed to update status')
    } else {
      setLead({ ...lead, status: newStatus })
      Alert.alert('Success', `Lead status updated to ${newStatus}`)
    }
  }

  if (loading) return <LoadingScreen />
  if (!lead) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <Text style={s.title}>{lead.name || 'Lead'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Card */}
        <Card style={s.statusCard}>
          <View style={s.statusHeader}>
            <Text style={s.statusLabel}>Current Status</Text>
            <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[lead.status] ?? colors.slate400) + '22' }]}>
              <Text style={[s.statusBadgeText, { color: STATUS_COLORS[lead.status] ?? colors.slate400 }]}>
                {lead.status}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statusScroll}>
            {(['new', 'contacted', 'qualified', 'converted', 'lost'] as const).map(st => (
              <TouchableOpacity
                key={st}
                disabled={updating}
                onPress={() => updateStatus(st)}
                style={[
                  styles.statusBtn,
                  lead.status === st && { backgroundColor: STATUS_COLORS[st], opacity: 1 },
                ]}
              >
                <Text style={[styles.statusBtnText, lead.status === st && { color: colors.navy }]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Contact Info */}
        <Card style={s.infoCard}>
          <Text style={s.infoTitle}>Contact Information</Text>

          {lead.email && (
            <View style={s.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{lead.email}</Text>
              </View>
            </View>
          )}

          {lead.phone && (
            <View style={s.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Phone</Text>
                <Text style={s.infoValue}>{lead.phone}</Text>
              </View>
            </View>
          )}

          {lead.source && (
            <View style={s.infoRow}>
              <Ionicons name="link-outline" size={18} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Source</Text>
                <Text style={s.infoValue}>{lead.source}</Text>
              </View>
            </View>
          )}

          <View style={s.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Created</Text>
              <Text style={s.infoValue}>{new Date(lead.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View style={s.actions}>
          {lead.email && (
            <Button
              title="Send Email"
              onPress={() => Linking.openURL(`mailto:${lead.email}`)}
              variant="outline"
            />
          )}
          {lead.phone && (
            <Button
              title="Call"
              onPress={() => Linking.openURL(`tel:${lead.phone}`)}
              variant="outline"
            />
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 8 },
  title: { color: colors.white, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  statusCard: { marginBottom: 16 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusLabel: { color: colors.slate400, fontSize: 14 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  statusScroll: { gap: 8 },
  infoCard: { marginBottom: 16 },
  infoTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  infoContent: { flex: 1 },
  infoLabel: { color: colors.slate400, fontSize: 12 },
  infoValue: { color: colors.white, fontSize: 14, marginTop: 4 },
  actions: { gap: 8 },
})

const styles = StyleSheet.create({
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8, backgroundColor: colors.navyLight, opacity: 0.6 },
  statusBtnText: { color: colors.slate300, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
})
