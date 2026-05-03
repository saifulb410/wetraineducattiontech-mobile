import { TouchableOpacity } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function AppLayout() {
  const router = useRouter()
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="education" />
      <Stack.Screen name="crm" />
      <Stack.Screen name="hrm" />
      <Stack.Screen
        name="store"
        options={{
          headerShown: true,
          title: 'Store',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#D4AF37',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/(app)/modules' as any)} style={{ marginRight: 16 }}>
              <Ionicons name="grid-outline" size={22} color="#D4AF37" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="modules"
        options={{
          headerShown: true,
          title: 'Modules',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#D4AF37',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  )
}
