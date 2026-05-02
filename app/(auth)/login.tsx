import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { colors } from '@/lib/theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Enter your email and password.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login Failed', error.message)
  }

  const handleMagicLink = async () => {
    if (!email) { Alert.alert('Error', 'Enter your email address.'); return }
    setMagicLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setMagicLoading(false)
    if (error) Alert.alert('Error', error.message)
    else Alert.alert('Check your email', `We sent a login link to ${email}`)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.brand}>WeTrainEducationTech</Text>
          <Text style={s.sub}>Sign in to your account</Text>
        </View>

        <View style={s.toggle}>
          {(['password', 'magic'] as const).map(m => (
            <TouchableOpacity key={m} style={[s.tab, mode === m && s.tabActive]} onPress={() => setMode(m)}>
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>{m === 'password' ? 'Password' : 'Magic Link'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={colors.slate500} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        {mode === 'password' && (
          <>
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={colors.slate500} value={password} onChangeText={setPassword} secureTextEntry />
          </>
        )}

        <View style={{ height: 24 }} />
        {mode === 'password'
          ? <Button title="Sign In" onPress={handleLogin} loading={loading} />
          : <Button title="Send Magic Link" onPress={handleMagicLink} loading={magicLoading} />
        }
        <Text style={s.footer}>Don't have an account? Contact your administrator.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  header: { marginBottom: 40 },
  brand: { color: colors.gold, fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: colors.slate400, fontSize: 15 },
  toggle: { flexDirection: 'row', backgroundColor: colors.navyLight, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.gold },
  tabText: { color: colors.slate400, fontWeight: '600' },
  tabTextActive: { color: colors.navy },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navyLight, color: colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: colors.slate700, marginBottom: 16 },
  footer: { color: colors.slate500, fontSize: 12, textAlign: 'center', marginTop: 32 },
})
