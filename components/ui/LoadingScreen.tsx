import { View, ActivityIndicator, Text } from 'react-native'

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-navy">
      <ActivityIndicator size="large" color="#D4AF37" />
      <Text className="mt-4 text-brand-gold text-base">{message}</Text>
    </View>
  )
}
