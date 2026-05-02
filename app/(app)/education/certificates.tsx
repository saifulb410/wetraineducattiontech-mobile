import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

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
    const { data } = await supabase
      .from('certifications')
      .select('id, certificate_number, issued_at, services(name)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
    setCerts((data as Certificate[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchCerts() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchCerts() }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View className="px-4 pt-6 pb-10">
        <Text className="text-white text-2xl font-bold mb-6">My Certificates</Text>

        {certs.length === 0 ? (
          <Card className="items-center py-10">
            <Ionicons name="ribbon-outline" size={48} color="#D4AF37" />
            <Text className="text-slate-400 mt-3 text-center">
              No certificates yet. Complete a course to earn one.
            </Text>
          </Card>
        ) : (
          certs.map(cert => (
            <Card key={cert.id} className="mb-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="ribbon" size={20} color="#D4AF37" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold flex-1">
                  {cert.services?.[0]?.name ?? 'Certificate'}
                </Text>
              </View>
              {cert.certificate_number && (
                <Text className="text-brand-gold text-xs mb-1">
                  #{cert.certificate_number}
                </Text>
              )}
              <Text className="text-slate-400 text-xs">
                Issued: {new Date(cert.issued_at).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}
