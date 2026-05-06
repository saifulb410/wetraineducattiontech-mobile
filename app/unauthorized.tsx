import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { colors } from '@/lib/theme'

export default function Unauthorized() {
  const { user } = useAuthContext()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name="time-outline" size={48} color={colors.gold} />
      </View>
      <Text style={s.title}>Account Pending</Text>
      <Text style={s.sub}>
        Your account has been created successfully.{'\n'}
        An administrator will assign your module access shortly.
      </Text>
      {user?.email ? (
        <View style={s.emailWrap}>
          <Ionicons name="mail-outline" size={14} color={colors.slate400} />
          <Text style={s.email}>{user.email}</Text>
        </View>
      ) : null}
      <Button title="Sign Out" onPress={handleSignOut} variant="ghost" />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy, paddingHorizontal: 32 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  sub: { color: colors.slate400, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  emailWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.navyLight, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 32, borderWidth: 1, borderColor: colors.slate700 },
  email: { color: colors.slate300, fontSize: 13 },
})
