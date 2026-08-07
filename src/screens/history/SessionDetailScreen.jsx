import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'react-native-qrcode-svg'
import { sessionAPI, bookingAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, Divider, InfoRow } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatDateTime, formatDate, formatCurrency } from '../../utils/helpers'

// Helper for HH:MM:SS
function formatHMS(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SessionDetailScreen({ route, navigation }) {
  const { sessionId } = route.params || {}
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const queryClient = useQueryClient()

  // 1. Fetch Session Detail
  const { data: session, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => sessionAPI.getById(sessionId).then(r => r.data.data),
    enabled: !!sessionId,
    refetchInterval: 15000, // auto refetch every 15s
  })

  const s = session || route.params?.session || null

  // 2. Fetch Booking Detail if booking ID exists
  const bookingId = typeof s?.booking === 'object' ? s?.booking?._id : s?.booking
  const { data: booking } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: () => bookingAPI.getById(bookingId).then(r => r.data.data),
    enabled: !!bookingId,
  })

  // 3. Live Elapsed Timer (seconds)
  const isCompleted = s?.status === 'completed'
  const entryTimeMs = s?.entryTime ? new Date(s.entryTime).getTime() : Date.now()
  const exitTimeMs = isCompleted && s?.exitTime ? new Date(s.exitTime).getTime() : Date.now()

  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.max(0, Math.floor((exitTimeMs - entryTimeMs) / 1000))
  )

  useEffect(() => {
    if (!s?.entryTime || isCompleted) {
      if (isCompleted && s?.entryTime && s?.exitTime) {
        setElapsedSeconds(Math.max(0, Math.floor((new Date(s.exitTime).getTime() - new Date(s.entryTime).getTime()) / 1000)))
      }
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - new Date(s.entryTime).getTime()) / 1000))
      setElapsedSeconds(diff)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [s?.entryTime, s?.exitTime, isCompleted])

  if (isLoading && !s) {
    return (
      <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
        <ScreenHeader title="Lượt gửi xe đang đỗ" onBack={() => navigation.goBack()} />
        <View style={{ padding: SIZES.screenPadding, gap: 12 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={90} radius={16} />)}
        </View>
      </View>
    )
  }

  // Formatting variables
  const sessionCode = s?.sessionCode || (s?._id ? `PS-${String(s._id).slice(-8).toUpperCase()}` : 'PS-LIVE')
  const licensePlate = s?.vehicleInfo?.licensePlate || s?.vehicleInfo?.plate || booking?.vehicleInfo?.licensePlate || '—'
  const vehicleType = s?.vehicleType?.name || booking?.vehicleType?.name || 'Phương tiện'
  const parkingLotName = s?.parkingLot?.name || booking?.parkingLot?.name || 'Bãi đỗ xe'
  const floorName = s?.floor?.name || (typeof s?.floor === 'object' ? s?.floor?.name : null) || 'Tầng'
  const zoneName = s?.zone?.name || (typeof s?.zone === 'object' ? s?.zone?.name : null) || ''
  const slotCode = s?.slot?.slotCode || booking?.assignedSlot?.slotCode || '—'
  const qrCheckoutValue = s?._id ? `co_${s._id}` : sessionCode

  // Surcharges & Fee calculations
  const totalFee = s?.totalFee ?? s?.currentFee ?? s?.baseFee ?? 0
  const prepaidFee = s?.advancePayment || booking?.estimatedFee || 0
  const surcharges = s?.surcharges || []
  const earlyArrivalSurcharge = s?.earlyArrivalSurcharge || 0
  const overtimeFee = s?.overtimeFee || 0

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Lượt gửi xe đang đỗ" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 60, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {/* TICKET CARD (DARK FANCY CARD) */}
        <Animated.View entering={ZoomIn.duration(400)}>
          <View
            style={{
              backgroundColor: dark ? '#0f172a' : '#1e293b',
              borderRadius: 24,
              padding: 20,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: dark ? '#334155' : '#334155',
              ...SHADOWS.lg,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 4 }}>
              PARKING TICKET
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#38bdf8', letterSpacing: 1.5, marginBottom: 16 }}>
              #{sessionCode}
            </Text>

            {/* QR CODE FOR CHECKOUT */}
            <View style={{ padding: 14, backgroundColor: '#ffffff', borderRadius: 20, ...SHADOWS.md, marginBottom: 16 }}>
              <QRCode value={qrCheckoutValue} size={170} backgroundColor="#ffffff" color="#0f172a" />
            </View>
            <Text style={{ fontSize: SIZES.fontXs, color: '#94a3b8', marginBottom: 16, textAlign: 'center' }}>
              Xuất trình mã QR này cho bảo vệ khi ra cổng check-out
            </Text>

            {/* LICENSE PLATE BADGE */}
            <View
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: SIZES.fontXs, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
                BIỂN SỐ XE
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#ffffff', letterSpacing: 2 }}>
                {licensePlate}
              </Text>
              <Text style={{ fontSize: SIZES.fontXs, color: '#38bdf8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>
                {vehicleType}
              </Text>
            </View>

            {/* ENTRY & BOOKED TIMES */}
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 12 }}>
              <View>
                <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>NGÀY VÀO</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff', marginTop: 2 }}>
                  {s?.entryTime ? formatDate(s.entryTime) : '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>GIỜ VÀO BÃI</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4ade80', marginTop: 2 }}>
                  {s?.entryTime ? new Date(s.entryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </Text>
              </View>
            </View>

            {booking && (
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 10, marginTop: 10 }}>
                <View>
                  <Text style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase' }}>GIỜ ĐẶT VÀO</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fef08a', marginTop: 2 }}>{booking.startTime}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase' }}>GIỜ ĐẶT RA</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fef08a', marginTop: 2 }}>{booking.endTime}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* 2 KPI CARDS: TIMER + CURRENT FEE */}
        <Animated.View entering={FadeInDown.delay(200)} style={{ flexDirection: 'row', gap: 12 }}>
          {/* TIMER CARD */}
          <Card style={{ flex: 1, padding: 14, backgroundColor: dark ? COLORS.dark.bgCard : '#f0f9ff', borderColor: dark ? COLORS.dark.border : '#bae6fd', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' }}>
                THỜI GIAN ĐỖ
              </Text>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '900', color: dark ? COLORS.dark.text : COLORS.text, letterSpacing: 0.5 }}>
              {formatHMS(elapsedSeconds)}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {!isCompleted ? (
                <>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>ĐANG ĐỖ</Text>
                </>
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary }}>ĐÃ CHECK-OUT</Text>
              )}
            </View>
          </Card>

          {/* ESTIMATED FEE CARD */}
          <Card style={{ flex: 1, padding: 14, backgroundColor: dark ? COLORS.dark.bgCard : '#f0fdf4', borderColor: dark ? COLORS.dark.border : '#bbf7d0', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="cash-outline" size={16} color="#16a34a" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>
                CƯỚC ƯỚC TÍNH
              </Text>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '900', color: '#15803d', letterSpacing: 0.5 }}>
              {formatCurrency(totalFee)}
            </Text>

            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 8 }}>
              {prepaidFee > 0 ? `Đã trả trước: ${formatCurrency(prepaidFee)}` : 'Thanh toán khi ra cổng'}
            </Text>
          </Card>
        </Animated.View>

        {/* PARKING LOCATION INFO */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 14 }}>
              📍 Vị trí gửi xe
            </Text>

            <InfoRow label="Bãi xe" value={parkingLotName} icon="business-outline" />
            <Divider />
            <InfoRow label="Vị trí slot" value={`${floorName}${zoneName ? ` — Zone ${zoneName}` : ''} — ${slotCode}`} icon="grid-outline" valueColor={COLORS.primary} />
            <Divider />
            <InfoRow label="Trạng thái" value={isCompleted ? 'Đã hoàn thành' : 'Đang đỗ tại bãi'} icon="checkmark-circle-outline" valueColor={isCompleted ? COLORS.textSecondary : COLORS.success} />
          </Card>
        </Animated.View>

        {/* SURCHARGE LOGS & FEE BREAKDOWN */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>
              🧾 Chi tiết cước & Phụ phí
            </Text>

            <InfoRow label="Phí ước tính cước gửi" value={formatCurrency(s?.baseFee || totalFee)} icon="receipt-outline" />

            {prepaidFee > 0 && (
              <>
                <Divider />
                <InfoRow label="Đã thanh toán trước (Booking)" value={`- ${formatCurrency(prepaidFee)}`} icon="card-outline" valueColor={COLORS.success} />
              </>
            )}

            {earlyArrivalSurcharge > 0 && (
              <>
                <Divider />
                <InfoRow label="Phụ phí vào sớm" value={`+ ${formatCurrency(earlyArrivalSurcharge)}`} icon="time-outline" valueColor={COLORS.warning} />
              </>
            )}

            {overtimeFee > 0 && (
              <>
                <Divider />
                <InfoRow label="Phụ phí quá giờ" value={`+ ${formatCurrency(overtimeFee)}`} icon="alert-circle-outline" valueColor={COLORS.danger} />
              </>
            )}

            {surcharges.map((sur, idx) => (
              <React.Fragment key={idx}>
                <Divider />
                <InfoRow label={sur.reason || sur.type || 'Phụ phí'} value={`+ ${formatCurrency(sur.amount)}`} icon="add-circle-outline" valueColor={COLORS.warning} />
              </React.Fragment>
            ))}

            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>
                Cần thanh toán tại cổng
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary }}>
                {formatCurrency(Math.max(0, totalFee - (isCompleted ? 0 : 0)))}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* POLICY NOTICE */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : '#fffbe6', borderColor: '#fde047', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="warning-outline" size={18} color="#d97706" />
              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: '#b45309' }}>Quy định & Lưu ý gửi xe</Text>
            </View>
            <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : '#78350f', lineHeight: 18 }}>
              • Check-in cho phép vào sớm tối đa 15 phút trước giờ đặt.{'\n'}
              • Vui lòng xuất trình mã QR trên thẻ vé này cho bảo vệ khi lái xe ra cổng.{'\n'}
              • Mọi chi phí phát sinh (nếu gửi quá giờ) sẽ được tính tự động tại cổng check-out.
            </Text>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
