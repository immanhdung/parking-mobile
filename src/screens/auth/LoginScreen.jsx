import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import Toast from 'react-native-toast-message'
import { Button, Input } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import useAuthStore from '../../store/authStore'

const { height } = Dimensions.get('window')

export default function LoginScreen({ navigation }) {
  const { login, isLoading } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    const result = await login(form.email.trim(), form.password)
    if (!result.success) Toast.show({ type: 'error', text1: 'Đăng nhập thất bại', text2: result.message })
  }

  const DEMOS = [
    { label: 'Admin', email: 'admin@parking.com', pass: 'Admin123!', color: '#7c3aed' },
    { label: 'User', email: 'user@parking.com', pass: 'User123!', color: COLORS.primary },
  ]

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={dark ? ['#0f172a','#1e293b','#0f172a'] : ['#eff6ff','#dbeafe','#ffffff']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SIZES.screenPadding }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* Logo */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={{ alignItems: 'center', marginTop: height * 0.08, marginBottom: 40 }}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 }}>
              <Text style={{ fontSize: 40 }}>🚗</Text>
            </LinearGradient>
            <Text style={{ fontSize: SIZES.fontHero, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, letterSpacing: -0.5 }}>ParkSmart</Text>
            <Text style={{ fontSize: SIZES.fontMd, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginTop: 4 }}>Bãi xe thông minh</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: dark ? COLORS.dark.border : '#f0f4ff' }}>
            <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 20 }}>Đăng nhập</Text>

            <Input label="Email" value={form.email} onChangeText={v => setForm({ ...form, email: v })} placeholder="email@example.com" keyboardType="email-address" icon="mail-outline" error={errors.email} style={{ marginBottom: 12 }} />

            <Input label="Mật khẩu" value={form.password} onChangeText={v => setForm({ ...form, password: v })} placeholder="••••••••" secureTextEntry={!showPass} icon="lock-closed-outline" error={errors.password} rightElement={
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            } style={{ marginBottom: 8 }} />

            <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
              <Text style={{ color: COLORS.primary, fontSize: SIZES.fontSm, fontWeight: '600' }}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <Button title={isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'} onPress={handleLogin} loading={isLoading} size="lg" />

            {/* Demo */}
            <View style={{ marginTop: 20 }}>
              <Text style={{ textAlign: 'center', fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textTertiary, marginBottom: 10 }}>Tài khoản demo</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DEMOS.map(d => (
                  <TouchableOpacity key={d.label} onPress={() => setForm({ email: d.email, password: d.pass })} style={{ flex: 1, paddingVertical: 8, backgroundColor: COLORS.primaryBg, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primaryBg2 }}>
                    <Text style={{ color: COLORS.primary, fontSize: SIZES.fontXs, fontWeight: '700' }}>{d.label}</Text>
                    <Text style={{ color: COLORS.textTertiary, fontSize: 10, marginTop: 1 }}>{d.email.split('@')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Register link */}
          <Animated.View entering={FadeInDown.delay(400)} style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontMd }}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: SIZES.fontMd }}>Đăng ký</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}
