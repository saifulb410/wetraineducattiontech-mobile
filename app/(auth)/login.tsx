import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login Failed', error.message)
  }

  const handleMagicLink = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.')
      return
    }
    setMagicLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setMagicLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Check your email', `We sent a login link to ${email}. Tap it to sign in.`)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-navy"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="mb-10">
            <Text className="text-brand-gold text-4xl font-bold mb-1">WeTrainEdu</Text>
            <Text className="text-slate-400 text-base">Sign in to your account</Text>
          </View>

          {/* Mode toggle */}
          <View className="flex-row bg-brand-navy-light rounded-xl p-1 mb-6">
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-lg items-center ${mode === 'password' ? 'bg-brand-gold' : ''}`}
              onPress={() => setMode('password')}
            >
              <Text className={`font-semibold ${mode === 'password' ? 'text-brand-navy' : 'text-slate-400'}`}>
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-lg items-center ${mode === 'magic' ? 'bg-brand-gold' : ''}`}
              onPress={() => setMode('magic')}
            >
              <Text className={`font-semibold ${mode === 'magic' ? 'text-brand-navy' : 'text-slate-400'}`}>
                Magic Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email input */}
          <View className="mb-4">
            <Text className="text-slate-300 text-sm mb-1.5 font-medium">Email</Text>
            <TextInput
              className="bg-brand-navy-light text-white rounded-xl px-4 py-3.5 text-base border border-slate-700"
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password input (only in password mode) */}
          {mode === 'password' && (
            <View className="mb-6">
              <Text className="text-slate-300 text-sm mb-1.5 font-medium">Password</Text>
              <TextInput
                className="bg-brand-navy-light text-white rounded-xl px-4 py-3.5 text-base border border-slate-700"
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          )}

          {mode === 'magic' && <View className="mb-6" />}

          {/* Submit button */}
          {mode === 'password' ? (
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          ) : (
            <Button
              title="Send Magic Link"
              onPress={handleMagicLink}
              loading={magicLoading}
            />
          )}

          <Text className="text-slate-500 text-xs text-center mt-8">
            Don't have an account? Contact your administrator.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
