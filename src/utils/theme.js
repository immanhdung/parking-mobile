export const COLORS = {
  primary: '#2563eb', primaryLight: '#3b82f6', primaryDark: '#1d4ed8',
  primaryBg: '#eff6ff', primaryBg2: '#dbeafe',
  success: '#16a34a', successBg: '#f0fdf4',
  warning: '#d97706', warningBg: '#fffbeb',
  danger: '#dc2626', dangerBg: '#fef2f2',
  white: '#ffffff', black: '#000000',
  bg: '#f8fafc', bgSecondary: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a', textSecondary: '#475569', textTertiary: '#94a3b8',
  dark: {
    bg: '#0f172a', bgSecondary: '#1e293b', bgCard: '#1e293b',
    border: '#334155', text: '#f8fafc', textSecondary: '#94a3b8',
  },
}

export const SIZES = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
  radiusSm: 8, radiusMd: 12, radiusLg: 16, radiusXl: 20, radiusFull: 999,
  fontXs: 11, fontSm: 13, fontMd: 15, fontLg: 17, fontXl: 20, fontXxl: 24, fontHero: 32,
  screenPadding: 20,
}

export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 },
  lg: { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
}

export const STATUS_CONFIG = {
  available:   { color: '#16a34a', bg: '#f0fdf4', label: 'Trống' },
  occupied:    { color: '#dc2626', bg: '#fef2f2', label: 'Đang đỗ' },
  reserved:    { color: '#2563eb', bg: '#eff6ff', label: 'Đã đặt' },
  maintenance: { color: '#d97706', bg: '#fffbeb', label: 'Bảo trì' },
  locked:      { color: '#64748b', bg: '#f1f5f9', label: 'Khóa' },
  pending:     { color: '#d97706', bg: '#fffbeb', label: 'Chờ duyệt' },
  approved:    { color: '#2563eb', bg: '#eff6ff', label: 'Đã duyệt' },
  cancelled:   { color: '#64748b', bg: '#f1f5f9', label: 'Đã hủy' },
  completed:   { color: '#16a34a', bg: '#f0fdf4', label: 'Hoàn thành' },
  active:      { color: '#16a34a', bg: '#f0fdf4', label: 'Đang gửi' },
  paid:        { color: '#16a34a', bg: '#f0fdf4', label: 'Đã thanh toán' },
  unpaid:      { color: '#dc2626', bg: '#fef2f2', label: 'Chưa thanh toán' },
  refunded:    { color: '#7c3aed', bg: '#f5f3ff', label: 'Hoàn tiền' },
  failed:      { color: '#dc2626', bg: '#fef2f2', label: 'Thất bại' },
}
