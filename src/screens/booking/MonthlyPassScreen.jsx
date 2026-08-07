import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { parkingLotAPI, paymentAPI, vehicleTypeAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader, Skeleton } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatCurrency } from '../../utils/helpers'

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getEndDate = (startDate) => {
  const [year, month, day] = startDate.split('-').map(Number)
  if (![year, month, day].every(Number.isFinite)) return ''
  const endDate = new Date(year, month, day)
  endDate.setDate(endDate.getDate() - 1)
  return formatDate(endDate)
}

export default function MonthlyPassScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    parkingLot: null,
    vehicleType: null,
    startDate: formatDate(new Date()),
    vehicleInfo: { licensePlate: '', vehicleModel: '', vehicleColor: '' },
  })
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [monthlyPass, setMonthlyPass] = useState(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots-monthly-pass'],
    queryFn: () => parkingLotAPI.getAll({ status: 'active', limit: 50 }).then(r => r.data.data),
  })
  const { data: vehicleTypes, isLoading: vehicleTypesLoading } = useQuery({
    queryKey: ['vehicle-types-monthly-pass'],
    queryFn: () => vehicleTypeAPI.getAll().then(r => r.data.data),
  })

  const monthlyRate = form.vehicleType?.pricing?.monthlyRate || 0
  const endDate = useMemo(() => getEndDate(form.startDate), [form.startDate])
  const canSubmit = !!form.parkingLot && !!form.vehicleType && monthlyRate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(form.startDate) && !!form.vehicleInfo.licensePlate.trim()

  const payMutation = useMutation({
    mutationFn: () => paymentAPI.createMonthlyPassAndPay({
      parkingLotId: form.parkingLot._id,
      vehicleTypeId: form.vehicleType._id,
      licensePlate: form.vehicleInfo.licensePlate.trim(),
      startDate: form.startDate,
      months: 1,
    }),
    onSuccess: (response) => {
      const data = response.data?.data || response.data
      setMonthlyPass(data?.monthlyPass || null)
      setPaymentInfo(data || null)
      setPaymentModalVisible(true)
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Không thể tạo vé tháng',
        text2: error.response?.data?.message || 'Vui lòng kiểm tra lại thông tin và thử lại.',
      })
    },
  })

  useEffect(() => {
    const paymentId = paymentInfo?.payment?._id || paymentInfo?.payment?.id || paymentInfo?.paymentId
    if (!paymentModalVisible || !paymentId) return undefined

    const intervalId = setInterval(async () => {
      try {
        const response = await paymentAPI.checkBankTransferStatus(paymentId)
        const status = response.data?.data || response.data
        if (status?.isPaid) {
          clearInterval(intervalId)
          setPaymentModalVisible(false)
          const activatedPass = { ...monthlyPass, status: 'active', paymentStatus: 'paid' }
          queryClient.setQueryData(['my-monthly-passes'], current => {
            const currentList = Array.isArray(current?.data) ? current.data : Array.isArray(current?.data?.data) ? current.data.data : Array.isArray(current) ? current : []
            const passId = activatedPass?._id || activatedPass?.id
            const nextList = passId && currentList.some(item => (item._id || item.id) === passId)
              ? currentList.map(item => (item._id || item.id) === passId ? activatedPass : item)
              : [activatedPass, ...currentList]
            return { ...(current && !Array.isArray(current) ? current : {}), data: nextList }
          })
          queryClient.invalidateQueries({ queryKey: ['my-monthly-passes'] })
          Toast.show({ type: 'success', text1: 'Thanh toán thành công', text2: 'Vé tháng của bạn đã được kích hoạt.' })
          navigation.replace('MonthlyPassSuccess', {
            monthlyPass: activatedPass,
            vehicleInfo: form.vehicleInfo,
            parkingLot: form.parkingLot,
            vehicleType: form.vehicleType,
            price: paymentInfo?.amount || monthlyRate,
          })
        }
      } catch (error) {
        console.warn('Unable to check monthly pass payment status', error)
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [navigation, paymentInfo, paymentModalVisible, queryClient])

  const updateVehicleInfo = (key, value) => setForm(current => ({
    ...current,
    vehicleInfo: { ...current.vehicleInfo, [key]: value },
  }))

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Vé tháng" subtitle="Hiệu lực trong 01 tháng" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 116, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calendar" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Đăng ký vé gửi xe tháng</Text>
              <Text style={{ marginTop: 3, fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Giá được áp dụng theo loại xe do quản trị viên cấu hình.</Text>
            </View>
          </View>
        </Card>

        <View>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 10 }}>1. Chọn bãi xe</Text>
          {lotsLoading ? <Skeleton width="100%" height={76} radius={16} /> : lots?.map(lot => {
            const selected = form.parkingLot?._id === lot._id
            return <TouchableOpacity key={lot._id} onPress={() => setForm(current => ({ ...current, parkingLot: lot }))} activeOpacity={0.85} style={{ marginBottom: 10 }}>
              <Card style={{ borderColor: selected ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), borderWidth: selected ? 2 : 1, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="business-outline" size={21} color={selected ? COLORS.primary : COLORS.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{lot.name}</Text>
                    <Text style={{ marginTop: 2, fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>{lot.address?.district || lot.address?.city || 'Bãi xe đang hoạt động'}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                </View>
              </Card>
            </TouchableOpacity>
          })}
        </View>

        <View>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 10 }}>2. Chọn loại xe</Text>
          {vehicleTypesLoading ? <Skeleton width="100%" height={76} radius={16} /> : vehicleTypes?.map(type => {
            const selected = form.vehicleType?._id === type._id
            const rate = type.pricing?.monthlyRate || 0
            return <TouchableOpacity key={type._id} onPress={() => setForm(current => ({ ...current, vehicleType: type }))} activeOpacity={0.85} style={{ marginBottom: 10 }}>
              <Card style={{ borderColor: selected ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), borderWidth: selected ? 2 : 1, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={type.code === 'MOTORBIKE' ? 'bicycle-outline' : 'car-outline'} size={22} color={selected ? COLORS.primary : COLORS.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{type.name}</Text>
                    <Text style={{ marginTop: 2, fontSize: SIZES.fontSm, color: rate > 0 ? COLORS.primary : COLORS.danger, fontWeight: '700' }}>{rate > 0 ? `${formatCurrency(rate)}/tháng` : 'Chưa cấu hình giá vé tháng'}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                </View>
              </Card>
            </TouchableOpacity>
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>3. Thông tin vé</Text>
          <Input label="Biển số xe *" value={form.vehicleInfo.licensePlate} onChangeText={value => updateVehicleInfo('licensePlate', value.toUpperCase())} placeholder="51A-12345" icon="car-outline" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Hãng xe" value={form.vehicleInfo.vehicleModel} onChangeText={value => updateVehicleInfo('vehicleModel', value)} placeholder="Toyota Vios" icon="car-sport-outline" style={{ flex: 1 }} />
            <Input label="Màu xe" value={form.vehicleInfo.vehicleColor} onChangeText={value => updateVehicleInfo('vehicleColor', value)} placeholder="Trắng" icon="color-palette-outline" style={{ flex: 1 }} />
          </View>
          <Input label="Ngày hiệu lực *" value={form.startDate} onChangeText={value => setForm(current => ({ ...current, startDate: value }))} placeholder="YYYY-MM-DD" icon="calendar-outline" />
          {!!endDate && <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontSm }}>Vé sẽ hết hạn vào ngày {endDate}.</Text>}
        </View>

        {form.vehicleType && <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#f0fdf4', borderColor: dark ? COLORS.dark.border : '#bbf7d0' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontSm }}>Tổng thanh toán</Text>
              <Text style={{ color: COLORS.success, fontSize: SIZES.fontXl, fontWeight: '900', marginTop: 3 }}>{monthlyRate > 0 ? formatCurrency(monthlyRate) : 'Chưa có giá'}</Text>
            </View>
            <Ionicons name="wallet-outline" size={30} color={COLORS.success} />
          </View>
        </Card>}
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: 20, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, backgroundColor: dark ? COLORS.dark.bg : COLORS.white }}>
        <Button title="Tạo mã QR thanh toán" icon="qr-code-outline" size="lg" disabled={!canSubmit} loading={payMutation.isPending} onPress={() => payMutation.mutate()} />
      </View>

      <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderRadius: 24, padding: 22, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Thanh toán vé tháng</Text>
                <Text style={{ marginTop: 3, fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Quét QR bằng ứng dụng ngân hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}><Ionicons name="close" size={25} color={dark ? COLORS.dark.text : COLORS.text} /></TouchableOpacity>
            </View>

            <View style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : COLORS.primaryBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>TỔNG THANH TOÁN</Text>
              <Text style={{ marginTop: 4, fontSize: SIZES.fontXl, fontWeight: '900', color: COLORS.primary }}>{formatCurrency(paymentInfo?.amount || monthlyPass?.price || monthlyRate)}</Text>
            </View>

            <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12 }}>
              {paymentInfo?.qrUrl ? <Image source={{ uri: paymentInfo.qrUrl }} style={{ width: 220, height: 220 }} resizeMode="contain" /> : <ActivityIndicator size="large" color={COLORS.primary} style={{ width: 220, height: 220 }} />}
            </View>

            <View style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#f8fafc', borderRadius: 14, padding: 14, gap: 7 }}>
              {[
                { label: 'Mã vé', value: monthlyPass?.passCode },
                { label: 'Ngân hàng', value: paymentInfo?.bankInfo?.bankName || paymentInfo?.bankName },
                { label: 'Số tài khoản', value: paymentInfo?.bankInfo?.accountNumber || paymentInfo?.accountNumber },
                { label: 'Nội dung CK', value: paymentInfo?.transferContent },
              ].map(item => <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>{item.label}</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: SIZES.fontXs, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{item.value || '—'}</Text>
              </View>)}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Đang chờ hệ thống xác nhận thanh toán…</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
