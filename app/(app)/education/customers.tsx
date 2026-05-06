import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TextInput, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Customer {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

function initials(name: string | null, email: string | null) {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (email ?? '??').slice(0, 2).toUpperCase()
}

export default function Customers() {
  const router = useRouter()
  const [all, setAll] = useState<Customer[]>([])
  const [filtered, setFiltered] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email,phone,created_at')
      .order('created_at', { ascending: false })
    const list = (data as Customer[]) ?? []
    setAll(list)
    setFiltered(list)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q
        ? all.filter(c =>
            c.full_name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q)
          )
        : all
    )
  }, [search, all])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      style={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <View style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Customers</Text>
            <Text style={s.pageSub}>{all.length} registered</Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, email or phone..."
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

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="people-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No customers found</Text>
          </Card>
        ) : (
          filtered.map(c => (
            <Card key={c.id} style={s.card}>
              <View style={s.row}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials(c.full_name, c.email)}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{c.full_name || '—'}</Text>
                  <Text style={s.email} numberOfLines={1}>{c.email || '—'}</Text>
                  {c.phone ? <Text style={s.phone}>{c.phone}</Text> : null}
                </View>
                <Text style={s.date}>
                  {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { padding: 4 },
  pageTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  pageSub: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.navyLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: colors.slate700,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  card: { marginBottom: 10, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold + '22', borderWidth: 1.5,
    borderColor: colors.gold + '60', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { color: colors.white, fontWeight: '600', fontSize: 14 },
  email: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  phone: { color: colors.slate500, fontSize: 11, marginTop: 2 },
  date: { color: colors.slate500, fontSize: 11 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})

