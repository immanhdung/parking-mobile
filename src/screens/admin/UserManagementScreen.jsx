import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Platform, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Toast from 'react-native-toast-message'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { Card, Badge, Input, ScreenHeader, Button, InfoRow, Divider } from '../../components/common'

const MOCK_USERS = [
  { id: '1', fullName: 'Nguyễn Văn A', email: 'a.nguyen@parking.com', phone: '0912345678', role: 'parking_user', status: 'active', isEmailVerified: true, createdAt: '2024-01-15' },
  { id: '2', fullName: 'Trần Thị B', email: 'b.tran@parking.com', phone: '0987654321', role: 'parking_user', status: 'active', isEmailVerified: true, createdAt: '2024-02-10' },
  { id: '3', fullName: 'Lê Văn C', email: 'c.le@parking.com', phone: '0901234567', role: 'parking_staff', status: 'active', isEmailVerified: true, createdAt: '2024-03-05' },
  { id: '4', fullName: 'Phạm Minh D', email: 'd.pham@parking.com', phone: '0933333333', role: 'parking_manager', status: 'active', isEmailVerified: true, createdAt: '2023-11-20' },
  { id: '5', fullName: 'Đỗ Thị E', email: 'e.do@parking.com', phone: '0944444444', role: 'parking_user', status: 'blocked', isEmailVerified: false, createdAt: '2024-04-01' },
  { id: '6', fullName: 'Hoàng Văn F', email: 'f.hoang@parking.com', phone: '0955555555', role: 'parking_user', status: 'active', isEmailVerified: false, createdAt: '2024-05-12' },
]

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
  const [users, setUsers] = useState(MOCK_USERS)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole
    return matchesSearch && matchesRole
  })

  const handleToggleStatus = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? 'blocked' : 'active'
        Toast.show({
          type: 'info',
          text1: `Trạng thái thay đổi`,
          text2: `Đã ${nextStatus === 'blocked' ? 'chặn' : 'mở chặn'} tài khoản ${u.fullName}`
        })
        if (selectedUser?.id === u.id) {
          setSelectedUser({ ...selectedUser, status: nextStatus })
        }
        return { ...u, status: nextStatus }
      }
      return u
    }))
  }

  const handleDeleteUser = (userId, name) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setSelectedUser(null)
    Toast.show({
      type: 'success',
      text1: 'Đã xóa tài khoản',
      text2: `Tài khoản ${name} đã được xóa khỏi hệ thống`
    })
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
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 40, gap: 10 }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60)}>
            <Card onPress={() => setSelectedUser(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{item.fullName}</Text>
                  <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 4 }}>{item.email}</Text>
                  <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 2 }}>{item.phone}</Text>

                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <Badge status={item.status} label={STATUS_LABELS[item.status]} size="sm" />
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: dark ? COLORS.dark.border : '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>{ROLE_LABELS[item.role]}</Text>
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
                <InfoRow label="Số điện thoại" value={selectedUser.phone} />
                <InfoRow label="Vai trò" value={ROLE_LABELS[selectedUser.role]} />
                <InfoRow label="Xác thực email" value={selectedUser.isEmailVerified ? 'Đã xác thực ✅' : 'Chưa xác thực ❌'} />
                <InfoRow label="Ngày tạo" value={selectedUser.createdAt} />
                <InfoRow label="Trạng thái" value={STATUS_LABELS[selectedUser.status]} valueColor={selectedUser.status === 'active' ? COLORS.success : COLORS.danger} />
              </View>

              <Divider />

              <View style={{ gap: 10 }}>
                <Button
                  title={selectedUser.status === 'active' ? 'Chặn tài khoản' : 'Mở chặn tài khoản 🔓'}
                  variant={selectedUser.status === 'active' ? 'danger' : 'primary'}
                  onPress={() => handleToggleStatus(selectedUser.id)}
                />
                <Button
                  title="Xóa tài khoản"
                  variant="outline"
                  style={{ borderColor: COLORS.danger }}
                  onPress={() => handleDeleteUser(selectedUser.id, selectedUser.fullName)}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}
