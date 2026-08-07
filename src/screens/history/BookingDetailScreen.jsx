import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'react-native-qrcode-svg'
import Toast from 'react-native-toast-message'
import { bookingAPI } from '../../services/api'
import { Button, Card, Badge, ScreenHeader, Skeleton, Divider } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatDate, formatCurrency } from '../../utils/helpers'

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: () => bookingAPI.getById(bookingId).then(r => r.data.data),
  })

  const cancelMut = useMutation({
    mutationFn: () => bookingAPI.cancel(bookingId, { reason: 'Người dùng hủy' }),
    onSuccess: () => { qc.invalidateQueries(['my-bookings']); qc.invalidateQueries(['booking-detail', bookingId]); Toast.show({ type: 'success', text1: 'Đã hủy booking' }) },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message }),
  })

  if (isLoading) return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Chi tiết đặt chỗ" onBack={() => navigation.goBack()} />
      <View style={{ padding: SIZES.screenPadding, gap: 12 }}>{[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View>
    </View>
  )

  const b = data

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Chi tiết đặt chỗ" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 120, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Code + status */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Card style={{ alignItems: 'center', paddingVertical: 20, backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginBottom: 4 }}>MÃ ĐẶT CHỖ</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 2 }}>{b?.bookingCode}</Text>
            <View style={{ marginTop: 8 }}><Badge status={b?.status} /></View>
          </Card>
        </Animated.View>

        {/* QR */}
        {['pending','approved'].includes(b?.status) && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 20 }}>🎫 Mã QR Check-in</Text>
              <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16, ...SHADOWS.md }}>
                <QRCode value={b?._id || b?.id ? `ci_${b._id || b.id}` : 'BOOKING'} size={160} backgroundColor="#ffffff" color="#000000" />
              </View>
              <Text style={{ fontSize: 10, color: COLORS.textTertiary, marginTop: 8 }}>{b?._id || b?.id ? `ci_${b._id || b.id}` : 'BOOKING'}</Text>
              <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 14, textAlign: 'center' }}>Xuất trình mã QR khi check-in tại bãi xe</Text>
            </Card>
          </Animated.View>
        )}

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Thông tin đặt chỗ</Text>
            {[
              { label: 'Bãi xe', value: b?.parkingLot?.name, icon: 'business-outline' },
              { label: 'Loại xe', value: b?.vehicleType?.name, icon: 'car-outline' },
              { label: 'Ngày', value: formatDate(b?.scheduledDate), icon: 'calendar-outline' },
              { label: 'Giờ vào', value: b?.startTime, icon: 'log-in-outline' },
              { label: 'Giờ ra', value: b?.endTime, icon: 'log-out-outline' },
            ].map((item, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={item.icon} size={16} color={COLORS.textTertiary} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                  </View>
                  <Text style={{ color: dark ? COLORS.dark.text : COLORS.text, fontWeight: '600', fontSize: SIZES.fontSm }}>{item.value || '—'}</Text>
                </View>
                {i < 4 && <View style={{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border }} />}
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Vehicle */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Thông tin xe</Text>
            {[
              { label: 'Biển số', value: b?.vehicleInfo?.licensePlate, icon: 'id-card-outline' },
              { label: 'Hãng xe', value: b?.vehicleInfo?.vehicleModel, icon: 'car-sport-outline' },
              { label: 'Màu xe', value: b?.vehicleInfo?.vehicleColor, icon: 'color-palette-outline' },
              { label: 'Slot', value: b?.assignedSlot?.slotCode || b?.assignedSlot?.code || b?.slot?.slotCode || (typeof b?.assignedSlot === 'string' ? b.assignedSlot : null) || 'Gán khi check-in', icon: 'grid-outline' },
            ].map((item, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={item.icon} size={16} color={COLORS.textTertiary} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                  </View>
                  <Text style={{ color: dark ? COLORS.dark.text : COLORS.text, fontWeight: '600', fontSize: SIZES.fontSm }}>{item.value || '—'}</Text>
                </View>
                {i < 3 && <View style={{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border }} />}
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Fee */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                <Text style={{ fontSize: SIZES.fontMd, color: COLORS.textSecondary }}>Phí ước tính</Text>
              </View>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '900', color: COLORS.primary }}>{formatCurrency(b?.estimatedFee)}</Text>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {['pending','approved'].includes(b?.status) && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border }}>
          <Button title="Hủy đặt chỗ" variant="danger" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending} size="lg" icon="close-circle-outline" />
        </View>
      )}
    </View>
  )
}
