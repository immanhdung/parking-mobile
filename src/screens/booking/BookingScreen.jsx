import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform, Modal, Image, ActivityIndicator, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { parkingLotAPI, vehicleTypeAPI, slotAPI, bookingAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton, Divider } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatCurrency, calcEstimatedFee } from '../../utils/helpers'

const STEPS = ['Chọn bãi xe', 'Thông tin xe', 'Xác nhận']
const { width: SCREEN_WIDTH } = Dimensions.get('window')

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

  // State for Pickers & Payment
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [timePickerType, setTimePickerType] = useState(null) // 'start' | 'end' | null
  const [createdBooking, setCreatedBooking] = useState(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)

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
    mutationFn: () => bookingAPI.create({ 
      parkingLot: form.parkingLot._id, 
      vehicleType: form.vehicleType._id, 
      scheduledDate: form.scheduledDate, 
      startTime: form.startTime, 
      endTime: form.endTime, 
      vehicleInfo: form.vehicleInfo 
    }),
    onSuccess: (res) => { 
      qc.invalidateQueries(['my-bookings-home'])
      setCreatedBooking(res.data.data)
      setPaymentModalVisible(true)
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Đặt chỗ thất bại', text2: err.response?.data?.message }),
  })

  // Polling check for payment status
  useEffect(() => {
    let intervalId
    if (paymentModalVisible && createdBooking) {
      intervalId = setInterval(async () => {
        try {
          const { data } = await bookingAPI.getById(createdBooking._id)
          const booking = data.data
          if (booking.paymentStatus === 'paid' || booking.status === 'approved') {
            clearInterval(intervalId)
            setPaymentModalVisible(false)
            setCreatedBooking(null)
            qc.invalidateQueries(['my-bookings-home'])
            navigation.navigate('BookingSuccess', { booking })
          }
        } catch (err) {
          console.error('Error polling booking payment status:', err)
        }
      }, 3000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [paymentModalVisible, createdBooking])

  const handleSimulatePayment = () => {
    if (!createdBooking) return
    const mockPaidBooking = {
      ...createdBooking,
      paymentStatus: 'paid',
      status: 'approved'
    }
    setPaymentModalVisible(false)
    setCreatedBooking(null)
    qc.invalidateQueries(['my-bookings-home'])
    navigation.navigate('BookingSuccess', { booking: mockPaidBooking })
  }

  const estFee = form.vehicleType ? calcEstimatedFee(form.startTime, form.endTime, form.vehicleType.pricing?.hourlyRate) : 0
  const canNext = () => step === 0 ? !!form.parkingLot && !!form.vehicleType : step === 1 ? !!form.vehicleInfo.licensePlate.trim() && !!form.scheduledDate : true

  const VehicleEmoji = (code) => ({ CAR: '🚗', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }[code] || '🚙')

  // Date generators
  const getNextDays = () => {
    const days = []
    for (let i = 0; i < 8; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }
  const DAYS = getNextDays()

  const getDayLabel = (d) => {
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    if (d.toDateString() === today.toDateString()) return 'Hôm nay'
    if (d.toDateString() === tomorrow.toDateString()) return 'Ngày mai'
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    return days[d.getDay()]
  }

  // Time slots generator
  const generateTimeOptions = () => {
    const options = []
    for (let h = 6; h <= 22; h++) {
      const hStr = h < 10 ? `0${h}` : `${h}`
      options.push(`${hStr}:00`)
      options.push(`${hStr}:30`)
    }
    return options
  }
  const TIME_OPTIONS = generateTimeOptions()

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
                {lotsLoading ? <View style={{ gap: 10 }}>{[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View> :
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

              {/* Clickable Date Picker trigger */}
              <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.9}>
                <View pointerEvents="none">
                  <Input label="Ngày đặt *" value={form.scheduledDate} placeholder="Chọn ngày đặt" icon="calendar-outline" editable={false} />
                </View>
              </TouchableOpacity>

              {/* Clickable Time Picker triggers */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setTimePickerType('start')} activeOpacity={0.9}>
                    <View pointerEvents="none">
                      <Input label="Giờ vào *" value={form.startTime} placeholder="Chọn giờ vào" icon="time-outline" editable={false} />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setTimePickerType('end')} activeOpacity={0.9}>
                    <View pointerEvents="none">
                      <Input label="Giờ ra *" value={form.endTime} placeholder="Chọn giờ ra" icon="time-outline" editable={false} />
                    </View>
                  </TouchableOpacity>
                </View>
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
                  <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: '#92400e', lineHeight: 20 }}>Mã QR thanh toán sẽ hiển thị ở bước tiếp theo để hoàn tất quy trình đặt chỗ.</Text>
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

      {/* ── Custom Date Picker Modal ── */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, maxHeight: '80%', gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Chọn ngày đặt chỗ</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {DAYS.map((d, index) => {
                const dateStr = d.toISOString().split('T')[0]
                const isSelected = form.scheduledDate === dateStr
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => { setForm({ ...form, scheduledDate: dateStr }); setShowDatePicker(false) }}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
                      backgroundColor: isSelected ? COLORS.primaryBg : 'transparent',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <View>
                      <Text style={{ fontWeight: '800', fontSize: SIZES.fontMd, color: isSelected ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>
                        {getDayLabel(d)}
                      </Text>
                      <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 4 }}>
                        {d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Custom Time Picker Modal ── */}
      <Modal visible={timePickerType !== null} transparent animationType="slide" onRequestClose={() => setTimePickerType(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>
                Chọn {timePickerType === 'start' ? 'giờ vào' : 'giờ ra'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerType(null)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {TIME_OPTIONS.map((time, idx) => {
                  const currentVal = timePickerType === 'start' ? form.startTime : form.endTime
                  const isSelected = currentVal === time
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        if (timePickerType === 'start') {
                          setForm({ ...form, startTime: time })
                        } else {
                          setForm({ ...form, endTime: time })
                        }
                        setTimePickerType(null)
                      }}
                      style={{
                        width: (SCREEN_WIDTH - SIZES.screenPadding * 2 - 40) / 4,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
                        backgroundColor: isSelected ? COLORS.primaryBg : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        fontWeight: '700',
                        fontSize: SIZES.fontSm,
                        color: isSelected ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text)
                      }}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Payment QR Code Polling Modal ── */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderRadius: 24, padding: 24, gap: 16, alignItems: 'center', ...SHADOWS.md }}>
            <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Thanh toán đặt chỗ</Text>
            
            <View style={{ width: '100%', backgroundColor: COLORS.primaryBg, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primaryBg2 }}>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>TỔNG TIỀN THANH TOÁN</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 4 }}>
                {formatCurrency(createdBooking?.estimatedFee || estFee)}
              </Text>
            </View>

            <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center' }}>
              Vui lòng quét mã QR MoMo dưới đây để thanh toán cho mã đặt chỗ <Text style={{ fontWeight: '700', color: COLORS.primary }}>{createdBooking?.bookingCode}</Text>
            </Text>

            {/* QR Image */}
            <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16, ...SHADOWS.card }}>
              {createdBooking?.qrCode ? (
                <Image source={{ uri: createdBooking.qrCode }} style={{ width: 180, height: 180 }} resizeMode="contain" />
              ) : (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ width: 180, height: 180 }} />
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, fontWeight: '600' }}>
                Đang chờ xác nhận giao dịch từ MoMo...
              </Text>
            </View>

            <Divider style={{ width: '100%', marginVertical: 4 }} />

            <View style={{ width: '100%', gap: 10 }}>
              <Button title="Tôi đã thanh toán (Simulate)" onPress={handleSimulatePayment} size="md" />
              <Button title="Hủy đặt chỗ" variant="outline" onPress={() => { setPaymentModalVisible(false); setCreatedBooking(null) }} size="md" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
