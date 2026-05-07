import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface EmployeeAccount {
  user_id: string
  balance: number
  profiles: { full_name: string | null; email: string } | null
}

export default function AccountsAdmin() {
  const [accounts, setAccounts] = useState<EmployeeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<EmployeeAccount | null>(null)
  const [txType, setTxType] = useState<'credit' | 'debit' | 'penalty'>('credit')
  const [txAmount, setTxAmount] = useState('')
  const [txNotes, setTxNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('store_accounts')
      .select('user_id,balance,profiles(full_name,email)')
      .order('balance', { ascending: false })
    setAccounts((data as EmployeeAccount[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchAccounts() }, [])
  const onRefresh = () => { setRefreshing(true); fetchAccounts() }

  const openTransaction = (a: EmployeeAccount) => {
    setSelected(a)
    setTxType('credit')
    setTxAmount('')
    setTxNotes('')
  }

  const handleTransaction = async () => {
    if (!selected) return
    const amount = parseFloat(txAmount)
    if (isNaN(amount) || amount <= 0) { Alert.alert('Validation', 'Enter a valid amount.'); return }

    setSaving(true)
    const isCredit = txType === 'credit'
    const newBalance = isCredit
      ? (selected.balance ?? 0) + amount
      : (selected.balance ?? 0) - amount

    await supabase.from('store_accounts').update({ balance: newBalance }).eq('user_id', selected.user_id)
    await supabase.from('store_ledger').insert({
      user_id: selected.user_id,
      type: txType,
      amount,
      notes: txNotes.trim() || null,
    })

    setSaving(false)
    setSelected(null)
    fetchAccounts()
    Alert.alert('Done', `${isCredit ? 'Credited' : 'Debited'} ৳${amount.toFixed(2)} to ${(selected.profiles as any)?.full_name ?? 'employee'}`)
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const negativeCount = accounts.filter(a => (a.balance ?? 0) < 0).length

  if (loading) return <LoadingScreen />

  return (
    <View style={s.root}>
      {/* Summary */}
      <View style={s.summaryRow}>
        <Card style={s.sumCard}>
          <Text style={s.sumNum}>{accounts.length}</Text>
          <Text style={s.sumLabel}>Total Accounts</Text>
        </Card>
        <Card style={s.sumCard}>
          <Text style={[s.sumNum, { color: totalBalance >= 0 ? colors.green : colors.red }]}>
            ৳{Math.abs(totalBalance).toLocaleString()}
          </Text>
          <Text style={s.sumLabel}>Net Balance</Text>
        </Card>
        <Card style={s.sumCard}>
          <Text style={[s.sumNum, { color: negativeCount > 0 ? colors.red : colors.slate400 }]}>{negativeCount}</Text>
          <Text style={s.sumLabel}>In Debt</Text>
        </Card>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={s.listWrap}>
          {accounts.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={44} color={colors.slate600} />
              <Text style={s.emptyText}>No accounts found</Text>
            </View>
          ) : (
            accounts.map(a => {
              const profile = a.profiles as any
              const name = profile?.full_name ?? profile?.email ?? a.user_id.slice(0, 8)
              const bal = a.balance ?? 0
              const balColor = bal >= 0 ? colors.green : colors.red
              return (
                <Card key={a.user_id} style={s.card}>
                  <View style={s.cardRow}>
                    <View style={s.avatarWrap}>
                      <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empName} numberOfLines={1}>{name}</Text>
                      {profile?.email ? <Text style={s.empEmail} numberOfLines={1}>{profile.email}</Text> : null}
                    </View>
                    <View style={s.balRight}>
                      <Text style={[s.balNum, { color: balColor }]}>৳{Math.abs(bal).toLocaleString()}</Text>
                      {bal < 0 && <Text style={{ color: colors.red, fontSize: 10, fontWeight: '700' }}>DEBT</Text>}
                    </View>
                    <TouchableOpacity style={s.txBtn} onPress={() => openTransaction(a)}>
                      <Ionicons name="swap-horizontal-outline" size={18} color={colors.gold} />
                    </TouchableOpacity>
                  </View>
                </Card>
              )
            })
          )}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Transaction Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Account Transaction</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>
            {selected && (
              <>
                <Text style={s.empNameModal}>
                  {(selected.profiles as any)?.full_name ?? (selected.profiles as any)?.email ?? 'Employee'}
                </Text>
                <Text style={s.currentBal}>
                  Balance: <Text style={{ color: (selected.balance ?? 0) >= 0 ? colors.green : colors.red, fontWeight: '800' }}>
                    ৳{(selected.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </Text>

                <Text style={s.label}>Transaction Type</Text>
                <View style={s.typeRow}>
                  {(['credit', 'debit', 'penalty'] as const).map(t => (
                    <TouchableOpacity key={t} style={[s.typeChip, txType === t && s.typeChipActive]} onPress={() => setTxType(t)}>
                      <Text style={[s.typeChipText, txType === t && s.typeChipTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>Amount (৳)</Text>
                <TextInput style={s.input} value={txAmount} onChangeText={setTxAmount} placeholder="0.00" placeholderTextColor={colors.slate500} keyboardType="decimal-pad" />

                <Text style={s.label}>Notes (optional)</Text>
                <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]} value={txNotes} onChangeText={setTxNotes} placeholder="Reason for transaction..." placeholderTextColor={colors.slate500} multiline />

                <Button title={saving ? 'Processing...' : 'Apply Transaction'} onPress={handleTransaction} loading={saving} style={{ marginTop: 16 }} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 },
  sumCard: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  sumNum: { color: colors.white, fontSize: 16, fontWeight: '800' },
  sumLabel: { color: colors.slate400, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  listWrap: { paddingHorizontal: 12, paddingTop: 8 },
  card: { marginBottom: 8, padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue + '33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.blue, fontSize: 16, fontWeight: '800' },
  empName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  empEmail: { color: colors.slate500, fontSize: 11, marginTop: 1 },
  balRight: { alignItems: 'flex-end', marginRight: 8 },
  balNum: { fontSize: 15, fontWeight: '800' },
  txBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  modalSheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  empNameModal: { color: colors.white, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  currentBal: { color: colors.slate400, fontSize: 13, marginBottom: 8 },
  label: { color: colors.slate400, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', borderWidth: 1, borderColor: colors.slate700 },
  typeChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeChipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: colors.navy },
  input: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.white, fontSize: 14, borderWidth: 1, borderColor: colors.slate700 },
})
