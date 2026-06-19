import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useColorScheme, Platform, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import Svg, { Path, Circle, Rect, Line, Defs, LinearGradient as SvgLinearGradient, Stop, G, Text as SvgText } from 'react-native-svg'
import Toast from 'react-native-toast-message'
import { reportsAPI, parkingLotAPI } from '../../services/api'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'
import { Card, ScreenHeader, Divider, Skeleton } from '../../components/common'
import { formatCurrency } from '../../utils/helpers'

const PERIODS = [
  { code: 'today', name: 'Hôm nay' },
  { code: 'week', name: 'Tuần này' },
  { code: 'month', name: 'Tháng này' },
  { code: 'year', name: 'Năm nay' },
]

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ReportsScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [period, setPeriod] = useState('month')
  const [selectedLot, setSelectedLot] = useState('ALL')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch parking lots for filter dropdown
  const { data: lots } = useQuery({
    queryKey: ['admin-lots-filter'],
    queryFn: () => parkingLotAPI.getAll({ limit: 100 }).then(r => r.data.data),
  })

  const lotId = selectedLot === 'ALL' ? undefined : selectedLot

  // Fetch Reports Data
  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['report-dashboard', lotId],
    queryFn: () => reportsAPI.getDashboard({ parkingLotId: lotId }).then(r => r.data.data),
  })

  const { data: revenueData, isLoading: revLoading, refetch: refetchRev } = useQuery({
    queryKey: ['report-revenue', period, lotId],
    queryFn: () => reportsAPI.getRevenue({ period, parkingLotId: lotId, groupBy: period === 'today' ? 'hour' : 'day' }).then(r => r.data.data),
  })

  const { data: occupancyData, isLoading: occLoading, refetch: refetchOcc } = useQuery({
    queryKey: ['report-occupancy', lotId],
    queryFn: () => reportsAPI.getOccupancy({ parkingLotId: lotId || lots?.[0]?._id }).then(r => r.data.data),
    enabled: !!lots && (lots.length > 0 || !!lotId),
  })

  const { data: sessionsData, isLoading: sessLoading, refetch: refetchSess } = useQuery({
    queryKey: ['report-sessions', period],
    queryFn: () => reportsAPI.getSessions({ period }).then(r => r.data.data),
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchDash(), refetchRev(), refetchOcc(), refetchSess()])
    setRefreshing(false)
  }

  const handleExport = () => {
    Toast.show({
      type: 'info',
      text1: '⏳ Đang khởi tạo xuất báo cáo',
      text2: 'Vui lòng chờ trong giây lát...',
    })
    reportsAPI.exportSessions({ period })
      .then(() => {
        Toast.show({
          type: 'success',
          text1: '✅ Xuất báo cáo thành công',
          text2: 'Báo cáo phiên gửi xe đã được xuất sang định dạng CSV.',
        })
      })
      .catch(err => {
        Toast.show({
          type: 'error',
          text1: '❌ Xuất báo cáo thất bại',
          text2: err.message || 'Hệ thống gặp sự cố khi tải file.',
        })
      })
  }

  // --- DRAWING CUSTOM CHARTS ---

  // 1. Render Revenue Bar Chart (Custom native elements + SVG helper)
  const renderRevenueChart = () => {
    if (revLoading) return <Skeleton width="100%" height={200} radius={16} />

    const chartPoints = revenueData?.chart || []
    if (chartPoints.length === 0) {
      return (
        <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="stats-chart" size={36} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: 8, fontSize: SIZES.fontSm }}>Không có dữ liệu doanh thu trong khoảng thời gian này</Text>
        </View>
      )
    }

    const maxVal = Math.max(...chartPoints.map(p => p.totalRevenue || 0), 10000)
    const chartHeight = 150

    return (
      <View style={{ gap: 10, marginTop: 12 }}>
        <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary, textAlign: 'right' }}>
          Đơn vị: VND (Max: {formatCurrency(maxVal)})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 30, gap: 14, paddingHorizontal: 10 }}>
            {chartPoints.map((item, index) => {
              const val = item.totalRevenue || 0
              const barHeight = (val / maxVal) * chartHeight
              const label = item._id?.day ? `${item._id.day}/${item._id.month}` : item._id?.hour ? `${item._id.hour}h` : `${item._id?.month || index}`
              
              return (
                <View key={index} style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.primary }}>
                    {val > 0 ? (val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val) : ''}
                  </Text>
                  <View style={{ width: 28, height: chartHeight, justifyContent: 'flex-end', backgroundColor: dark ? '#1e293b' : '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={[COLORS.primaryLight, COLORS.primary]}
                      style={{ width: '100%', height: barHeight || 2, borderRadius: 6 }}
                    />
                  </View>
                  <Text style={{ fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' }}>{label}</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>
    )
  }

  // 2. Render Occupancy Pie / Ring Chart
  const renderOccupancyChart = () => {
    if (occLoading) return <Skeleton width="100%" height={160} radius={16} />

    const list = occupancyData || []
    if (list.length === 0) {
      return (
        <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="pie-chart-outline" size={36} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: 8, fontSize: SIZES.fontSm }}>Không có dữ liệu công suất sử dụng</Text>
        </View>
      )
    }

    // Process data to group by vehicle code and count statuses
    // Available + Reserved = Total capacity
    const grouped = {}
    list.forEach(item => {
      const code = item.vehicleType?.code || 'OTHER'
      const name = item.vehicleType?.name || 'Khác'
      const status = item._id?.status || 'available'
      const count = item.count || 0

      if (!grouped[code]) {
        grouped[code] = { name, code, available: 0, reserved: 0, occupied: 0, total: 0 }
      }
      if (status === 'available') grouped[code].available += count
      else if (status === 'reserved') grouped[code].reserved += count
      else grouped[code].occupied += count

      grouped[code].total += count
    })

    const chartItems = Object.values(grouped)

    return (
      <View style={{ gap: 14, marginTop: 8 }}>
        {chartItems.map((item, idx) => {
          const occCount = item.reserved + item.occupied
          const rate = item.total > 0 ? (occCount / item.total) : 0
          const color = item.code === 'CAR' ? COLORS.primary : item.code === 'MOTORBIKE' ? '#7c3aed' : '#059669'
          const bgLight = item.code === 'CAR' ? COLORS.primaryBg : item.code === 'MOTORBIKE' ? '#f5f3ff' : '#f0fdf4'
          
          // SVG Circle parameters for progress ring
          const radius = 32
          const strokeWidth = 8
          const circum = 2 * Math.PI * radius
          const strokeDashoffset = circum * (1 - rate)

          return (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: dark ? '#1e293b' : '#f8fafc', padding: 12, borderRadius: 16 }}>
              {/* SVG Circular Progress Ring */}
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Circle cx={40} cy={40} r={radius} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth={strokeWidth} fill="transparent" />
                <Circle
                  cx={40}
                  cy={40}
                  r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circum}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
                <SvgText x={40} y={44} textAnchor="middle" fontSize={11} fontWeight="800" fill={dark ? COLORS.dark.text : COLORS.text}>
                  {`${(rate * 100).toFixed(0)}%`}
                </SvgText>
              </Svg>

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: SIZES.fontMd, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{item.name}</Text>
                <Text style={{ fontSize: SIZES.fontXs + 1, color: COLORS.textSecondary }}>
                  Đã sử dụng: <Text style={{ fontWeight: '700', color }}>{occCount}</Text> / {item.total} vị trí
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success }} />
                    <Text style={{ fontSize: 9, color: COLORS.textSecondary }}>Còn trống: {item.available}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
                    <Text style={{ fontSize: 9, color: COLORS.textSecondary }}>Đã đặt: {item.reserved}</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  // 3. Render Session Peak Hours / Activity (SVG Smooth Line Chart)
  const renderSessionsLineChart = () => {
    if (sessLoading) return <Skeleton width="100%" height={180} radius={16} />

    const peakHours = sessionsData?.peakHours || []

    // If API returns empty peakHours, we simulate standard active hours curve for a parking lot (busy morning, evening)
    const chartData = peakHours.length > 0 ? peakHours : [
      { hour: 7, count: 12 }, { hour: 8, count: 35 }, { hour: 9, count: 28 }, 
      { hour: 11, count: 15 }, { hour: 12, count: 22 }, { hour: 14, count: 18 },
      { hour: 17, count: 42 }, { hour: 18, count: 38 }, { hour: 19, count: 20 }
    ]

    const width = SCREEN_WIDTH - SIZES.screenPadding * 2 - 32
    const height = 120
    const padding = 15

    const maxVal = Math.max(...chartData.map(d => d.count), 10)
    
    // Map to chart coordinates
    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (width - padding * 2)
      const y = height - padding - ((d.count / maxVal) * (height - padding * 2))
      return { x, y, ...d }
    })

    // Construct SVG Path
    let pathD = ''
    let fillD = ''
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`
      fillD = `M ${points[0].x} ${height - padding} L ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        // Curve construction using bezier curves helper (simplistic)
        const cpX1 = (points[i-1].x + points[i].x) / 2
        const cpY1 = points[i-1].y
        const cpX2 = (points[i-1].x + points[i].x) / 2
        const cpY2 = points[i].y
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`
        fillD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`
      }
      fillD += ` L ${points[points.length - 1].x} ${height - padding} Z`
    }

    return (
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textTertiary, fontStyle: 'italic' }}>
          {peakHours.length === 0 ? '⚠️ Sử dụng dữ liệu mẫu (Chưa có dữ liệu phiên gửi thực tế)' : 'Biểu đồ tần suất hoạt động theo khung giờ'}
        </Text>
        <Svg width={width} height={height} style={{ backgroundColor: dark ? '#1e293b' : '#f8fafc', borderRadius: 16 }}>
          <Defs>
            <SvgLinearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Background Grid Lines */}
          <Line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} strokeWidth={1} strokeDasharray="3 3" />
          <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth={1} />

          {/* Area under the line */}
          {points.length > 0 && <Path d={fillD} fill="url(#lineGrad)" />}

          {/* Spark Line */}
          {points.length > 0 && <Path d={pathD} fill="none" stroke={COLORS.primary} strokeWidth={2.5} />}

          {/* Data Points */}
          {points.map((p, i) => (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r={4} fill={COLORS.primary} />
              <Circle cx={p.x} cy={p.y} r={2} fill="#fff" />
              {/* Hour Labels */}
              {i % 2 === 0 && (
                <SvgText x={p.x} y={height - 2} fontSize={8} fill={COLORS.textSecondary} textAnchor="middle" fontWeight="bold">
                  {`${p.hour}h`}
                </SvgText>
              )}
            </G>
          ))}
        </Svg>
      </View>
    )
  }

  // --- RENDERING SCREEN LAYOUT ---

  const totalRev = revenueData?.totalRevenue || dashboard?.todayRevenue || 0
  const activeSess = dashboard?.activeSessions || 0
  const totalUsr = dashboard?.totalUsers || 0
  const totalBks = revenueData?.totalTransactions || dashboard?.totalSessions || 0

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader 
        title="Báo cáo & Thống kê" 
        onBack={() => navigation.goBack()} 
        rightElement={
          <TouchableOpacity 
            onPress={handleExport}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      {/* Lot selector & Period Filters */}
      <View style={{ paddingHorizontal: SIZES.screenPadding, gap: 10, marginBottom: 12 }}>
        {/* Lot Dropdown filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => setSelectedLot('ALL')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: selectedLot === 'ALL' ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
              backgroundColor: selectedLot === 'ALL' ? COLORS.primaryBg : 'transparent',
            }}
          >
            <Text style={{ fontSize: SIZES.fontXs + 1, fontWeight: '700', color: selectedLot === 'ALL' ? COLORS.primary : COLORS.textSecondary }}>Tất cả bãi xe</Text>
          </TouchableOpacity>
          {lots?.map(lot => (
            <TouchableOpacity
              key={lot._id}
              onPress={() => setSelectedLot(lot._id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: selectedLot === lot._id ? COLORS.primary : (dark ? COLORS.dark.border : '#e2e8f0'),
                backgroundColor: selectedLot === lot._id ? COLORS.primaryBg : 'transparent',
              }}
            >
              <Text style={{ fontSize: SIZES.fontXs + 1, fontWeight: '700', color: selectedLot === lot._id ? COLORS.primary : COLORS.textSecondary }}>{lot.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Period Selector Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: dark ? COLORS.dark.bgSecondary : '#f1f5f9', borderRadius: 14, padding: 4 }}>
          {PERIODS.map(p => {
            const active = period === p.code
            return (
              <TouchableOpacity
                key={p.code}
                onPress={() => setPeriod(p.code)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: active ? (dark ? COLORS.dark.bg : '#fff') : 'transparent',
                  ...SHADOWS.sm
                }}
              >
                <Text style={{ fontSize: SIZES.fontXs + 1, fontWeight: active ? '800' : '600', color: active ? COLORS.primary : COLORS.textSecondary }}>{p.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: SIZES.screenPadding, paddingBottom: 50, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {/* KPI Scorecard Grid */}
        <Animated.View entering={FadeInDown.delay(100)} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 14, gap: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.successBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cash-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>Doanh thu</Text>
              {revLoading || dashLoading ? <Skeleton width="80%" height={24} /> : (
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{formatCurrency(totalRev)}</Text>
              )}
            </Card>
            <Card style={{ flex: 1, padding: 14, gap: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>Giao dịch</Text>
              {revLoading || dashLoading ? <Skeleton width="80%" height={24} /> : (
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{totalBks} lượt</Text>
              )}
            </Card>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 14, gap: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="car-outline" size={18} color="#7c3aed" />
              </View>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>Đang đỗ</Text>
              {dashLoading ? <Skeleton width="80%" height={24} /> : (
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{activeSess} xe</Text>
              )}
            </Card>
            <Card style={{ flex: 1, padding: 14, gap: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people-outline" size={18} color="#d97706" />
              </View>
              <Text style={{ fontSize: SIZES.fontXs, color: COLORS.textSecondary }}>Khách hàng</Text>
              {dashLoading ? <Skeleton width="80%" height={24} /> : (
                <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{totalUsr} thành viên</Text>
              )}
            </Card>
          </View>
        </Animated.View>

        {/* Section 1: Revenue Over Time */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: SIZES.fontMd + 1, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Doanh thu theo thời gian</Text>
            </View>
            <Divider style={{ marginVertical: 6 }} />
            {renderRevenueChart()}
          </Card>
        </Animated.View>

        {/* Section 2: Occupancy Rate */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd + 1, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Công suất đỗ xe hiện tại</Text>
            <Divider style={{ marginVertical: 6 }} />
            {renderOccupancyChart()}
          </Card>
        </Animated.View>

        {/* Section 3: Sessions Peak Hours */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card>
            <Text style={{ fontSize: SIZES.fontMd + 1, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>Khung giờ cao điểm</Text>
            <Divider style={{ marginVertical: 6 }} />
            {renderSessionsLineChart()}
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
