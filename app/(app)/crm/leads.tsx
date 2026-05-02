import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TextInput, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Lead { id: string; name: string | null; email: string | null; phone: string | null; status: string; source: string | null; created_at: string }
const STATUS_COLORS: Record<string, string> = { new: colors.blue, contacted: colors.amber, qualified: colors.purple, converted: colors.green, lost: colors.red }

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeads = async () => {
    const { data } = await supabase.from('crm_leads').select('id,name,email,phone,status,source,created_at').order('created_at', { ascending: false }).limit(50)
    const rows = (data as Lead[]) ?? []
    setLeads(rows); setFiltered(rows); setLoading(false); setRefreshing(false)
  }

  useEffect(() => { fetchLeads() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? leads.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q)) : leads)
  }, [search, leads])
  const onRefresh = () => { setRefreshing(true); fetchLeads() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <TextInput style={s.search} placeholder="Search name, email, phone…" placeholderTextColor={colors.slate500} value={search} onChangeText={setSearch} />
        <Text style={s.count}>{filtered.length} leads</Text>
        {filtered.map(lead => (
          <Card key={lead.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.leadName}>{lead.name ?? 'Unknown'}</Text>
              <View style={[s.badge, { backgroundColor: (STATUS_COLORS[lead.status] ?? colors.slate400) + '22' }]}>
                <Text style={[s.badgeText, { color: STATUS_COLORS[lead.status] ?? colors.slate400 }]}>{lead.status}</Text>
              </View>
            </View>
            {lead.email && <Text style={s.detail}>{lead.email}</Text>}
            {lead.phone && <Text style={s.detail}>{lead.phone}</Text>}
            <View style={s.row}>
              {lead.source && <Text style={s.meta}>{lead.source}</Text>}
              <Text style={s.meta}>{new Date(lead.created_at).toLocaleDateString()}</Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  search: { backgroundColor: colors.navyLight, color: colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, marginBottom: 12, fontSize: 15 },
  count: { color: colors.slate400, fontSize: 13, marginBottom: 12 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  leadName: { color: colors.white, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  detail: { color: colors.slate400, fontSize: 12, marginBottom: 2 },
  meta: { color: colors.slate500, fontSize: 11, textTransform: 'capitalize' },
})
