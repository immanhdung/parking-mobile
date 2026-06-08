# 📱 ParkSmart Mobile

React Native (Expo) app cho **Parking User** — kết nối API Railway.

## 🚀 Cài đặt & Chạy

```bash
cd parking-mobile
npm install
npx expo start
```

Quét QR bằng **Expo Go** (iOS Camera / Android Expo Go app).

## 📁 Cấu trúc

```
src/
├── screens/
│   ├── auth/         LoginScreen, RegisterScreen
│   ├── home/         HomeScreen, ParkingLotDetailScreen
│   ├── booking/      BookingScreen (3-step), BookingSuccessScreen, SlotMapViewerScreen
│   ├── history/      HistoryScreen, BookingDetailScreen, SessionDetailScreen
│   ├── payment/      PaymentScreen, PaymentDetailScreen
│   ├── notifications/ NotificationsScreen
│   └── profile/      ProfileScreen, FeedbackScreen
├── navigation/       AppNavigator (Tab + Stack + Modal)
├── components/       Button, Input, Card, Badge, Skeleton, ...
├── services/         api.js → Railway backend
├── store/            authStore (Zustand + SecureStore)
└── utils/            theme.js, helpers.js
```

## 🔗 API Backend

```
https://web-production-a1e70.up.railway.app/api/v1
```

## 🎨 Màn hình

| Màn hình | Mô tả |
|---|---|
| Login / Register | Đăng nhập, đăng ký |
| Home | Dashboard, quick actions, bãi xe, booking gần đây |
| Đặt chỗ | 3-step: chọn bãi → thông tin xe → xác nhận + QR |
| Lịch sử | Booking + Sessions, filter, cancel, QR |
| Thanh toán | Lịch sử giao dịch, detail |
| Thông báo | Realtime, mark read, delete |
| Hồ sơ | Sửa thông tin, đổi mật khẩu, feedback, logout |

## 🔑 Demo

| Email | Password | Role |
|---|---|---|
| admin@parking.com | Admin123! | Admin |
| user@parking.com  | User123!  | User  |
