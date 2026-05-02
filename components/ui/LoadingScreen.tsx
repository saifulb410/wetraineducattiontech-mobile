import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { colors } from '@/lib/theme'

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={s.text}>{message}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  text: { marginTop: 16, color: colors.gold, fontSize: 16 },
})
