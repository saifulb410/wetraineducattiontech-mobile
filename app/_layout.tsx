import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { AuthProvider, useAuthContext } from '@/context/AuthContext'
import { getPrimaryModule } from '@/lib/auth/roles'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, loading, roles } = useAuthContext()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()
    const inAuth = segments[0] === '(auth)'
    const inHome = segments.length === 0 || segments[0] === 'index'
    if (!session && !inAuth && !inHome) {
      router.replace('/(auth)/login')
    } else if (session && (inAuth || inHome)) {
      const mod = roles ? getPrimaryModule(roles) : null
      router.replace(mod ? `/(app)/${mod}` as any : '/unauthorized')
    }
  }, [session, loading, roles, segments])

  useEffect(() => {
    const handle = async ({ url }: { url: string }) => {
      const parsed = Linking.parse(url)
      const q = parsed.queryParams ?? {}
      if (typeof q.access_token === 'string' && typeof q.refresh_token === 'string') {
        await supabase.auth.setSession({ access_token: q.access_token, refresh_token: q.refresh_token })
      } else if (typeof q.code === 'string') {
        await supabase.auth.exchangeCodeForSession(q.code)
      }
    }
    const sub = Linking.addEventListener('url', handle)
    Linking.getInitialURL().then(url => { if (url) handle({ url }) })
    return () => sub.remove()
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="unauthorized" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}
