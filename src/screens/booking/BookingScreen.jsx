import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { parkingLotAPI, vehicleTypeAPI, slotAPI, bookingAPI, vehicleAPI, floorAPI, zoneAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton, Badge } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatCurrency, calcEstimatedFee, formatDate } from '../../utils/helpers'

const STEPS = ['Bãi xe & Loại xe', 'Thông tin xe', 'Chọn vị trí', 'Xác nhận']

const STATUS_STYLE = {
  available:   { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  occupied:    { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  reserved:    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  maintenance: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  locked:      { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
}

export default function BookingScreen({ navigation, route }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    parkingLot: null,
    vehicleType: null,
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '17:00',
    vehicleInfo: { licensePlate: '', vehicleModel: '', vehicleColor: '' },
    floor: null,
    zone: null,
    selectedSlot: null,
  })

  // Queries for step 0
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots-booking'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 20 }).then(r => r.data.data),
  })

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })

  // Query saved vehicles for step 1
  const { data: userVehicles } = useQuery({
    queryKey: ['user-vehicles-booking'],
    queryFn: () => vehicleAPI.getAll().then(r => r.data.data),
    enabled: step >= 1,
  })

  // Queries for step 2 (position selection)
  const { data: floors } = useQuery({
    queryKey: ['booking-floors', form.parkingLot?._id],
    queryFn: () => floorAPI.getAll({ parkingLot: form.parkingLot._id }).then(r => r.data.data),
    enabled: !!form.parkingLot && step === 2,
  })

  const { data: zones } = useQuery({
    queryKey: ['booking-zones', form.floor?._id],
    queryFn: () => zoneAPI.getAll({ floor: form.floor._id }).then(r => r.data.data),
    enabled: !!form.floor && step === 2,
  })

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['booking-slots', form.floor?._id],
    queryFn: () => slotAPI.getFloorMap(form.floor._id).then(r => r.data.data),
    enabled: !!form.floor && step === 2,
  })

  // Auto-select floor when floors load
  useEffect(() => {
    if (floors && floors.length > 0 && !form.floor) {
      setForm(prev => ({ ...prev, floor: floors[0] }))
    }
  }, [floors])

  // Auto-select zone when zones load
  useEffect(() => {
    if (zones && zones.length > 0) {
      setForm(prev => ({ ...prev, zone: zones[0] }))
    } else {
      setForm(prev => ({ ...prev, zone: null }))
    }
  }, [zones])

  // Reset floor/zone/slot selection if parking lot changes
  useEffect(() => {
    setForm(prev => ({ ...prev, floor: null, zone: null, selectedSlot: null }))
  }, [form.parkingLot])

  // Auto fill default vehicle on load
  useEffect(() => {
    if (userVehicles && userVehicles.length > 0 && !form.vehicleInfo.licensePlate) {
      const def = userVehicles.find(v => v.isDefault) || userVehicles[0]
      handleSelectSavedVehicle(def)
    }
  }, [userVehicles])

  const handleSelectSavedVehicle = (v) => {
    const vtId = typeof v.vehicleType === 'object' ? v.vehicleType._id : v.vehicleType
    const matchingType = vehicleTypes?.find(t => t._id === vtId)
    setForm(prev => ({
      ...prev,
      vehicleInfo: {
        licensePlate: v.licensePlate,
        vehicleModel: v.vehicleModel || '',
        vehicleColor: v.vehicleColor || '',
      },
      vehicleType: matchingType || prev.vehicleType
    }))
    Toast.show({ type: 'info', text1: `Đã chọn xe ${v.licensePlate}` })
  }

  const handleManualInput = () => {
    setForm(prev => ({
      ...prev,
      vehicleInfo: { licensePlate: '', vehicleModel: '', vehicleColor: '' }
    }))
    Toast.show({ type: 'info', text1: 'Chuyển sang nhập thủ công' })
  }

  const createMut = useMutation({
    mutationFn: () => bookingAPI.create({
      parkingLot: form.parkingLot._id,
      vehicleType: form.vehicleType._id,
      scheduledDate: form.scheduledDate,
      startTime: form.startTime,
      endTime: form.endTime,
      vehicleInfo: form.vehicleInfo,
      floorId: form.floor?._id,
      zoneId: form.zone?._id,
      assignedSlot: form.selectedSlot?._id,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['my-bookings-home'])
      navigation.navigate('BookingSuccess', { booking: res.data.data })
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Đặt chỗ thất bại', text2: err.response?.data?.message })
    },
  })

  const estFee = form.vehicleType ? calcEstimatedFee(form.startTime, form.endTime, form.vehicleType.pricing?.hourlyRate) : 0
  
  const canNext = () => {
    if (step === 0) return !!form.parkingLot && !!form.vehicleType
    if (step === 1) return !!form.vehicleInfo.licensePlate.trim() && !!form.scheduledDate
    if (step === 2) return !!form.selectedSlot
    return true
  }

  const VehicleEmoji = (code) => ({ CAR: '🚗', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }[code] || '🚙')

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Đặt chỗ"
        subtitle={`Bước ${step + 1}/${STEPS.length}: ${STEPS[step]}`}
        onBack={step === 0 ? () => navigation.goBack() : () => setStep(step - 1)}
      />

      {/* Progress */}
      <View style={{ paddingHorizontal: SIZES.screenPadding, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                backgroundColor: i <= step ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border),
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(300)}>
          {/* STEP 0: CHỌN BÃI XE & LOẠI XE */}
          {step === 0 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Chọn bãi xe</Text>
                {lotsLoading ? (
                  <View style={{ gap: 10 }}>
                    {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}
                  </View>
                ) : (
                  lots?.map(lot => (
                    <TouchableOpacity key={lot._id} onPress={() => setForm({ ...form, parkingLot: lot })} activeOpacity={0.85}>
                      <Card style={{ marginBottom: 10, borderWidth: 2, borderColor: form.parkingLot?._id === lot._id ? COLORS.primary : (dark ? COLORS.dark.border : '#f1f5f9'), backgroundColor: form.parkingLot?._id === lot._id ? COLORS.primaryBg : (dark ? COLORS.dark.bgCard : '#fff') }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: form.parkingLot?._id === lot._id ? COLORS.primary : COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="business" size={22} color={form.parkingLot?._id === lot._id ? '#fff' : COLORS.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{lot.name}</Text>
                            <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 2 }}>{lot.address?.district} · {lot.availableSlots} chỗ trống</Text>
                          </View>
                          {form.parkingLot?._id === lot._id && (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <View>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Loại phương tiện</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {vehicleTypes?.map(vt => (
                    <TouchableOpacity key={vt._id} onPress={() => setForm({ ...form, vehicleType: vt })} activeOpacity={0.85}>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 2, borderColor: form.vehicleType?._id === vt._id ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), backgroundColor: form.vehicleType?._id === vt._id ? COLORS.primaryBg : (dark ? COLORS.dark.bgSecondary : '#f8fafc'), flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>{VehicleEmoji(vt.code)}</Text>
                        <View>
                          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: form.vehicleType?._id === vt._id ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>{vt.name}</Text>
                          <Text style={{ fontSize: 10, color: COLORS.textTertiary }}>{formatCurrency(vt.pricing?.hourlyRate)}/giờ</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 1: THÔNG TIN XE */}
          {step === 1 && (
            <View style={{ gap: 14 }}>
              {/* Quick select saved vehicles */}
              {userVehicles && userVehicles.length > 0 && (
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 10 }}>Chọn nhanh xe đã lưu</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                    {userVehicles.map(v => {
                      const isSelected = form.vehicleInfo.licensePlate === v.licensePlate
                      return (
                        <TouchableOpacity
                          key={v._id}
                          onPress={() => handleSelectSavedVehicle(v)}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border),
                            backgroundColor: isSelected ? COLORS.primaryBg : (dark ? COLORS.dark.bgCard : COLORS.white),
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: isSelected ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>
                            {v.licensePlate}
                          </Text>
                          {v.nickname ? (
                            <Text style={{ fontSize: 10, color: COLORS.textTertiary }}>({v.nickname})</Text>
                          ) : null}
                        </TouchableOpacity>
                      )
                    })}
                    <TouchableOpacity
                      onPress={handleManualInput}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: dark ? COLORS.dark.border : COLORS.border,
                        backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white,
                        borderStyle: 'dashed',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary }}>+ Nhập thủ công</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              <Input label="Biển số xe *" value={form.vehicleInfo.licensePlate} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, licensePlate: v.toUpperCase() } })} placeholder="51A-12345" icon="car-outline" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><Input label="Hãng xe" value={form.vehicleInfo.vehicleModel} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, vehicleModel: v } })} placeholder="Toyota Vios" icon="car-sport-outline" /></View>
                <View style={{ flex: 1 }}><Input label="Màu xe" value={form.vehicleInfo.vehicleColor} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, vehicleColor: v } })} placeholder="Trắng" icon="color-palette-outline" /></View>
              </View>
              <Input label="Ngày đặt *" value={form.scheduledDate} onChangeText={v => setForm({ ...form, scheduledDate: v })} placeholder="YYYY-MM-DD" icon="calendar-outline" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><Input label="Giờ vào *" value={form.startTime} onChangeText={v => setForm({ ...form, startTime: v })} placeholder="08:00" icon="time-outline" /></View>
                <View style={{ flex: 1 }}><Input label="Giờ ra *" value={form.endTime} onChangeText={v => setForm({ ...form, endTime: v })} placeholder="17:00" icon="time-outline" /></View>
              </View>
              {estFee > 0 && (
                <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textSecondary }}>Phí ước tính</Text>
                    <Text style={{ color: COLORS.primary, fontSize: SIZES.fontXl, fontWeight: '900' }}>{formatCurrency(estFee)}</Text>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* STEP 2: CHỌN VỊ TRÍ ĐỖ (FLOOR, ZONE, SLOT MAP) */}
          {step === 2 && (
            <View style={{ gap: 14 }}>
              <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Chọn vị trí đỗ xe</Text>
              
              {/* Floor Selection */}
              <View>
                <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 8 }}>Chọn Tầng</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {floors?.map(f => (
                    <TouchableOpacity key={f._id} onPress={() => setForm({ ...form, floor: f, selectedSlot: null })} activeOpacity={0.8}>
                      <View style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: form.floor?._id === f._id ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9'),
                      }}>
                        <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: form.floor?._id === f._id ? '#fff' : COLORS.textSecondary }}>
                          {f.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Zone info */}
              {zones && zones.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>Khu vực khả dụng:</Text>
                  {zones.map(z => (
                    <Badge key={z._id} status="primary" label={z.name} size="sm" />
                  ))}
                </View>
              )}

              {/* Slot grid */}
              <View>
                <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 12 }}>Chọn Vị Trí Ô Đỗ (Màu Xanh)</Text>
                {slotsLoading ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} width={64} height={56} radius={10} />)}
                  </View>
                ) : !slots || slots.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: COLORS.textSecondary }}>Tầng này chưa cấu hình ô đỗ</Text>
                  </Card>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {slots.map(slot => {
                      const isSelected = form.selectedSlot?._id === slot._id
                      const isSameType = (slot.vehicleType?._id || slot.vehicleType) === form.vehicleType?._id
                      
                      // If status is not available, or doesn't match vehicle type, treat as locked/disabled
                      const isAvailable = slot.status === 'available' && isSameType
                      const st = isAvailable 
                        ? (STATUS_STYLE.available) 
                        : (slot.status === 'available' ? STATUS_STYLE.locked : STATUS_STYLE[slot.status] || STATUS_STYLE.locked)

                      return (
                        <TouchableOpacity
                          key={slot._id}
                          disabled={!isAvailable}
                          onPress={() => setForm({ ...form, selectedSlot: slot })}
                          activeOpacity={0.8}
                          style={{
                            width: 64, height: 56,
                            borderRadius: 10,
                            backgroundColor: dark ? `${st.bg}33` : st.bg,
                            borderWidth: isSelected ? 2.5 : 1.5,
                            borderColor: isSelected ? COLORS.primary : st.border,
                            alignItems: 'center', justifyContent: 'center',
                            opacity: isAvailable ? 1 : 0.45,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: st.text }}>{slot.slotCode}</Text>
                          <Text style={{ fontSize: 8, color: COLORS.textTertiary, marginTop: 2 }}>
                            {!isSameType ? 'Khác loại' : slot.vehicleType?.code || '—'}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              </View>

              {/* Status Note */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="ellipse" size={12} color={COLORS.success} />
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 }}>Trống (Chọn được)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="ellipse" size={12} color={COLORS.danger} />
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 }}>Đang đỗ</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="lock-closed" size={12} color={COLORS.textTertiary} />
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 }}>Không khả dụng/Khác loại xe</Text>
                </View>
              </View>

              {form.selectedSlot && (
                <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1, marginTop: 4 }}>
                  <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary }}>
                    Đã chọn: Ô {form.selectedSlot.slotCode} (Tầng {form.floor?.name})
                  </Text>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 2 }}>
                    Khu vực: {form.selectedSlot.zone?.name || '—'} · Vị trí: Hàng {form.selectedSlot.position?.row || '—'} Cột {form.selectedSlot.position?.column || '—'}
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* STEP 3: XÁC NHẬN */}
          {step === 3 && (
            <View style={{ gap: 14 }}>
              <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary, marginBottom: 14 }}>Thông tin đặt chỗ</Text>
                {[
                  { label: 'Bãi xe', value: form.parkingLot?.name, icon: 'business-outline' },
                  { label: 'Loại xe', value: form.vehicleType?.name, icon: 'car-outline' },
                  { label: 'Ngày', value: formatDate(form.scheduledDate), icon: 'calendar-outline' },
                  { label: 'Giờ', value: `${form.startTime} → ${form.endTime}`, icon: 'time-outline' },
                  { label: 'Biển số', value: form.vehicleInfo.licensePlate, icon: 'id-card-outline' },
                  { label: 'Tầng đỗ', value: form.floor?.name, icon: 'layers-outline' },
                  { label: 'Vị trí ô đỗ', value: `Slot ${form.selectedSlot?.slotCode} (${form.selectedSlot?.zone?.name || 'Khu vực'})`, icon: 'grid-outline' },
                  { label: 'Phí ước tính', value: formatCurrency(estFee), icon: 'cash-outline', color: COLORS.primary },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 7 ? 1 : 0, borderBottomColor: COLORS.primaryBg2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={item.icon} size={16} color={COLORS.textTertiary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                    </View>
                    <Text style={{ color: item.color || (dark ? COLORS.dark.text : COLORS.text), fontWeight: '600', fontSize: SIZES.fontSm, maxWidth: '55%', textAlign: 'right' }}>{item.value || '—'}</Text>
                  </View>
                ))}
              </Card>
              <Card style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                  <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: '#92400e', lineHeight: 20 }}>Mã QR check-in sẽ được tạo ngay lập tức. Vui lòng check-in đúng giờ đặt chỗ.</Text>
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, ...SHADOWS.md }}>
        <Button title={step < 3 ? 'Tiếp theo →' : 'Xác nhận đặt chỗ'} onPress={() => step < 3 ? setStep(step + 1) : createMut.mutate()} loading={createMut.isPending} disabled={!canNext()} size="lg" />
      </View>
    </View>
  )
}

