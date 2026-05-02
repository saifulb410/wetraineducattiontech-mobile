import { View, type ViewProps } from 'react-native'

export function Card({ children, className = '', ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-brand-navy-light rounded-2xl p-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  )
}
