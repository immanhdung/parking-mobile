import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { parkingLotAPI, vehicleTypeAPI, slotAPI, bookingAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatCurrency, calcEstimatedFee } from '../../utils/helpers'

const STEPS = ['Chọn bãi xe', 'Thông tin xe', 'Xác nhận']

export default function BookingScreen({ navigation, route }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    parkingLot: null, vehicleType: null,
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '08:00', endTime: '17:00',
    vehicleInfo: { licensePlate: '', vehicleModel: '', vehicleColor: '' },
  })

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots-booking'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 20 }).then(r => r.data.data),
  })
  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })
  const { data: available } = useQuery({
    queryKey: ['avail-slots', form.parkingLot?._id, form.vehicleType?._id],
    queryFn: () => slotAPI.findAvailable({ parkingLotId: form.parkingLot._id, vehicleTypeId: form.vehicleType._id }).then(r => r.data.data),
    enabled: !!form.parkingLot && !!form.vehicleType,
  })

  const createMut = useMutation({
    mutationFn: () => bookingAPI.create({ parkingLot: form.parkingLot._id, vehicleType: form.vehicleType._id, scheduledDate: form.scheduledDate, startTime: form.startTime, endTime: form.endTime, vehicleInfo: form.vehicleInfo }),
    onSuccess: (res) => { qc.invalidateQueries(['my-bookings-home']); navigation.navigate('BookingSuccess', { booking: res.data.data }) },
    onError: (err) => Toast.show({ type: 'error', text1: 'Đặt chỗ thất bại', text2: err.response?.data?.message }),
  })

  const estFee = form.vehicleType ? calcEstimatedFee(form.startTime, form.endTime, form.vehicleType.pricing?.hourlyRate) : 0
  const canNext = () => step === 0 ? !!form.parkingLot && !!form.vehicleType : step === 1 ? !!form.vehicleInfo.licensePlate.trim() && !!form.scheduledDate : true

  const VehicleEmoji = (code) => ({ CAR: '🚗', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }[code] || '🚙')

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Đặt chỗ" subtitle={`Bước ${step + 1}/${STEPS.length}: ${STEPS[step]}`} onBack={step === 0 ? () => navigation.goBack() : () => setStep(step - 1)} />

      {/* Progress */}
      <View style={{ paddingHorizontal: SIZES.screenPadding, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= step ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border) }} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(300)}>
          {/* STEP 0 */}
          {step === 0 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Chọn bãi xe</Text>
                {lotsLoading ? <View style={{ gap: 10 }}>{[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View> :
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
                          {form.parkingLot?._id === lot._id && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={14} color="#fff" /></View>}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))
                }
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
              {available && (
                <Card style={{ backgroundColor: COLORS.successBg, borderColor: '#bbf7d0', borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    <Text style={{ color: COLORS.success, fontWeight: '600' }}>{available.total} chỗ trống phù hợp</Text>
                  </View>
                  {available.recommended && <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm, marginTop: 4 }}>Gợi ý: Slot {available.recommended.slotCode}</Text>}
                </Card>
              )}
            </View>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <View style={{ gap: 14 }}>
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

          {/* STEP 2 */}
          {step === 2 && (
            <View style={{ gap: 14 }}>
              <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary, marginBottom: 14 }}>Thông tin đặt chỗ</Text>
                {[
                  { label: 'Bãi xe', value: form.parkingLot?.name, icon: 'business-outline' },
                  { label: 'Loại xe', value: form.vehicleType?.name, icon: 'car-outline' },
                  { label: 'Ngày', value: form.scheduledDate, icon: 'calendar-outline' },
                  { label: 'Giờ', value: `${form.startTime} → ${form.endTime}`, icon: 'time-outline' },
                  { label: 'Biển số', value: form.vehicleInfo.licensePlate, icon: 'id-card-outline' },
                  { label: 'Phí ước tính', value: formatCurrency(estFee), icon: 'cash-outline', color: COLORS.primary },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: COLORS.primaryBg2 }}>
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
                  <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: '#92400e', lineHeight: 20 }}>QR code sẽ được tạo sau khi đặt. Hệ thống tự động gán slot phù hợp nhất.</Text>
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, ...SHADOWS.md }}>
        <Button title={step < 2 ? 'Tiếp theo →' : '🎉 Xác nhận đặt chỗ'} onPress={() => step < 2 ? setStep(step + 1) : createMut.mutate()} loading={createMut.isPending} disabled={!canNext()} size="lg" />
      </View>
    </View>
  )
}
