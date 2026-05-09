import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface StockProduct {
  id: string
  name: string
  price: number
  status: string
  store_stocks: { on_hand: number } | null
}

export default function Stocks() {
  const { roles } = useAuthContext()
  const isAdmin = roles?.storeRole === 'ADMIN'

  const [products, setProducts] = useState<StockProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<StockProduct | null>(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjType, setAdjType] = useState<'add' | 'remove' | 'set'>('add')
  const [saving, setSaving] = useState(false)

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('store_products')
      .select('id,name,price,status,store_stocks(on_hand)')
      .eq('status', 'active')
      .order('name')
    setProducts((data as StockProduct[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchProducts() }, [])
  const onRefresh = () => { setRefreshing(true); fetchProducts() }

  const openAdjust = (p: StockProduct) => {
    if (!isAdmin) return
    setSelected(p)
    setAdjQty('')
    setAdjType('add')
  }

  const handleAdjust = async () => {
    if (!selected) return
    const qty = parseInt(adjQty)
    if (isNaN(qty) || qty < 0) { Alert.alert('Validation', 'Enter a valid quantity.'); return }

    const currentOnHand = (selected.store_stocks as any)?.on_hand ?? 0
    let newOnHand = currentOnHand
    if (adjType === 'add') newOnHand = currentOnHand + qty
    else if (adjType === 'remove') newOnHand = Math.max(0, currentOnHand - qty)
    else newOnHand = qty

    setSaving(true)
    const { data: existing } = await supabase.from('store_stocks').select('id').eq('product_id', selected.id).maybeSingle()
    if (existing) {
      await supabase.from('store_stocks').update({ on_hand: newOnHand }).eq('product_id', selected.id)
    } else {
      await supabase.from('store_stocks').insert({ product_id: selected.id, on_hand: newOnHand })
    }
    setSaving(false)
    setSelected(null)
    fetchProducts()
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const lowStockCount = products.filter(p => {
    const oh = (p.store_stocks as any)?.on_hand ?? 0
    return oh <= 5
  }).length

  if (loading) return <LoadingScreen />

  return (
    <View style={s.root}>
      {/* Alert banner */}
      {lowStockCount > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning-outline" size={14} color={colors.amber} />
          <Text style={s.alertText}>{lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low</Text>
        </View>
      )}

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={15} color={colors.slate400} />
        <TextInput style={s.searchInput} placeholder="Search products..." placeholderTextColor={colors.slate500} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={15} color={colors.slate400} /></TouchableOpacity> : null}
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={s.listWrap}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.slate600} />
              <Text style={s.emptyText}>No products found</Text>
            </View>
          ) : (
            filtered.map(p => {
              const onHand = (p.store_stocks as any)?.on_hand ?? (p as any).store_stocks?.[0]?.on_hand ?? 0
              const isOut = onHand === 0
              const isLow = onHand > 0 && onHand <= 5
              const stockColor = isOut ? colors.red : isLow ? colors.amber : colors.green
              return (
                <Card key={p.id} style={s.card}>
                  <View style={s.cardRow}>
                    <View style={[s.iconBox, { backgroundColor: stockColor + '18' }]}>
                      <Ionicons name="cube-outline" size={20} color={stockColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.priceText}>৳{p.price}</Text>
                    </View>
                    <View style={s.stockRight}>
                      <Text style={[s.stockNum, { color: stockColor }]}>{onHand}</Text>
                      <Text style={s.stockLabel}>on hand</Text>
                    </View>
                    {isAdmin && (
                      <TouchableOpacity style={s.adjustBtn} onPress={() => openAdjust(p)}>
                        <Ionicons name="options-outline" size={18} color={colors.gold} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              )
            })
          )}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Adjust Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Adjust Stock</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>
            {selected && (
              <>
                <Text style={s.productName}>{selected.name}</Text>
                <Text style={s.currentStock}>
                  Current: <Text style={{ color: colors.gold, fontWeight: '800' }}>
                    {(selected.store_stocks as any)?.on_hand ?? 0} units
                  </Text>
                </Text>

                <Text style={s.label}>Adjustment Type</Text>
                <View style={s.typeRow}>
                  {(['add', 'remove', 'set'] as const).map(t => (
                    <TouchableOpacity key={t} style={[s.typeChip, adjType === t && s.typeChipActive]} onPress={() => setAdjType(t)}>
                      <Text style={[s.typeChipText, adjType === t && s.typeChipTextActive]}>
                        {t === 'add' ? '+ Add' : t === 'remove' ? '− Remove' : '= Set to'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>Quantity</Text>
                <TextInput
                  style={s.input}
                  value={adjQty}
                  onChangeText={setAdjQty}
                  placeholder="Enter quantity"
                  placeholderTextColor={colors.slate500}
                  keyboardType="number-pad"
                />
                <View style={{ marginTop: 32 }}>
                  <Button title={saving ? 'Saving...' : 'Apply Adjustment'} onPress={handleAdjust} loading={saving} />
                </View>
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
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.amber + '18', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.amber + '30' },
  alertText: { color: colors.amber, fontSize: 12, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: colors.navyLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.slate700 },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  scroll: { flex: 1 },
  listWrap: { paddingHorizontal: 12 },
  card: { marginBottom: 8, padding: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 13, fontWeight: '600' },
  priceText: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  stockRight: { alignItems: 'center', marginRight: 8 },
  stockNum: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  stockLabel: { color: colors.slate500, fontSize: 10, fontWeight: '600' },
  adjustBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  modalSheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  productName: { color: colors.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  currentStock: { color: colors.slate400, fontSize: 13, marginBottom: 8 },
  label: { color: colors.slate400, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', borderWidth: 1, borderColor: colors.slate700 },
  typeChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeChipText: { color: colors.slate400, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: colors.navy },
  input: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.white, fontSize: 14, borderWidth: 1, borderColor: colors.slate700 },
})
