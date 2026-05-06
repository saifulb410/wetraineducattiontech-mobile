import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

const { width } = Dimensions.get('window')

const features = [
  { icon: 'school-outline',      label: 'Education',  desc: 'Courses, orders & payments' },
  { icon: 'people-outline',      label: 'CRM',         desc: 'Leads & sales pipeline'     },
  { icon: 'bar-chart-outline',   label: 'HRM',         desc: 'KPI tracking & task reports' },
  { icon: 'storefront-outline',  label: 'Store',       desc: 'Balance, invoices & ledger'  },
]

export default function Home() {
  const router = useRouter()

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const scaleAnim = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} bounces={false}>
      {/* Background circles */}
      <View style={s.circle1} />
      <View style={s.circle2} />

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoIcon}>
            <Ionicons name="school" size={36} color={colors.gold} />
          </View>
        </View>

        {/* Headline */}
        <Text style={s.brand}>WeTrainEducationTech</Text>
        <Text style={s.tagline}>All your business tools in one place</Text>

        {/* Feature cards */}
        <View style={s.featuresGrid}>
          {features.map(({ icon, label, desc }) => (
            <View key={label} style={s.featureCard}>
              <View style={s.featureIconWrap}>
                <Ionicons name={icon as any} size={22} color={colors.gold} />
              </View>
              <Text style={s.featureLabel}>{label}</Text>
              <Text style={s.featureDesc}>{desc}</Text>
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { value: '4+', label: 'Modules' },
            { value: '100%', label: 'Cloud' },
            { value: '24/7', label: 'Access' },
          ].map(({ value, label }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statValue}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={s.btnGroup}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(auth)/register' as any)} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.navy} />
          </TouchableOpacity>

          <TouchableOpacity style={s.btnSecondary} onPress={() => router.push('/(auth)/login' as any)} activeOpacity={0.85}>
            <Text style={s.btnSecondaryText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Secure · Reliable · Built for teams</Text>
      </Animated.View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },

  // Background decoration
  circle1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.gold + '0C' },
  circle2: { position: 'absolute', bottom: 100, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.blue + '0A' },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.gold + '18', borderWidth: 1.5, borderColor: colors.gold + '40', alignItems: 'center', justifyContent: 'center' },

  // Text
  brand: { color: colors.white, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: 0.3 },
  tagline: { color: colors.slate400, fontSize: 15, textAlign: 'center', marginBottom: 36 },

  // Features grid
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featureCard: { width: (width - 60) / 2, backgroundColor: colors.navyLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate700 + '80' },
  featureIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.gold + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureLabel: { color: colors.white, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  featureDesc: { color: colors.slate400, fontSize: 12, lineHeight: 17 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.navyLight, borderRadius: 16, paddingVertical: 18, marginBottom: 32, borderWidth: 1, borderColor: colors.slate700 + '60' },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: colors.slate400, fontSize: 12 },

  // Buttons
  btnGroup: { gap: 12, marginBottom: 24 },
  btnPrimary: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimaryText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  btnSecondary: { backgroundColor: colors.navyLight, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.slate700 },
  btnSecondaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  footer: { color: colors.slate500, fontSize: 12, textAlign: 'center' },
})
