import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { floorAPI, slotAPI, parkingLotAPI } from '../../services/api'
import { Card, Badge, ScreenHeader, Skeleton } from '../../components/common'
import { COLORS, SIZES } from '../../utils/theme'

const STATUS_STYLE = {
  available:   { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  occupied:    { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  reserved:    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  maintenance: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  locked:      { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
}

export default function SlotMapViewerScreen({ route, navigation }) {
  const { parkingLotId } = route.params || {}
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slots, setSlots] = useState([])

  const { data: floors } = useQuery({
    queryKey: ['floors-viewer', parkingLotId],
    queryFn: () => floorAPI.getAll({ parkingLot: parkingLotId }).then(r => r.data.data),
    enabled: !!parkingLotId,
    onSuccess: d => { if (d?.[0] && !selectedFloor) setSelectedFloor(d[0]._id) },
  })

  const { isLoading, refetch } = useQuery({
    queryKey: ['slot-map-viewer', selectedFloor],
    queryFn: () => slotAPI.getFloorMap(selectedFloor).then(r => r.data.data),
    enabled: !!selectedFloor,
    onSuccess: d => setSlots(d || []),
  })

  const summary = slots.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    acc.total = (acc.total || 0) + 1
    return acc
  }, {})

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader
        title="Sơ đồ bãi xe"
        subtitle="Xem tình trạng chỗ đỗ"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={refetch} style={{ padding: 6 }}>
            <Ionicons name="refresh-outline" size={22} color={dark ? COLORS.dark.text : COLORS.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: SIZES.screenPadding, paddingBottom: 12, gap: 8 }}>
          {[
            { key: 'total',       label: 'Tổng',     color: COLORS.primary,   bg: COLORS.primaryBg },
            { key: 'available',   label: 'Trống',     color: COLORS.success,   bg: COLORS.successBg },
            { key: 'occupied',    label: 'Đang đỗ',  color: COLORS.danger,    bg: COLORS.dangerBg },
            { key: 'reserved',    label: 'Đã đặt',   color: '#1d4ed8',        bg: '#eff6ff' },
          ].map(item => (
            <Card key={item.key} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: item.bg, padding: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: item.color }}>{summary[item.key] || 0}</Text>
              <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 2 }}>{item.label}</Text>
            </Card>
          ))}
        </View>

        {/* Floor tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, gap: 8, paddingBottom: 12 }}>
          {floors?.map(floor => (
            <TouchableOpacity key={floor._id} onPress={() => setSelectedFloor(floor._id)} activeOpacity={0.8}>
              <View style={{
                paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
                backgroundColor: selectedFloor === floor._id ? COLORS.primary : (dark ? COLORS.dark.bgSecondary : '#f1f5f9'),
              }}>
                <Text style={{ fontSize: SIZES.fontSm, fontWeight: '700', color: selectedFloor === floor._id ? '#fff' : COLORS.textSecondary }}>
                  {floor.name}
                </Text>
                <Text style={{ fontSize: 10, color: selectedFloor === floor._id ? 'rgba(255,255,255,0.7)' : COLORS.textTertiary, textAlign: 'center' }}>
                  {floor.availableSlots}/{floor.totalSlots}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot grid */}
        <View style={{ paddingHorizontal: SIZES.screenPadding }}>
          {isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <Skeleton key={i} width={64} height={56} radius={10} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((slot, i) => {
                const st = STATUS_STYLE[slot.status] || STATUS_STYLE.locked
                const isSelected = selectedSlot?._id === slot._id
                return (
                  <Animated.View key={slot._id} entering={FadeInDown.delay(i * 8)}>
                    <TouchableOpacity
                      onPress={() => setSelectedSlot(isSelected ? null : slot)}
                      activeOpacity={0.8}
                      style={{
                        width: 64, height: 56,
                        borderRadius: 10,
                        backgroundColor: dark ? `${st.bg}33` : st.bg,
                        borderWidth: isSelected ? 2.5 : 1.5,
                        borderColor: isSelected ? COLORS.primary : st.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: st.text }}>{slot.slotCode}</Text>
                      <Text style={{ fontSize: 8, color: COLORS.textTertiary, marginTop: 2 }}>{slot.vehicleType?.code}</Text>
                      {slot.status === 'occupied' && (
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger }} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )
              })}
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: SIZES.screenPadding, paddingVertical: 16 }}>
          {[
            { label: 'Trống',    color: COLORS.success, icon: '🟢' },
            { label: 'Đang đỗ', color: COLORS.danger,   icon: '🔴' },
            { label: 'Đã đặt',  color: '#1d4ed8',       icon: '🔵' },
            { label: 'Bảo trì', color: COLORS.warning,  icon: '🟠' },
          ].map(item => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text>{item.icon}</Text>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected slot detail */}
        {selectedSlot && (
          <Animated.View entering={FadeInDown} style={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 24 }}>
            <Card style={{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryBg2, borderWidth: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.primary }}>Slot {selectedSlot.slotCode}</Text>
                <Badge status={selectedSlot.status} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary }}>Loại xe</Text>
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.text : COLORS.text }}>{selectedSlot.vehicleType?.name || '—'}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary }}>Khu vực</Text>
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.text : COLORS.text }}>{selectedSlot.zone?.name || '—'}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary }}>Vị trí</Text>
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.text : COLORS.text }}>
                    {selectedSlot.position?.row}{selectedSlot.position?.column}
                  </Text>
                </View>
              </View>
              {selectedSlot.features?.hasEVCharger && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text>⚡</Text>
                  <Text style={{ fontSize: SIZES.fontXs, color: COLORS.success, fontWeight: '600' }}>Có sạc điện EV</Text>
                </View>
              )}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  )
}
