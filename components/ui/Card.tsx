import { View, StyleSheet, type ViewProps } from 'react-native'
import { colors } from '@/lib/theme'

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[s.card, style]} {...props}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.navyLight, borderRadius: 16, padding: 16 },
})
