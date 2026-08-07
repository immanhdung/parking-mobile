import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform, ActivityIndicator, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { vehicleAPI, vehicleTypeAPI } from '../../services/api'
import { Button, Card, Input } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { getVehicleName } from '../../utils/helpers'

export default function MyVehiclesScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  
  const [addMode, setAddMode] = useState(false)
  const [form, setForm] = useState({ licensePlate: '', vehicleTypeCode: '', vehicleModel: '', vehicleColor: '' })

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => vehicleAPI.getMyVehicles().then(r => r.data.data),
  })

  // Fetch all vehicle types to map codes to ObjectIds
  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicle-types-global'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })

  // Extract unique vehicle types by code
  const uniqueVehicleTypes = React.useMemo(() => {
    if (!vehicleTypes) return []
    const map = new Map()
    vehicleTypes.forEach(vt => {
      // Prefer global vehicle types if duplicates exist
      if (!map.has(vt.code) || !vt.parkingLot) {
        map.set(vt.code, vt)
      }
    })
    return Array.from(map.values())
  }, [vehicleTypes])

  const addMut = useMutation({
    mutationFn: (d) => vehicleAPI.addVehicle(d),
    onSuccess: () => { 
      qc.invalidateQueries(['my-vehicles']); 
      Toast.show({ type: 'success', text1: 'Đã thêm phương tiện' }); 
      setAddMode(false);
      setForm({ licensePlate: '', vehicleTypeCode: '', vehicleModel: '', vehicleColor: '' });
    },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi thêm phương tiện' }),
  })

  const delMut = useMutation({
    mutationFn: (id) => vehicleAPI.deleteVehicle(id),
    onSuccess: () => { qc.invalidateQueries(['my-vehicles']); Toast.show({ type: 'success', text1: 'Đã xóa phương tiện' }) },
  })

  const handleSave = () => {
    if (!form.licensePlate.trim()) { Toast.show({ type: 'error', text1: 'Vui lòng nhập biển số xe' }); return }
    if (!form.vehicleTypeCode) { Toast.show({ type: 'error', text1: 'Vui lòng chọn loại phương tiện' }); return }
    
    const vt = uniqueVehicleTypes.find(v => v.code === form.vehicleTypeCode)
    if (!vt) return

    addMut.mutate({
      licensePlate: form.licensePlate.trim(),
      vehicleType: vt._id,
      vehicleModel: form.vehicleModel.trim(),
      vehicleColor: form.vehicleColor.trim()
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.screenPadding, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16, backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderBottomWidth: 1, borderBottomColor: dark ? COLORS.dark.border : COLORS.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={dark ? COLORS.dark.text : COLORS.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Phương tiện của tôi</Text>
        <TouchableOpacity onPress={() => setAddMode(true)} style={{ padding: 8, marginRight: -8 }}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : vehicles?.length === 0 ? (
          <Animated.View entering={FadeInDown} style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="car-outline" size={64} color={COLORS.textTertiary} />
            <Text style={{ fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' }}>Bạn chưa thêm phương tiện nào.</Text>
            <Button title="Thêm phương tiện mới" onPress={() => setAddMode(true)} style={{ marginTop: 20 }} />
          </Animated.View>
        ) : (
          vehicles?.map((v, i) => (
            <Animated.View key={v._id} entering={FadeInDown.delay(i * 100)}>
              <Card style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: dark ? COLORS.dark.bgSecondary : COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 4 }}>{v.licensePlate}</Text>
                  <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary }}>{v.vehicleType?.code || '—'} · {v.vehicleModel || 'Không rõ dòng xe'} · {v.vehicleColor || 'Không rõ màu'}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('BookingStack', { screen: 'MonthlyPass', params: { vehicle: v } })} style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${COLORS.primary}15`, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="card-outline" size={14} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>Mua vé tháng</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => delMut.mutate(v._id)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      {addMode && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100 }}>
          <Animated.View entering={FadeInDown} style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Thêm phương tiện</Text>
              <TouchableOpacity onPress={() => setAddMode(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>

            <Input label="Biển số xe *" value={form.licensePlate} onChangeText={v => setForm({ ...form, licensePlate: v.toUpperCase() })} icon="id-card-outline" placeholder="VD: 29A-123.45" autoCapitalize="characters" />
            
            <View>
              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 8 }}>Mã loại xe (Code) *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {uniqueVehicleTypes.map(vt => {
                  const isSelected = form.vehicleTypeCode === vt.code
                  return (
                    <TouchableOpacity key={vt.code} onPress={() => setForm({ ...form, vehicleTypeCode: vt.code })} style={{
                      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border),
                      backgroundColor: isSelected ? (dark ? `${COLORS.primary}20` : COLORS.primaryBg) : 'transparent',
                    }}>
                      <Text style={{ fontWeight: isSelected ? '700' : '500', color: isSelected ? COLORS.primary : (dark ? COLORS.dark.textSecondary : COLORS.textSecondary) }}>
                        {vt.code}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <Input label="Dòng xe (Tuỳ chọn)" value={form.vehicleModel} onChangeText={v => setForm({ ...form, vehicleModel: v })} icon="car-sport-outline" placeholder="VD: Honda Civic" />
            <Input label="Màu xe (Tuỳ chọn)" value={form.vehicleColor} onChangeText={v => setForm({ ...form, vehicleColor: v })} icon="color-palette-outline" placeholder="VD: Trắng" />
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button title="Hủy" variant="outline" onPress={() => setAddMode(false)} style={{ flex: 1 }} />
              <Button title="Lưu" onPress={handleSave} loading={addMut.isPending} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  )
}
