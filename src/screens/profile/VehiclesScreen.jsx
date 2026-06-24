import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { vehicleAPI, vehicleTypeAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton, Badge, EmptyState } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'

export default function VehiclesScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()

  // State
  const [showModal, setShowModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [form, setForm] = useState({
    vehicleType: '',
    licensePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleBrand: '',
    nickname: '',
    isDefault: false,
  })

  // Queries
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => vehicleAPI.getAll().then(r => r.data.data),
  })

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicle-types-form'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })

  // Mutations
  const createMut = useMutation({
    mutationFn: (d) => vehicleAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['my-vehicles'])
      Toast.show({ type: 'success', text1: 'Thêm xe thành công' })
      handleCloseModal()
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Lỗi thêm xe', text2: err.response?.data?.message || 'Có lỗi xảy ra' })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => vehicleAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['my-vehicles'])
      Toast.show({ type: 'success', text1: 'Cập nhật xe thành công' })
      handleCloseModal()
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Lỗi cập nhật xe', text2: err.response?.data?.message || 'Có lỗi xảy ra' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => vehicleAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['my-vehicles'])
      Toast.show({ type: 'success', text1: 'Đã xóa phương tiện' })
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Lỗi xóa xe', text2: err.response?.data?.message || 'Có lỗi xảy ra' })
    },
  })

  const setDefaultMut = useMutation({
    mutationFn: (id) => vehicleAPI.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries(['my-vehicles'])
      Toast.show({ type: 'success', text1: 'Đã đặt làm mặc định' })
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Lỗi đặt mặc định', text2: err.response?.data?.message || 'Có lỗi xảy ra' })
    },
  })

  // Handlers
  const handleOpenAdd = () => {
    setEditingVehicle(null)
    setForm({
      vehicleType: vehicleTypes?.[0]?._id || '',
      licensePlate: '',
      vehicleModel: '',
      vehicleColor: '',
      vehicleBrand: '',
      nickname: '',
      isDefault: false,
    })
    setShowModal(true)
  }

  const handleOpenEdit = (v) => {
    setEditingVehicle(v)
    const vtId = typeof v.vehicleType === 'object' ? v.vehicleType._id : v.vehicleType
    setForm({
      vehicleType: vtId,
      licensePlate: v.licensePlate,
      vehicleModel: v.vehicleModel || '',
      vehicleColor: v.vehicleColor || '',
      vehicleBrand: v.vehicleBrand || '',
      nickname: v.nickname || '',
      isDefault: v.isDefault || false,
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingVehicle(null)
  }

  const handleSave = () => {
    if (!form.licensePlate.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập biển số xe' })
      return
    }
    if (!form.vehicleType) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn loại xe' })
      return
    }

    const payload = {
      ...form,
      licensePlate: form.licensePlate.toUpperCase().trim(),
    }

    if (editingVehicle) {
      updateMut.mutate({ id: editingVehicle._id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Xóa xe', 'Bạn có chắc chắn muốn xóa phương tiện này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteMut.mutate(id) },
    ])
  }

  const VehicleEmoji = (code) => ({ CAR: '🚗', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }[code] || '🚙')

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Quản lý phương tiện"
        subtitle="Quản lý các xe đã lưu của bạn"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={handleOpenAdd}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: COLORS.primaryBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 100, gap: 14 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map(i => (
              <Skeleton key={i} width="100%" height={110} radius={18} />
            ))}
          </View>
        ) : !vehicles || vehicles.length === 0 ? (
          <EmptyState
            icon="car-sport-outline"
            title="Chưa có xe nào"
            subtitle="Đăng ký xe của bạn để đặt chỗ nhanh chóng hơn mà không cần nhập lại thông tin"
            action={<Button title="Thêm xe mới" icon="add" onPress={handleOpenAdd} />}
          />
        ) : (
          vehicles.map((v, i) => {
            const vt = typeof v.vehicleType === 'object' ? v.vehicleType : {}
            const vtCode = vt.code || 'CAR'
            const vtName = vt.name || 'Xe'

            return (
              <Animated.View key={v._id} entering={FadeInRight.delay(i * 80)}>
                <Card style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                      {/* Avatar/Emoji */}
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: dark ? COLORS.dark.bgSecondary : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{VehicleEmoji(vtCode)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{v.licensePlate}</Text>
                          {v.isDefault && <Badge status="success" label="Mặc định" size="sm" />}
                        </View>
                        {v.nickname ? (
                          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: COLORS.primary, marginTop: 2 }}>{v.nickname}</Text>
                        ) : null}
                        <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 4 }}>
                          {v.vehicleBrand ? `${v.vehicleBrand} ` : ''}{v.vehicleModel || ''} {v.vehicleColor ? `· Màu ${v.vehicleColor}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border, marginVertical: 12 }} />

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {!v.isDefault ? (
                      <TouchableOpacity
                        onPress={() => setDefaultMut.mutate(v._id)}
                        disabled={setDefaultMut.isPending}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="star-outline" size={16} color={COLORS.primary} />
                        <Text style={{ fontSize: SIZES.fontSm, color: COLORS.primary, fontWeight: '600' }}>Đặt mặc định</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="star" size={16} color="#eab308" />
                        <Text style={{ fontSize: SIZES.fontSm, color: '#eab308', fontWeight: '700' }}>Ưu tiên</Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <TouchableOpacity onPress={() => handleOpenEdit(v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="create-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, fontWeight: '600' }}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(v._id)} disabled={deleteMut.isPending} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        <Text style={{ fontSize: SIZES.fontSm, color: COLORS.danger, fontWeight: '600' }}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )
          })
        )}
      </ScrollView>

      {/* Modal sheet */}
      {showModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleCloseModal} />
          <Animated.View entering={FadeInDown} style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 14, ...SHADOWS.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>
                {editingVehicle ? 'Cập nhật thông tin xe' : 'Thêm xe mới'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }} style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {/* Vehicle Type selector */}
              <View>
                <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 8 }}>
                  Loại phương tiện *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {vehicleTypes?.map(vt => (
                    <TouchableOpacity
                      key={vt._id}
                      onPress={() => setForm({ ...form, vehicleType: vt._id })}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: form.vehicleType === vt._id ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border),
                        backgroundColor: form.vehicleType === vt._id ? COLORS.primaryBg : (dark ? COLORS.dark.bgSecondary : '#f8fafc'),
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{VehicleEmoji(vt.code)}</Text>
                      <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: form.vehicleType === vt._id ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>
                        {vt.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Biển số xe * (Ví dụ: 29A-12345)"
                value={form.licensePlate}
                onChangeText={v => setForm({ ...form, licensePlate: v })}
                icon="card-outline"
                placeholder="29A-12345"
              />

              <Input
                label="Tên gọi gợi nhớ (Ví dụ: Xe đi làm)"
                value={form.nickname}
                onChangeText={v => setForm({ ...form, nickname: v })}
                icon="bookmark-outline"
                placeholder="Xe đi làm, Xe gia đình..."
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Hãng xe"
                    value={form.vehicleBrand}
                    onChangeText={v => setForm({ ...form, vehicleBrand: v })}
                    icon="car-sport-outline"
                    placeholder="Toyota, Honda..."
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Dòng xe (Model)"
                    value={form.vehicleModel}
                    onChangeText={v => setForm({ ...form, vehicleModel: v })}
                    placeholder="Vios, Wave..."
                  />
                </View>
              </View>

              <Input
                label="Màu sắc"
                value={form.vehicleColor}
                onChangeText={v => setForm({ ...form, vehicleColor: v })}
                icon="color-palette-outline"
                placeholder="Trắng, Đen, Đỏ..."
              />

              {/* Set as Default Switch */}
              <TouchableOpacity
                onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 4 }}
              >
                <Ionicons
                  name={form.isDefault ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={form.isDefault ? COLORS.primary : COLORS.textTertiary}
                />
                <Text style={{ fontSize: SIZES.fontMd, color: dark ? COLORS.dark.text : COLORS.text, fontWeight: '500' }}>
                  Đặt làm phương tiện mặc định
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button title="Hủy" variant="outline" onPress={handleCloseModal} style={{ flex: 1 }} />
              <Button
                title={editingVehicle ? 'Cập nhật' : 'Thêm mới'}
                onPress={handleSave}
                loading={createMut.isPending || updateMut.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  )
}
