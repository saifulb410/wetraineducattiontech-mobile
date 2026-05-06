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

interface Project {
  id: string
  title: string
  category: string | null
  tech_stack: string | null
  updated_at: string | null
  created_at: string
}

export default function Projects() {
  const router = useRouter()
  const [all, setAll] = useState<Project[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id,title,category,tech_stack,updated_at,created_at')
      .order('created_at', { ascending: false })
    const list = (data as Project[]) ?? []
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
        ? all.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q) ||
            p.tech_stack?.toLowerCase().includes(q)
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
            <Text style={s.pageTitle}>Projects</Text>
            <Text style={s.pageSub}>{all.length} portfolio projects</Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by title, category or tech..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="briefcase-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No projects found</Text>
          </Card>
        ) : (
          filtered.map(p => (
            <Card key={p.id} style={s.card}>
              <View style={s.topRow}>
                <View style={s.iconWrap}>
                  <Ionicons name="cube-outline" size={20} color={colors.gold} />
                </View>
                <View style={s.info}>
                  <Text style={s.title} numberOfLines={2}>{p.title}</Text>
                  {p.category && (
                    <View style={s.catBadge}>
                      <Text style={s.catText}>{p.category}</Text>
                    </View>
                  )}
                </View>
              </View>
              {p.tech_stack && (
                <View style={s.techRow}>
                  <Ionicons name="code-slash-outline" size={13} color={colors.slate500} />
                  <Text style={s.techText}>{p.tech_stack}</Text>
                </View>
              )}
              <Text style={s.date}>
                Updated {new Date(p.updated_at ?? p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
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
  card: { marginBottom: 10, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.gold + '18', borderWidth: 1,
    borderColor: colors.gold + '40', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: colors.white, fontWeight: '700', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.blue + '22',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  catText: { color: colors.blue, fontSize: 11, fontWeight: '700' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  techText: { color: colors.slate400, fontSize: 12, flex: 1 },
  date: { color: colors.slate500, fontSize: 11 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
