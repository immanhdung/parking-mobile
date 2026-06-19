import React from 'react'
import { View, Text, ScrollView, useColorScheme, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, ZoomIn, FadeInDown } from 'react-native-reanimated'
import QRCode from 'react-native-qrcode-svg'
import { Button, Card } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatDate, formatCurrency } from '../../utils/helpers'

export default function BookingSuccessScreen({ route, navigation }) {
  const booking = route?.params?.booking
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qrData = booking?.qrCodeData || booking?.bookingCode || 'BOOKING'

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SIZES.screenPadding, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <Animated.View entering={ZoomIn.delay(100).springify()} style={{ alignItems: 'center', paddingVertical: 32 }}>
          <LinearGradient colors={['#16a34a','#15803d']} style={{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </LinearGradient>
          <Animated.Text entering={FadeIn.delay(300)} style={{ fontSize: 26, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginTop: 20, textAlign: 'center' }}>Đặt chỗ thành công!</Animated.Text>
          <Animated.Text entering={FadeIn.delay(400)} style={{ fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>Hệ thống đã xác nhận booking của bạn</Animated.Text>
        </Animated.View>

        {/* Booking code */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card style={{ alignItems: 'center', backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 4 }}>Mã đặt chỗ</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: 2 }}>{booking?.bookingCode || '—'}</Text>
          </Card>
        </Animated.View>

        {/* QR Code */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={{ alignItems: 'center', padding: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 20 }}>🎫 Mã QR Check-in</Text>
            <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16, ...SHADOWS.md }}>
              <QRCode value={qrData} size={180} backgroundColor="#fff" color="#1e293b" />
            </View>
            <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' }}>Xuất trình mã QR khi check-in tại bãi xe</Text>
          </Card>
        </Animated.View>

        {/* Details */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 14 }}>Chi tiết đặt chỗ</Text>
            {[
              { label: 'Bãi xe', value: booking?.parkingLot?.name, icon: 'business-outline' },
              { label: 'Ngày', value: formatDate(booking?.scheduledDate), icon: 'calendar-outline' },
              { label: 'Giờ', value: `${booking?.startTime} → ${booking?.endTime}`, icon: 'time-outline' },
              { label: 'Biển số', value: booking?.vehicleInfo?.licensePlate, icon: 'id-card-outline' },
              { label: 'Slot', value: booking?.assignedSlot?.slotCode || 'Gán khi check-in', icon: 'grid-outline' },
              { label: 'Phí ước tính', value: formatCurrency(booking?.estimatedFee), icon: 'cash-outline', color: COLORS.primary },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: dark ? COLORS.dark.border : COLORS.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={item.icon} size={15} color={COLORS.textTertiary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                </View>
                <Text style={{ color: item.color || (dark ? COLORS.dark.text : COLORS.text), fontWeight: '600', fontSize: SIZES.fontSm, maxWidth: '55%', textAlign: 'right' }}>{item.value || '—'}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, gap: 10 }}>
        <Button title="Tiếp tục đặt chỗ" onPress={() => navigation.navigate('Booking')} size="lg" />
        <Button title="Xem lịch sử đặt chỗ" onPress={() => navigation.navigate('HistoryStack')} variant="outline" size="lg" />
        <Button title="Về trang chủ" onPress={() => navigation.navigate('HomeStack')} variant="ghost" size="lg" />
      </View>
    </View>
  )
}
