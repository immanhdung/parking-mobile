import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform, Modal, Image, ActivityIndicator, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { parkingLotAPI, vehicleTypeAPI, slotAPI, bookingAPI, floorAPI, paymentAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton, Divider, Badge } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { formatCurrency, calcEstimatedFee } from '../../utils/helpers'

const STEPS = ['Chọn bãi & vị trí', 'Thông tin xe', 'Xác nhận']
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PAYMENT_TIMEOUT_SECONDS = 5 * 60

const STATUS_STYLE = {
  available: { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  occupied: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  reserved: { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  maintenance: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  locked: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
}

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

  // State for Pickers, Slots & Payment
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [timePickerType, setTimePickerType] = useState(null) // 'start' | 'end' | null
  // iOS spinner pickers hold a local draft value; only committed to `form` on "Xong" (Done).
  // Feeding the picker's own onChange value straight back into its `value` prop on every tick
  // fights the native UIDatePicker mid-scroll and makes the selection appear to snap back.
  const [draftDate, setDraftDate] = useState(null)
  const [draftTime, setDraftTime] = useState(null)
  const [createdBooking, setCreatedBooking] = useState(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_TIMEOUT_SECONDS)
  const [qrImageStatus, setQrImageStatus] = useState('loading') // 'loading' | 'loaded' | 'error'
  const [qrRetryKey, setQrRetryKey] = useState(0)

  // Slots Mapping
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Screen focus listener to reset the booking form
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setStep(0)
      setForm({
        parkingLot: null, vehicleType: null,
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '08:00', endTime: '17:00',
        vehicleInfo: { licensePlate: '', vehicleModel: '', vehicleColor: '' },
      })
      setSelectedFloor(null)
      setSelectedSlot(null)
      setCreatedBooking(null)
      setPaymentInfo(null)
      setPaymentModalVisible(false)
      setDraftDate(null)
      setDraftTime(null)
      setSecondsLeft(PAYMENT_TIMEOUT_SECONDS)
      setQrImageStatus('loading')
      setQrRetryKey(0)
    })
    return unsubscribe
  }, [navigation])

  // Reset slot selection when parking lot or vehicle type changes
  useEffect(() => {
    setSelectedFloor(null)
    setSelectedSlot(null)
  }, [form.parkingLot, form.vehicleType])

  // Fetch queries
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots-booking'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 20 }).then(r => r.data.data),
  })

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })

  const { data: floors } = useQuery({
    queryKey: ['floors-booking-flow', form.parkingLot?._id],
    queryFn: () => floorAPI.getAll({ parkingLot: form.parkingLot._id }).then(r => r.data.data),
    enabled: !!form.parkingLot,
  })

  useEffect(() => {
    if (floors?.[0] && !selectedFloor) {
      setSelectedFloor(floors[0]._id)
    }
  }, [floors, selectedFloor])

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots-booking-flow-map', selectedFloor, form.scheduledDate, form.startTime, form.endTime],
    queryFn: () => slotAPI.getFloorMap(selectedFloor, {
      scheduledDate: form.scheduledDate,
      date: form.scheduledDate,
      startTime: form.startTime,
      endTime: form.endTime,
    }).then(r => r.data.data),
    enabled: !!selectedFloor,
  })

  // Fetch existing bookings to validate time overlap for any logged-in user
  const { data: existingBookings } = useQuery({
    queryKey: ['existing-bookings-check', form.parkingLot?._id, form.scheduledDate],
    queryFn: async () => {
      if (!form.parkingLot?._id || !form.scheduledDate) return []
      try {
        const res = await bookingAPI.getAll({ parkingLot: form.parkingLot._id, scheduledDate: form.scheduledDate, limit: 200 })
        return res.data?.data || res.data || []
      } catch (err) {
        console.warn('Fallback to myBookings:', err)
        const res = await bookingAPI.myBookings({ limit: 100 })
        return res.data?.data || res.data || []
      }
    },
    enabled: !!form.parkingLot?._id && !!form.scheduledDate,
  })

  const toMinutes = (tStr) => {
    if (!tStr) return 0
    const [h, m] = tStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const addMinutesToTime = (timeStr, minsToAdd) => {
    if (!timeStr) return timeStr
    const [h, m] = timeStr.split(':').map(Number)
    let totalMins = (h || 0) * 60 + (m || 0) + minsToAdd
    if (totalMins < 0) totalMins += 24 * 60
    totalMins = totalMins % (24 * 60)
    const newH = Math.floor(totalMins / 60)
    const newM = totalMins % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
  }

  const checkTimeOverlap = () => {
    if (!form.startTime || !form.endTime) return null
    const formStartMins = toMinutes(form.startTime)
    const formEndMins = toMinutes(form.endTime)

    if (formStartMins >= formEndMins) {
      return { invalidTime: true, message: `Giờ vào (${form.startTime}) không được bằng hoặc muộn hơn giờ ra (${form.endTime}). Vui lòng điều chỉnh lại khung giờ!` }
    }
    if (!selectedSlot || !existingBookings || !Array.isArray(existingBookings) || existingBookings.length === 0) return null

    const targetSlotId = String(selectedSlot._id)
    const targetSlotCode = selectedSlot.slotCode
    const BUFFER_MINUTES = 15

    const conflictingBooking = existingBookings.find(b => {
      if (['cancelled', 'failed'].includes(b.status)) return false
      const bSlotId = b.assignedSlot?._id || b.assignedSlot || b.slot?._id || b.slot
      const bSlotCode = b.assignedSlot?.slotCode || b.slot?.slotCode
      const isSameSlot = (targetSlotId && bSlotId && String(bSlotId) === targetSlotId) || (targetSlotCode && bSlotCode && bSlotCode === targetSlotCode)
      if (!isSameSlot) return false

      const bDate = b.scheduledDate ? new Date(b.scheduledDate).toISOString().split('T')[0] : null
      if (bDate && bDate !== form.scheduledDate) return false

      // Backend applies 15 min buffer to prevent overlap during car exit/entry
      const bStartMins = toMinutes(b.startTime) - BUFFER_MINUTES
      const bEndMins = toMinutes(b.endTime) + BUFFER_MINUTES

      return formStartMins < bEndMins && formEndMins > bStartMins
    })

    if (conflictingBooking) {
      const bEndWithBuffer = addMinutesToTime(conflictingBooking.endTime, BUFFER_MINUTES)
      return {
        conflict: true,
        booking: conflictingBooking,
        message: `Slot ${selectedSlot.slotCode} đã có người đặt trong khung giờ ${conflictingBooking.startTime} → ${conflictingBooking.endTime} (cần thêm 15 phút ra bãi đến ${bEndWithBuffer}). Vui lòng chọn giờ vào từ ${bEndWithBuffer} trở đi!`,
      }
    }

    return null
  }



  const createMut = useMutation({
    mutationFn: () => bookingAPI.create({
      parkingLot: form.parkingLot._id,
      parkingLotId: form.parkingLot._id,
      vehicleType: form.vehicleType._id,
      vehicleTypeId: form.vehicleType._id,
      scheduledDate: form.scheduledDate,
      date: form.scheduledDate,
      startTime: form.startTime,
      endTime: form.endTime,
      vehicleInfo: form.vehicleInfo,
      slotId: selectedSlot?._id,
      assignedSlot: selectedSlot?._id,
      slot: selectedSlot?._id,
      parkingSlot: selectedSlot?._id,
      slotCode: selectedSlot?.slotCode,
      floorId: selectedSlot?.floor?._id || selectedSlot?.floor || selectedSlot?.floorId,
      zoneId: selectedSlot?.zone?._id || selectedSlot?.zone || selectedSlot?.zoneId
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['my-bookings-home'])
      const bookingData = res.data.data
      const fullBooking = {
        ...bookingData,
        assignedSlot: bookingData?.assignedSlot || selectedSlot
      }
      setCreatedBooking(fullBooking)
      setPaymentModalVisible(true)
      initiatePaymentMut.mutate(bookingData._id)
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Đặt chỗ thất bại', text2: err.response?.data?.message }),
  })

  // Generate the SePay bank-transfer QR for the newly created booking
  const initiatePaymentMut = useMutation({
    mutationFn: (bookingId) => paymentAPI.initiateBookingBankTransfer({ bookingId }),
    onSuccess: (res) => {
      setQrImageStatus('loading')
      setPaymentInfo(res.data.data)
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Không tạo được mã QR thanh toán', text2: err.response?.data?.message }),
  })

  const cancelMut = useMutation({
    mutationFn: () => bookingAPI.cancel(createdBooking._id, { reason: 'Người dùng hủy trước khi thanh toán' }),
    onSettled: () => {
      setPaymentModalVisible(false)
      setCreatedBooking(null)
      setPaymentInfo(null)
      qc.invalidateQueries(['my-bookings-home'])
    },
  })

  // Polling check for payment status against the SePay bank-transfer payment
  useEffect(() => {
    let intervalId
    const paymentId = paymentInfo?.payment?._id
    if (paymentModalVisible && paymentId) {
      intervalId = setInterval(async () => {
        try {
          const { data } = await paymentAPI.checkBankTransferStatus(paymentId)
          if (data.data.isPaid) {
            clearInterval(intervalId)
            setPaymentModalVisible(false)
            const paidBooking = { ...createdBooking, paymentStatus: 'paid', status: 'approved' }
            setCreatedBooking(null)
            setPaymentInfo(null)
            qc.invalidateQueries(['my-bookings-home'])
            navigation.navigate('BookingSuccess', { booking: paidBooking })
          }
        } catch (err) {
          console.error('Error polling payment status:', err)
        }
      }, 3000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [paymentModalVisible, paymentInfo, createdBooking])

  // Countdown: cancel the pending booking automatically if payment isn't confirmed in time
  useEffect(() => {
    if (!paymentModalVisible) return
    setSecondsLeft(PAYMENT_TIMEOUT_SECONDS)
    const tickId = setInterval(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearInterval(tickId)
  }, [paymentModalVisible])

  useEffect(() => {
    if (paymentModalVisible && secondsLeft === 0 && createdBooking) {
      Toast.show({ type: 'error', text1: 'Hết thời gian thanh toán', text2: 'Đặt chỗ đã tự động bị hủy do quá 5 phút chưa chuyển khoản.' })
      cancelMut.mutate()
    }
  }, [secondsLeft, paymentModalVisible])

  const estFee = form.vehicleType ? calcEstimatedFee(form.scheduledDate, form.startTime, form.endTime, form.vehicleType.pricing) : 0
  const overlapCheck = checkTimeOverlap()
  const canNext = () => {
    if (step === 0) return !!form.parkingLot && !!form.vehicleType && !!selectedSlot
    if (step === 1) return !!form.vehicleInfo.licensePlate.trim() && !!form.scheduledDate && !overlapCheck?.conflict && !overlapCheck?.invalidTime
    return !overlapCheck?.conflict && !overlapCheck?.invalidTime
  }

  const handleNextOrSubmit = () => {
    if (step === 0) {
      setStep(1)
      return
    }

    if (form.startTime >= form.endTime) {
      Toast.show({ type: 'error', text1: 'Thời gian không hợp lệ', text2: 'Giờ ra phải sau giờ vào!' })
      return
    }

    const overlap = checkTimeOverlap()
    if (overlap?.invalidTime) {
      Toast.show({ type: 'error', text1: 'Thời gian không hợp lệ', text2: overlap.message })
      return
    }
    if (overlap?.conflict) {
      Toast.show({ type: 'error', text1: 'Trùng khung giờ đặt', text2: overlap.message })
      return
    }

    if (step < 2) {
      setStep(step + 1)
    } else {
      createMut.mutate()
    }
  }

  const VehicleEmoji = (code) => ({ CAR: '🚖', MOTORBIKE: '🏍️', BICYCLE: '🚲', ELECTRIC_BIKE: '⚡' }[code] || '🚚')

  const formatDateStr = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const formatTimeStr = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '08:00'
    const h = dateObj.getHours()
    const m = dateObj.getMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const getDateObject = (dateStr) => {
    if (!dateStr) return new Date()
    const parts = dateStr.split('-').map(n => parseInt(n, 10))
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
    }
    return new Date()
  }

  const getTimeObject = (timeStr) => {
    if (!timeStr) return new Date()
    const parts = timeStr.split(':').map(n => parseInt(n, 10))
    const now = new Date()
    const h = isNaN(parts[0]) ? 8 : parts[0]
    const m = isNaN(parts[1]) ? 0 : parts[1]
    now.setHours(h, m, 0, 0)
    return now
  }

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: getDateObject(form.scheduledDate),
        mode: 'date',
        display: 'default',
        minimumDate: new Date(),
        maximumDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setForm(f => ({ ...f, scheduledDate: formatDateStr(date) }))
          }
        },
      })
    } else if (Platform.OS === 'ios') {
      setDraftDate(getDateObject(form.scheduledDate))
      setShowDatePicker(true)
    }
  }

  const openTimePicker = (type) => {
    const initialTime = getTimeObject(type === 'start' ? form.startTime : form.endTime)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialTime,
        mode: 'time',
        // 'default' renders Android's 24h clock-face UI, which has a known ring-confusion bug:
        // tapping a PM hour (13-24) on the outer ring can register as the same-angle inner-ring
        // hour (1-12), e.g. 19:00 misread as 07:00. The spinner is an unambiguous HH:MM wheel.
        display: 'spinner',
        is24Hour: true,
        onChange: (event, time) => {
          if (event.type === 'set' && time) {
            const timeStr = formatTimeStr(time)
            setForm(f => type === 'start' ? { ...f, startTime: timeStr } : { ...f, endTime: timeStr })
          }
        },
      })
    } else if (Platform.OS === 'ios') {
      setDraftTime(initialTime)
      setTimePickerType(type)
    }
  }

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
          {/* STEP 0: Selection */}
          {step === 0 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Chọn bãi xe</Text>
                {lotsLoading ? <View style={{ gap: 10 }}>{[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={80} radius={16} />)}</View> :
                  lots?.map(lot => {
                    const isSelected = form.parkingLot?._id === lot._id
                    return (
                      <TouchableOpacity key={lot._id} onPress={() => setForm({ ...form, parkingLot: lot })} activeOpacity={0.85}>
                        <Card style={{
                          marginBottom: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : '#f1f5f9'),
                          backgroundColor: isSelected ? (dark ? `${COLORS.primary}25` : COLORS.primaryBg) : (dark ? COLORS.dark.bgCard : '#fff')
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : COLORS.primaryBg), alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="business" size={22} color={isSelected ? '#fff' : COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: isSelected ? (dark ? '#60a5fa' : COLORS.primary) : (dark ? COLORS.dark.text : COLORS.text) }}>{lot.name}</Text>
                              <Text style={{ fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginTop: 2 }}>{lot.address?.district} · {lot.availableSlots} chỗ trống</Text>
                            </View>
                            {isSelected && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={14} color="#fff" /></View>}
                          </View>
                        </Card>
                      </TouchableOpacity>
                    )
                  })
                }
              </View>

              {form.parkingLot && (
                <Animated.View entering={FadeInDown}>
                  <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>Loại phương tiện</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {vehicleTypes?.map(vt => {
                      const isSelected = form.vehicleType?._id === vt._id
                      return (
                        <TouchableOpacity key={vt._id} onPress={() => setForm({ ...form, vehicleType: vt })} activeOpacity={0.85}>
                          <View style={{
                            paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 2,
                            borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border),
                            backgroundColor: isSelected ? (dark ? `${COLORS.primary}25` : COLORS.primaryBg) : (dark ? COLORS.dark.bgSecondary : '#f8fafc'),
                            flexDirection: 'row', alignItems: 'center', gap: 8
                          }}>
                            <Text style={{ fontSize: 20 }}>{VehicleEmoji(vt.code)}</Text>
                            <View>
                              <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: isSelected ? (dark ? '#60a5fa' : COLORS.primary) : (dark ? COLORS.dark.text : COLORS.text) }}>{vt.name}</Text>
                              <Text style={{ fontSize: 10, color: dark ? COLORS.dark.textSecondary : COLORS.textTertiary }}>{formatCurrency(vt.pricing?.dayBlockRate)}/4h</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </Animated.View>
              )}

              {/* Slot map rendering directly in booking screen */}
              {form.parkingLot && form.vehicleType && (
                <Animated.View entering={FadeInDown} style={{ gap: 12 }}>
                  <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>Chọn vị trí đỗ (Slot) *</Text>

                  {/* Floor selector tabs */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {floors?.map(floor => (
                      <TouchableOpacity key={floor._id} onPress={() => setSelectedFloor(floor._id)} activeOpacity={0.8}>
                        <View style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                          backgroundColor: selectedFloor === floor._id ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9'),
                        }}>
                          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: selectedFloor === floor._id ? '#fff' : COLORS.textSecondary }}>
                            {floor.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Slots display */}
                  {slotsLoading ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} width={60} height={50} radius={10} />)}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {slots?.map(slot => {
                        const st = STATUS_STYLE[slot.status] || STATUS_STYLE.locked
                        const isSelected = selectedSlot?._id === slot._id
                        const isVehicleMatch = slot.vehicleType?.code === form.vehicleType?.code
                        const isAvailable = slot.status === 'available'
                        const isSelectable = isAvailable && isVehicleMatch

                        return (
                          <TouchableOpacity
                            key={slot._id}
                            disabled={!isSelectable}
                            onPress={() => setSelectedSlot(isSelected ? null : slot)}
                            activeOpacity={0.8}
                            style={{
                              width: 60, height: 50,
                              borderRadius: 10,
                              backgroundColor: dark ? `${st.bg}22` : st.bg,
                              borderWidth: isSelected ? 2.5 : 1.5,
                              borderColor: isSelected ? COLORS.primary : st.border,
                              alignItems: 'center', justifyContent: 'center',
                              opacity: isSelectable ? 1 : 0.35
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '800', color: st.text }}>{slot.slotCode}</Text>
                            <Text style={{ fontSize: 7, color: COLORS.textTertiary }}>{slot.vehicleType?.code}</Text>
                            {isSelected && (
                              <View style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark" size={10} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}

                  {/* Selected slot overview card */}
                  {selectedSlot && (
                    <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2, borderWidth: 1, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Vị trí đã chọn</Text>
                          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.primary, marginTop: 2 }}>
                            Slot {selectedSlot.slotCode} ({selectedSlot.zone?.name || 'Khu vực'} · Tầng {selectedSlot.floor?.name || 'Tầng'})
                          </Text>
                        </View>
                        <Badge status="available" label="Đầy đủ điều kiện" />
                      </View>
                    </Card>
                  )}
                </Animated.View>
              )}
            </View>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <View style={{ gap: 14 }}>
              <Input label="Biển số xe *" value={form.vehicleInfo.licensePlate} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, licensePlate: v.toUpperCase() } })} placeholder="51A-12345" icon="car-outline" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><Input label="Hãng xe" value={form.vehicleInfo.vehicleModel} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, vehicleModel: v } })} placeholder="Toyota Vios" icon="car-sport-outline" /></View>
                <View style={{ flex: 1 }}><Input label="Màu xe" value={form.vehicleInfo.vehicleColor} onChangeText={v => setForm({ ...form, vehicleInfo: { ...form.vehicleInfo, vehicleColor: v } })} placeholder="Trắng" icon="color-palette-outline" /></View>
              </View>

              {Platform.OS === 'web' ? (
                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: SIZES.fontXs, fontWeight: '700', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 6 }}>Ngày đặt *</Text>
                    <input
                      type="date"
                      value={form.scheduledDate}
                      min={formatDateStr(new Date())}
                      onChange={e => e.target.value && setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: `1.5px solid ${dark ? '#334155' : '#cbd5e1'}`,
                        backgroundColor: dark ? '#1e293b' : '#ffffff',
                        color: dark ? '#f8fafc' : '#0f172a',
                        fontSize: '14px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: SIZES.fontXs, fontWeight: '700', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 6 }}>Giờ vào *</Text>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={e => e.target.value && setForm(f => ({ ...f, startTime: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: `1.5px solid ${dark ? '#334155' : '#cbd5e1'}`,
                          backgroundColor: dark ? '#1e293b' : '#ffffff',
                          color: dark ? '#f8fafc' : '#0f172a',
                          fontSize: '14px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: SIZES.fontXs, fontWeight: '700', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 6 }}>Giờ ra *</Text>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={e => e.target.value && setForm(f => ({ ...f, endTime: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: `1.5px solid ${dark ? '#334155' : '#cbd5e1'}`,
                          backgroundColor: dark ? '#1e293b' : '#ffffff',
                          color: dark ? '#f8fafc' : '#0f172a',
                          fontSize: '14px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  {/* Clickable Date Picker trigger */}
                  <TouchableOpacity onPress={openDatePicker} activeOpacity={0.9}>
                    <View pointerEvents="none">
                      <Input label="Ngày đặt *" value={form.scheduledDate} placeholder="Chọn ngày đặt" icon="calendar-outline" editable={false} />
                    </View>
                  </TouchableOpacity>

                  {/* Clickable Time Picker triggers */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => openTimePicker('start')} activeOpacity={0.9}>
                        <View pointerEvents="none">
                          <Input label="Giờ vào *" value={form.startTime} placeholder="Chọn giờ vào" icon="time-outline" editable={false} />
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => openTimePicker('end')} activeOpacity={0.9}>
                        <View pointerEvents="none">
                          <Input label="Giờ ra *" value={form.endTime} placeholder="Chọn giờ ra" icon="time-outline" editable={false} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}



              {overlapCheck?.invalidTime && (
                <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#fffbe0', borderColor: dark ? COLORS.dark.border : '#fde047', borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
                    <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: dark ? '#fef08a' : '#854d0e', fontWeight: '600', lineHeight: 20 }}>
                      ⚠️ {overlapCheck.message}
                    </Text>
                  </View>
                </Card>
              )}

              {overlapCheck?.conflict && (
                <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#fef2f2', borderColor: dark ? COLORS.dark.border : '#fca5a5', borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
                    <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: dark ? '#fca5a5' : '#991b1b', fontWeight: '600', lineHeight: 20 }}>
                      {overlapCheck.message}
                    </Text>
                  </View>
                </Card>
              )}

              {isTimeInPast(form.scheduledDate, form.startTime) && (
                <Text style={{ color: COLORS.danger, fontSize: SIZES.fontSm, marginTop: -6 }}>
                  Giờ vào không được là thời điểm trong quá khứ, vui lòng chọn lại.
                </Text>
              )}

              {estFee > 0 && (
                <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2, borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Phí ước tính</Text>
                    <Text style={{ color: COLORS.primary, fontSize: SIZES.fontXl, fontWeight: '900' }}>{formatCurrency(estFee)}</Text>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* STEP 2: Confirmation */}
          {step === 2 && (
            <View style={{ gap: 14 }}>
              <Card style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2, borderWidth: 1 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary, marginBottom: 14 }}>Thông tin đặt chỗ</Text>
                {[
                  { label: 'Bãi xe', value: form.parkingLot?.name, icon: 'business-outline' },
                  { label: 'Vị trí đỗ', value: `Slot ${selectedSlot?.slotCode} (${selectedSlot?.floor?.name || 'Tầng'})`, icon: 'grid-outline' },
                  { label: 'Loại xe', value: form.vehicleType?.name, icon: 'car-outline' },
                  { label: 'Ngày', value: form.scheduledDate, icon: 'calendar-outline' },
                  { label: 'Giờ', value: `${form.startTime} → ${form.endTime}`, icon: 'time-outline' },
                  { label: 'Biển số', value: form.vehicleInfo.licensePlate, icon: 'id-card-outline' },
                  { label: 'Phí ước tính', value: formatCurrency(estFee), icon: 'cash-outline', color: COLORS.primary },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: dark ? COLORS.dark.border : COLORS.primaryBg2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={item.icon} size={16} color={dark ? COLORS.dark.textSecondary : COLORS.textTertiary} />
                      <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                    </View>
                    <Text style={{ color: item.color || (dark ? COLORS.dark.text : COLORS.text), fontWeight: '600', fontSize: SIZES.fontSm, maxWidth: '55%', textAlign: 'right' }}>{item.value || '—'}</Text>
                  </View>
                ))}

              </Card>
              <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#fffbeb', borderColor: dark ? COLORS.dark.border : '#fde68a', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                  <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: dark ? '#fef08a' : '#92400e', lineHeight: 20 }}>Mã QR thanh toán sẽ hiển thị ở bước tiếp theo để hoàn tất quy trình đặt chỗ.</Text>
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, ...SHADOWS.md }}>
        <Button title={step < 2 ? 'Tiếp theo →' : '🎉 Xác nhận đặt chỗ'} onPress={handleNextOrSubmit} loading={createMut.isPending} disabled={!canNext()} size="lg" />
      </View>

      {/* ── Native Date Picker (Android uses the imperative DateTimePickerAndroid.open API above; iOS uses this tray modal) ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Chọn ngày đặt chỗ</Text>
                <TouchableOpacity onPress={() => {
                  if (draftDate) setForm(f => ({ ...f, scheduledDate: draftDate.toISOString().split('T')[0] }))
                  setShowDatePicker(false)
                }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: SIZES.fontMd }}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftDate || getDateObject(form.scheduledDate)}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                locale="vi-VN"
                onChange={(event, date) => { if (date) setDraftDate(date) }}
                themeVariant={dark ? 'dark' : 'light'}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Native Time Picker (Android uses the imperative DateTimePickerAndroid.open API above; iOS uses this tray modal) ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={timePickerType !== null} transparent animationType="slide" onRequestClose={() => setTimePickerType(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SIZES.screenPadding, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>
                  Chọn {timePickerType === 'start' ? 'giờ vào' : 'giờ ra'}
                </Text>
                <TouchableOpacity onPress={() => {
                  if (draftTime) {
                    const h = draftTime.getHours()
                    const m = draftTime.getMinutes()
                    const timeStr = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`
                    if (timePickerType === 'start' && isTimeInPast(form.scheduledDate, timeStr)) {
                      Toast.show({ type: 'error', text1: 'Giờ vào không hợp lệ', text2: 'Vui lòng chọn giờ từ hiện tại trở đi.' })
                      setTimePickerType(null)
                      return
                    }
                    setForm(f => timePickerType === 'start' ? { ...f, startTime: timeStr } : { ...f, endTime: timeStr })
                  }
                  setTimePickerType(null)
                }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: SIZES.fontMd }}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftTime || getTimeObject(timePickerType === 'start' ? form.startTime : form.endTime)}
                mode="time"
                display="spinner"
                is24Hour={true}
                // is24Hour is Android-only in this library — on iOS the 12h/24h format
                // is dictated entirely by device locale, so force a 24h locale explicitly.
                locale="vi-VN"
                onChange={(event, time) => { if (time) setDraftTime(time) }}
                themeVariant={dark ? 'dark' : 'light'}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Payment QR Code Polling Modal ── */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxHeight: '90%', backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderRadius: 24, ...SHADOWS.md }}>
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Thanh toán đặt chỗ</Text>

              <View style={{ width: '100%', backgroundColor: dark ? COLORS.dark.bgSecondary : COLORS.primaryBg, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2 }}>
                <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>TỔNG TIỀN THANH TOÁN</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 4 }}>
                  {formatCurrency(paymentInfo?.amount ?? createdBooking?.estimatedFee ?? estFee)}
                </Text>
              </View>

              <Text style={{ fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center' }}>
                Quét mã QR bằng app ngân hàng để chuyển khoản cho mã đặt chỗ <Text style={{ fontWeight: '700', color: COLORS.primary }}>{createdBooking?.bookingCode}</Text>
              </Text>

              {/* QR Image */}
              <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16, ...SHADOWS.card }}>
                {paymentInfo?.qrUrl ? (
                  <View style={{ width: 220, height: 220 }}>
                    <Image
                      key={qrRetryKey}
                      source={{ uri: paymentInfo.qrUrl }}
                      style={{ width: 220, height: 220 }}
                      resizeMode="contain"
                      onLoadStart={() => setQrImageStatus('loading')}
                      onLoad={() => setQrImageStatus('loaded')}
                      onError={() => setQrImageStatus('error')}
                    />
                    {qrImageStatus !== 'loaded' && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff' }}>
                        {qrImageStatus === 'error' ? (
                          <>
                            <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
                            <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 10 }}>
                              Không tải được ảnh mã QR
                            </Text>
                            <Button title="Tải lại" size="sm" onPress={() => { setQrImageStatus('loading'); setQrRetryKey(k => k + 1) }} />
                          </>
                        ) : (
                          <ActivityIndicator size="large" color={COLORS.primary} />
                        )}
                      </View>
                    )}
                  </View>
                ) : initiatePaymentMut.isError ? (
                  <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
                    <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, textAlign: 'center' }}>
                      Không tạo được mã QR thanh toán
                    </Text>
                    <Button
                      title="Thử lại"
                      size="sm"
                      onPress={() => createdBooking && initiatePaymentMut.mutate(createdBooking._id)}
                      loading={initiatePaymentMut.isPending}
                    />
                  </View>
                ) : (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ width: 220, height: 220 }} />
                )}
              </View>

              {/* Bank transfer details for manual transfer */}
              {paymentInfo && (
                <View style={{ width: '100%', backgroundColor: dark ? COLORS.dark.bgSecondary : '#f8fafc', borderRadius: 14, padding: 14, gap: 8 }}>
                  {[
                    { label: 'Ngân hàng', value: paymentInfo.bankInfo?.bankName },
                    { label: 'Số tài khoản', value: paymentInfo.bankInfo?.accountNumber },
                    { label: 'Chủ tài khoản', value: paymentInfo.bankInfo?.accountName },
                    { label: 'Nội dung CK', value: paymentInfo.transferContent },
                  ].map((row, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>{row.label}</Text>
                      <Text style={{ fontSize: SIZES.fontXs, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{row.value || '—'}</Text>
                    </View>
                  ))}
                  <Text style={{ fontSize: 10, color: COLORS.warning, marginTop: 2 }}>
                    ⚠️ Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xác nhận.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary, fontWeight: '600' }}>
                  Đang chờ xác nhận chuyển khoản...
                </Text>
              </View>

              <Text style={{ fontSize: SIZES.fontXs + 1, color: secondsLeft <= 60 ? COLORS.danger : COLORS.textSecondary, fontWeight: '700' }}>
                Tự động hủy sau {String(Math.max(Math.floor(secondsLeft / 60), 0)).padStart(2, '0')}:{String(Math.max(secondsLeft, 0) % 60).padStart(2, '0')}
              </Text>

              <Divider style={{ width: '100%', marginVertical: 4 }} />

              <View style={{ width: '100%', gap: 10 }}>
                <Button title="Hủy đặt chỗ" variant="outline" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending} size="md" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
