import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { colors } from '@/lib/theme'

WebBrowser.maybeCompleteAuthSession()

export default function Register() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRegister = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Please enter your full name.'); return }
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email.'); return }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (error) {
      setLoading(false)
      Alert.alert('Registration Failed', error.message)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
      })
    }

    setLoading(false)
    Alert.alert(
      'Account Created!',
      'Please check your email to verify your account, then sign in.',
      [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
    )
  }

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true)
      const redirectUri = makeRedirectUri({ scheme: 'wetrainedu', path: 'auth' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url)
        const code = url.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else {
          const accessToken = url.searchParams.get('access_token')
          const refreshToken = url.searchParams.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Google Sign-Up Failed', err.message ?? 'Something went wrong')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.brand}>WeTrainEducationTech</Text>
          <Text style={s.sub}>Create your account</Text>
        </View>

        {/* Google Sign Up */}
        <TouchableOpacity style={s.googleBtn} onPress={handleGoogleRegister} disabled={googleLoading} activeOpacity={0.85}>
          {googleLoading
            ? <ActivityIndicator size="small" color={colors.navy} />
            : <Ionicons name="logo-google" size={20} color="#EA4335" />
          }
          <Text style={s.googleText}>{googleLoading ? 'Signing up...' : 'Continue with Google'}</Text>
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or create with email</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Full Name */}
        <Text style={s.label}>Full Name</Text>
        <TextInput
          style={s.input}
          placeholder="Your full name"
          placeholderTextColor={colors.slate500}
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Email */}
        <Text style={s.label}>Email Address</Text>
        <TextInput
          style={s.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.slate500}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password */}
        <Text style={s.label}>Password</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.slate500}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.slate400} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 16 }} />

        {/* Confirm Password */}
        <Text style={s.label}>Confirm Password</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Re-enter password"
            placeholderTextColor={colors.slate500}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eyeBtn}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.slate400} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />

        <Button title="Create Account" onPress={handleRegister} loading={loading} />

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={s.loginLink}>
          <Text style={s.loginText}>Already have an account? <Text style={s.loginBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  header: { marginBottom: 32 },
  brand: { color: colors.gold, fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: colors.slate400, fontSize: 15 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, marginBottom: 24 },
  googleText: { color: '#1a1a1a', fontWeight: '700', fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.slate700 },
  dividerText: { color: colors.slate500, fontSize: 12 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navyLight, color: colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: colors.slate700, marginBottom: 16 },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navyLight, borderRadius: 12, borderWidth: 1, borderColor: colors.slate700 },
  eyeBtn: { paddingHorizontal: 14 },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginText: { color: colors.slate400, fontSize: 14 },
  loginBold: { color: colors.gold, fontWeight: '700' },
})
