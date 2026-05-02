import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function Unauthorized() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View className="flex-1 items-center justify-center bg-brand-navy px-6">
      <Text className="text-5xl mb-4">🔒</Text>
      <Text className="text-white text-2xl font-bold mb-2 text-center">Access Denied</Text>
      <Text className="text-slate-400 text-base text-center mb-8">
        Your account does not have access to any module. Contact your administrator.
      </Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  )
}
