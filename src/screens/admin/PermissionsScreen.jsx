import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Toast from 'react-native-toast-message'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { Card, Input, ScreenHeader, Button, Divider } from '../../components/common'

const MOCK_USERS = [
  { id: '1', fullName: 'Nguyễn Văn A', email: 'a.nguyen@parking.com', role: 'parking_user' },
  { id: '2', fullName: 'Trần Thị B', email: 'b.tran@parking.com', role: 'parking_user' },
  { id: '3', fullName: 'Lê Văn C', email: 'c.le@parking.com', role: 'parking_staff' },
  { id: '4', fullName: 'Phạm Minh D', email: 'd.pham@parking.com', role: 'parking_manager' },
  { id: '5', fullName: 'Đỗ Thị E', email: 'e.do@parking.com', role: 'parking_user' },
  { id: '6', fullName: 'Hoàng Văn F', email: 'f.hoang@parking.com', role: 'parking_user' },
]

const ROLES = [
  { code: 'parking_user', name: 'Người dùng', desc: 'Được quyền tìm bãi xe, đặt chỗ trước, thanh toán trực tuyến và xem lịch sử giao dịch cá nhân.', icon: 'person-outline', color: COLORS.primary },
  { code: 'parking_staff', name: 'Nhân viên bãi xe', desc: 'Được quyền quét mã QR check-in/check-out của khách hàng, xem trạng thái bãi xe hiện tại.', icon: 'scan-outline', color: '#7c3aed' },
  { code: 'parking_manager', name: 'Quản lý bãi xe', desc: 'Có quyền xem báo cáo doanh thu bãi xe, cấu hình sơ đồ tầng và các vị trí đỗ trong bãi đỗ.', icon: 'business-outline', color: '#059669' },
  { code: 'system_admin', name: 'Quản trị hệ thống', desc: 'Toàn quyền quản trị tài khoản người dùng, phân quyền các nhóm vai trò và cấu hình cài đặt chung.', icon: 'settings-outline', color: '#dc2626' },
]

const ROLE_LABELS = {
  system_admin: 'Admin',
  parking_manager: 'Quản lý',
  parking_staff: 'Nhân viên',
  parking_user: 'Người dùng',
}

export default function PermissionsScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [users, setUsers] = useState(MOCK_USERS)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpdateRole = (userId, newRole) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        Toast.show({
          type: 'success',
          text1: 'Đã phân quyền thành công',
          text2: `Đổi vai trò của ${u.fullName} thành ${ROLE_LABELS[newRole]}`
        })
        if (selectedUser?.id === u.id) {
          setSelectedUser({ ...selectedUser, role: newRole })
        }
        return { ...u, role: newRole }
      }
      return u
    }))
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Phân quyền vai trò" onBack={() => navigation.goBack()} />

      <View style={{ paddingHorizontal: SIZES.screenPadding, marginBottom: 12 }}>
        <Input 
          value={search} 
          onChangeText={setSearch} 
          placeholder="Tìm tên hoặc email người dùng..." 
          icon="search-outline" 
          style={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 40, gap: 10 }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60)}>
            <Card onPress={() => setSelectedUser(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{item.fullName}</Text>
                  <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 2 }}>{item.email}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary }}>Vai trò hiện tại:</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: COLORS.primaryBg }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.primary }}>{ROLE_LABELS[item.role]}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: dark ? COLORS.dark.bgSecondary : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
                </View>
              </View>
            </Card>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="people-outline" size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 10, fontSize: SIZES.fontMd }}>Không tìm thấy tài khoản phù hợp</Text>
          </View>
        }
      />

      {/* Permissions Modal */}
      {selectedUser && (
        <Modal transparent animationType="slide" visible={!!selectedUser} onRequestClose={() => setSelectedUser(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, maxHeight: '80%', gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Phân quyền tài khoản</Text>
                  <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 2 }}>{selectedUser.fullName} ({selectedUser.email})</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <FlatList
                data={ROLES}
                keyExtractor={item => item.code}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const isCurrent = selectedUser.role === item.code
                  return (
                    <TouchableOpacity 
                      onPress={() => handleUpdateRole(selectedUser.id, item.code)}
                      activeOpacity={0.85}
                    >
                      <View style={{
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: isCurrent ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
                        backgroundColor: isCurrent ? COLORS.primaryBg : (dark ? 'transparent' : '#f8fafc'),
                        flexDirection: 'row',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isCurrent ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                          <Ionicons name={item.icon} size={18} color={isCurrent ? '#fff' : (dark ? '#cbd5e1' : '#475569')} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: isCurrent ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>{item.name}</Text>
                            {isCurrent && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                          </View>
                          <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 }}>{item.desc}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}
