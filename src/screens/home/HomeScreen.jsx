import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { parkingLotAPI, bookingAPI, notificationAPI } from '../../services/api'
import { Card, Badge, SectionHeader, Skeleton } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatDate, formatCurrency } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [refreshing, setRefreshing] = useState(false)

  const { data: bookings, refetch: refetchB } = useQuery({
    queryKey: ['my-bookings-home'],
    queryFn: () => bookingAPI.myBookings({ page: 1, limit: 3 }).then(r => r.data.data),
  })
  const { data: activeSessionsRes, refetch: refetchS } = useQuery({
    queryKey: ['my-active-sessions'],
    queryFn: () => sessionAPI.getAll({ status: 'active', limit: 5 }).then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: lots, refetch: refetchL } = useQuery({
    queryKey: ['lots-home'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 5 }).then(r => r.data.data),
  })
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationAPI.getUnreadCount().then(r => r.data.data),
    refetchInterval: 30000,
  })

  const rawSessions = Array.isArray(activeSessionsRes)
    ? activeSessionsRes
    : activeSessionsRes?.data?.docs || activeSessionsRes?.data || activeSessionsRes?.docs || activeSessionsRes?.items || []
  const activeSession = Array.isArray(rawSessions) ? rawSessions.find(s => !s.monthlyPass && s.status === 'active') || rawSessions[0] : null

  const onRefresh = async () => { setRefreshing(true); await Promise.all([refetchB(), refetchS(), refetchL()]); setRefreshing(false) }
  const firstName = user?.fullName?.split(' ').pop() || 'bạn'

  const QUICK = [
    { icon: 'calendar-outline', label: 'Đặt chỗ', color: COLORS.primary, bg: COLORS.primaryBg, screen: 'BookingStack' },
    { icon: 'time-outline', label: 'Lịch sử', color: '#7c3aed', bg: '#f5f3ff', screen: 'HistoryStack' },
    { icon: 'card-outline', label: 'Thanh toán', color: '#059669', bg: '#f0fdf4', screen: 'PaymentStack' },
    { icon: 'chatbubble-outline', label: 'Phản hồi', color: '#dc2626', bg: '#fef2f2', screen: 'ProfileStack' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, '#1e40af', '#1d4ed8']} style={{ paddingTop: 56, paddingBottom: 32, paddingHorizontal: SIZES.screenPadding, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Animated.View entering={FadeInDown.delay(100)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: SIZES.fontSm }}>Xin chào</Text>
            <Text style={{ color: '#fff', fontSize: SIZES.fontXxl, fontWeight: '800', marginTop: 2 }}>{firstName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {unreadData?.count > 0 && <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' }} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileStack')} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: SIZES.fontSm }}>{user?.fullName?.[0] || 'U'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200)} style={{ flexDirection: 'row', gap: 12 }}>
          {[{ label: 'Đặt chỗ', value: bookings?.length || 0, icon: 'calendar' }, { label: 'Thông báo', value: unreadData?.count || 0, icon: 'notifications' }].map((item, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon} size={18} color="#fff" />
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{item.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: SIZES.fontXs }}>{item.label}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </LinearGradient>

      <View style={{ padding: SIZES.screenPadding, gap: 24 }}>
        {/* Active Parking Session Widget */}
        {activeSession && (
          <Animated.View entering={FadeInDown.delay(250)}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('HistoryStack', { screen: 'SessionDetail', params: { sessionId: activeSession._id, session: activeSession } })}
            >
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#38bdf8',
                  ...SHADOWS.md,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#38bdf8', letterSpacing: 1 }}>
                      LƯỢT ĐỖ XE ĐANG HOẠT ĐỘNG
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>
                    #{activeSession.sessionCode || String(activeSession._id).slice(-6).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5 }}>
                      {activeSession.vehicleInfo?.licensePlate || activeSession.vehicleInfo?.plate || 'XE ĐANG ĐỖ'}
                    </Text>
                    <Text style={{ fontSize: SIZES.fontXs, color: '#94a3b8', marginTop: 2 }}>
                      {activeSession.parkingLot?.name || 'Bãi đỗ xe'} · Slot: {activeSession.slot?.slotCode || '—'}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: SIZES.fontXs }}>Xem vé đỗ</Text>
                    <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <SectionHeader title="Chức năng nhanh" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {QUICK.map((a, i) => (
              <TouchableOpacity key={i} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 6, ...SHADOWS.sm }}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={{ fontSize: SIZES.fontXs, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, textAlign: 'center' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350)}>
          <Card onPress={() => navigation.navigate('BookingStack', { screen: 'MonthlyPass' })} style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#eff6ff', borderColor: dark ? COLORS.dark.border : '#bfdbfe' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="card-outline" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Đăng ký vé tháng</Text>
                <Text style={{ marginTop: 3, fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Tiết kiệm và quản lý chỗ gửi xe theo tháng</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </View>
          </Card>
        </Animated.View>

        {/* Recent bookings */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <SectionHeader title="Đặt chỗ gần đây" action="Xem tất cả" onAction={() => navigation.navigate('HistoryStack')} />
          {!bookings ? (
            <View style={{ gap: 10 }}>{[0, 1].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View>
          ) : bookings.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textSecondary, marginTop: 10, fontSize: SIZES.fontMd }}>Chưa có đặt chỗ nào</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BookingStack')} style={{ marginTop: 10 }}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Đặt chỗ ngay →</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            bookings.map((b, i) => (
              <Animated.View key={b._id} entering={FadeInRight.delay(i * 100)}>
                <Card style={{ marginBottom: 10 }} onPress={() => navigation.navigate('HistoryStack', { screen: 'BookingDetail', params: { bookingId: b._id } })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700', fontFamily: 'monospace' }}>{b.bookingCode}</Text>
                      <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginTop: 2 }}>{b.parkingLot?.name || '—'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="calendar-outline" size={13} color={COLORS.textTertiary} />
                        <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary }}>{formatDate(b.scheduledDate)} · {b.startTime} → {b.endTime}</Text>
                      </View>
                    </View>
                    <Badge status={b.status} />
                  </View>
                </Card>
              </Animated.View>
            ))
          )}
        </Animated.View>

        {/* Lots */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <SectionHeader title="Bãi xe" action="Đặt chỗ" onAction={() => navigation.navigate('BookingStack')} />
          {!lots ? (
            <View style={{ gap: 10 }}>{[0, 1].map(i => <Skeleton key={i} width="100%" height={100} radius={16} />)}</View>
          ) : lots.map((lot, i) => (
            <Animated.View key={lot._id} entering={FadeInDown.delay(i * 80)}>
              <Card style={{ marginBottom: 10 }} onPress={() => navigation.navigate('ParkingLotDetail', { lotId: lot._id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="business-outline" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{lot.name}</Text>
                    <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 2 }}>{lot.address?.district}, {lot.address?.city}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Text style={{ fontSize: SIZES.fontSm, color: COLORS.success, fontWeight: '700' }}>{lot.availableSlots} trống</Text>
                      <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textTertiary }}>/ {lot.totalSlots}</Text>
                      <View style={{ flex: 1, height: 4, backgroundColor: dark ? COLORS.dark.border : '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${100 - (lot.occupancyRate || 0)}%`, height: '100%', backgroundColor: lot.availableSlots > 10 ? COLORS.success : lot.availableSlots > 0 ? COLORS.warning : COLORS.danger, borderRadius: 2 }} />
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                </View>
              </Card>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
    </ScrollView>
  )
}
