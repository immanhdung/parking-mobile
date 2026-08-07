import React, { useMemo } from 'react'
import { Alert, ScrollView, Text, useColorScheme, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { monthlyPassAPI } from '../../services/api'
import { Badge, Button, Card, InfoRow, ScreenHeader, Skeleton } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'
import { formatCurrency, formatDate } from '../../utils/helpers'

const unwrapPass = (response, fallback) => {
  const data = response?.data?.data || response?.data
  return data?.monthlyPass || data || fallback
}

export default function MonthlyPassDetailScreen({ navigation, route }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const queryClient = useQueryClient()
  const initialPass = route.params?.monthlyPass
  const passId = initialPass?._id || initialPass?.id

  const { data: response, isLoading } = useQuery({
    queryKey: ['monthly-pass', passId],
    queryFn: () => monthlyPassAPI.getById(passId),
    enabled: !!passId,
  })
  const pass = unwrapPass(response, initialPass)
  const canCancel = ['pending', 'active'].includes(pass?.status)
  const qrValue = useMemo(() => pass?.qrCodeData || `MP:${pass?.passCode || ''}:${pass?.parkingLot?._id || pass?.parkingLot || ''}`, [pass])

  const cancelMutation = useMutation({
    mutationFn: () => monthlyPassAPI.cancel(passId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-monthly-passes'] })
      Toast.show({ type: 'success', text1: 'Đã hủy vé tháng' })
      navigation.goBack()
    },
    onError: error => Toast.show({ type: 'error', text1: 'Không thể hủy vé tháng', text2: error.response?.data?.message || 'Vui lòng thử lại.' }),
  })

  const requestCancel = () => Alert.alert('Hủy vé tháng', 'Bạn có chắc muốn hủy vé tháng này không?', [
    { text: 'Không', style: 'cancel' },
    { text: 'Hủy vé', style: 'destructive', onPress: () => cancelMutation.mutate() },
  ])

  if (!pass && isLoading) return <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}><ScreenHeader title="Chi tiết vé tháng" onBack={() => navigation.goBack()} /><View style={{ padding: SIZES.screenPadding, gap: 12 }}><Skeleton width="100%" height={190} radius={20} /><Skeleton width="100%" height={220} radius={20} /></View></View>

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Chi tiết vé tháng" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: canCancel ? 116 : 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : COLORS.primaryBg, borderColor: dark ? COLORS.dark.border : COLORS.primaryBg2, alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: SIZES.fontXs, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>MÃ VÉ THÁNG</Text>
          <Text style={{ marginTop: 6, fontFamily: 'monospace', fontSize: SIZES.fontXl, fontWeight: '900', color: COLORS.primary }}>{pass?.passCode || '—'}</Text>
          <View style={{ marginTop: 10 }}><Badge status={pass?.status} label={pass?.status === 'active' ? 'Đang hiệu lực' : undefined} /></View>
        </Card>

        {pass?.status === 'active' && <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Mã QR Check-in</Text>
          <View style={{ marginTop: 16, padding: 14, backgroundColor: '#fff', borderRadius: 18 }}>
            <QRCode value={qrValue} size={210} color="#0f172a" backgroundColor="#fff" />
          </View>
          <Text style={{ marginTop: 16, fontSize: SIZES.fontSm, textAlign: 'center', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Xuất trình mã QR khi check-in tại bãi xe.</Text>
        </Card>}

        <Card>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 6 }}>Thông tin vé tháng</Text>
          <InfoRow label="Bãi xe" value={pass?.parkingLot?.name} icon="business-outline" />
          <InfoRow label="Loại xe" value={pass?.vehicleType?.code} icon="car-outline" />
          <InfoRow label="Hiệu lực từ" value={formatDate(pass?.startDate)} icon="calendar-outline" />
          <InfoRow label="Hiệu lực đến" value={formatDate(pass?.endDate)} icon="calendar-clear-outline" />
        </Card>

        <Card>
          <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 6 }}>Thông tin xe</Text>
          <InfoRow label="Biển số" value={pass?.licensePlate || pass?.vehicleInfo?.licensePlate} icon="id-card-outline" />
          {pass?.vehicleInfo?.vehicleModel && <InfoRow label="Hãng xe" value={pass.vehicleInfo.vehicleModel} icon="car-sport-outline" />}
          {pass?.vehicleInfo?.vehicleColor && <InfoRow label="Màu xe" value={pass.vehicleInfo.vehicleColor} icon="color-palette-outline" />}
        </Card>

        <Card style={{ backgroundColor: dark ? COLORS.dark.bgSecondary : '#f0fdf4', borderColor: dark ? COLORS.dark.border : '#bbf7d0' }}>
          <InfoRow label="Phí vé tháng" value={formatCurrency(pass?.price)} icon="wallet-outline" valueColor={COLORS.success} />
          <InfoRow label="Thanh toán" value={pass?.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'} icon="card-outline" valueColor={pass?.paymentStatus === 'paid' ? COLORS.success : COLORS.warning} />
        </Card>
      </ScrollView>
      {canCancel && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border }}>
        <Button title="Hủy vé tháng" variant="danger" icon="close-circle-outline" size="lg" loading={cancelMutation.isPending} onPress={requestCancel} />
      </View>}
    </View>
  )
}
