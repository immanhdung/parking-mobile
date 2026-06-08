import React from 'react'
import { View, Text, ScrollView, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { sessionAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, Divider, InfoRow } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatDateTime, formatCurrency, formatDuration } from '../../utils/helpers'

export default function SessionDetailScreen({ route, navigation }) {
  const { sessionId } = route.params
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => sessionAPI.getById(sessionId).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
        <ScreenHeader title="Chi tiết lượt gửi xe" onBack={() => navigation.goBack()} />
        <View style={{ padding: SIZES.screenPadding, gap: 12 }}>
          {[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16}/>)}
        </View>
      </View>
    )
  }

  const s = session

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Chi tiết lượt gửi xe" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Card style={{ alignItems: 'center', paddingVertical: 20, backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'monospace', marginBottom: 4 }}>MÃ PHIÊN</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 }}>{s?.sessionCode}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Badge status={s?.status} />
              <Badge status={s?.paymentStatus} />
            </View>
          </Card>
        </Animated.View>

        {/* Vehicle info */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>🚗 Thông tin xe</Text>
            <InfoRow label="Biển số" value={s?.vehicleInfo?.licensePlate} icon="id-card-outline" />
            <Divider />
            <InfoRow label="Loại xe" value={s?.vehicleType?.name} icon="car-outline" />
            <Divider />
            <InfoRow label="Hãng xe" value={s?.vehicleInfo?.vehicleModel || '—'} icon="car-sport-outline" />
            <Divider />
            <InfoRow label="Màu xe" value={s?.vehicleInfo?.vehicleColor || '—'} icon="color-palette-outline" />
          </Card>
        </Animated.View>

        {/* Parking info */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>🏢 Thông tin bãi xe</Text>
            <InfoRow label="Bãi xe" value={s?.parkingLot?.name} icon="business-outline" />
            <Divider />
            <InfoRow label="Tầng" value={s?.floor?.name} icon="layers-outline" />
            <Divider />
            <InfoRow label="Khu vực" value={s?.zone?.name} icon="map-outline" />
            <Divider />
            <InfoRow label="Slot" value={s?.slot?.slotCode} icon="grid-outline" />
          </Card>
        </Animated.View>

        {/* Time info */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>⏱ Thời gian</Text>
            <InfoRow label="Giờ vào" value={formatDateTime(s?.entryTime)} icon="log-in-outline" />
            <Divider />
            <InfoRow label="Giờ ra" value={s?.exitTime ? formatDateTime(s.exitTime) : '🔴 Đang gửi'} icon="log-out-outline" />
            <Divider />
            <InfoRow label="Thời gian gửi" value={formatDuration(s?.durationHours || s?.currentDurationHours)} icon="timer-outline" />
            {s?.isOvertime && (
              <>
                <Divider />
                <InfoRow label="Thời gian quá giờ" value={`${s.overtimeHours} giờ`} icon="warning-outline" valueColor={COLORS.warning} />
              </>
            )}
          </Card>
        </Animated.View>

        {/* Fee */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>💰 Chi phí</Text>
            <InfoRow label="Phí cơ bản" value={formatCurrency(s?.baseFee)} icon="cash-outline" />
            {s?.overtimeFee > 0 && (
              <>
                <Divider />
                <InfoRow label="Phí quá giờ" value={formatCurrency(s?.overtimeFee)} icon="time-outline" valueColor={COLORS.warning} />
              </>
            )}
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Tổng cộng</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary }}>{formatCurrency(s?.totalFee)}</Text>
            </View>
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>Phương thức</Text>
              <Badge status={s?.paymentStatus} />
            </View>
          </Card>
        </Animated.View>

        {/* Invoice */}
        {s?.payment?.invoiceCode && (
          <Animated.View entering={FadeInDown.delay(350)}>
            <Card>
              <InfoRow label="Mã hóa đơn" value={s.payment.invoiceCode} icon="receipt-outline" />
              <Divider />
              <InfoRow label="Phương thức TT" value={s.payment.method === 'cash' ? 'Tiền mặt' : s.payment.method} icon="card-outline" />
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  )
}
