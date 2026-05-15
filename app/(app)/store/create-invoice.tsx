import { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  StyleSheet, TouchableOpacity, Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
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

interface CartItem { product: Product; qty: number }

export default function CreateInvoice() {
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.storeRole === 'ADMIN'
  const [permission, requestPermission] = useCameraPermissions()

  const [products, setProducts] = useState<Product[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<{ text: string; success: boolean } | null>(null)

  const fetchProducts = async () => {
    const [productsRes, balanceRes] = await Promise.all([
      supabase.from('store_products').select('id,name,price,status,barcode,store_stocks(on_hand)').eq('status', 'active').order('name'),
      user ? supabase.from('store_accounts').select('balance').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    setProducts((productsRes.data as Product[]) ?? [])
    setBalance((balanceRes as any).data?.balance ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [user])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  const cartItems = Object.values(cart)
  const cartTotal = cartItems.reduce((s, { product, qty }) => s + product.price * qty, 0)
  const cartCount = cartItems.reduce((s, { qty }) => s + qty, 0)

  const addToCart = (product: Product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: { product, qty: (prev[product.id]?.qty ?? 0) + 1 },
    }))
  }

  const removeFromCart = (product: Product) => {
    setCart(prev => {
      const qty = (prev[product.id]?.qty ?? 0) - 1
      if (qty <= 0) {
        const next = { ...prev }
        delete next[product.id]
        return next
      }
      return { ...prev, [product.id]: { product, qty } }
    })
  }

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to scan barcodes.')
        return
      }
    }
    setScanned(false)
    setScanFeedback(null)
    setScannerOpen(true)
  }

  const handleBarcodeScan = ({ data: barcodeData }: { data: string }) => {
    if (scanned) return
    setScanned(true)

    const match = products.find(p => p.barcode === barcodeData)
    if (match) {
      const onHand = (match.store_stocks as any)?.on_hand ?? 0
      if (onHand === 0) {
        setScanFeedback({ text: `"${match.name}" is out of stock`, success: false })
      } else {
        addToCart(match)
        setScanFeedback({ text: `Added: ${match.name} (৳${match.price})`, success: true })
      }
    } else {
      setScanFeedback({ text: `No product found for: ${barcodeData}`, success: false })
    }

    // Allow scanning again after 2s
    setTimeout(() => {
      setScanned(false)
      setScanFeedback(null)
    }, 2000)
  }

  const handleSubmit = async () => {
    if (cartItems.length === 0) { Alert.alert('Empty Cart', 'Add items first.'); return }
    if (!user) return
    if (!isAdmin && balance < cartTotal) {
      Alert.alert('Insufficient Balance', `Your balance is ৳${balance.toFixed(2)} but cart total is ৳${cartTotal.toFixed(2)}. Please ask admin to top up your account.`)
      return
    }

    setSubmitting(true)

    const { data: invoice, error: invErr } = await supabase
      .from('store_invoices')
      .insert({ user_id: user.id, amount: cartTotal, status: 'confirmed', confirmed_at: new Date().toISOString() })
      .select()
      .single()

    if (invErr || !invoice) {
      setSubmitting(false)
      Alert.alert('Error', invErr?.message ?? 'Failed to create invoice')
      return
    }

    await supabase.from('store_invoice_items').insert(
      cartItems.map(({ product, qty }) => ({
        invoice_id: invoice.id,
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
        total_price: product.price * qty,
      }))
    )

    const { data: account } = await supabase
      .from('store_accounts')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    const newBalance = (account?.balance ?? 0) - cartTotal
    if (account) {
      await supabase.from('store_accounts').update({ balance: newBalance }).eq('user_id', user.id)
    } else {
      await supabase.from('store_accounts').insert({ user_id: user.id, balance: newBalance })
    }

    await supabase.from('store_ledger').insert({
      user_id: user.id,
      type: 'purchase',
      amount: cartTotal,
      notes: `Store invoice ${invoice.id.slice(0, 8).toUpperCase()}`,
    })

    setSubmitting(false)
    setCart({})
    Alert.alert(
      '✓ Invoice Created',
      `${cartCount} item${cartCount > 1 ? 's' : ''} • ৳${cartTotal.toFixed(2)} deducted\nNew balance: ৳${newBalance.toFixed(2)}`
    )
  }

  if (loading) return <LoadingScreen />

  return (
    <View style={s.root}>
      {/* Search + Scan bar */}
      <View style={s.topBar}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.slate400} />
          <TextInput
            style={s.searchInput}
            placeholder="Search products or barcode..."
            placeholderTextColor={colors.slate500}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.slate400} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={s.scanBtn} onPress={openScanner} activeOpacity={0.8}>
          <Ionicons name="barcode-outline" size={20} color={colors.navy} />
          <Text style={s.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Product list */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.listWrap}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.slate600} />
              <Text style={s.emptyText}>No products found</Text>
            </View>
          ) : (
            filtered.map(product => {
              const qty = cart[product.id]?.qty ?? 0
              const onHand = (product.store_stocks as any)?.on_hand ?? (product as any).store_stocks?.[0]?.on_hand ?? 99
              const outOfStock = onHand === 0
              return (
                <Card key={product.id} style={[s.card, outOfStock && s.cardOut]}>
                  <View style={s.cardRow}>
                    <View style={[s.iconBox, { backgroundColor: outOfStock ? colors.slate700 : colors.gold + '22' }]}>
                      <Ionicons name="cube-outline" size={20} color={outOfStock ? colors.slate600 : colors.gold} />
                    </View>
                    <View style={s.info}>
                      <Text style={[s.name, outOfStock && { color: colors.slate500 }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <View style={s.metaRow}>
                        <Text style={s.price}>৳{product.price}</Text>
                        <View style={[s.stockBadge, { backgroundColor: outOfStock ? colors.red + '22' : colors.green + '22' }]}>
                          <Text style={[s.stockText, { color: outOfStock ? colors.red : colors.green }]}>
                            {outOfStock ? 'Out of stock' : `${onHand} left`}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {!outOfStock && (
                      <View style={s.qtyRow}>
                        {qty > 0 && (
                          <TouchableOpacity style={s.qtyBtn} onPress={() => removeFromCart(product)}>
                            <Ionicons name="remove" size={14} color={colors.white} />
                          </TouchableOpacity>
                        )}
                        {qty > 0 && <Text style={s.qtyNum}>{qty}</Text>}
                        <TouchableOpacity style={s.qtyBtnAdd} onPress={() => addToCart(product)}>
                          <Ionicons name="add" size={14} color={colors.navy} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Card>
              )
            })
          )}
          <View style={{ height: cartCount > 0 ? 120 : 20 }} />
        </View>
      </ScrollView>

      {/* Balance bar - always visible for employees */}
      {!isAdmin && (
        <View style={[s.balanceBar, { borderTopColor: balance <= 0 ? colors.red + '55' : colors.slate700 }]}>
          <Ionicons name="wallet-outline" size={14} color={balance <= 0 ? colors.red : colors.green} />
          <Text style={[s.balanceBarText, { color: balance <= 0 ? colors.red : colors.slate400 }]}>
            Balance: <Text style={{ color: balance <= 0 ? colors.red : colors.green, fontWeight: '800' }}>৳{balance.toFixed(2)}</Text>
          </Text>
          {cartCount > 0 && balance < cartTotal && (
            <View style={s.warnBadge}>
              <Text style={s.warnText}>Insufficient</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom checkout bar */}
      {cartCount > 0 && (
        <View style={s.checkoutBar}>
          <View style={s.checkoutInfo}>
            <Text style={s.checkoutCount}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</Text>
            <Text style={s.checkoutTotal}>৳{cartTotal.toFixed(2)}</Text>
          </View>
          <Button
            title={submitting ? 'Creating...' : 'Create Invoice'}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      )}

      {/* Barcode Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={s.scanRoot}>
          {/* Header */}
          <View style={s.scanHeader}>
            <Text style={s.scanTitle}>Scan Barcode</Text>
            <TouchableOpacity style={s.scanClose} onPress={() => setScannerOpen(false)}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Camera + overlay in a relative container */}
          <View style={s.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'] }}
            />
            {/* Viewfinder overlay — absolutely positioned over camera */}
            <View style={s.overlay}>
              <View style={s.overlayTop} />
              <View style={s.overlayMiddle}>
                <View style={s.overlaySide} />
                <View style={s.viewfinder}>
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  <View style={s.scanLine} />
                </View>
                <View style={s.overlaySide} />
              </View>
              <View style={s.overlayBottom}>
                {scanFeedback ? (
                  <View style={[s.feedbackBox, { backgroundColor: scanFeedback.success ? colors.green + 'DD' : colors.red + 'DD' }]}>
                    <Ionicons name={scanFeedback.success ? 'checkmark-circle' : 'close-circle'} size={18} color={colors.white} />
                    <Text style={s.feedbackText}>{scanFeedback.text}</Text>
                  </View>
                ) : (
                  <Text style={s.scanHint}>Point camera at a barcode</Text>
                )}
              </View>
            </View>
          </View>

          {/* Cart summary while scanning */}
          {cartCount > 0 && (
            <View style={s.scanCartBar}>
              <Ionicons name="cart-outline" size={18} color={colors.gold} />
              <Text style={s.scanCartText}>{cartCount} item{cartCount > 1 ? 's' : ''} • ৳{cartTotal.toFixed(2)}</Text>
              <TouchableOpacity style={s.scanDoneBtn} onPress={() => setScannerOpen(false)}>
                <Text style={s.scanDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

const CORNER_SIZE = 24
const CORNER_THICKNESS = 3

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navyLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.slate700 },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  scanBtnText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  scroll: { flex: 1 },
  listWrap: { paddingHorizontal: 12 },
  card: { marginBottom: 8, padding: 10 },
  cardOut: { opacity: 0.45 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: colors.white, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  price: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  stockBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  stockText: { fontSize: 10, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.slate700, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 15, minWidth: 20, textAlign: 'center' },
  balanceBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.navyLight, borderTopWidth: 1 },
  balanceBarText: { flex: 1, fontSize: 12 },
  warnBadge: { backgroundColor: colors.red + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  warnText: { color: colors.red, fontSize: 11, fontWeight: '700' },
  checkoutBar: { padding: 16, paddingBottom: 24, backgroundColor: colors.navyLight, borderTopWidth: 1, borderTopColor: colors.slate700 },
  checkoutInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  checkoutCount: { color: colors.slate400, fontSize: 13 },
  checkoutTotal: { color: colors.gold, fontWeight: '900', fontSize: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  // Scanner
  scanRoot: { flex: 1, backgroundColor: '#000' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#000' },
  scanTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  scanClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  cameraContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: '#00000088' },
  overlayMiddle: { flexDirection: 'row', height: 240 },
  overlaySide: { flex: 1, backgroundColor: '#00000088' },
  viewfinder: { width: 260, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: colors.gold },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  scanLine: { position: 'absolute', top: '50%', left: 8, right: 8, height: 2, backgroundColor: colors.gold + 'AA' },
  overlayBottom: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24 },
  scanHint: { color: '#ffffffaa', fontSize: 14 },
  feedbackBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  feedbackText: { color: colors.white, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  scanCartBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.navyLight, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.slate700 },
  scanCartText: { flex: 1, color: colors.white, fontSize: 14, fontWeight: '600' },
  scanDoneBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  scanDoneText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
})
