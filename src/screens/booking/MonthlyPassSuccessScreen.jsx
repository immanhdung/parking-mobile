import React, { useMemo } from 'react'
import { ScrollView, Text, useColorScheme, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { Button, Card, InfoRow, ScreenHeader } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatCurrency, formatDate } from '../../utils/helpers'

export default function MonthlyPassSuccessScreen({ navigation, route }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const { monthlyPass, vehicleInfo, parkingLot, vehicleType, price } = route.params || {}
  const lot = monthlyPass?.parkingLot?.name ? monthlyPass.parkingLot : parkingLot
  const type = monthlyPass?.vehicleType?.name ? monthlyPass.vehicleType : vehicleType
  const qrValue = useMemo(() => monthlyPass?.qrCodeData || `MP:${monthlyPass?.passCode || ''}:${lot?._id || monthlyPass?.parkingLot?._id || ''}`, [lot, monthlyPass])

  const goHome = () => {
    const tabNavigation = navigation.getParent()
    if (tabNavigation) tabNavigation.navigate('HomeStack', { screen: 'Home' })
    else navigation.navigate('HomeStack', { screen: 'Home' })
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Đăng ký thành công" />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 36, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ alignItems: 'center', backgroundColor: dark ? COLORS.dark.bgSecondary : '#f0fdf4', borderColor: dark ? COLORS.dark.border : '#bbf7d0', paddingVertical: 22 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={34} color="#fff" />
          </View>
          <Text style={{ marginTop: 12, fontSize: SIZES.fontXl, fontWeight: '900', color: dark ? COLORS.dark.text : COLORS.text }}>Vé tháng đã kích hoạt</Text>
          <Text style={{ marginTop: 5, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, fontSize: SIZES.fontSm, textAlign: 'center' }}>Thanh toán thành công. Hãy xuất trình mã QR khi check-in.</Text>
        </Card>

        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Mã QR Check-in</Text>
          <View style={{ marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff' }}>
            <QRCode value={qrValue} size={210} color="#0f172a" backgroundColor="#fff" />
          </View>
          <Text style={{ marginTop: 12, fontFamily: 'monospace', fontSize: SIZES.fontSm, fontWeight: '800', color: COLORS.primary }}>{monthlyPass?.passCode || 'Vé tháng'}</Text>
        </Card>

        <Card>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 6 }}>Thông tin vé tháng</Text>
          <InfoRow label="Bãi xe" value={lot?.name} icon="business-outline" />
          <InfoRow label="Loại xe" value={type?.name} icon="car-outline" />
          <InfoRow label="Hiệu lực từ" value={formatDate(monthlyPass?.startDate)} icon="calendar-outline" />
          <InfoRow label="Hiệu lực đến" value={formatDate(monthlyPass?.endDate)} icon="calendar-clear-outline" />
          <InfoRow label="Phí vé tháng" value={formatCurrency(monthlyPass?.price || price)} icon="wallet-outline" valueColor={COLORS.success} />
        </Card>

        <Card>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 6 }}>Thông tin xe</Text>
          <InfoRow label="Biển số" value={monthlyPass?.licensePlate || vehicleInfo?.licensePlate} icon="id-card-outline" />
          {vehicleInfo?.vehicleModel && <InfoRow label="Hãng xe" value={vehicleInfo.vehicleModel} icon="car-sport-outline" />}
          {vehicleInfo?.vehicleColor && <InfoRow label="Màu xe" value={vehicleInfo.vehicleColor} icon="color-palette-outline" />}
        </Card>

        <View style={{ gap: 10, marginTop: 2 }}>
          <Button title="Về trang chủ" icon="home-outline" size="lg" onPress={goHome} />
          <Button title="Tiếp tục đặt vé" icon="add-circle-outline" variant="outline" size="lg" onPress={() => navigation.replace('MonthlyPass')} />
        </View>
      </ScrollView>
    </View>
  )
}
