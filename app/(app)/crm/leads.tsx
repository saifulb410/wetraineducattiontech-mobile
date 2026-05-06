import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  TextInput, TouchableOpacity, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Lead {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  status: string
  source: string | null
  notes: string | null
  created_at: string
  assigned_to: string | null
  crm_users?: { full_name: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  new: colors.slate400,
  contacted: colors.blue,
  interested: colors.amber,
  no_response: colors.red,
  sold: colors.green,
  qualified: colors.purple,
  converted: colors.green,
  lost: colors.red,
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  no_response: 'No Response', sold: 'Sold', qualified: 'Qualified',
  converted: 'Converted', lost: 'Lost',
}

const ALL_FILTERS = ['All', 'new', 'contacted', 'interested', 'no_response', 'sold', 'qualified', 'lost']

export default function Leads() {
  const router = useRouter()
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [all, setAll] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeads = async () => {
    let query = supabase
      .from('crm_leads')
      .select('id,name,phone,email,status,source,notes,created_at,assigned_to,crm_users!assigned_to(full_name)')
      .order('created_at', { ascending: false })

    if (!isAdmin && user) {
      query = query.eq('assigned_to', user.id)
    }

    const { data } = await query
    const rows = (data as Lead[]) ?? []
    setAll(rows)
    setFiltered(rows)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchLeads() }, [user])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(all.filter(l => {
      const matchStatus = statusFilter === 'All' || l.status === statusFilter
      const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q)
      return matchStatus && matchSearch
    }))
  }, [search, statusFilter, all])

  const onRefresh = () => { setRefreshing(true); fetchLeads() }
  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, phone, email..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.slate400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {ALL_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[s.chip, statusFilter === f && s.chipActive]}
            >
              <Text style={[s.chipText, statusFilter === f && s.chipTextActive]}>
                {f === 'All' ? 'All' : (STATUS_LABELS[f] ?? f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.count}>{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="people-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No leads found</Text>
          </Card>
        ) : (
          filtered.map(lead => (
            <TouchableOpacity key={lead.id} onPress={() => router.push(`/(app)/crm/leads/${lead.id}` as any)} activeOpacity={0.8}>
              <Card style={s.card}>
                <View style={s.topRow}>
                  <View style={s.nameWrap}>
                    <Text style={s.phone}>{lead.phone ?? '—'}</Text>
                    <Text style={s.name}>{lead.name ?? 'Unknown'}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLORS[lead.status] ?? colors.slate400) + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLORS[lead.status] ?? colors.slate400 }]}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </Text>
                  </View>
                </View>

                {lead.notes ? (
                  <Text style={s.notes} numberOfLines={1}>{lead.notes}</Text>
                ) : null}

                <View style={s.metaRow}>
                  {lead.source ? (
                    <View style={s.sourceBadge}>
                      <Text style={s.sourceTxt}>{lead.source}</Text>
                    </View>
                  ) : null}
                  {isAdmin && lead.crm_users?.full_name ? (
                    <View style={s.ownerBadge}>
                      <Ionicons name="person-outline" size={10} color={colors.gold} />
                      <Text style={s.ownerTxt}>{lead.crm_users.full_name}</Text>
                    </View>
                  ) : null}
                  <Text style={s.date}>{new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.navyLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10, borderWidth: 1, borderColor: colors.slate700,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  filterRow: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.navyLight, borderWidth: 1,
    borderColor: colors.slate700, marginRight: 8,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  count: { color: colors.slate400, fontSize: 12, marginBottom: 10 },
  card: { marginBottom: 10, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  nameWrap: { flex: 1, marginRight: 8 },
  phone: { color: colors.gold, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  name: { color: colors.white, fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  notes: { color: colors.slate400, fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sourceBadge: { backgroundColor: colors.slate700 + '80', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  sourceTxt: { color: colors.slate400, fontSize: 10, fontWeight: '600' },
  ownerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.gold + '18', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  ownerTxt: { color: colors.gold, fontSize: 10, fontWeight: '600' },
  date: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
