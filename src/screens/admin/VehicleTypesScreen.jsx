import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Platform, Modal, ScrollView, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { COLORS, SIZES } from '../../utils/theme'
import { Card, Badge, Input, ScreenHeader, Button, Divider, Skeleton, EmptyState } from '../../components/common'
import { parkingLotAPI, vehicleTypeAPI } from '../../services/api'
import { formatCurrency, getVehicleTypeName } from '../../utils/helpers'

const SIZE_LABELS = { small: 'Nhỏ', medium: 'Vừa', large: 'Lớn', extra_large: 'Rất lớn' }
const VEHICLE_EMOJI = { CAR: '🚖', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }

const EMPTY_FORM = {
  name: '', code: '', size: 'medium',
  dayBlockRate: '', nightBlockRate: '', dailyRate: '', monthlyRate: '',
  isActive: true,
}

export default function VehicleTypesScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null) // vehicle type object being edited, or null
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedParkingLot, setSelectedParkingLot] = useState(null)

  const { data: parkingLots, isLoading: lotsLoading } = useQuery({
    queryKey: ['admin-parking-lots-for-pricing'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 100 }).then(r => r.data.data),
  })

  const { data: types, isLoading, refetch } = useQuery({
    queryKey: ['admin-vehicle-types', selectedParkingLot?._id],
    queryFn: () => vehicleTypeAPI.getAll({ includeInactive: true, parkingLot: selectedParkingLot._id }).then(r => (r.data.data || []).map(type => ({ ...type, name: getVehicleTypeName(type) }))),
    enabled: !!selectedParkingLot?._id,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-vehicle-types'] })
    qc.invalidateQueries({ queryKey: ['vehicle-types'] })
  }

  const createMut = useMutation({
    mutationFn: (payload) => vehicleTypeAPI.create(payload),
    onSuccess: () => {
      invalidateAll()
      Toast.show({ type: 'success', text1: 'Đã thêm loại xe' })
      closeForm()
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Thêm loại xe thất bại', text2: err.response?.data?.message }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => vehicleTypeAPI.update(id, payload),
    onSuccess: () => {
      invalidateAll()
      Toast.show({ type: 'success', text1: 'Đã cập nhật loại xe' })
      closeForm()
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Cập nhật thất bại', text2: err.response?.data?.message }),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => vehicleTypeAPI.delete(id),
    onSuccess: () => {
      invalidateAll()
      Toast.show({ type: 'success', text1: 'Đã xóa loại xe' })
      closeForm()
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Xóa thất bại', text2: err.response?.data?.message }),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormVisible(true)
  }

  const openEdit = (vt) => {
    setEditing(vt)
    setForm({
      name: vt.name || '',
      code: vt.code || '',
      size: vt.size || 'medium',
      dayBlockRate: String(vt.pricing?.dayBlockRate ?? ''),
      nightBlockRate: vt.pricing?.nightBlockRate ? String(vt.pricing.nightBlockRate) : '',
      dailyRate: String(vt.pricing?.dailyRate ?? ''),
      monthlyRate: vt.pricing?.monthlyRate ? String(vt.pricing.monthlyRate) : '',
      isActive: vt.isActive !== false,
    })
    setFormVisible(true)
  }

  const closeForm = () => {
    setFormVisible(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const canSave = !!selectedParkingLot && form.name.trim() && form.code.trim() && form.dayBlockRate && form.dailyRate

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      size: form.size,
      isActive: form.isActive,
      parkingLot: selectedParkingLot._id,
      pricing: {
        dayBlockRate: Number(form.dayBlockRate) || 0,
        nightBlockRate: form.nightBlockRate ? Number(form.nightBlockRate) : undefined,
        dailyRate: Number(form.dailyRate) || 0,
        monthlyRate: form.monthlyRate ? Number(form.monthlyRate) : 0,
      },
    }
    if (editing) {
      updateMut.mutate({ id: editing._id, payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Loại xe & giá gửi"
        subtitle="Cấu hình loại phương tiện và biểu phí gửi xe"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={openCreate} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      <View style={{ marginBottom: 12 }}>
        <Text style={{ paddingHorizontal: SIZES.screenPadding, fontSize: SIZES.fontSm, fontWeight: '700', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 8 }}>Chọn tòa/bãi xe để cấu hình giá</Text>
        {lotsLoading ? <View style={{ paddingHorizontal: SIZES.screenPadding }}><Skeleton width="55%" height={42} radius={14} /></View> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, gap: 8 }}>
            {parkingLots?.map(lot => {
              const selected = selectedParkingLot?._id === lot._id
              return <TouchableOpacity key={lot._id} onPress={() => { setSelectedParkingLot(lot); closeForm() }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: selected ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9'), borderWidth: 1.5, borderColor: selected ? COLORS.primary : 'transparent' }}>
                <Text style={{ color: selected ? '#fff' : (dark ? COLORS.dark.textSecondary : COLORS.textSecondary), fontWeight: '700', fontSize: SIZES.fontSm }}>{lot.name}</Text>
              </TouchableOpacity>
            })}
          </ScrollView>
        )}
      </View>

      {!selectedParkingLot ? (
        <EmptyState icon="business-outline" title="Chọn tòa/bãi xe" subtitle="Chọn một tòa ở trên để xem và cấu hình giá từng loại xe." />
      ) : isLoading ? (
        <View style={{ paddingHorizontal: SIZES.screenPadding, gap: 10 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={100} radius={16} />)}
        </View>
      ) : (
        <FlatList
          data={types || []}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 40, gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60)}>
              <Card onPress={() => openEdit(item)} style={{ opacity: item.isActive === false ? 0.55 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{VEHICLE_EMOJI[item.code] || '🚚'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{getVehicleTypeName(item)}</Text>
                      <Badge status={item.isActive === false ? 'blocked' : 'available'} label={item.isActive === false ? 'Tắt' : 'Đang dùng'} size="sm" />
                    </View>
                    <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, marginTop: 2 }}>{item.code} · {SIZE_LABELS[item.size] || item.size}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                      <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.primary, fontWeight: '700' }}>Block ngày: {formatCurrency(item.pricing?.dayBlockRate)}</Text>
                      <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary }}>Ngày: {formatCurrency(item.pricing?.dailyRate)}</Text>
                      <Text style={{ fontSize: SIZES.fontXs + 1, color: item.pricing?.monthlyRate > 0 ? COLORS.success : COLORS.textTertiary, fontWeight: '700' }}>
                        Vé tháng: {item.pricing?.monthlyRate > 0 ? `${formatCurrency(item.pricing.monthlyRate)}/tháng` : 'Chưa cấu hình'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginTop: 2 }} />
                </View>
              </Card>
            </Animated.View>
          )}
          ListEmptyComponent={
            <EmptyState icon="car-outline" title="Chưa có loại xe nào" subtitle="Nhấn nút + để thêm loại xe mới" />
          }
        />
      )}

      {/* Add / Edit Form Modal */}
      <Modal transparent animationType="slide" visible={formVisible} onRequestClose={closeForm}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '90%', backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
            <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>
                  {editing ? 'Sửa loại xe' : 'Thêm loại xe'}
                </Text>
                <TouchableOpacity onPress={closeForm}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Input label="Tên loại xe *" value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="Xe ô tô" icon="pricetag-outline" />
              <Input label="Mã (code) *" value={form.code} onChangeText={v => setForm({ ...form, code: v.toUpperCase() })} placeholder="CAR" icon="barcode-outline" />

              <View>
                <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>Kích cỡ *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(SIZE_LABELS).map(s => (
                    <TouchableOpacity key={s} onPress={() => setForm({ ...form, size: s })} activeOpacity={0.85}>
                      <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: form.size === s ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), backgroundColor: form.size === s ? COLORS.primaryBg : 'transparent' }}>
                        <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: form.size === s ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>{SIZE_LABELS[s]}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Divider />
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Biểu phí gửi xe (VND)</Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input label="Block ngày (4h) *" value={form.dayBlockRate} onChangeText={v => setForm({ ...form, dayBlockRate: v.replace(/[^0-9]/g, '') })} placeholder="5000" keyboardType="numeric" icon="sunny-outline" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Block đêm (4h)" value={form.nightBlockRate} onChangeText={v => setForm({ ...form, nightBlockRate: v.replace(/[^0-9]/g, '') })} placeholder="Mặc định 1.5x ngày" keyboardType="numeric" icon="moon-outline" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input label="Giá theo ngày *" value={form.dailyRate} onChangeText={v => setForm({ ...form, dailyRate: v.replace(/[^0-9]/g, '') })} placeholder="80000" keyboardType="numeric" icon="calendar-outline" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Giá theo tháng" value={form.monthlyRate} onChangeText={v => setForm({ ...form, monthlyRate: v.replace(/[^0-9]/g, '') })} placeholder="1500000" keyboardType="numeric" icon="wallet-outline" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '600', color: dark ? COLORS.dark.text : COLORS.text }}>Đang áp dụng</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm({ ...form, isActive: v })}
                  trackColor={{ false: '#cbd5e1', true: COLORS.primaryBg2 }}
                  thumbColor={form.isActive ? COLORS.primary : '#94a3b8'}
                />
              </View>

              <Divider />

              <View style={{ gap: 10 }}>
                <Button title={editing ? 'Lưu thay đổi' : 'Thêm loại xe'} onPress={handleSave} loading={saving} disabled={!canSave} size="lg" />
                {editing && (
                  <Button
                    title="Xóa loại xe"
                    variant="outline"
                    loading={deleteMut.isPending}
                    style={{ borderColor: COLORS.danger }}
                    onPress={() => deleteMut.mutate(editing._id)}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
