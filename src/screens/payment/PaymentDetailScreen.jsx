import React from 'react'
import { View, Text, ScrollView, useColorScheme, Share, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { paymentAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, Divider, InfoRow } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatDateTime, formatCurrency } from '../../utils/helpers'

const METHOD_CONFIG = {
  cash:  { icon: 'cash-outline',           label: 'Tiền mặt',  color: COLORS.success,  bg: COLORS.successBg },
  momo:  { icon: 'phone-portrait-outline', label: 'MoMo',      color: '#ae2070',        bg: '#fdf2f8' },
  vnpay: { icon: 'card-outline',           label: 'VNPay',     color: '#005baa',        bg: '#eff6ff' },
  card:  { icon: 'card-outline',           label: 'Thẻ',       color: COLORS.primary,  bg: COLORS.primaryBg },
}

export default function PaymentDetailScreen({ route, navigation }) {
  const { paymentId } = route.params
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment-detail', paymentId],
    queryFn: () => paymentAPI.getById(paymentId).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
        <ScreenHeader title="Chi tiết thanh toán" onBack={() => navigation.goBack()} />
        <View style={{ padding: SIZES.screenPadding, gap: 12 }}>
          {[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16}/>)}
        </View>
      </View>
    )
  }

  const p = payment
  const method = METHOD_CONFIG[p?.method] || METHOD_CONFIG.cash

  const handleShare = () => {
    Share.share({
      message: `Hóa đơn ${p?.invoiceCode}\nSố tiền: ${formatCurrency(p?.amount)}\nThời gian: ${formatDateTime(p?.paidAt)}\nParkSmart`,
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Chi tiết thanh toán"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleShare} style={{ padding: 6 }}>
            <Ionicons name="share-outline" size={22} color={dark ? COLORS.dark.text : COLORS.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Receipt header */}
        <Animated.View entering={ZoomIn.delay(100).springify()}>
          <LinearGradient
            colors={p?.status === 'completed' ? ['#16a34a', '#15803d'] : ['#dc2626', '#b91c1c']}
            style={{
              borderRadius: 24, padding: 24, alignItems: 'center',
              ...SHADOWS.lg,
            }}
          >
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Ionicons name={p?.status === 'completed' ? 'checkmark-circle' : 'close-circle'} size={36} color="#fff" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: SIZES.fontSm, marginBottom: 4 }}>
              {p?.status === 'completed' ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 }}>
              {formatCurrency(p?.amount)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: SIZES.fontSm, marginTop: 8, fontFamily: 'monospace' }}>
              {p?.invoiceCode}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Method */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card style={{ backgroundColor: method.bg, borderColor: `${method.color}30`, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: `${method.color}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={method.icon} size={24} color={method.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary }}>Phương thức thanh toán</Text>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: method.color }}>{method.label}</Text>
              </View>
              <Badge status={p?.status} />
            </View>
          </Card>
        </Animated.View>

        {/* Fee breakdown */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>
              💰 Chi tiết thanh toán
            </Text>
            <InfoRow label="Phí cơ bản" value={formatCurrency(p?.baseFee)} icon="car-outline" />
            {p?.overtimeFee > 0 && (
              <>
                <Divider />
                <InfoRow label="Phí quá giờ" value={formatCurrency(p?.overtimeFee)} icon="time-outline" valueColor={COLORS.warning} />
              </>
            )}
            {p?.discount > 0 && (
              <>
                <Divider />
                <InfoRow label="Giảm giá" value={`-${formatCurrency(p?.discount)}`} icon="pricetag-outline" valueColor={COLORS.success} />
              </>
            )}
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Tổng cộng</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary }}>{formatCurrency(p?.amount)}</Text>
            </View>
            {p?.method === 'cash' && p?.cashReceived && (
              <>
                <Divider />
                <InfoRow label="Tiền nhận" value={formatCurrency(p?.cashReceived)} icon="cash-outline" />
                <Divider />
                <InfoRow label="Tiền thối" value={formatCurrency(p?.cashChange)} icon="return-down-back-outline" valueColor={COLORS.success} />
              </>
            )}
          </Card>
        </Animated.View>

        {/* Transaction info */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>
              📋 Thông tin giao dịch
            </Text>
            <InfoRow label="Mã hóa đơn" value={p?.invoiceCode} icon="receipt-outline" />
            {p?.transactionId && (
              <>
                <Divider />
                <InfoRow label="Mã giao dịch" value={p?.transactionId} icon="finger-print-outline" />
              </>
            )}
            <Divider />
            <InfoRow label="Thời gian" value={formatDateTime(p?.paidAt || p?.createdAt)} icon="calendar-outline" />
            <Divider />
            <InfoRow label="Bãi xe" value={p?.parkingLot?.name} icon="business-outline" />
          </Card>
        </Animated.View>

        {/* Session link */}
        {p?.parkingSession && (
          <Animated.View entering={FadeInDown.delay(350)}>
            <Card
              style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: p.parkingSession._id || p.parkingSession })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="car" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary }}>Phiên gửi xe liên kết</Text>
                  <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary }}>
                    {p?.parkingSession?.sessionCode || 'Xem chi tiết →'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </View>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  )
}
