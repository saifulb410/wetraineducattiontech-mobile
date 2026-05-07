import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, Alert,
  StyleSheet, TouchableOpacity,
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

interface CartItem { product: Product; qty: number }

export default function CreateInvoice() {
  const { user } = useAuthContext()

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('store_products')
      .select('id,name,price,status,barcode,store_stocks(on_hand)')
      .eq('status', 'active')
      .order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

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

  const handleSubmit = async () => {
    if (cartItems.length === 0) { Alert.alert('Empty Cart', 'Add items first.'); return }
    if (!user) return

    setSubmitting(true)

    // Create invoice
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

    // Insert items
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

    // Update account balance
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

    // Add ledger entry
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
      {/* Search bar */}
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
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: colors.navyLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.slate700 },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
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
  checkoutBar: { padding: 16, paddingBottom: 24, backgroundColor: colors.navyLight, borderTopWidth: 1, borderTopColor: colors.slate700 },
  checkoutInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  checkoutCount: { color: colors.slate400, fontSize: 13 },
  checkoutTotal: { color: colors.gold, fontWeight: '900', fontSize: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
})
