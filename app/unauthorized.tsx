import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

export default function Unauthorized() {
  const router = useRouter()
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }
  return (
    <View style={s.container}>
      <Text style={s.icon}>🔒</Text>
      <Text style={s.title}>Access Denied</Text>
      <Text style={s.sub}>Your account has no module access. Contact your administrator.</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy, paddingHorizontal: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  sub: { color: colors.slate400, fontSize: 15, textAlign: 'center', marginBottom: 32 },
})
