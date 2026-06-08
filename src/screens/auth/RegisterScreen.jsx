import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Toast from 'react-native-toast-message'
import { Button, Input } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import useAuthStore from '../../store/authStore'

export default function RegisterScreen({ navigation }) {
  const { register, isLoading } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!form.email.trim()) e.email = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu'
    else if (form.password.length < 8) e.password = 'Mật khẩu ít nhất 8 ký tự'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Cần chữ hoa, thường và số'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    const result = await register(form)
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Đăng ký thành công!', text2: 'Kiểm tra email để xác thực tài khoản' })
      navigation?.navigate('Login')
    } else {
      Toast.show({ type: 'error', text1: 'Đăng ký thất bại', text2: result.message })
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={dark ? ['#0f172a','#1e293b'] : ['#f8fafc','#ffffff']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SIZES.screenPadding }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? COLORS.dark.bgSecondary : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginTop: 52 }}>
            <Ionicons name="arrow-back" size={20} color={dark ? COLORS.dark.text : COLORS.text} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginTop: 24, marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Tạo tài khoản</Text>
            <Text style={{ fontSize: SIZES.fontMd, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginTop: 6 }}>Đăng ký để sử dụng ParkSmart</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 14 }}>
            <Input label="Họ tên *" value={form.fullName} onChangeText={v => setForm({ ...form, fullName: v })} placeholder="Nguyễn Văn A" icon="person-outline" error={errors.fullName} />
            <Input label="Email *" value={form.email} onChangeText={v => setForm({ ...form, email: v })} placeholder="email@example.com" keyboardType="email-address" icon="mail-outline" error={errors.email} />
            <Input label="Mật khẩu *" value={form.password} onChangeText={v => setForm({ ...form, password: v })} placeholder="Tối thiểu 8 ký tự, có chữ hoa + số" secureTextEntry={!showPass} icon="lock-closed-outline" error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              }
            />
            <Input label="Số điện thoại" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} placeholder="0912345678" keyboardType="phone-pad" icon="call-outline" />
            <Button title={isLoading ? 'Đang đăng ký...' : 'Đăng ký'} onPress={handleRegister} loading={isLoading} size="lg" style={{ marginTop: 8 }} />
          </Animated.View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontMd }}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: SIZES.fontMd }}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}
