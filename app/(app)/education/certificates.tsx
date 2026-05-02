import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Certificate {
  id: string
  certificate_number: string | null
  issued_at: string
  services?: { name: string }[] | null
}

export default function Certificates() {
  const { user } = useAuthContext()
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCerts = async () => {
    if (!user) return
    const { data } = await supabase.from('certifications').select('id,certificate_number,issued_at,services(name)').eq('user_id', user.id).order('issued_at', { ascending: false })
    setCerts((data as Certificate[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchCerts() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchCerts() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        <Text style={s.title}>My Certificates</Text>
        {certs.length === 0
          ? <Card style={s.emptyCard}><Ionicons name="ribbon-outline" size={48} color={colors.gold} /><Text style={s.emptyText}>No certificates yet. Complete a course to earn one.</Text></Card>
          : certs.map(c => (
            <Card key={c.id} style={s.certCard}>
              <View style={s.row}>
                <Ionicons name="ribbon" size={20} color={colors.gold} />
                <Text style={s.certName}>{c.services?.[0]?.name ?? 'Certificate'}</Text>
              </View>
              {c.certificate_number && <Text style={s.certNum}>#{c.certificate_number}</Text>}
              <Text style={s.date}>Issued: {new Date(c.issued_at).toLocaleDateString()}</Text>
            </Card>
          ))}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  title: { color: colors.white, fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  emptyCard: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.slate400, marginTop: 12, textAlign: 'center' },
  certCard: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  certName: { color: colors.white, fontWeight: 'bold', flex: 1 },
  certNum: { color: colors.gold, fontSize: 12, marginBottom: 4 },
  date: { color: colors.slate400, fontSize: 12 },
})
