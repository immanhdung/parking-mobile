import React, { useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { paymentAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, EmptyState } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatDateTime, formatCurrency } from '../../utils/helpers'

const METHOD_CONFIG = {
  cash:  { icon: 'cash-outline',           label: 'Tiền mặt', color: COLORS.success },
  momo:  { icon: 'phone-portrait-outline', label: 'MoMo',     color: '#ae2070' },
  vnpay: { icon: 'card-outline',           label: 'VNPay',    color: '#005baa' },
  card:  { icon: 'card-outline',           label: 'Thẻ',      color: COLORS.primary },
}

export default function PaymentScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-payments', page],
    queryFn: () => paymentAPI.getAll({ page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false) }

  const totalPaid = data?.data?.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0) || 0
  const totalTx = data?.meta?.pagination?.total || 0

  const PaymentItem = ({ item, index }) => {
    const method = METHOD_CONFIG[item.method] || METHOD_CONFIG.cash
    return (
      <Animated.View entering={FadeInDown.delay(index * 40)}>
        <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate('PaymentDetail', { paymentId: item._id })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: `${method.color}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={method.icon} size={22} color={method.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{method.label}</Text>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: item.status === 'completed' ? COLORS.success : COLORS.danger }}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary, fontFamily: 'monospace' }}>{item.invoiceCode}</Text>
                <Badge status={item.status} size="sm" />
              </View>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary, marginTop: 3 }}>
                {formatDateTime(item.paidAt || item.createdAt)}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Lịch sử thanh toán" subtitle={`${totalTx} giao dịch`} />

      {/* Summary */}
      <View style={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 16, backgroundColor: COLORS.successBg, borderColor: '#bbf7d0', borderWidth: 1 }}>
          <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '600', marginBottom: 4 }}>TỔNG ĐÃ THANH TOÁN</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.success }}>{formatCurrency(totalPaid)}</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 16, backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
          <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600', marginBottom: 4 }}>GIAO DỊCH</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.primary }}>{totalTx}</Text>
        </Card>
      </View>

      <FlatList
        data={data?.data}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => <PaymentItem item={item} index={index} />}
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          isLoading
            ? <View style={{ gap: 10 }}>{[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View>
            : <EmptyState icon="card-outline" title="Chưa có giao dịch" subtitle="Lịch sử thanh toán sẽ xuất hiện ở đây" />
        }
      />
    </View>
  )
}
