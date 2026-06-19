import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useMutation } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { userAPI, authAPI } from '../../services/api'
import { Button, Card, Input } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import useAuthStore from '../../store/authStore'

const ROLE_LABELS = {
  system_admin: 'Quản trị hệ thống',
  parking_manager: 'Quản lý bãi xe',
  parking_staff: 'Nhân viên',
  parking_user: 'Người dùng',
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [editMode, setEditMode] = useState(false)
  const [passMode, setPassMode] = useState(false)
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' })
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState({ cur: false, new: false, con: false })

  const updateMut = useMutation({
    mutationFn: (d) => userAPI.updateProfile(d),
    onSuccess: (res) => { updateUser(res.data.data); Toast.show({ type: 'success', text1: '✅ Cập nhật thành công' }); setEditMode(false) },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi cập nhật' }),
  })

  const passMut = useMutation({
    mutationFn: (d) => authAPI.changePassword(d),
    onSuccess: () => { Toast.show({ type: 'success', text1: '🔐 Đổi mật khẩu thành công' }); setPassMode(false); setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Mật khẩu hiện tại không đúng' }),
  })

  const handleSave = () => {
    if (!form.fullName.trim()) { Toast.show({ type: 'error', text1: 'Họ tên không được để trống' }); return }
    updateMut.mutate(form)
  }
  const handleChangePass = () => {
    if (!passForm.currentPassword) { Toast.show({ type: 'error', text1: 'Nhập mật khẩu hiện tại' }); return }
    if (passForm.newPassword.length < 8) { Toast.show({ type: 'error', text1: 'Mật khẩu mới ít nhất 8 ký tự' }); return }
    if (passForm.newPassword !== passForm.confirmPassword) { Toast.show({ type: 'error', text1: 'Mật khẩu xác nhận không khớp' }); return }
    passMut.mutate({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
  }
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ])
  }

  const isAdmin = user?.role === 'system_admin'

  const MENU = [
    {
      section: 'Tài khoản', items: [
        { icon: 'person-outline', label: 'Chỉnh sửa hồ sơ', action: () => setEditMode(true) },
        { icon: 'lock-closed-outline', label: 'Đổi mật khẩu', action: () => setPassMode(true) },
      ]
    },
    ...(!isAdmin ? [{
      section: 'Lịch sử', items: [
        { icon: 'calendar-outline', label: 'Lịch sử đặt chỗ', action: () => navigation.navigate('HistoryStack') },
      ]
    }] : []),
    {
      section: 'Hỗ trợ', items: [
        ...(!isAdmin ? [{ icon: 'chatbubble-outline', label: 'Gửi phản hồi', action: () => navigation.navigate('Feedback') }] : []),
        { icon: 'information-circle-outline', label: 'Về ứng dụng', action: () => Toast.show({ type: 'info', text1: 'ParkSmart v1.0.0' }) },
      ]
    },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[COLORS.primary, '#1d4ed8']} style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: SIZES.screenPadding, alignItems: 'center' }}>
          <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center' }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 14, ...SHADOWS.lg }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff' }}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' }}>{user?.fullName || '—'}</Text>
            <Text style={{ fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{user?.email}</Text>
            <View style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Text style={{ fontSize: SIZES.fontXs, color: '#fff', fontWeight: '600' }}>{ROLE_LABELS[user?.role] || 'Người dùng'}</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Info cards */}
        <View style={{ flexDirection: 'row', marginHorizontal: SIZES.screenPadding, marginTop: -20, gap: 10, marginBottom: 8 }}>
          {[
            { label: 'Email', value: user?.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực', color: user?.isEmailVerified ? COLORS.success : COLORS.danger },
            { label: 'SĐT', value: user?.phone || 'Chưa cập nhật' },
          ].map((item, i) => (
            <Card key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginBottom: 4 }}>{item.label}</Text>
              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: item.color || (dark ? COLORS.dark.text : COLORS.text), textAlign: 'center' }} numberOfLines={1}>{item.value}</Text>
            </Card>
          ))}
        </View>

        {/* Menu */}
        <View style={{ padding: SIZES.screenPadding, gap: 20, paddingTop: 12 }}>
          {MENU.map((section, si) => (
            <Animated.View key={si} entering={FadeInDown.delay(300 + si * 80)}>
              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: COLORS.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>{section.section}</Text>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {section.items.map((item, ii) => (
                  <View key={ii}>
                    <TouchableOpacity onPress={item.action} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                      </View>
                      <Text style={{ flex: 1, fontSize: SIZES.fontMd, color: dark ? COLORS.dark.text : COLORS.text, fontWeight: '500' }}>{item.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                    {ii < section.items.length - 1 && <View style={{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border, marginLeft: 64 }} />}
                  </View>
                ))}
              </Card>
            </Animated.View>
          ))}

          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.dangerBg, borderWidth: 1.5, borderColor: '#fecaca' }}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={{ color: COLORS.danger, fontSize: SIZES.fontMd, fontWeight: '700' }}>Đăng xuất</Text>
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', fontSize: SIZES.fontXs, color: COLORS.textTertiary, paddingBottom: 16 }}>ParkSmart v1.0.0 · © 2024</Text>
        </View>
      </ScrollView>

      {/* Edit modal */}
      {editMode && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeInDown} style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setEditMode(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Input label="Họ tên" value={form.fullName} onChangeText={v => setForm({ ...form, fullName: v })} icon="person-outline" placeholder="Nguyễn Văn A" />
            <Input label="Số điện thoại" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} icon="call-outline" placeholder="0912345678" keyboardType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Hủy" variant="outline" onPress={() => setEditMode(false)} style={{ flex: 1 }} />
              <Button title="Lưu" onPress={handleSave} loading={updateMut.isPending} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Change password modal */}
      {passMode && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeInDown} style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={() => setPassMode(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Input label="Mật khẩu hiện tại" value={passForm.currentPassword} onChangeText={v => setPassForm({ ...passForm, currentPassword: v })} secureTextEntry={!showPass.cur} icon="lock-closed-outline"
              rightElement={<TouchableOpacity onPress={() => setShowPass({ ...showPass, cur: !showPass.cur })}><Ionicons name={showPass.cur ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} /></TouchableOpacity>} />
            <Input label="Mật khẩu mới" value={passForm.newPassword} onChangeText={v => setPassForm({ ...passForm, newPassword: v })} secureTextEntry={!showPass.new} icon="lock-open-outline" placeholder="Tối thiểu 8 ký tự"
              rightElement={<TouchableOpacity onPress={() => setShowPass({ ...showPass, new: !showPass.new })}><Ionicons name={showPass.new ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} /></TouchableOpacity>} />
            <Input label="Xác nhận mật khẩu mới" value={passForm.confirmPassword} onChangeText={v => setPassForm({ ...passForm, confirmPassword: v })} secureTextEntry={!showPass.con} icon="shield-checkmark-outline"
              rightElement={<TouchableOpacity onPress={() => setShowPass({ ...showPass, con: !showPass.con })}><Ionicons name={showPass.con ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} /></TouchableOpacity>} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Hủy" variant="outline" onPress={() => setPassMode(false)} style={{ flex: 1 }} />
              <Button title="Đổi mật khẩu" onPress={handleChangePass} loading={passMut.isPending} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  )
}
