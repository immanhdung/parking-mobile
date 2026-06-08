import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { parkingLotAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton, Button } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'

export default function ParkingLotDetailScreen({ route, navigation }) {
  const { lotId } = route.params
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot-detail', lotId],
    queryFn: () => parkingLotAPI.getById(lotId).then(r => r.data.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['lot-summary', lotId],
    queryFn: () => parkingLotAPI.getSlotsSummary(lotId).then(r => r.data.data),
    enabled: !!lotId,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
        <ScreenHeader title="Thông tin bãi xe" onBack={() => navigation.goBack()} />
        <View style={{ padding: SIZES.screenPadding, gap: 12 }}>
          {[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={16}/>)}
        </View>
      </View>
    )
  }

  const occupancyRate = summary?.total > 0 ? Math.round((summary.occupied / summary.total) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={[COLORS.primary, '#1d4ed8']} style={{ paddingTop: 56, paddingBottom: 32, paddingHorizontal: SIZES.screenPadding }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Animated.View entering={FadeInDown.delay(100)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Badge status={lot?.status} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{lot?.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: SIZES.fontSm }}>
                {lot?.address?.street}, {lot?.address?.district}, {lot?.address?.city}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={{ padding: SIZES.screenPadding, gap: 14 }}>
          {/* Slot summary */}
          <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Tổng slot',   value: summary?.total || 0,       color: COLORS.primary, bg: COLORS.primaryBg },
              { label: 'Trống',       value: summary?.available || 0,    color: COLORS.success, bg: COLORS.successBg },
              { label: 'Đang đỗ',    value: summary?.occupied || 0,     color: COLORS.danger,  bg: COLORS.dangerBg },
              { label: 'Đã đặt',     value: summary?.reserved || 0,     color: '#1d4ed8',      bg: '#eff6ff' },
            ].map((item, i) => (
              <Card key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: item.bg }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </Card>
            ))}
          </Animated.View>

          {/* Occupancy rate */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>Tỷ lệ lấp đầy</Text>
                <Text style={{ fontSize: SIZES.fontSm, fontWeight: '800', color: occupancyRate > 80 ? COLORS.danger : occupancyRate > 50 ? COLORS.warning : COLORS.success }}>
                  {occupancyRate}%
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: dark ? COLORS.dark.border : '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{
                  width: `${occupancyRate}%`, height: '100%', borderRadius: 5,
                  backgroundColor: occupancyRate > 80 ? COLORS.danger : occupancyRate > 50 ? COLORS.warning : COLORS.success,
                }} />
              </View>
            </Card>
          </Animated.View>

          {/* Info */}
          <Animated.View entering={FadeInDown.delay(250)}>
            <Card>
              <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 12 }}>
                ℹ️ Thông tin
              </Text>
              {[
                { icon: 'time-outline', label: 'Giờ hoạt động', value: lot?.operatingHours?.is24Hours ? '24/7' : `${lot?.operatingHours?.open} – ${lot?.operatingHours?.close}` },
                { icon: 'call-outline', label: 'Điện thoại', value: lot?.contactPhone || '—' },
                { icon: 'mail-outline', label: 'Email', value: lot?.contactEmail || '—' },
                { icon: 'person-outline', label: 'Quản lý', value: lot?.manager?.fullName || '—' },
              ].map((item, i) => (
                <View key={i}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={item.icon} size={16} color={COLORS.textTertiary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.fontSm }}>{item.label}</Text>
                    </View>
                    <Text style={{ color: dark ? COLORS.dark.text : COLORS.text, fontWeight: '600', fontSize: SIZES.fontSm, maxWidth: '50%', textAlign: 'right' }}>
                      {item.value}
                    </Text>
                  </View>
                  {i < 3 && <View style={{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border }} />}
                </View>
              ))}
            </Card>
          </Animated.View>

          {/* Amenities */}
          {lot?.amenities?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300)}>
              <Card>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text, marginBottom: 10 }}>
                  🎁 Tiện ích
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {lot.amenities.map((a, i) => (
                    <View key={i} style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: COLORS.primaryBg, borderWidth: 1, borderColor: COLORS.primaryBg2,
                    }}>
                      <Text style={{ fontSize: SIZES.fontSm, color: COLORS.primary, fontWeight: '600' }}>✓ {a}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* CTA Buttons */}
          <Animated.View entering={FadeInDown.delay(350)} style={{ gap: 10 }}>
            <Button
              title="Đặt chỗ tại đây"
              onPress={() => navigation.navigate('BookingStack', { screen: 'Booking', params: { preSelectedLotId: lotId } })}
              size="lg"
              icon="calendar-outline"
            />
            <Button
              title="Xem sơ đồ bãi xe"
              onPress={() => navigation.navigate('SlotMapViewer', { parkingLotId: lotId })}
              variant="outline"
              size="lg"
              icon="grid-outline"
            />
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  )
}
