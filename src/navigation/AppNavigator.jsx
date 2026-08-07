import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, useColorScheme, Platform } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useQuery } from '@tanstack/react-query'
import { COLORS, SIZES } from '../utils/theme'
import useAuthStore from '../store/authStore'
import { notificationAPI } from '../services/api'

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'

// Home
import HomeScreen from '../screens/home/HomeScreen'
import ParkingLotDetailScreen from '../screens/home/ParkingLotDetailScreen'

// Booking
import BookingScreen from '../screens/booking/BookingScreen'
import BookingSuccessScreen from '../screens/booking/BookingSuccessScreen'
import SlotMapViewerScreen from '../screens/booking/SlotMapViewerScreen'
import MonthlyPassScreen from '../screens/booking/MonthlyPassScreen'

// History
import HistoryScreen from '../screens/history/HistoryScreen'
import BookingDetailScreen from '../screens/history/BookingDetailScreen'
import SessionDetailScreen from '../screens/history/SessionDetailScreen'
import MonthlyPassDetailScreen from '../screens/history/MonthlyPassDetailScreen'

// Payment
import PaymentScreen from '../screens/payment/PaymentScreen'
import PaymentDetailScreen from '../screens/payment/PaymentDetailScreen'

// Notifications
import NotificationsScreen from '../screens/notifications/NotificationsScreen'

// Profile
import ProfileScreen from '../screens/profile/ProfileScreen'
import FeedbackScreen from '../screens/profile/FeedbackScreen'

// Admin screens
import AdminHomeScreen from '../screens/admin/AdminHomeScreen'
import UserManagementScreen from '../screens/admin/UserManagementScreen'
import PermissionsScreen from '../screens/admin/PermissionsScreen'
import SystemConfigScreen from '../screens/admin/SystemConfigScreen'
import VehicleTypesScreen from '../screens/admin/VehicleTypesScreen'
import ReportsScreen from '../screens/admin/ReportsScreen'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// ── Auth Stack ──
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}

// ── Home Stack ──
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ParkingLotDetail" component={ParkingLotDetailScreen} />
    </Stack.Navigator>
  )
}

// ── Booking Stack ──
function BookingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
      <Stack.Screen name="SlotMapViewer" component={SlotMapViewerScreen} />
      <Stack.Screen name="MonthlyPass" component={MonthlyPassScreen} />
    </Stack.Navigator>
  )
}

// ── History Stack ──
function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="MonthlyPassDetail" component={MonthlyPassDetailScreen} />
    </Stack.Navigator>
  )
}

// ── Payment Stack ──
function PaymentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
    </Stack.Navigator>
  )
}

// ── Profile Stack ──
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  )
}

// ── Admin Home Stack ──
function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  )
}

// ── User Management Stack ──
function UserManagementStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    </Stack.Navigator>
  )
}

// ── Permissions Stack ──
function PermissionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  )
}

// ── System Config Stack ──
function SystemConfigStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SystemConfig" component={SystemConfigScreen} />
      <Stack.Screen name="VehicleTypes" component={VehicleTypesScreen} />
    </Stack.Navigator>
  )
}

// ── Custom Tab Bar ──
function CustomTabBar({ state, navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'system_admin'

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationAPI.getUnreadCount().then(r => r.data.data),
    refetchInterval: 30000,
    enabled: !isAdmin,
  })

  const USER_TABS = [
    { name: 'HomeStack', icon: 'home', label: 'Trang chủ' },
    { name: 'BookingStack', icon: 'calendar', label: 'Đặt chỗ' },
    { name: 'HistoryStack', icon: 'time', label: 'Lịch sử' },
    { name: 'ProfileStack', icon: 'person', label: 'Hồ sơ', badge: unreadData?.count },
  ]

  const ADMIN_TABS = [
    { name: 'AdminHomeStack', icon: 'home', label: 'Trang chủ' },
    { name: 'UserManagementStack', icon: 'people', label: 'Tài khoản' },
    { name: 'PermissionsStack', icon: 'shield-checkmark', label: 'Quyền' },
    { name: 'SystemConfigStack', icon: 'settings', label: 'Cấu hình' },
    { name: 'ProfileStack', icon: 'person', label: 'Hồ sơ' },
  ]

  const TABS = isAdmin ? ADMIN_TABS : USER_TABS

  return (
    <BlurView
      intensity={dark ? 80 : 65}
      tint={dark ? 'dark' : 'light'}
      style={{
        borderTopWidth: 1,
        borderTopColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingTop: 10,
        backgroundColor: dark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      }}
    >
      <View style={{ flexDirection: 'row', paddingHorizontal: 6 }}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {tab.special ? (
                // Booking FAB button
                <View style={{ height: 36, width: 54, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View style={{
                    width: 54, height: 54, borderRadius: 18,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
                    position: 'absolute',
                    bottom: 0,
                  }}>
                    <Ionicons name={isFocused ? tab.icon : `${tab.icon}-outline`} size={24} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={{ height: 36, alignItems: 'center', position: 'relative' }}>
                  <View style={{
                    width: 40, height: 36, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isFocused ? `${COLORS.primary}18` : 'transparent',
                  }}>
                    <Ionicons
                      name={isFocused ? tab.icon : `${tab.icon}-outline`}
                      size={22}
                      color={isFocused ? COLORS.primary : (dark ? '#64748b' : '#94a3b8')}
                    />
                  </View>
                  {/* Badge */}
                  {tab.badge > 0 && (
                    <View style={{
                      position: 'absolute', top: 0, right: 2,
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: COLORS.danger,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: dark ? '#1e293b' : '#fff',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={{
                fontSize: 10, fontWeight: isFocused ? '700' : '500',
                color: isFocused ? COLORS.primary : (dark ? '#64748b' : '#94a3b8'),
                marginTop: 2,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </BlurView>
  )
}

// ── Admin Tabs ──
function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="AdminHomeStack" component={AdminHomeStack} />
      <Tab.Screen name="UserManagementStack" component={UserManagementStack} />
      <Tab.Screen name="PermissionsStack" component={PermissionsStack} />
      <Tab.Screen name="SystemConfigStack" component={SystemConfigStack} />
      <Tab.Screen name="ProfileStack" component={ProfileStack} />
    </Tab.Navigator>
  )
}

// ── Main Tabs ──
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeStack" component={HomeStack} />
      <Tab.Screen name="BookingStack" component={BookingStack} />
      <Tab.Screen name="HistoryStack" component={HistoryStack} />
      <Tab.Screen name="ProfileStack" component={ProfileStack} />
      {/* Not part of CustomTabBar's USER_TABS — reachable only via navigation.navigate('PaymentStack') from quick actions. */}
      <Tab.Screen name="PaymentStack" component={PaymentStack} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  )
}

// ── Root Stack (allows Notifications modal over any tab) ──
function RootStack() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'system_admin'
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={isAdmin ? AdminTabs : MainTabs} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'modal', animationTypeForReplace: 'push' }}
      />
    </Stack.Navigator>
  )
}

// ── App Navigator (root) ──
export default function AppNavigator() {
  const { user, isInitialized, initialize } = useAuthStore()
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  useEffect(() => { initialize() }, [])

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🚗</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 }}>ParkSmart</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6 }}>Đang tải...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer
      theme={{
        dark,
        colors: {
          primary: COLORS.primary,
          background: dark ? COLORS.dark.bg : COLORS.bg,
          card: dark ? COLORS.dark.bgCard : COLORS.white,
          text: dark ? COLORS.dark.text : COLORS.text,
          border: dark ? COLORS.dark.border : COLORS.border,
          notification: COLORS.danger,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Root" component={RootStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
