import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '@/lib/theme'

interface ButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}

export function Button({ title, onPress, loading, variant = 'primary', disabled }: ButtonProps) {
  const bg = variant === 'primary' ? colors.gold : 'transparent'
  const border = variant === 'secondary' ? colors.gold : 'transparent'
  const textColor = variant === 'primary' ? colors.navy : colors.gold

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, borderColor: border, borderWidth: variant === 'secondary' ? 1 : 0, opacity: disabled || loading ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading && <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />}
      <Text style={[s.label, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  label: { fontSize: 16, fontWeight: 'bold' },
})
