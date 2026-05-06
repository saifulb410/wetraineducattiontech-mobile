import { useEffect } from 'react'
import { TouchableOpacity } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthContext } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function HrmLayout() {
  const { roles, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && roles && !roles.hasHrmAccess) {
      router.replace('/unauthorized')
    }
  }, [roles, loading])

  if (loading) return <LoadingScreen />

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0a1628', borderTopColor: '#1e3a5f' },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: { backgroundColor: '#0a1628' },
        headerTintColor: '#D4AF37',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/(app)/modules' as any)} style={{ marginRight: 16 }}>
            <Ionicons name="grid-outline" size={22} color="#D4AF37" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kpi"
        options={{
          title: 'KPI',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden admin screens */}
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="weeks"     options={{ href: null }} />
    </Tabs>
  )
}
