import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="education" />
      <Stack.Screen name="crm" />
      <Stack.Screen name="hrm" />
      <Stack.Screen name="store" />
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
