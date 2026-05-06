import { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, Dimensions, StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

const { width } = Dimensions.get('window')

const modules = [
  {
    icon: 'school-outline' as const,
    title: 'Education',
    desc: 'Enroll in courses, track your orders and payment history all in one place.',
    color: colors.blue,
    bg: '#1e3a5f',
  },
  {
    icon: 'people-outline' as const,
    title: 'CRM',
    desc: 'Manage leads, track your sales pipeline, and close more deals faster.',
    color: colors.purple,
    bg: '#2d1f4e',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'HRM & KPI',
    desc: 'Weekly KPI tracking, task reports, and employee performance management.',
    color: colors.amber,
    bg: '#3d2a0a',
  },
  {
    icon: 'storefront-outline' as const,
    title: 'Store',
    desc: 'View your balance, invoices, purchase history, and account ledger.',
    color: colors.green,
    bg: '#0d2e1a',
  },
]

const stats = [
  { value: '4+',   label: 'Modules'      },
  { value: '100%', label: 'Cloud Based'  },
  { value: '24/7', label: 'Access'       },
  { value: '1',    label: 'Platform'     },
]

const whyUs = [
  { icon: 'shield-checkmark-outline' as const, text: 'Secure & reliable infrastructure' },
  { icon: 'flash-outline' as const,            text: 'Real-time data across all modules' },
  { icon: 'phone-portrait-outline' as const,   text: 'Works on any device, anywhere'    },
  { icon: 'people-circle-outline' as const,    text: 'Built for teams of all sizes'     },
]

export default function Home() {
  const router = useRouter()
  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HERO ── */}
        <View style={s.hero}>
          <View style={s.heroBubble1} />
          <View style={s.heroBubble2} />

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Nav */}
            <View style={s.nav}>
              <View style={s.logoRow}>
                <View style={s.logoBox}>
                  <Ionicons name="school" size={20} color={colors.gold} />
                </View>
                <Text style={s.logoText}>WeTrainEducationTech</Text>
              </View>
              <TouchableOpacity style={s.navLogin} onPress={() => router.push('/(auth)/login' as any)}>
                <Text style={s.navLoginText}>Login</Text>
              </TouchableOpacity>
            </View>

            {/* Hero content */}
            <View style={s.heroContent}>
              <View style={s.heroBadge}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={s.heroBadgeText}>All-in-one business platform</Text>
              </View>
              <Text style={s.heroTitle}>Grow Your Business{'\n'}
                <Text style={s.heroTitleGold}>Smarter & Faster</Text>
              </Text>
              <Text style={s.heroSub}>
                Education, CRM, HRM, and Store management — everything your team needs in one powerful app.
              </Text>

              <View style={s.heroButtons}>
                <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(auth)/register' as any)} activeOpacity={0.85}>
                  <Text style={s.btnPrimaryText}>Get Started Free</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.navy} />
                </TouchableOpacity>
                <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/(auth)/login' as any)} activeOpacity={0.85}>
                  <Text style={s.btnOutlineText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ── STATS ── */}
        <View style={s.statsSection}>
          {stats.map(({ value, label }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statValue}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── MODULES ── */}
        <View style={s.section}>
          <Text style={s.sectionBadge}>WHAT WE OFFER</Text>
          <Text style={s.sectionTitle}>Everything Your Team Needs</Text>
          <Text style={s.sectionSub}>Four powerful modules designed to run your entire business from one place.</Text>

          <View style={s.modulesGrid}>
            {modules.map(({ icon, title, desc, color, bg }) => (
              <View key={title} style={[s.moduleCard, { backgroundColor: bg }]}>
                <View style={[s.moduleIconWrap, { borderColor: color + '40' }]}>
                  <Ionicons name={icon} size={26} color={color} />
                </View>
                <Text style={s.moduleTitle}>{title}</Text>
                <Text style={s.moduleDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── WHY US ── */}
        <View style={[s.section, s.whySection]}>
          <Text style={s.sectionBadge}>WHY CHOOSE US</Text>
          <Text style={s.sectionTitle}>Built for Real Teams</Text>
          <View style={s.whyList}>
            {whyUs.map(({ icon, text }) => (
              <View key={text} style={s.whyItem}>
                <View style={s.whyIconWrap}>
                  <Ionicons name={icon} size={20} color={colors.gold} />
                </View>
                <Text style={s.whyText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── ABOUT ── */}
        <View style={[s.section, { backgroundColor: colors.navyLight }]}>
          <Text style={s.sectionBadge}>ABOUT US</Text>
          <Text style={s.sectionTitle}>WeTrainEducationTech</Text>
          <Text style={s.aboutText}>
            We are a team dedicated to building tools that help businesses grow. Our platform brings together education management, customer relations, HR performance, and store operations under one roof — so your team spends less time switching between apps and more time doing what matters.
          </Text>
          <View style={s.aboutHighlight}>
            <Ionicons name="location-outline" size={14} color={colors.gold} />
            <Text style={s.aboutHighlightText}>Trusted by teams across Bangladesh</Text>
          </View>
        </View>

        {/* ── CTA BANNER ── */}
        <View style={s.ctaBanner}>
          <View style={s.ctaBubble} />
          <Text style={s.ctaTitle}>Ready to Get Started?</Text>
          <Text style={s.ctaSub}>Create your account in seconds. No credit card required.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/(auth)/register' as any)} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Create Free Account</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} style={{ marginTop: 14 }}>
            <Text style={s.ctaLoginText}>Already have an account? <Text style={{ color: colors.gold, fontWeight: '700' }}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerLogo}>WeTrainEducationTech</Text>
          <Text style={s.footerSub}>© {new Date().getFullYear()} All rights reserved.</Text>
          <Text style={s.footerTagline}>Education · CRM · HRM · Store</Text>
        </View>

      </ScrollView>
    </View>
  )
}

const GOLD = colors.gold

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },

  // HERO
  hero: { backgroundColor: colors.navy, paddingBottom: 32, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: GOLD + '0C' },
  heroBubble2: { position: 'absolute', top: 160, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.blue + '0A' },

  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logoBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: GOLD + '20', borderWidth: 1, borderColor: GOLD + '40', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.white, fontWeight: '800', fontSize: 13, flex: 1 },
  navLogin: { backgroundColor: GOLD + '18', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: GOLD + '40' },
  navLoginText: { color: GOLD, fontWeight: '700', fontSize: 13 },

  heroContent: { paddingHorizontal: 20, paddingTop: 24 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD + '15', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20, borderWidth: 1, borderColor: GOLD + '30' },
  heroBadgeText: { color: GOLD, fontSize: 12, fontWeight: '600' },
  heroTitle: { color: colors.white, fontSize: 32, fontWeight: '800', lineHeight: 40, marginBottom: 14 },
  heroTitleGold: { color: GOLD },
  heroSub: { color: colors.slate400, fontSize: 15, lineHeight: 24, marginBottom: 28 },
  heroButtons: { flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14 },
  btnPrimaryText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  btnOutline: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.slate700 },
  btnOutlineText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  // STATS
  statsSection: { flexDirection: 'row', backgroundColor: GOLD + '12', borderTopWidth: 1, borderBottomWidth: 1, borderColor: GOLD + '25', paddingVertical: 18 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: GOLD, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.slate400, fontSize: 11, marginTop: 2 },

  // SECTIONS
  section: { paddingHorizontal: 20, paddingVertical: 36 },
  sectionBadge: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  sectionTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginBottom: 10, lineHeight: 32 },
  sectionSub: { color: colors.slate400, fontSize: 14, lineHeight: 22, marginBottom: 24 },

  // MODULES
  modulesGrid: { gap: 14 },
  moduleCard: { borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.slate700 + '60' },
  moduleIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.navy + 'AA', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  moduleTitle: { color: colors.white, fontWeight: '700', fontSize: 17, marginBottom: 6 },
  moduleDesc: { color: colors.slate400, fontSize: 13, lineHeight: 20 },

  // WHY US
  whySection: { backgroundColor: colors.navyLight },
  whyList: { gap: 14 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.navy, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.slate700 + '60' },
  whyIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD + '15', alignItems: 'center', justifyContent: 'center' },
  whyText: { color: colors.slate300, fontSize: 14, fontWeight: '500', flex: 1 },

  // ABOUT
  aboutText: { color: colors.slate400, fontSize: 14, lineHeight: 24, marginBottom: 16 },
  aboutHighlight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aboutHighlightText: { color: GOLD, fontSize: 13, fontWeight: '600' },

  // CTA
  ctaBanner: { backgroundColor: colors.navyLight, margin: 16, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: GOLD + '30', overflow: 'hidden' },
  ctaBubble: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: GOLD + '08' },
  ctaTitle: { color: colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  ctaSub: { color: colors.slate400, fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 20 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  ctaBtnText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  ctaLoginText: { color: colors.slate400, fontSize: 13 },

  // FOOTER
  footer: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.slate700 + '60' },
  footerLogo: { color: GOLD, fontWeight: '800', fontSize: 14, marginBottom: 4 },
  footerSub: { color: colors.slate500, fontSize: 12, marginBottom: 4 },
  footerTagline: { color: colors.slate700, fontSize: 11 },
})
