import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { Card, Badge, SectionHeader, StatCard } from '../../components/common'
import useAuthStore from '../../store/authStore'
import { reportsAPI } from '../../services/api'
import { formatCurrency } from '../../utils/helpers'

export default function AdminHomeScreen({ navigation }) {
  const { user } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [refreshing, setRefreshing] = useState(false)

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => reportsAPI.getDashboard().then(r => r.data.data),
  })

  const onRefresh = () => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }

  const ADMIN_TASKS = [
    { icon: 'people-outline', label: 'Tài khoản', color: COLORS.primary, bg: COLORS.primaryBg, screen: 'UserManagementStack', params: { screen: 'UserManagement' } },
    { icon: 'shield-checkmark-outline', label: 'Phân quyền', color: '#7c3aed', bg: '#f5f3ff', screen: 'PermissionsStack', params: { screen: 'Permissions' } },
    { icon: 'settings-outline', label: 'Cấu hình', color: '#059669', bg: '#f0fdf4', screen: 'SystemConfigStack', params: { screen: 'SystemConfig' } },
    { icon: 'stats-chart-outline', label: 'Báo cáo', color: '#dc2626', bg: '#fef2f2', screen: 'Reports' },
  ]

  const RECENT_ACTIVITIES = [
    { id: '1', type: 'user', icon: 'person-add-outline', color: COLORS.primary, bg: COLORS.primaryBg, title: 'Người dùng mới đăng ký', desc: 'Nguyễn Văn A (a.nguyen@parking.com) vừa tạo tài khoản', time: '5 phút trước' },
    { id: '2', type: 'config', icon: 'settings-outline', color: '#059669', bg: '#f0fdf4', title: 'Cập nhật cấu hình', desc: 'Thay đổi giá vé giờ cao điểm thành 15,000đ/h', time: '1 giờ trước' },
    { id: '3', type: 'system', icon: 'server-outline', color: '#7c3aed', bg: '#f5f3ff', title: 'Hệ thống tự động sao lưu', desc: 'Dữ liệu bãi xe đã được sao lưu an toàn', time: '3 giờ trước' },
    { id: '4', type: 'payment', icon: 'cash-outline', color: '#d97706', bg: '#fffbeb', title: 'Giao dịch thanh toán mới', desc: 'Hóa đơn #BK-8849 thanh toán qua ví MoMo', time: '4 giờ trước' },
  ]

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <LinearGradient 
        colors={[COLORS.primary, '#1e40af', '#1d4ed8']} 
        style={{ paddingTop: 56, paddingBottom: 32, paddingHorizontal: SIZES.screenPadding, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: SIZES.fontSm }}>Quản trị hệ thống ⚙️</Text>
            <Text style={{ color: '#fff', fontSize: SIZES.fontXxl, fontWeight: '800', marginTop: 2 }}>{user?.fullName || 'Admin'}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ProfileStack')}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="person-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Status indicator banner */}
        <Animated.View entering={FadeInDown.delay(200)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success }} />
          <Text style={{ color: '#fff', fontSize: SIZES.fontSm, fontWeight: '600', flex: 1 }}>Trạng thái hệ thống: Hoạt động bình thường</Text>
        </Animated.View>
      </LinearGradient>
      
      <View style={{ padding: SIZES.screenPadding, gap: 24 }}>
        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: 12 }}>
          <SectionHeader title="Số liệu hệ thống" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard title="Tổng thành viên" value={isLoading ? '...' : String(dashboard?.totalUsers || 0)} icon="people" color={COLORS.primary} bg={COLORS.primaryBg} />
            <StatCard title="Phiên hôm nay" value={isLoading ? '...' : String(dashboard?.todaySessions || 0)} icon="calendar" color="#7c3aed" bg="#f5f3ff" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard title="Doanh thu hôm nay" value={isLoading ? '...' : formatCurrency(dashboard?.todayRevenue || 0)} icon="cash" color="#059669" bg="#f0fdf4" />
            <StatCard title="Công suất đỗ" value={isLoading ? '...' : `${((dashboard?.occupancyRate || 0) * 100).toFixed(0)}%`} icon="trending-up" color="#d97706" bg="#fffbeb" />
          </View>
        </Animated.View>

        {/* Admin actions */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <SectionHeader title="Chức năng quản lý" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {ADMIN_TASKS.map((a, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => navigation.navigate(a.screen, a.params)} 
                activeOpacity={0.8} 
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 6, ...SHADOWS.sm }}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, textAlign: 'center' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Recent logs */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <SectionHeader title="Hoạt động gần đây" />
          <View style={{ gap: 10 }}>
            {RECENT_ACTIVITIES.map((act) => (
              <Card key={act.id} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: act.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={act.icon} size={20} color={act.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: SIZES.fontSm + 1, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{act.title}</Text>
                      <Text style={{ fontSize: 10, color: COLORS.textTertiary }}>{act.time}</Text>
                    </View>
                    <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 3 }} numberOfLines={2}>{act.desc}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  )
}
