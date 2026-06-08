import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { notificationAPI } from '../../services/api'
import { ScreenHeader, Skeleton, EmptyState } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { timeAgo } from '../../utils/helpers'

const TYPE_CONFIG = {
  booking_approved:  { icon: 'checkmark-circle', color: COLORS.success,  bg: COLORS.successBg },
  booking_rejected:  { icon: 'close-circle',     color: COLORS.danger,   bg: COLORS.dangerBg },
  booking_cancelled: { icon: 'ban',              color: '#64748b',        bg: '#f1f5f9' },
  booking_reminder:  { icon: 'alarm',            color: COLORS.warning,  bg: COLORS.warningBg },
  checkin_success:   { icon: 'log-in',           color: COLORS.primary,  bg: COLORS.primaryBg },
  checkout_success:  { icon: 'log-out',          color: '#7c3aed',       bg: '#f5f3ff' },
  payment_success:   { icon: 'cash',             color: COLORS.success,  bg: COLORS.successBg },
  payment_failed:    { icon: 'card',             color: COLORS.danger,   bg: COLORS.dangerBg },
  overdue_alert:     { icon: 'warning',          color: COLORS.warning,  bg: COLORS.warningBg },
  incident_alert:    { icon: 'alert-circle',     color: COLORS.danger,   bg: COLORS.dangerBg },
  system_notice:     { icon: 'megaphone',        color: COLORS.primary,  bg: COLORS.primaryBg },
  general:           { icon: 'notifications',    color: COLORS.primary,  bg: COLORS.primaryBg },
}

export default function NotificationsScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll({ limit: 50 }).then(r => r.data),
  })
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationAPI.getUnreadCount().then(r => r.data.data),
  })

  const markReadMut = useMutation({
    mutationFn: (id) => notificationAPI.markAsRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications', 'unread-count']),
  })
  const markAllMut = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => { qc.invalidateQueries(['notifications', 'unread-count']); Toast.show({ type: 'success', text1: 'Đã đọc tất cả' }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id) => notificationAPI.delete(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false) }
  const unreadCount = unreadData?.count || 0

  const NotifItem = ({ item, index }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.general
    return (
      <Animated.View entering={FadeInDown.delay(index * 35)}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { if (!item.isRead) markReadMut.mutate(item._id) }}
          style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            backgroundColor: item.isRead ? (dark ? COLORS.dark.bgCard : COLORS.white) : (dark ? '#1e3a5f' : '#eff6ff'),
            borderRadius: 16, padding: 14, marginBottom: 10,
            borderWidth: item.isRead ? 1 : 1.5,
            borderColor: item.isRead ? (dark ? COLORS.dark.border : '#f1f5f9') : COLORS.primaryBg2,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ionicons name={cfg.icon} size={22} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: item.isRead ? '500' : '700', color: dark ? COLORS.dark.text : COLORS.text, flex: 1, marginRight: 8 }} numberOfLines={2}>
                {item.title}
              </Text>
              {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 }} />}
            </View>
            <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary }}>{timeAgo(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => deleteMut.mutate(item._id)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}
        onBack={() => navigation.goBack()}
        rightElement={
          unreadCount > 0 && (
            <TouchableOpacity onPress={() => markAllMut.mutate()} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primaryBg, borderRadius: 10 }}>
              <Text style={{ color: COLORS.primary, fontSize: SIZES.fontSm, fontWeight: '600' }}>Đọc tất cả</Text>
            </TouchableOpacity>
          )
        }
      />
      <FlatList
        data={data?.data}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => <NotifItem item={item} index={index} />}
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingTop: 8, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          isLoading
            ? <View style={{ gap: 10 }}>{[0,1,2,3].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View>
            : <EmptyState icon="notifications-off-outline" title="Chưa có thông báo" subtitle="Các thông báo sẽ xuất hiện ở đây" />
        }
      />
    </View>
  )
}
