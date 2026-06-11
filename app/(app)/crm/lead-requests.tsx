import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

// lead_payload is jsonb: { lead_name, phone, source }
interface LeadRequest {
  id: string
  lead_payload: { lead_name?: string; phone?: string; source?: string } | null
  status: string
  created_at: string
  requester_id: string | null
  profiles?: { full_name: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.amber,
  APPROVED: colors.green,
  DECLINED: colors.red,
}

const FILTERS = ['All', 'PENDING', 'APPROVED', 'DECLINED']

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export default function LeadRequests() {
  const router = useRouter()
  const { roles } = useAuthContext()
  const isAdmin = roles?.crmRole === 'ADMIN'

  const [all, setAll] = useState<LeadRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = async () => {
    const { data } = await supabase
      .from('crm_lead_requests')
      .select('id,lead_payload,status,created_at,requester_id')
      .order('created_at', { ascending: false })

    const rows = (data as LeadRequest[]) ?? []
    // Fetch requester profiles
    const requesterIds = [...new Set(rows.map(r => r.requester_id).filter(Boolean))] as string[]
    if (requesterIds.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id,full_name').in('id', requesterIds)
      const profileMap: Record<string, string | null> = {}
      ;(profileData ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name })
      setAll(rows.map(r => ({
        ...r,
        profiles: r.requester_id ? { full_name: profileMap[r.requester_id] ?? null } : null,
      })))
    } else {
      setAll(rows)
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = statusFilter === 'All' ? all : all.filter(r => r.status === statusFilter)

  const handleUpdate = async (id: string, newStatus: 'APPROVED' | 'DECLINED') => {
    setUpdating(id)
    const { error } = await supabase
      .from('crm_lead_requests')
      .update({ status: newStatus })
      .eq('id', id)
    setUpdating(null)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setAll(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    }
  }

  if (!isAdmin) {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.gold} />
        <Text style={s.noAccess}>Admin access required.</Text>
      </View>
    )
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Lead Requests</Text>
            <Text style={s.pageSub}>{all.filter(r => r.status === 'PENDING').length} pending review</Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[s.chip, statusFilter === f && s.chipActive]}
            >
              <Text style={[s.chipText, statusFilter === f && s.chipTextActive]}>
                {f === 'All' ? 'All' : statusLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No {statusFilter === 'All' ? '' : statusLabel(statusFilter)} requests</Text>
          </Card>
        ) : (
          filtered.map(req => {
            const statusColor = STATUS_COLORS[req.status] ?? colors.slate400
            const isPending = req.status === 'PENDING'
            const payload = req.lead_payload ?? {}
            const leadName = payload.lead_name || '—'
            const leadPhone = payload.phone || '—'
            const leadSource = payload.source || null
            return (
              <Card key={req.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.leadInfo}>
                    <Text style={s.leadName}>{leadName}</Text>
                    <Text style={s.leadPhone}>{leadPhone}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[s.badgeText, { color: statusColor }]}>{statusLabel(req.status)}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {leadSource && (
                    <View style={s.sourceBadge}>
                      <Text style={s.sourceText}>{leadSource}</Text>
                    </View>
                  )}
                  {req.profiles?.full_name && (
                    <View style={s.requesterBadge}>
                      <Ionicons name="person-outline" size={10} color={colors.blue} />
                      <Text style={s.requesterText}>{req.profiles.full_name}</Text>
                    </View>
                  )}
                  <Text style={s.dateText}>
                    {new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </Text>
                </View>

                {isPending && (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.green + '22', borderColor: colors.green + '44' }]}
                      onPress={() => handleUpdate(req.id, 'APPROVED')}
                      disabled={updating === req.id}
                    >
                      <Ionicons name="checkmark" size={14} color={colors.green} />
                      <Text style={[s.actionText, { color: colors.green }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.red + '22', borderColor: colors.red + '44' }]}
                      onPress={() => handleUpdate(req.id, 'DECLINED')}
                      disabled={updating === req.id}
                    >
                      <Ionicons name="close" size={14} color={colors.red} />
                      <Text style={[s.actionText, { color: colors.red }]}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  center: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noAccess: { color: colors.slate400, fontSize: 15, marginTop: 12, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { padding: 4 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  filterRow: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  card: { marginBottom: 10, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  leadInfo: { flex: 1, marginRight: 8 },
  leadName: { color: colors.white, fontWeight: '700', fontSize: 15 },
  leadPhone: { color: colors.gold, fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  sourceBadge: { backgroundColor: colors.slate700 + '80', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  sourceText: { color: colors.slate400, fontSize: 10, fontWeight: '600' },
  requesterBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.blue + '18', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  requesterText: { color: colors.blue, fontSize: 10, fontWeight: '600' },
  dateText: { color: colors.slate500, fontSize: 11, marginLeft: 'auto' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, paddingVertical: 8, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
