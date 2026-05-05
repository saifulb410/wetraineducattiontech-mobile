import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

const DATE_FILTERS = ['This Month', 'Last Month', 'This Year', 'All Time']

const STATUS_COLORS: Record<string, string> = {
  new: colors.blue,
  contacted: colors.amber,
  qualified: colors.purple,
  converted: colors.green,
  lost: colors.red,
}

export default function CrmDashboard() {
  const { roles, signOut } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateFilter, setDateFilter] = useState('This Month')
  const [showFilters, setShowFilters] = useState(false)

  const [totalLeads, setTotalLeads] = useState(0)
  const [soldDeals, setSoldDeals] = useState(0)
  const [activeLeads, setActiveLeads] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([])
  const [sourceBreakdown, setSourceBreakdown] = useState<{ source: string; count: number }[]>([])

  const getDateFilter = () => {
    const now = new Date()
    if (dateFilter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return start.toISOString()
    }
    if (dateFilter === 'Last Month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return start.toISOString()
    }
    if (dateFilter === 'This Year') {
      return new Date(now.getFullYear(), 0, 1).toISOString()
    }
    return null
  }

  const fetchStats = async () => {
    let query = supabase.from('crm_leads').select('status,source,created_at')
    const from = getDateFilter()
    if (from) query = query.gte('created_at', from)

    const { data } = await query
    if (data) {
      const total = data.length
      const sold = data.filter(l => l.status === 'converted').length
      const active = data.filter(l => l.status !== 'lost' && l.status !== 'converted').length
      const rate = total > 0 ? Math.round((sold / total) * 100) : 0

      setTotalLeads(total)
      setSoldDeals(sold)
      setActiveLeads(active)
      setConversionRate(rate)

      const statusMap: Record<string, number> = {}
      const sourceMap: Record<string, number> = {}
      data.forEach(l => {
        statusMap[l.status] = (statusMap[l.status] ?? 0) + 1
        if (l.source) sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1
      })
      setStatusBreakdown(Object.entries(statusMap).map(([status, count]) => ({ status, count })))
      setSourceBreakdown(Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count })))
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchStats() }, [dateFilter])
  const onRefresh = () => { setRefreshing(true); fetchStats() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.pageTitle}>CRM Dashboard</Text>
            <Text style={s.pageSub}>Welcome back, {roles?.crmRole ?? 'User'}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>

        {/* Date Filter */}
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Text style={s.filterText}>Date Range: {dateFilter}</Text>
          <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gold} />
        </TouchableOpacity>
        {showFilters && (
          <Card style={s.filterCard}>
            {DATE_FILTERS.map(f => (
              <TouchableOpacity key={f} style={s.filterOption} onPress={() => { setDateFilter(f); setShowFilters(false) }}>
                <Text style={[s.filterOptionText, dateFilter === f && { color: colors.gold, fontWeight: '700' }]}>{f}</Text>
                {dateFilter === f && <Ionicons name="checkmark" size={16} color={colors.gold} />}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Stats */}
        <View style={s.statsGrid}>
          <Card style={s.statCard}>
            <View style={s.statIconRow}><Text style={s.statLabel}>Total Leads</Text><Ionicons name="people-outline" size={16} color={colors.slate400} /></View>
            <Text style={s.statNum}>{totalLeads}</Text>
            <Text style={s.statSub}>{dateFilter}</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconRow}><Text style={s.statLabel}>Sold Deals</Text><Ionicons name="checkmark-circle-outline" size={16} color={colors.green} /></View>
            <Text style={[s.statNum, { color: colors.green }]}>{soldDeals}</Text>
            <Text style={s.statSub}>Successfully closed</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconRow}><Text style={s.statLabel}>Active Leads</Text><Ionicons name="trending-up-outline" size={16} color={colors.blue} /></View>
            <Text style={[s.statNum, { color: colors.blue }]}>{activeLeads}</Text>
            <Text style={s.statSub}>In progress</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconRow}><Text style={s.statLabel}>Conversion Rate</Text><Ionicons name="bar-chart-outline" size={16} color={colors.purple} /></View>
            <Text style={[s.statNum, { color: colors.purple }]}>{conversionRate}%</Text>
            <Text style={s.statSub}>Won / Total</Text>
          </Card>
        </View>

        {/* Status Breakdown */}
        <Card style={s.breakdownCard}>
          <Text style={s.sectionTitle}>Leads by Status</Text>
          {statusBreakdown.length === 0
            ? <Text style={s.empty}>No data for selected period</Text>
            : statusBreakdown.map(({ status, count }) => (
              <View key={status} style={s.breakdownRow}>
                <View style={[s.dot, { backgroundColor: STATUS_COLORS[status] ?? colors.slate400 }]} />
                <Text style={s.breakdownLabel}>{status}</Text>
                <View style={s.barWrap}>
                  <View style={[s.bar, { width: `${Math.min((count / totalLeads) * 100, 100)}%` as any, backgroundColor: STATUS_COLORS[status] ?? colors.slate400 }]} />
                </View>
                <Text style={s.breakdownCount}>{count}</Text>
              </View>
            ))}
        </Card>

        {/* Lead Sources */}
        <Card style={s.breakdownCard}>
          <Text style={s.sectionTitle}>Lead Sources</Text>
          {sourceBreakdown.length === 0
            ? <Text style={s.empty}>No data available</Text>
            : sourceBreakdown.map(({ source, count }) => (
              <View key={source} style={s.breakdownRow}>
                <Ionicons name="link-outline" size={14} color={colors.gold} />
                <Text style={[s.breakdownLabel, { textTransform: 'capitalize' }]}>{source.replace('_', ' ')}</Text>
                <View style={s.barWrap}>
                  <View style={[s.bar, { width: `${Math.min((count / totalLeads) * 100, 100)}%` as any, backgroundColor: colors.gold }]} />
                </View>
                <Text style={s.breakdownCount}>{count}</Text>
              </View>
            ))}
        </Card>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 13, marginTop: 2 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.navyLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.slate700 },
  filterText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  filterCard: { marginBottom: 12, padding: 0 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '44' },
  filterOptionText: { color: colors.slate300, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', paddingVertical: 14 },
  statIconRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { color: colors.slate400, fontSize: 12 },
  statNum: { color: colors.white, fontSize: 28, fontWeight: 'bold' },
  statSub: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  breakdownCard: { marginBottom: 16 },
  sectionTitle: { color: colors.white, fontWeight: '700', fontSize: 15, marginBottom: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { color: colors.white, fontSize: 13, width: 80, textTransform: 'capitalize' },
  barWrap: { flex: 1, height: 6, backgroundColor: colors.slate700, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  breakdownCount: { color: colors.gold, fontWeight: 'bold', width: 28, textAlign: 'right' },
  empty: { color: colors.slate400, textAlign: 'center', paddingVertical: 16 },
})
