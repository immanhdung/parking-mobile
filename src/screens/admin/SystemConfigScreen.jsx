import React, { useState } from 'react'
import { View, Text, ScrollView, Switch, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { COLORS, SIZES } from '../../utils/theme'
import { Input, ScreenHeader, Button, Card } from '../../components/common'

export default function SystemConfigScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    systemName: 'ParkSmart',
    maxHours: '24',
    supportEmail: 'support@parksmart.com',
    maintenanceMode: false
  })

  const handleSave = () => {
    if (!config.systemName.trim()) {
      Toast.show({ type: 'error', text1: 'Lỗi cấu hình', text2: 'Tên hệ thống không được để trống' })
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      Toast.show({
        type: 'success',
        text1: '✅ Lưu cấu hình thành công',
        text2: 'Các thiết lập mới đã được áp dụng toàn hệ thống.'
      })
      navigation.goBack()
    }, 1000)
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}
    >
      <ScreenHeader title="Cấu hình hệ thống" onBack={() => navigation.goBack()} />

      <ScrollView 
        contentContainerStyle={{ padding: SIZES.screenPadding, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary, marginBottom: 16 }}>Thiết lập cơ bản</Text>
          <Input 
            label="Tên hệ thống" 
            value={config.systemName} 
            onChangeText={v => setConfig({ ...config, systemName: v })} 
            placeholder="ParkSmart" 
            icon="business-outline" 
          />
          <Input 
            label="Email hỗ trợ kỹ thuật" 
            value={config.supportEmail} 
            onChangeText={v => setConfig({ ...config, supportEmail: v })} 
            placeholder="support@parksmart.com" 
            icon="mail-outline" 
            keyboardType="email-address" 
          />
        </Card>

        <Card onPress={() => navigation.navigate('VehicleTypes')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="car-sport-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Loại xe & giá gửi</Text>
            <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 2 }}>Thêm/sửa loại phương tiện, biểu phí gửi xe theo giờ, ngày, tháng</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </Card>

        <Card>
          <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary, marginBottom: 16 }}>Quy định bãi xe</Text>
          <Input 
            label="Thời gian đặt đỗ tối đa (giờ)" 
            value={config.maxHours} 
            onChangeText={v => setConfig({ ...config, maxHours: v })} 
            placeholder="24" 
            icon="time-outline" 
            keyboardType="numeric" 
          />
        </Card>

        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Chế độ bảo trì</Text>
            <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 4 }}>Khi kích hoạt, toàn bộ người dùng sẽ không thể đặt chỗ mới.</Text>
          </View>
          <Switch 
            value={config.maintenanceMode} 
            onValueChange={v => setConfig({ ...config, maintenanceMode: v })} 
            trackColor={{ false: '#cbd5e1', true: COLORS.primaryBg2 }}
            thumbColor={config.maintenanceMode ? COLORS.primary : '#94a3b8'}
          />
        </Card>

        <Button 
          title="Lưu cấu hình hệ thống" 
          onPress={handleSave} 
          loading={loading} 
          size="lg" 
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
