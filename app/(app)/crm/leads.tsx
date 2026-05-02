import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TextInput } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

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
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  converted: '#22c55e',
  lost: '#ef4444',
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('crm_leads')
      .select('id, name, email, phone, status, source, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    const rows = (data as Lead[]) ?? []
    setLeads(rows)
    setFiltered(rows)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? leads.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      ) : leads
    )
  }, [search, leads])

  const onRefresh = () => { setRefreshing(true); fetchLeads() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-4 pb-10">
        <TextInput
          className="bg-brand-navy-light text-white rounded-xl px-4 py-3 mb-4 border border-slate-700"
          placeholder="Search by name, email, phone…"
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />

        <Text className="text-slate-400 text-sm mb-3">{filtered.length} leads</Text>

        {filtered.map(lead => (
          <Card key={lead.id} className="mb-3">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-white font-bold flex-1 mr-2">
                {lead.name ?? 'Unknown'}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: (STATUS_COLORS[lead.status] ?? '#94a3b8') + '22' }}
              >
                <Text
                  className="text-xs font-semibold capitalize"
                  style={{ color: STATUS_COLORS[lead.status] ?? '#94a3b8' }}
                >
                  {lead.status}
                </Text>
              </View>
            </View>
            {lead.email && <Text className="text-slate-400 text-xs mb-0.5">{lead.email}</Text>}
            {lead.phone && <Text className="text-slate-400 text-xs mb-0.5">{lead.phone}</Text>}
            <View className="flex-row justify-between mt-2">
              {lead.source && (
                <Text className="text-slate-500 text-xs capitalize">{lead.source}</Text>
              )}
              <Text className="text-slate-500 text-xs">
                {new Date(lead.created_at).toLocaleDateString()}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}
