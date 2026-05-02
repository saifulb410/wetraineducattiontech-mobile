import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

interface ButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  className?: string
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
  className = '',
}: ButtonProps) {
  const base = 'rounded-xl px-6 py-4 items-center justify-center flex-row'
  const styles = {
    primary: 'bg-brand-gold',
    secondary: 'border border-brand-gold bg-transparent',
    ghost: 'bg-transparent',
  }
  const textStyles = {
    primary: 'text-brand-navy font-bold text-base',
    secondary: 'text-brand-gold font-semibold text-base',
    ghost: 'text-brand-gold text-base',
  }

  return (
    <TouchableOpacity
      className={`${base} ${styles[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#0a1628' : '#D4AF37'}
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={textStyles[variant]}>{title}</Text>
    </TouchableOpacity>
  )
}
