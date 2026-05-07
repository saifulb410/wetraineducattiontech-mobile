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

interface Product {
  id: string
  name: string
  price: number
  status: string
  barcode: string | null
  store_stocks: { on_hand: number } | null
}

export default function Products() {
  const { roles } = useAuthContext()
  const isAdmin = roles?.storeRole === 'ADMIN'

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active')
  const [saving, setSaving] = useState(false)

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('store_products')
      .select('id,name,price,status,barcode,store_stocks(on_hand)')
      .order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchProducts() }, [])
  const onRefresh = () => { setRefreshing(true); fetchProducts() }

  const openAdd = () => {
    setEditTarget(null)
    setFormName(''); setFormPrice(''); setFormBarcode(''); setFormStatus('active')
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditTarget(p)
    setFormName(p.name)
    setFormPrice(String(p.price))
    setFormBarcode(p.barcode ?? '')
    setFormStatus(p.status as any)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPrice.trim()) { Alert.alert('Validation', 'Name and price are required.'); return }
    const price = parseFloat(formPrice)
    if (isNaN(price) || price < 0) { Alert.alert('Validation', 'Enter a valid price.'); return }

    setSaving(true)
    if (editTarget) {
      await supabase.from('store_products').update({
        name: formName.trim(), price, barcode: formBarcode.trim() || null, status: formStatus,
      }).eq('id', editTarget.id)
    } else {
      await supabase.from('store_products').insert({
        name: formName.trim(), price, barcode: formBarcode.trim() || null, status: formStatus,
      })
    }
    setSaving(false)
    setShowForm(false)
    fetchProducts()
  }

  const handleDelete = (p: Product) => {
    Alert.alert('Delete Product', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('store_products').delete().eq('id', p.id)
          fetchProducts()
        }
      }
    ])
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={15} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or barcode..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color={colors.slate400} />
            </TouchableOpacity>
          ) : null}
        </View>
        {isAdmin && (
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color={colors.navy} />
          </TouchableOpacity>
        )}
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
              const isActive = p.status === 'active'
              const lowStock = onHand <= 5 && onHand > 0
              const outOfStock = onHand === 0
              return (
                <Card key={p.id} style={[s.card, !isActive && s.cardInactive]}>
                  <View style={s.cardRow}>
                    <View style={[s.iconBox, { backgroundColor: isActive ? colors.gold + '22' : colors.slate700 }]}>
                      <Ionicons name="cube-outline" size={20} color={isActive ? colors.gold : colors.slate500} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.name, !isActive && { color: colors.slate500 }]} numberOfLines={1}>{p.name}</Text>
                      <View style={s.metaRow}>
                        <Text style={s.price}>৳{p.price}</Text>
                        {p.barcode ? <Text style={s.barcode}>{p.barcode}</Text> : null}
                        <View style={[s.badge, {
                          backgroundColor: outOfStock ? colors.red + '22' : lowStock ? colors.amber + '22' : colors.green + '22'
                        }]}>
                          <Text style={[s.badgeText, {
                            color: outOfStock ? colors.red : lowStock ? colors.amber : colors.green
                          }]}>
                            {outOfStock ? 'Out' : `${onHand} left`}
                          </Text>
                        </View>
                        {!isActive && (
                          <View style={s.inactiveBadge}>
                            <Text style={s.inactiveBadgeText}>Inactive</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {isAdmin && (
                      <View style={s.actionRow}>
                        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(p)}>
                          <Ionicons name="pencil-outline" size={15} color={colors.gold} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(p)}>
                          <Ionicons name="trash-outline" size={15} color={colors.red} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Card>
              )
            })
          )}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Product' : 'Add Product'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Name *</Text>
              <TextInput style={s.input} value={formName} onChangeText={setFormName} placeholder="Product name" placeholderTextColor={colors.slate500} />

              <Text style={s.label}>Price (৳) *</Text>
              <TextInput style={s.input} value={formPrice} onChangeText={setFormPrice} placeholder="0.00" placeholderTextColor={colors.slate500} keyboardType="decimal-pad" />

              <Text style={s.label}>Barcode</Text>
              <TextInput style={s.input} value={formBarcode} onChangeText={setFormBarcode} placeholder="Optional barcode" placeholderTextColor={colors.slate500} />

              <Text style={s.label}>Status</Text>
              <View style={s.statusRow}>
                {(['active', 'inactive'] as const).map(st => (
                  <TouchableOpacity key={st} style={[s.statusChip, formStatus === st && s.statusChipActive]} onPress={() => setFormStatus(st)}>
                    <Text style={[s.statusChipText, formStatus === st && s.statusChipTextActive]}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button title={saving ? 'Saving...' : 'Save Product'} onPress={handleSave} loading={saving} style={{ marginTop: 16, marginBottom: 8 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navyLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.slate700 },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  listWrap: { paddingHorizontal: 12 },
  card: { marginBottom: 8, padding: 10 },
  cardInactive: { opacity: 0.5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  price: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  barcode: { color: colors.slate500, fontSize: 11 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  inactiveBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.slate700 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: colors.slate400 },
  actionRow: { flexDirection: 'row', gap: 6 },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.red + '22', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  modalSheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  label: { color: colors.slate400, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.white, fontSize: 14, borderWidth: 1, borderColor: colors.slate700 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', borderWidth: 1, borderColor: colors.slate700 },
  statusChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  statusChipText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  statusChipTextActive: { color: colors.navy },
})
