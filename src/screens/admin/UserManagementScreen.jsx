import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Platform, Modal, ScrollView, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { Card, Badge, Input, ScreenHeader, Button, InfoRow, Divider, Skeleton } from '../../components/common'
import { userAPI } from '../../services/api'

const ROLE_LABELS = {
  system_admin: 'Admin',
  parking_manager: 'Quản lý',
  parking_staff: 'Nhân viên',
  parking_user: 'Người dùng',
}

const STATUS_LABELS = {
  active: 'Hoạt động',
  blocked: 'Đã chặn',
}

export default function UserManagementScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', search, selectedRole],
    queryFn: () => userAPI.getAll({
      search: search.trim() || undefined,
      role: selectedRole === 'ALL' ? undefined : selectedRole
    }).then(r => r.data.data)
  })

  const toggleBlockMut = useMutation({
    mutationFn: (userId) => userAPI.toggleBlock(userId),
    onSuccess: (res, userId) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đã thay đổi trạng thái tài khoản'
      })
      if (selectedUser && (selectedUser._id === userId || selectedUser.id === userId)) {
        setSelectedUser(prev => ({
          ...prev,
          status: prev.status === 'active' ? 'blocked' : 'active'
        }))
      }
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Thao tác thất bại',
        text2: err.response?.data?.message || 'Không thể chặn/mở chặn tài khoản này'
      })
    }
  })

  const deleteMut = useMutation({
    mutationFn: (userId) => userAPI.delete(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      Toast.show({
        type: 'success',
        text1: 'Đã xóa tài khoản',
        text2: 'Tài khoản đã được xóa khỏi hệ thống'
      })
      setSelectedUser(null)
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Thao tác thất bại',
        text2: err.response?.data?.message || 'Không thể xóa tài khoản này'
      })
    }
  })

  const users = Array.isArray(data) ? data : (data?.users || [])

  const handleToggleStatus = (userId) => {
    toggleBlockMut.mutate(userId)
  }

  const handleDeleteUser = (userId) => {
    deleteMut.mutate(userId)
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Quản lý tài khoản" onBack={() => navigation.goBack()} />

      {/* Filter and Search */}
      <View style={{ paddingHorizontal: SIZES.screenPadding, gap: 12, marginBottom: 12 }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm tên, email, số điện thoại..."
          icon="search-outline"
          style={{ marginBottom: 0 }}
        />

        {/* Role filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['ALL', 'parking_user', 'parking_staff', 'parking_manager'].map(role => (
            <TouchableOpacity
              key={role}
              onPress={() => setSelectedRole(role)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: selectedRole === role ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
                backgroundColor: selectedRole === role ? COLORS.primaryBg : (dark ? 'transparent' : '#fff'),
              }}
            >
              <Text style={{
                fontSize: SIZES.fontXs + 1,
                fontWeight: '700',
                color: selectedRole === role ? COLORS.primary : (dark ? COLORS.dark.textSecondary : COLORS.textSecondary)
              }}>
                {role === 'ALL' ? 'Tất cả' : ROLE_LABELS[role]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* User list */}
      {isLoading ? (
        <View style={{ paddingHorizontal: SIZES.screenPadding, gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={90} radius={16} />
          ))}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 40, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60)}>
              <Card onPress={() => setSelectedUser(item)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{item.fullName}</Text>
                    <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 4 }}>{item.email}</Text>
                    <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 2 }}>{item.phone || 'Không có số điện thoại'}</Text>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      <Badge status={item.status || 'active'} label={STATUS_LABELS[item.status || 'active']} size="sm" />
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: dark ? COLORS.dark.border : '#e2e8f0' }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>{ROLE_LABELS[item.role] || item.role}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginTop: 2 }} />
                </View>
              </Card>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="people-outline" size={48} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textSecondary, marginTop: 10, fontSize: SIZES.fontMd }}>Không tìm thấy người dùng phù hợp</Text>
            </View>
          }
        />
      )}

      {/* Details Modal */}
      {selectedUser && (
        <Modal transparent animationType="slide" visible={!!selectedUser} onRequestClose={() => setSelectedUser(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Chi tiết tài khoản</Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 4 }}>
                <InfoRow label="Họ tên" value={selectedUser.fullName} />
                <InfoRow label="Email" value={selectedUser.email} />
                <InfoRow label="Số điện thoại" value={selectedUser.phone || '—'} />
                <InfoRow label="Vai trò" value={ROLE_LABELS[selectedUser.role] || selectedUser.role} />
                <InfoRow label="Xác thực email" value={selectedUser.isEmailVerified ? 'Đã xác thực ✅' : 'Chưa xác thực ❌'} />
                <InfoRow label="Ngày tạo" value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN') : '—'} />
                <InfoRow label="Trạng thái" value={STATUS_LABELS[selectedUser.status || 'active']} valueColor={(selectedUser.status || 'active') === 'active' ? COLORS.success : COLORS.danger} />
              </View>

              <Divider />

              <View style={{ gap: 10 }}>
                <Button
                  title={(selectedUser.status || 'active') === 'active' ? 'Chặn tài khoản' : 'Mở chặn tài khoản 🔓'}
                  variant={(selectedUser.status || 'active') === 'active' ? 'danger' : 'primary'}
                  loading={toggleBlockMut.isPending}
                  onPress={() => handleToggleStatus(selectedUser._id || selectedUser.id)}
                />
                <Button
                  title="Xóa tài khoản"
                  variant="outline"
                  loading={deleteMut.isPending}
                  style={{ borderColor: COLORS.danger }}
                  onPress={() => handleDeleteUser(selectedUser._id || selectedUser.id)}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}
