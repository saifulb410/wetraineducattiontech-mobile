import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { colors } from '@/lib/theme'

const TEAM: { name: string; percent: number }[] = [
  { name: 'Team Leader (You)', percent: 40 },
  { name: 'BDE 1', percent: 18 },
  { name: 'BDE 2', percent: 18 },
  { name: 'Marketing', percent: 12 },
  { name: 'CS 1', percent: 6 },
  { name: 'CS 2', percent: 6 },
]

export default function ProfitCalculator() {
  const [amount, setAmount] = useState('')
  const [results, setResults] = useState<{ name: string; percent: number; share: string }[]>([])

  function calculate() {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.')
      return
    }
    setResults(
      TEAM.map(m => ({
        ...m,
        share: (value * m.percent / 100).toFixed(2),
      }))
    )
  }

  function reset() {
    setAmount('')
    setResults([])
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Profit Share Calculator</Text>
      <Text style={s.sub}>Enter the total bonus amount to split across the team</Text>

      <View style={s.inputRow}>
        <Text style={s.currency}>$</Text>
        <TextInput
          style={s.input}
          placeholder="0.00"
          placeholderTextColor={colors.slate500}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          returnKeyType="done"
          onSubmitEditing={calculate}
        />
      </View>

      <TouchableOpacity style={s.btn} onPress={calculate} activeOpacity={0.85}>
        <Text style={s.btnText}>Calculate</Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Breakdown</Text>

          {results.map((r, i) => (
            <View key={r.name} style={[s.card, i === 0 && s.leaderCard]}>
              <View style={s.cardLeft}>
                <Text style={[s.memberName, i === 0 && s.leaderName]}>{r.name}</Text>
                <Text style={s.pctLabel}>{r.percent}% share</Text>
              </View>
              <Text style={[s.shareAmount, i === 0 && s.leaderAmount]}>${r.share}</Text>
            </View>
          ))}

          <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.75}>
            <Text style={s.resetText}>Reset</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 24, paddingTop: 32 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: colors.slate400, fontSize: 13, marginBottom: 28, lineHeight: 18 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate700,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currency: { color: colors.gold, fontSize: 22, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, color: colors.white, fontSize: 24, fontWeight: '600', paddingVertical: 14 },

  btn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { color: colors.navy, fontSize: 16, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.slate700, marginVertical: 24 },
  sectionLabel: {
    color: colors.slate500, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginBottom: 12,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate700 + '80',
  },
  leaderCard: { borderColor: colors.gold + '55', backgroundColor: '#0f2a10' },
  cardLeft: { flex: 1 },
  memberName: { color: colors.white, fontSize: 15, fontWeight: '700' },
  leaderName: { color: colors.gold },
  pctLabel: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  shareAmount: { color: colors.white, fontSize: 20, fontWeight: '800' },
  leaderAmount: { color: colors.gold },

  resetBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate700,
  },
  resetText: { color: colors.slate400, fontSize: 14, fontWeight: '600' },
})
