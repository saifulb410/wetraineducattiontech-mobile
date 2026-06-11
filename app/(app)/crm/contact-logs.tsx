import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  TextInput, TouchableOpacity, StyleSheet, Alert, Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Log {
  id: string
  notes: string | null
  contact_type: string | null
  created_at: string
  crm_leads?: { name: string | null; phone: string | null } | null
  crm_users?: { full_name: string | null } | null
}

interface Lead { id: string; name: string | null; phone: string | null }

// New schema uses contact_type (default 'CALL') instead of type
const LOG_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'SMS', 'OTHER']
const TYPE_ICONS: Record<string, any> = {
  CALL: 'call-outline', EMAIL: 'mail-outline', WHATSAPP: 'logo-whatsapp',
  MEETING: 'people-outline', SMS: 'chatbubble-outline', OTHER: 'ellipsis-horizontal-outline',
}
const TYPE_COLORS: Record<string, string> = {
  CALL: colors.green, EMAIL: colors.blue, WHATSAPP: '#25D366',
  MEETING: colors.purple, SMS: colors.amber, OTHER: colors.slate400,
}

const typeLabel = (t: string | null) => {
  if (!t) return 'Other'
  return t.charAt(0) + t.slice(1).toLowerCase()
}

export default function ContactLogs() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [logs, setLogs] = useState<Log[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ lead_id: '', contact_type: 'CALL', notes: '' })
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showLeadPicker, setShowLeadPicker] = useState(false)

  const fetchData = async () => {
    let query = supabase
      .from('crm_contact_logs')
      .select('id,notes,contact_type,created_at,crm_leads(name,phone),crm_users(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!isAdmin && user) {
      query = query.eq('user_id', user.id)
    }

    const { data } = await query
    setLogs((data as Log[]) ?? [])

    // Fetch leads for picker — non-admin: filter by owner_id
    let leadsQuery = supabase.from('crm_leads').select('id,name,phone').order('created_at', { ascending: false }).limit(100)
    if (!isAdmin && user) leadsQuery = leadsQuery.eq('owner_id', user.id)
    const { data: leadsData } = await leadsQuery
    setLeads((leadsData as Lead[]) ?? [])

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = search
    ? logs.filter(l =>
        l.crm_leads?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.crm_leads?.phone?.includes(search) ||
        l.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  const handleSave = async () => {
    if (!form.lead_id) { Alert.alert('Error', 'Please select a lead.'); return }
    if (!form.notes.trim()) { Alert.alert('Error', 'Please enter notes.'); return }
    setSaving(true)
    const { error } = await supabase.from('crm_contact_logs').insert({
      lead_id: form.lead_id,
      user_id: user?.id,
      contact_type: form.contact_type,
      notes: form.notes.trim(),
    })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setShowModal(false)
      setForm({ lead_id: '', contact_type: 'CALL', notes: '' })
      setSelectedLead(null)
      fetchData()
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={s.container}>

          <View style={s.headerRow}>
            <View>
              <Text style={s.pageTitle}>Contact Logs</Text>
              <Text style={s.pageSub}>{filtered.length} interactions</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={20} color={colors.navy} />
              <Text style={s.addBtnText}>Log</Text>
            </TouchableOpacity>
          </View>

          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.slate400} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by lead or notes..."
              placeholderTextColor={colors.slate500}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {filtered.length === 0 ? (
            <Card style={s.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.slate600} />
              <Text style={s.emptyText}>No contact logs yet</Text>
            </Card>
          ) : (
            filtered.map(log => {
              const ct = (log.contact_type ?? 'OTHER').toUpperCase()
              const typeColor = TYPE_COLORS[ct] ?? colors.slate400
              const typeIcon = TYPE_ICONS[ct] ?? 'ellipsis-horizontal-outline'
              return (
                <Card key={log.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.typeIcon, { backgroundColor: typeColor + '22' }]}>
                      <Ionicons name={typeIcon} size={16} color={typeColor} />
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.leadName}>{log.crm_leads?.name ?? '—'}</Text>
                      <Text style={s.leadPhone}>{log.crm_leads?.phone ?? ''}</Text>
                    </View>
                    <Text style={s.logDate}>
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                  {log.notes ? <Text style={s.logNotes}>{log.notes}</Text> : null}
                  <View style={s.cardBottom}>
                    <View style={[s.typeBadge, { backgroundColor: typeColor + '18' }]}>
                      <Text style={[s.typeBadgeText, { color: typeColor }]}>{typeLabel(log.contact_type)}</Text>
                    </View>
                    {isAdmin && log.crm_users?.full_name ? (
                      <Text style={s.byText}>by {log.crm_users.full_name}</Text>
                    ) : null}
                    <Text style={s.timeText}>
                      {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </Card>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Add Log Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log Contact</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>

            {/* Lead Picker */}
            <Text style={s.label}>Lead *</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowLeadPicker(!showLeadPicker)}>
              <Text style={selectedLead ? s.pickerValue : s.pickerPlaceholder}>
                {selectedLead ? `${selectedLead.name} · ${selectedLead.phone}` : 'Select lead...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.slate400} />
            </TouchableOpacity>
            {showLeadPicker && (
              <ScrollView style={s.leadList} nestedScrollEnabled>
                {leads.map(l => (
                  <TouchableOpacity key={l.id} style={s.leadOption} onPress={() => {
                    setSelectedLead(l)
                    setForm({ ...form, lead_id: l.id })
                    setShowLeadPicker(false)
                  }}>
                    <Text style={s.leadOptName}>{l.name}</Text>
                    <Text style={s.leadOptPhone}>{l.phone}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Contact Type */}
            <Text style={s.label}>Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
              {LOG_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, form.contact_type === t && { backgroundColor: (TYPE_COLORS[t] ?? colors.gold), borderColor: TYPE_COLORS[t] ?? colors.gold }]}
                  onPress={() => setForm({ ...form, contact_type: t })}
                >
                  <Ionicons name={TYPE_ICONS[t]} size={13} color={form.contact_type === t ? colors.white : colors.slate400} />
                  <Text style={[s.typeChipText, form.contact_type === t && { color: colors.white }]}>{typeLabel(t)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Notes */}
            <Text style={s.label}>Notes *</Text>
            <TextInput
              style={s.notesInput}
              placeholder="What happened in this interaction..."
              placeholderTextColor={colors.slate500}
              value={form.notes}
              onChangeText={v => setForm({ ...form, notes: v })}
              multiline
              textAlignVertical="top"
            />

            <Button title="Save Log" onPress={handleSave} loading={saving} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: colors.navy, fontWeight: '700', fontSize: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.navyLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: colors.slate700,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  card: { marginBottom: 10, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  leadName: { color: colors.white, fontWeight: '600', fontSize: 14 },
  leadPhone: { color: colors.gold, fontSize: 12, marginTop: 1 },
  logDate: { color: colors.slate500, fontSize: 11 },
  logNotes: { color: colors.slate300, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  byText: { color: colors.slate500, fontSize: 11 },
  timeText: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, marginBottom: 4 },
  pickerValue: { color: colors.white, fontSize: 14 },
  pickerPlaceholder: { color: colors.slate500, fontSize: 14 },
  leadList: { maxHeight: 160, backgroundColor: colors.navy, borderRadius: 10, borderWidth: 1, borderColor: colors.slate700, marginBottom: 14 },
  leadOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44' },
  leadOptName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  leadOptPhone: { color: colors.gold, fontSize: 12 },
  typeRow: { marginBottom: 14 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  typeChipText: { color: colors.slate400, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  notesInput: { backgroundColor: colors.navy, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 14, minHeight: 90, marginBottom: 16 },
})
