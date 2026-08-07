import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ScrollView, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { bookingAPI, monthlyPassAPI, sessionAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, EmptyState, Button } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatDate, formatDateTime, formatCurrency, formatDuration } from '../../utils/helpers'

const TABS = [
  { key: 'bookings', label: 'Đặt chỗ', icon: 'calendar-outline' },
  { key: 'sessions', label: 'Lượt gửi xe', icon: 'car-outline' },
  { key: 'monthlyPasses', label: 'Vé tháng', icon: 'card-outline' },
]

export default function HistoryScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  const [tab, setTab] = useState('bookings')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const { data: bookings, isLoading: bLoading, refetch: refetchB } = useQuery({
    queryKey: ['my-bookings', statusFilter, page],
    queryFn: () => bookingAPI.myBookings({ status: statusFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: sessions, isLoading: sLoading, refetch: refetchS } = useQuery({
    queryKey: ['my-sessions', statusFilter, page],
    queryFn: () => sessionAPI.getAll({ status: statusFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
    enabled: tab === 'sessions',
  })
  const { data: monthlyPasses, isLoading: mLoading, refetch: refetchM } = useQuery({
    queryKey: ['my-monthly-passes'],
    queryFn: () => monthlyPassAPI.getMy().then(r => r.data),
    enabled: tab === 'monthlyPasses',
  })

  const cancelMut = useMutation({
    mutationFn: (id) => bookingAPI.cancel(id, { reason: 'Người dùng hủy' }),
    onSuccess: () => { qc.invalidateQueries(['my-bookings']); Toast.show({ type: 'success', text1: 'Đã hủy booking' }) },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message }),
  })
  const cancelMonthlyPassMut = useMutation({
    mutationFn: id => monthlyPassAPI.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-monthly-passes'] }); Toast.show({ type: 'success', text1: 'Đã hủy vé tháng' }) },
    onError: error => Toast.show({ type: 'error', text1: 'Không thể hủy vé tháng', text2: error.response?.data?.message || 'Vui lòng thử lại.' }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    if (tab === 'bookings') await refetchB()
    else if (tab === 'sessions') await refetchS()
    else await refetchM()
    setRefreshing(false)
  }

  const monthlyPassData = Array.isArray(monthlyPasses?.data) ? monthlyPasses.data
    : Array.isArray(monthlyPasses?.data?.docs) ? monthlyPasses.data.docs
    : Array.isArray(monthlyPasses?.data?.data) ? monthlyPasses.data.data
    : Array.isArray(monthlyPasses?.docs) ? monthlyPasses.docs
    : Array.isArray(monthlyPasses) ? monthlyPasses : []
  const filteredMonthlyPasses = statusFilter ? monthlyPassData.filter(pass => pass.status === statusFilter) : monthlyPassData

  const sessionList = Array.isArray(sessions?.data)
    ? sessions.data
    : Array.isArray(sessions?.data?.docs)
    ? sessions.data.docs
    : Array.isArray(sessions?.docs)
    ? sessions.docs
    : Array.isArray(sessions)
    ? sessions
    : []

  const bookingList = Array.isArray(bookings?.data)
    ? bookings.data
    : Array.isArray(bookings?.data?.docs)
    ? bookings.data.docs
    : Array.isArray(bookings?.docs)
    ? bookings.docs
    : Array.isArray(bookings)
    ? bookings
    : []

  const isLoading = tab === 'bookings' ? bLoading : tab === 'sessions' ? sLoading : mLoading
  const currentData = tab === 'bookings' ? bookingList : tab === 'sessions' ? sessionList : filteredMonthlyPasses
  const pagination = tab === 'bookings' ? bookings?.meta?.pagination : tab === 'sessions' ? sessions?.meta?.pagination : null

  const STATUS_FILTERS = {
    bookings: [{ key: '', label: 'Tất cả' }, { key: 'pending', label: 'Chờ duyệt' }, { key: 'approved', label: 'Đã duyệt' }, { key: 'completed', label: 'Hoàn thành' }, { key: 'cancelled', label: 'Đã hủy' }],
    sessions: [{ key: '', label: 'Tất cả' }, { key: 'active', label: 'Đang gửi' }, { key: 'completed', label: 'Hoàn thành' }],
    monthlyPasses: [{ key: '', label: 'Tất cả' }, { key: 'pending', label: 'Chờ thanh toán' }, { key: 'active', label: 'Đang hiệu lực' }, { key: 'expired', label: 'Hết hạn' }, { key: 'cancelled', label: 'Đã hủy' }],
  }

  const BookingItem = ({ item, index }) => {
    const slotCode = item.assignedSlot?.slotCode || item.assignedSlot?.code || item.slot?.slotCode || (typeof item.assignedSlot === 'string' ? item.assignedSlot : null)
    return (
      <Animated.View entering={FadeInDown.delay(index * 50)}>
        <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700', fontFamily: 'monospace' }}>{item.bookingCode}</Text>
              <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginTop: 2 }}>{item.parkingLot?.name || '—'}</Text>
            </View>
            <Badge status={item.status} />
          </View>
          <View style={{ gap: 5 }}>
            {[
              { icon: 'calendar-outline', text: `${formatDate(item.scheduledDate)} · ${item.startTime} → ${item.endTime}` },
              { icon: 'car-outline', text: `${item.vehicleInfo?.licensePlate || '—'} · ${item.vehicleType?.name || ''}` },
              { icon: 'grid-outline', text: `Slot: ${slotCode ? `Slot ${slotCode}` : 'Gán khi check-in'}` },
              { icon: 'cash-outline', text: `Phí ước tính: ${formatCurrency(item.estimatedFee)}`, color: COLORS.primary },
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={row.icon} size={13} color={COLORS.textTertiary} />
                <Text style={{ fontSize: SIZES.fontSm, color: row.color || COLORS.textSecondary, fontWeight: row.color ? '700' : '400' }}>{row.text}</Text>
              </View>
            ))}
          </View>
          {['pending', 'approved'].includes(item.status) && (
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center' }}>
                <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: SIZES.fontSm }}>Xem QR</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => cancelMut.mutate(item._id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.danger, alignItems: 'center' }}>
                <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: SIZES.fontSm }}>Hủy</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </Animated.View>
    )
  }

  const SessionItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate('SessionDetail', { sessionId: item._id })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'monospace' }}>{item.sessionCode}</Text>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginTop: 2 }}>{item.parkingLot?.name || '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge status={item.status} />
            <Badge status={item.paymentStatus} size="sm" />
          </View>
        </View>
        <View style={{ gap: 5 }}>
          {[
            { icon: 'car-sport-outline', text: `${item.vehicleInfo?.licensePlate} · ${item.vehicleType?.name}` },
            { icon: 'log-in-outline', text: `Vào: ${formatDateTime(item.entryTime)}` },
            { icon: 'log-out-outline', text: item.exitTime ? `Ra: ${formatDateTime(item.exitTime)}` : '🔴 Đang gửi xe' },
            { icon: 'cash-outline', text: `Phí: ${formatCurrency(item.totalFee)}`, color: item.totalFee > 0 ? COLORS.primary : COLORS.textSecondary },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={row.icon} size={13} color={COLORS.textTertiary} />
              <Text style={{ fontSize: SIZES.fontSm, color: row.color || COLORS.textSecondary, fontWeight: row.color ? '700' : '400' }}>{row.text}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Animated.View>
  )

  const MonthlyPassItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700', fontFamily: 'monospace' }}>{item.passCode || 'VÉ THÁNG'}</Text>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginTop: 2 }}>{item.parkingLot?.name || '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge status={item.status} label={item.status === 'active' ? 'Đang hiệu lực' : undefined} />
            <Badge status={item.paymentStatus} size="sm" />
          </View>
        </View>
        <View style={{ gap: 5 }}>
          {[
            { icon: 'car-outline', text: `${item.licensePlate || '—'} · ${item.vehicleType?.name || ''}` },
            { icon: 'calendar-outline', text: `Hiệu lực: ${formatDate(item.startDate)} → ${formatDate(item.endDate)}` },
            { icon: 'cash-outline', text: `Giá vé: ${formatCurrency(item.price)}`, color: COLORS.success },
          ].map((row, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={row.icon} size={13} color={COLORS.textTertiary} />
            <Text style={{ fontSize: SIZES.fontSm, color: row.color || COLORS.textSecondary, fontWeight: row.color ? '700' : '400' }}>{row.text}</Text>
          </View>)}
        </View>
        {['pending', 'active'].includes(item.status) && <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('MonthlyPassDetail', { monthlyPass: item })} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center' }}>
            <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: SIZES.fontSm }}>Xem QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => cancelMonthlyPassMut.mutate(item._id || item.id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.danger, alignItems: 'center' }}>
            <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: SIZES.fontSm }}>Hủy</Text>
          </TouchableOpacity>
        </View>}
      </Card>
    </Animated.View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Lịch sử" subtitle="Booking, lượt gửi xe & vé tháng" />

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: SIZES.screenPadding, gap: 8, marginBottom: 10 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => { setTab(t.key); setStatusFilter(''); setPage(1) }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: tab === t.key ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9') }}>
            <Ionicons name={t.icon} size={16} color={tab === t.key ? '#fff' : COLORS.textTertiary} />
            <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: tab === t.key ? '#fff' : COLORS.textSecondary }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filters */}
      <View style={{ height: 42, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, gap: 8, alignItems: 'center' }}>
          {STATUS_FILTERS[tab].map(s => (
            <TouchableOpacity key={s.key} onPress={() => { setStatusFilter(s.key); setPage(1) }} style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: statusFilter === s.key ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9'), borderWidth: 1.5, borderColor: statusFilter === s.key ? COLORS.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: statusFilter === s.key ? '#fff' : COLORS.textSecondary }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => tab === 'bookings' ? <BookingItem item={item} index={index} /> : tab === 'sessions' ? <SessionItem item={item} index={index} /> : <MonthlyPassItem item={item} index={index} />}
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          isLoading
            ? <View style={{ gap: 10 }}>{[0,1,2].map(i => <Skeleton key={i} width="100%" height={120} radius={16} />)}</View>
            : <EmptyState icon="file-tray-outline" title="Chưa có dữ liệu" subtitle={tab === 'bookings' ? 'Bạn chưa có lượt đặt chỗ nào' : tab === 'sessions' ? 'Bạn chưa có lượt gửi xe nào' : 'Bạn chưa có vé tháng nào'} />
        }
        ListFooterComponent={pagination?.hasNextPage ? <Button title="Xem thêm" variant="outline" onPress={() => setPage(p => p + 1)} style={{ marginTop: 8 }} /> : null}
      />
    </View>
  )
}
