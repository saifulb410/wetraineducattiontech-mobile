import {
  View, Text, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

/**
 * KPI Marking screen — simplified / graceful degradation.
 *
 * The new HRM schema tracks scored KPI submissions differently
 * (marker → subject, via hrm_kpi_submissions with a more complex
 * structure). This screen is temporarily replaced with an informational
 * placeholder until the marking workflow is re-implemented for the
 * new schema.
 */
export default function MarkingScreen() {
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name="bar-chart-outline" size={56} color={colors.gold} />
      </View>
      <Text style={s.title}>KPI Marking</Text>
      <Text style={s.body}>
        The KPI marking system has been updated. The new workflow
        supports scored submissions tracked by markers against subjects.
      </Text>
      <Text style={s.body}>
        Please use the web app to manage KPI marks until the mobile
        interface is updated for the new system.
      </Text>
      <View style={s.infoPill}>
        <Ionicons name="information-circle-outline" size={16} color={colors.amber} />
        <Text style={s.infoText}>Coming soon — new KPI system</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.gold + '18',
    borderWidth: 1,
    borderColor: colors.gold + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: colors.slate400,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.amber + '18',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.amber + '40',
  },
  infoText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700',
  },
})
