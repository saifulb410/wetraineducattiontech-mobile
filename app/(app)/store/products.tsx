import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  RefreshControl, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

const SCREEN_H = Dimensions.get('window').height

interface Product {
  id: string
  name: string
  unit_price: number
  is_active: boolean
  barcode: string | null
  store_stock_movements: { quantity_delta: number }[]
}

export default function Products() {
  const { user, roles } = useAuthContext()
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
  const [formActive, setFormActive] = useState(true)
  const [formQty, setFormQty] = useState('0')
  const [saving, setSaving] = useState(false)
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [barcodeScanned, setBarcodeScanned] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const openBarcodeScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) { Alert.alert('Permission Denied', 'Camera access is required.'); return }
    }
    setBarcodeScanned(false)
    setBarcodeScanning(true)
  }

  const handleBarcodeScan = ({ data }: { data: string }) => {
    if (barcodeScanned) return
    setBarcodeScanned(true)
    setFormBarcode(data)
    setBarcodeScanning(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('store_products')
      .select('id,name,unit_price,is_active,barcode,store_stock_movements(quantity_delta)')
      .order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchProducts() }, [])
  const onRefresh = () => { setRefreshing(true); fetchProducts() }

  const openAdd = () => {
    setEditTarget(null)
    setFormName(''); setFormPrice(''); setFormBarcode(''); setFormActive(true); setFormQty('0')
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditTarget(p)
    setFormName(p.name)
    setFormPrice(String(p.unit_price))
    setFormBarcode(p.barcode ?? '')
    setFormActive(p.is_active)
    const onHand = (p.store_stock_movements ?? []).reduce((s, m) => s + m.quantity_delta, 0)
    setFormQty(String(onHand))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPrice.trim()) { Alert.alert('Validation', 'Name and price are required.'); return }
    const price = parseFloat(formPrice)
    if (isNaN(price) || price < 0) { Alert.alert('Validation', 'Enter a valid price.'); return }

    const qty = Math.max(0, parseInt(formQty) || 0)

    setSaving(true)
    try {
      if (editTarget) {
        const { error: updateErr } = await supabase.from('store_products').update({
          name: formName.trim(), unit_price: price, barcode: formBarcode.trim() || null, is_active: formActive,
        }).eq('id', editTarget.id)
        if (updateErr) throw updateErr

        // If qty changed, add a stock entry + movement for the difference
        const currentOnHand = (editTarget.store_stock_movements ?? []).reduce((s, m) => s + m.quantity_delta, 0)
        const delta = qty - currentOnHand
        if (delta !== 0 && user) {
          const { data: entry, error: entryErr } = await supabase
            .from('store_stock_entries')
            .insert({ product_id: editTarget.id, quantity: Math.abs(delta), entered_by: user.id, note: 'Stock adjustment' })
            .select().single()
          if (entryErr) throw entryErr
          const { error: movErr } = await supabase.from('store_stock_movements').insert({
            product_id: editTarget.id,
            stock_entry_id: entry.id,
            movement_type: 'STOCK_IN',
            quantity_delta: delta,
            actor_user_id: user.id,
          })
          if (movErr) throw movErr
        }
      } else {
        const { data: newProduct, error: insertErr } = await supabase.from('store_products').insert({
          name: formName.trim(), unit_price: price, barcode: formBarcode.trim() || null, is_active: formActive,
        }).select().single()
        if (insertErr) throw insertErr

        if (newProduct && qty > 0 && user) {
          const { data: entry, error: entryErr } = await supabase
            .from('store_stock_entries')
            .insert({ product_id: newProduct.id, quantity: qty, entered_by: user.id, note: 'Initial stock' })
            .select().single()
          if (entryErr) throw entryErr
          const { error: movErr } = await supabase.from('store_stock_movements').insert({
            product_id: newProduct.id,
            stock_entry_id: entry.id,
            movement_type: 'STOCK_IN',
            quantity_delta: qty,
            actor_user_id: user.id,
          })
          if (movErr) throw movErr
        }
      }
      setShowForm(false)
      fetchProducts()
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message ?? 'Could not save product. Check Supabase table permissions (RLS).')
    } finally {
      setSaving(false)
    }
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
              const onHand = (p.store_stock_movements ?? []).reduce((s, m) => s + m.quantity_delta, 0)
              const isActive = p.is_active
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
                        <Text style={s.price}>৳{p.unit_price}</Text>
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

      {/* Add/Edit Product Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={[s.modalSheet, { maxHeight: SCREEN_H * 0.88 }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Product' : 'Add Product'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={22} color={colors.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={s.label}>Name *</Text>
              <TextInput
                style={s.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Product name"
                placeholderTextColor={colors.slate500}
              />

              <Text style={s.label}>Price (৳) *</Text>
              <TextInput
                style={s.input}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="0.00"
                placeholderTextColor={colors.slate500}
                keyboardType="decimal-pad"
              />

              <Text style={s.label}>Barcode</Text>
              <View style={s.barcodeRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={formBarcode}
                  onChangeText={setFormBarcode}
                  placeholder="Scan or type barcode"
                  placeholderTextColor={colors.slate500}
                />
                <TouchableOpacity style={s.scanIconBtn} onPress={openBarcodeScanner}>
                  <Ionicons name="barcode-outline" size={22} color={colors.navy} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Initial Stock Quantity</Text>
              <View style={s.qtyInputRow}>
                <TouchableOpacity
                  style={s.qtyCtrlBtn}
                  onPress={() => setFormQty(q => String(Math.max(0, (parseInt(q) || 0) - 1)))}
                >
                  <Ionicons name="remove" size={18} color={colors.white} />
                </TouchableOpacity>
                <TextInput
                  style={[s.input, s.qtyInput]}
                  value={formQty}
                  onChangeText={v => setFormQty(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[s.qtyCtrlBtn, { backgroundColor: colors.gold }]}
                  onPress={() => setFormQty(q => String((parseInt(q) || 0) + 1))}
                >
                  <Ionicons name="add" size={18} color={colors.navy} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Status</Text>
              <View style={s.statusRow}>
                {([true, false] as const).map(active => (
                  <TouchableOpacity
                    key={String(active)}
                    style={[s.statusChip, formActive === active && s.statusChipActive]}
                    onPress={() => setFormActive(active)}
                  >
                    <Text style={[s.statusChipText, formActive === active && s.statusChipTextActive]}>
                      {active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 24 }} />
              <Button
                title={saving ? 'Saving...' : 'Save Product'}
                onPress={handleSave}
                loading={saving}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal visible={barcodeScanning} animationType="slide" onRequestClose={() => setBarcodeScanning(false)}>
        <View style={s.scanRoot}>
          <View style={s.scanHeader}>
            <Text style={s.scanTitle}>Scan Product Barcode</Text>
            <TouchableOpacity style={s.scanClose} onPress={() => setBarcodeScanning(false)}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={s.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={barcodeScanned ? undefined : handleBarcodeScan}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'] }}
            />
            <View style={s.scanOverlay}>
              <View style={s.scanOverlayTop} />
              <View style={s.scanOverlayMiddle}>
                <View style={s.scanOverlaySide} />
                <View style={s.viewfinder}>
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  <View style={s.scanLine} />
                </View>
                <View style={s.scanOverlaySide} />
              </View>
              <View style={s.scanOverlayBottom}>
                <Text style={s.scanHint}>Point at barcode to auto-fill</Text>
              </View>
            </View>
          </View>
        </View>
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
  modalSheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  label: { color: colors.slate400, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.white, fontSize: 14, borderWidth: 1, borderColor: colors.slate700 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanIconBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  qtyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyCtrlBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.slate700, alignItems: 'center', justifyContent: 'center' },
  qtyInput: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.white },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', borderWidth: 1, borderColor: colors.slate700 },
  statusChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  statusChipText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  statusChipTextActive: { color: colors.navy },
  // Barcode scanner
  scanRoot: { flex: 1, backgroundColor: '#000' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#000' },
  scanTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  scanClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  cameraContainer: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject },
  scanOverlayTop: { flex: 1, backgroundColor: '#00000088' },
  scanOverlayMiddle: { flexDirection: 'row', height: 240 },
  scanOverlaySide: { flex: 1, backgroundColor: '#00000088' },
  viewfinder: { width: 260, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.gold },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: { position: 'absolute', top: '50%', left: 8, right: 8, height: 2, backgroundColor: colors.gold + 'AA' },
  scanOverlayBottom: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24 },
  scanHint: { color: '#ffffffaa', fontSize: 14 },
})
