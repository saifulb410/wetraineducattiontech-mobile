import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface LedgerEntry {
  id: string
  user_id: string
  type: string
  amount: number
  notes: string | null
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
}

const TYPE_CONFIG: Record<string, { color: string; icon: string; sign: string }> = {
  credit:   { color: colors.green,  icon: 'arrow-down-circle-outline',  sign: '+' },
  deposit:  { color: colors.green,  icon: 'wallet-outline',             sign: '+' },
  refund:   { color: colors.green,  icon: 'refresh-circle-outline',     sign: '+' },
  purchase: { color: colors.red,    icon: 'cart-outline',               sign: '-' },
  penalty:  { color: colors.red,    icon: 'alert-circle-outline',       sign: '-' },
  debit:    { color: colors.red,    icon: 'arrow-up-circle-outline',    sign: '-' },
}

const FILTERS = ['All', 'credit', 'deposit', 'purchase', 'penalty', 'refund']

export default function Ledger() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.profileRole === 'admin'

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [filter, setFilter] = useState('All')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    let q = supabase
      .from('store_ledger')
      .select('id,user_id,type,amount,notes,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!isAdmin || !showAll) q = q.eq('user_id', user.id)

    const { data } = await q

    if (isAdmin && showAll) {
      const ids = [...new Set((data ?? []).map((e: any) => e.user_id))]
      if (ids.length > 0) {
        const { data: profileData } = await supabase.from('profiles').select('id,full_name,email').in('id', ids)
        const profileMap: Record<string, any> = {}
        ;(profileData ?? []).forEach((p: any) => { profileMap[p.id] = p })
        setEntries(((data ?? []) as LedgerEntry[]).map(e => ({ ...e, profiles: profileMap[e.user_id] ?? null })))
      } else {
        setEntries([])
      }
    } else {
      setEntries((data as LedgerEntry[]) ?? [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [user, showAll])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = filter === 'All' ? entries : entries.filter(e => e.type === filter)

  const totalIn  = filtered.filter(e => ['credit', 'deposit', 'refund'].includes(e.type)).reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalOut = filtered.filter(e => ['purchase', 'penalty', 'debit'].includes(e.type)).reduce((s, e) => s + (e.amount ?? 0), 0)

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Summary cards */}
        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <Ionicons name="arrow-down-circle-outline" size={18} color={colors.green} />
            <Text style={[s.statNum, { color: colors.green }]}>৳{totalIn.toLocaleString()}</Text>
            <Text style={s.statLabel}>Money In</Text>
          </Card>
          <Card style={s.statCard}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={colors.red} />
            <Text style={[s.statNum, { color: colors.red }]}>৳{totalOut.toLocaleString()}</Text>
            <Text style={s.statLabel}>Money Out</Text>
          </Card>
          <Card style={s.statCard}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.gold} />
            <Text style={[s.statNum, { color: colors.gold }]}>{filtered.length}</Text>
            <Text style={s.statLabel}>Entries</Text>
          </Card>
        </View>

        {/* Admin toggle */}
        {isAdmin && (
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, !showAll && s.toggleBtnActive]}
              onPress={() => setShowAll(false)}
            >
              <Ionicons name="person-outline" size={13} color={!showAll ? colors.navy : colors.slate400} />
              <Text style={[s.toggleText, !showAll && s.toggleTextActive]}>My Ledger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, showAll && s.toggleBtnActive]}
              onPress={() => setShowAll(true)}
            >
              <Ionicons name="people-outline" size={13} color={showAll ? colors.navy : colors.slate400} />
              <Text style={[s.toggleText, showAll && s.toggleTextActive]}>All Employees</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ledger entries */}
        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="book-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No {filter === 'All' ? '' : filter} entries found</Text>
          </Card>
        ) : (
          filtered.map(entry => {
            const cfg = TYPE_CONFIG[entry.type] ?? { color: colors.slate400, icon: 'ellipse-outline', sign: '' }
            const isPositive = cfg.sign === '+'
            return (
              <Card key={entry.id} style={s.entryCard}>
                <View style={s.entryRow}>
                  <View style={[s.iconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.entryType}>{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</Text>
                    {showAll && entry.profiles && (
                      <Text style={[s.entryNotes, { color: colors.gold }]} numberOfLines={1}>
                        {(entry.profiles as any)?.full_name ?? (entry.profiles as any)?.email ?? ''}
                      </Text>
                    )}
                    {entry.notes ? (
                      <Text style={s.entryNotes} numberOfLines={1}>{entry.notes}</Text>
                    ) : null}
                    <Text style={s.entryDate}>
                      {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                    </Text>
                  </View>
                  <Text style={[s.entryAmount, { color: cfg.color }]}>
                    {cfg.sign}৳{(entry.amount ?? 0).toLocaleString()}
                  </Text>
                </View>
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
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: colors.slate400, fontSize: 10, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.navyLight, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: colors.slate700 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: colors.gold },
  toggleText: { color: colors.slate400, fontSize: 12, fontWeight: '700' },
  toggleTextActive: { color: colors.navy },
  filterRow: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  entryCard: { marginBottom: 8, padding: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryType: { color: colors.white, fontSize: 13, fontWeight: '600' },
  entryNotes: { color: colors.slate400, fontSize: 11, marginTop: 1 },
  entryDate: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  entryAmount: { fontSize: 15, fontWeight: '800' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
