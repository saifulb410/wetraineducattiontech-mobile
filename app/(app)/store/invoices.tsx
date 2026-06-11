import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Invoice {
  id: string
  total_amount: number
  status: string
  notes: string | null
  confirmed_at: string | null
  created_at: string
}

interface InvoiceItem {
  id: string
  quantity: number
  unit_price: number
  line_total: number
  store_products: { name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: colors.green,
  PENDING: colors.amber,
  CANCELLED: colors.red,
}

const FILTERS = ['All', 'PENDING', 'CONFIRMED', 'CANCELLED']

export default function Invoices() {
  const router = useRouter()
  const { user, roles } = useAuthContext()
  const isAdmin = roles?.profileRole === 'admin'

  const [all, setAll] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [detailInv, setDetailInv] = useState<Invoice | null>(null)
  const [detailItems, setDetailItems] = useState<InvoiceItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchData = async () => {
    if (!user) return
    let q = supabase
      .from('store_invoices')
      .select('id,total_amount,status,notes,confirmed_at,created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!isAdmin) q = q.eq('user_id', user.id)

    const { data } = await q
    setAll((data as Invoice[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  const openDetail = async (inv: Invoice) => {
    setDetailInv(inv)
    setDetailItems([])
    setDetailLoading(true)
    const { data } = await supabase
      .from('store_invoice_items')
      .select('id,quantity,unit_price,line_total,store_products(name)')
      .eq('invoice_id', inv.id)
      .order('id')
    setDetailItems((data as InvoiceItem[]) ?? [])
    setDetailLoading(false)
  }

  useEffect(() => { fetchData() }, [user])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = filter === 'All' ? all : all.filter(i => i.status === filter)
  const totalAmount = filtered.reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const filterLabel = (f: string) => {
    if (f === 'All') return 'All'
    return f.charAt(0) + f.slice(1).toLowerCase()
  }

  if (loading) return <LoadingScreen />

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
      <View style={s.container}>
        {/* Summary */}
        <Card style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View>
              <Text style={s.summaryLabel}>{filter === 'All' ? 'Total Invoices' : `${filterLabel(filter)} Invoices`}</Text>
              <Text style={s.summaryCount}>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.summaryRight}>
              <Text style={s.summaryAmountLabel}>Total Amount</Text>
              <Text style={s.summaryAmount}>৳{totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {filterLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.slate600} />
            <Text style={s.emptyText}>No {filter === 'All' ? '' : filterLabel(filter)} invoices</Text>
          </Card>
        ) : (
          filtered.map(inv => {
            const statusColor = STATUS_COLORS[inv.status] ?? colors.slate400
            const date = new Date(inv.created_at)
            return (
              <TouchableOpacity key={inv.id} onPress={() => openDetail(inv)} activeOpacity={0.8}>
              <Card style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invoiceId}>INV-{inv.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={s.invoiceDate}>
                      {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.invoiceAmount}>৳{(inv.total_amount ?? 0).toLocaleString()}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>{filterLabel(inv.status)}</Text>
                    </View>
                  </View>
                </View>

                {inv.notes ? (
                  <Text style={s.notes} numberOfLines={2}>{inv.notes}</Text>
                ) : null}

                {inv.confirmed_at && inv.status === 'CONFIRMED' && (
                  <View style={s.confirmedRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                    <Text style={s.confirmedText}>
                      Confirmed {new Date(inv.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
                <View style={s.tapHint}>
                  <Text style={s.tapHintText}>Tap to view items</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.slate600} />
                </View>
              </Card>
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </ScrollView>

    {/* Invoice Detail Modal */}
    <Modal visible={!!detailInv} animationType="slide" transparent onRequestClose={() => setDetailInv(null)}>
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          {/* Header */}
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalId}>INV-{detailInv?.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={s.modalDate}>
                {detailInv ? new Date(detailInv.created_at).toLocaleString('en-GB') : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {detailInv && (
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[detailInv.status] ?? colors.slate400) + '22' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLORS[detailInv.status] ?? colors.slate400 }]}>{filterLabel(detailInv.status)}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setDetailInv(null)}>
                <Ionicons name="close-circle" size={24} color={colors.slate400} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Items */}
          <Text style={s.itemsLabel}>Items Purchased</Text>
          {detailLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
          ) : detailItems.length === 0 ? (
            <Text style={s.noItems}>No items found</Text>
          ) : (
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {detailItems.map((item, i) => (
                <View key={item.id} style={[s.itemRow, i < detailItems.length - 1 && s.itemBorder]}>
                  <View style={s.itemDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.store_products?.name ?? '—'}</Text>
                    <Text style={s.itemUnit}>৳{item.unit_price} × {item.quantity}</Text>
                  </View>
                  <Text style={s.itemTotal}>৳{item.line_total.toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>৳{(detailInv?.total_amount ?? 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  summaryCard: { marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.slate400, fontSize: 12 },
  summaryCount: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryAmountLabel: { color: colors.slate400, fontSize: 12 },
  summaryAmount: { color: colors.gold, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  filterRow: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.slate700, marginRight: 8 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.slate400, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  invoiceId: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  invoiceDate: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  invoiceAmount: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  notes: { color: colors.slate400, fontSize: 12, marginBottom: 6 },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedText: { color: colors.green, fontSize: 11 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.slate400, fontSize: 14 },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6, gap: 2 },
  tapHintText: { color: colors.slate600, fontSize: 10 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  modalId: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  modalDate: { color: colors.slate400, fontSize: 12, marginTop: 3 },
  itemsLabel: { color: colors.slate400, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  noItems: { color: colors.slate500, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.slate700 + '55' },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  itemName: { color: colors.white, fontSize: 13, fontWeight: '600' },
  itemUnit: { color: colors.slate400, fontSize: 11, marginTop: 2 },
  itemTotal: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.slate700 },
  totalLabel: { color: colors.slate400, fontSize: 13, fontWeight: '700' },
  totalAmount: { color: colors.white, fontSize: 22, fontWeight: '900' },
})
