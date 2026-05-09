import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

const SCREEN_H = Dimensions.get('window').height

const CATEGORIES = [
  'Monthly Allocation',
  'Employee Payment',
  'Purchase',
  'Refund',
  'Reversal',
  'Correction',
  'Penalty',
  'Bonus Or Reward',
  'Other',
]

interface EmployeeAccount {
  user_id: string
  balance: number
  profiles: { full_name: string | null; email: string | null } | null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AccountsAdmin() {
  const { user } = useAuthContext()
  const [accounts, setAccounts] = useState<EmployeeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [entryType, setEntryType] = useState<'Deposit' | 'Withdrawal'>('Deposit')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Monthly Allocation')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(todayStr())
  const [effectiveMonth, setEffectiveMonth] = useState(currentMonthStr())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('store_accounts')
      .select('user_id,balance,profiles(full_name,email)')
      .order('balance', { ascending: false })
    setAccounts((data as EmployeeAccount[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])
  const onRefresh = () => { setRefreshing(true); fetchAccounts() }

  const openModal = (preselect?: string) => {
    setSelectedUserId(preselect ?? '')
    setEntryType('Deposit')
    setAmount('')
    setCategory('Monthly Allocation')
    setEffectiveDate(todayStr())
    setEffectiveMonth(currentMonthStr())
    setNotes('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedUserId) { Alert.alert('Validation', 'Please select an employee.'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { Alert.alert('Validation', 'Enter a valid amount.'); return }

    const account = accounts.find(a => a.user_id === selectedUserId)
    if (!account) return

    setSaving(true)
    try {
      const isDeposit = entryType === 'Deposit'
      const newBalance = isDeposit
        ? (account.balance ?? 0) + amt
        : (account.balance ?? 0) - amt

      const { error: balErr } = await supabase
        .from('store_accounts')
        .update({ balance: newBalance })
        .eq('user_id', selectedUserId)
      if (balErr) throw balErr

      const { error: ledErr } = await supabase.from('store_ledger').insert({
        user_id: selectedUserId,
        type: isDeposit ? 'credit' : 'debit',
        amount: amt,
        notes: notes.trim() || null,
        category,
        effective_date: effectiveDate || null,
        effective_month: effectiveMonth || null,
        created_by: user?.id ?? null,
      })
      if (ledErr) throw ledErr

      await fetchAccounts()
      setShowModal(false)
      Alert.alert('Saved', `${entryType} of ৳${amt.toFixed(2)} saved successfully.`)
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const positiveCount = accounts.filter(a => (a.balance ?? 0) >= 0).length
  const negativeCount = accounts.filter(a => (a.balance ?? 0) < 0).length

  if (loading) return <LoadingScreen />

  const selectedAccount = accounts.find(a => a.user_id === selectedUserId)

  return (
    <View style={s.root}>
      {/* Summary row */}
      <View style={s.summaryRow}>
        <Card style={s.sumCard}>
          <Text style={s.sumNum}>{accounts.length}</Text>
          <Text style={s.sumLabel}>Total{'\n'}Accounts</Text>
        </Card>
        <Card style={s.sumCard}>
          <Text style={[s.sumNum, { color: totalBalance >= 0 ? colors.green : colors.red }]}>
            ৳{Math.abs(totalBalance).toLocaleString()}
          </Text>
          <Text style={s.sumLabel}>Net{'\n'}Balance</Text>
        </Card>
        <Card style={s.sumCard}>
          <Text style={[s.sumNum, { color: colors.green }]}>{positiveCount}</Text>
          <Text style={s.sumLabel}>Positive{'\n'}Bal</Text>
        </Card>
        <Card style={s.sumCard}>
          <Text style={[s.sumNum, { color: negativeCount > 0 ? colors.red : colors.slate400 }]}>{negativeCount}</Text>
          <Text style={s.sumLabel}>In{'\n'}Debt</Text>
        </Card>
      </View>

      {/* Add button */}
      <TouchableOpacity style={s.addBar} onPress={() => openModal()} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color={colors.navy} />
        <Text style={s.addBarText}>Add Deposit / Withdrawal</Text>
      </TouchableOpacity>

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
                      <Text style={s.avatarText}>{(name as string).charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empName} numberOfLines={1}>{name}</Text>
                      {profile?.email ? <Text style={s.empEmail} numberOfLines={1}>{profile.email}</Text> : null}
                    </View>
                    <View style={s.balRight}>
                      <Text style={[s.balNum, { color: balColor }]}>৳{Math.abs(bal).toLocaleString()}</Text>
                      {bal < 0 && <Text style={s.debtLabel}>DEBT</Text>}
                    </View>
                    <TouchableOpacity style={s.txBtn} onPress={() => openModal(a.user_id)}>
                      <Ionicons name="swap-horizontal-outline" size={18} color={colors.gold} />
                    </TouchableOpacity>
                  </View>
                </Card>
              )
            })
          )}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Add Deposit/Withdrawal Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={[s.modalCard, { maxHeight: SCREEN_H * 0.92 }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Add Deposit / Withdrawal</Text>
                <Text style={s.modalSub}>Deposit or withdraw employee balance</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              {/* Employee */}
              <Text style={s.label}>Employee</Text>
              <View style={s.pickerBox}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {accounts.map(a => {
                    const profile = a.profiles as any
                    const name = profile?.full_name ?? profile?.email ?? a.user_id.slice(0, 8)
                    const active = selectedUserId === a.user_id
                    return (
                      <TouchableOpacity
                        key={a.user_id}
                        style={[s.empChip, active && s.empChipActive]}
                        onPress={() => setSelectedUserId(a.user_id)}
                      >
                        <View style={[s.empChipAvatar, active && { backgroundColor: colors.navy }]}>
                          <Text style={[s.empChipInitial, active && { color: colors.gold }]}>
                            {(name as string).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[s.empChipName, active && { color: colors.gold }]} numberOfLines={1}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
              {selectedAccount && (
                <Text style={s.currentBal}>
                  Current balance: <Text style={{ color: (selectedAccount.balance ?? 0) >= 0 ? colors.green : colors.red, fontWeight: '700' }}>
                    ৳{(selectedAccount.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </Text>
              )}

              {/* Entry Type */}
              <Text style={s.label}>Entry Type</Text>
              <View style={s.typeRow}>
                {(['Deposit', 'Withdrawal'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, entryType === t && { backgroundColor: t === 'Deposit' ? colors.green : colors.red, borderColor: t === 'Deposit' ? colors.green : colors.red }]}
                    onPress={() => setEntryType(t)}
                  >
                    <Ionicons
                      name={t === 'Deposit' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                      size={16}
                      color={entryType === t ? colors.white : colors.slate400}
                    />
                    <Text style={[s.typeChipText, entryType === t && { color: colors.white }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={s.label}>Amount (৳)</Text>
              <TextInput
                style={s.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.slate500}
                keyboardType="decimal-pad"
              />

              {/* Category */}
              <Text style={s.label}>Category</Text>
              <TouchableOpacity style={s.dropdownBtn} onPress={() => setShowCategoryPicker(true)}>
                <Text style={s.dropdownText}>{category}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.slate400} />
              </TouchableOpacity>

              {/* Effective Date & Month */}
              <View style={s.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Effective Date</Text>
                  <TextInput
                    style={s.input}
                    value={effectiveDate}
                    onChangeText={setEffectiveDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.slate500}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Effective Month</Text>
                  <TextInput
                    style={s.input}
                    value={effectiveMonth}
                    onChangeText={setEffectiveMonth}
                    placeholder="YYYY-MM"
                    placeholderTextColor={colors.slate500}
                  />
                </View>
              </View>

              {/* Notes */}
              <Text style={s.label}>Reason / Notes</Text>
              <TextInput
                style={[s.input, s.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional context for this balance entry"
                placeholderTextColor={colors.slate500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <Text style={s.saveBtnText}>Save Entry</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={s.catOverlay} onPress={() => setShowCategoryPicker(false)} activeOpacity={1}>
          <View style={s.catCard}>
            <Text style={s.catTitle}>Select Category</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catRow, category === cat && s.catRowActive]}
                onPress={() => { setCategory(cat); setShowCategoryPicker(false) }}
              >
                <Text style={[s.catRowText, category === cat && { color: colors.gold, fontWeight: '700' }]}>{cat}</Text>
                {category === cat && <Ionicons name="checkmark" size={16} color={colors.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  summaryRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 8 },
  sumCard: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  sumNum: { color: colors.white, fontSize: 14, fontWeight: '800' },
  sumLabel: { color: colors.slate400, fontSize: 9, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
  addBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.gold, marginHorizontal: 12, marginBottom: 10,
    borderRadius: 12, paddingVertical: 12,
  },
  addBarText: { color: colors.navy, fontWeight: '800', fontSize: 14 },
  scroll: { flex: 1 },
  listWrap: { paddingHorizontal: 12 },
  card: { marginBottom: 8, padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue + '33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.blue, fontSize: 16, fontWeight: '800' },
  empName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  empEmail: { color: colors.slate500, fontSize: 11, marginTop: 1 },
  balRight: { alignItems: 'flex-end', marginRight: 8 },
  balNum: { fontSize: 15, fontWeight: '800' },
  debtLabel: { color: colors.red, fontSize: 10, fontWeight: '700' },
  txBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  // Modal
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700,
  },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '800' },
  modalSub: { color: colors.slate400, fontSize: 11, marginTop: 2 },
  label: { color: colors.slate400, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  // Employee picker
  pickerBox: { borderWidth: 1, borderColor: colors.slate700, borderRadius: 10, backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 6 },
  empChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20,
    borderWidth: 1, borderColor: colors.slate700, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.navyLight,
  },
  empChipActive: { borderColor: colors.gold, backgroundColor: colors.gold + '22' },
  empChipAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blue + '33', alignItems: 'center', justifyContent: 'center' },
  empChipInitial: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  empChipName: { color: colors.slate300, fontSize: 12, fontWeight: '600', maxWidth: 90 },
  currentBal: { color: colors.slate400, fontSize: 12, marginTop: 6 },
  // Entry type
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: colors.navy,
    borderWidth: 1, borderColor: colors.slate700,
  },
  typeChipText: { color: colors.slate400, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.white, fontSize: 14, borderWidth: 1, borderColor: colors.slate700,
  },
  // Category dropdown
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.slate700,
  },
  dropdownText: { color: colors.white, fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.slate700, backgroundColor: colors.navy,
  },
  cancelText: { color: colors.slate400, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: colors.gold,
  },
  saveBtnText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  // Category picker
  catOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', paddingHorizontal: 24 },
  catCard: { backgroundColor: colors.navyLight, borderRadius: 16, padding: 16 },
  catTitle: { color: colors.white, fontSize: 15, fontWeight: '800', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 + '55' },
  catRowActive: { backgroundColor: colors.gold + '11' },
  catRowText: { color: colors.slate300, fontSize: 14 },
})
