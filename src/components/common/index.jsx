import React from 'react'
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SIZES, SHADOWS, STATUS_CONFIG } from '../../utils/theme'

// BUTTON
export const Button = ({ title, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style }) => {
  const GRAD = {
    primary: [COLORS.primary, COLORS.primaryDark],
    secondary: ['#f1f5f9', '#e2e8f0'],
    danger: ['#dc2626', '#b91c1c'],
    outline: ['transparent', 'transparent'],
    ghost: ['transparent', 'transparent'],
  }
  const TEXT_COLOR = { primary: '#fff', secondary: COLORS.text, danger: '#fff', outline: COLORS.primary, ghost: COLORS.primary }
  const SIZES_MAP = { sm: { px: 12, py: 8, fs: 13, r: 12 }, md: { px: 20, py: 14, fs: 15, r: 16 }, lg: { px: 24, py: 16, fs: 16, r: 18 } }
  const sz = SIZES_MAP[size] || SIZES_MAP.md
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={[{ borderRadius: sz.r, borderWidth: variant === 'outline' ? 1.5 : 0, borderColor: COLORS.primary, opacity: (disabled || loading) ? 0.6 : 1 }, style]}>
      <LinearGradient colors={GRAD[variant] || GRAD.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: sz.px, paddingVertical: sz.py, borderRadius: sz.r, gap: 8 }}>
        {loading ? <ActivityIndicator size="small" color={TEXT_COLOR[variant]} /> : icon ? <Ionicons name={icon} size={sz.fs + 2} color={TEXT_COLOR[variant]} /> : null}
        <Text style={{ color: TEXT_COLOR[variant], fontSize: sz.fs, fontWeight: '700' }}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

// INPUT
export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, icon, error, multiline, numberOfLines, editable = true, rightElement, style }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={[{ marginBottom: 4 }, style]}>
      {label && <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 6 }}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? COLORS.dark.bgSecondary : '#f8fafc', borderRadius: SIZES.radiusLg, borderWidth: focused ? 2 : 1.5, borderColor: error ? COLORS.danger : focused ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), paddingHorizontal: 14, minHeight: multiline ? 80 : 50 }}>
        {icon && <Ionicons name={icon} size={18} color={focused ? COLORS.primary : COLORS.textTertiary} style={{ marginRight: 8 }} />}
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textTertiary} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} numberOfLines={numberOfLines} editable={editable} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ flex: 1, fontSize: SIZES.fontMd, color: dark ? COLORS.dark.text : COLORS.text, paddingVertical: multiline ? 12 : 0, textAlignVertical: multiline ? 'top' : 'center' }} />
        {rightElement}
      </View>
      {error && <Text style={{ color: COLORS.danger, fontSize: SIZES.fontXs, marginTop: 4 }}>{error}</Text>}
    </View>
  )
}

// CARD
export const Card = ({ children, style, onPress }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper onPress={onPress} activeOpacity={0.95} style={[{ backgroundColor: dark ? COLORS.dark.bgCard : COLORS.white, borderRadius: SIZES.radiusXl, padding: SIZES.md, borderWidth: 1, borderColor: dark ? COLORS.dark.border : '#f1f5f9', ...SHADOWS.card }, style]}>
      {children}
    </Wrapper>
  )
}

// BADGE
export const Badge = ({ status, label, size = 'md' }) => {
  const cfg = STATUS_CONFIG[status] || { color: '#64748b', bg: '#f1f5f9', label: status || '—' }
  const pad = size === 'sm' ? { px: 8, py: 3, fs: 10 } : { px: 10, py: 4, fs: 12 }
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: SIZES.radiusFull, paddingHorizontal: pad.px, paddingVertical: pad.py, alignSelf: 'flex-start' }}>
      <Text style={{ color: cfg.color, fontSize: pad.fs, fontWeight: '700' }}>{label || cfg.label}</Text>
    </View>
  )
}

// SKELETON
export const Skeleton = ({ width, height = 16, radius = 8, style }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])).start()
  }, [])
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#e2e8f0', opacity }, style]} />
}

// EMPTY STATE
export const EmptyState = ({ icon, title, subtitle, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Ionicons name={icon || 'file-tray-outline'} size={36} color={COLORS.primary} />
    </View>
    <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: SIZES.fontMd, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>{subtitle}</Text>}
    {action && <View style={{ marginTop: 20 }}>{action}</View>}
  </View>
)

// SECTION HEADER
export const SectionHeader = ({ title, action, onAction }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: dark ? COLORS.dark.text : COLORS.text }}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={{ fontSize: SIZES.fontSm, color: COLORS.primary, fontWeight: '600' }}>{action}</Text></TouchableOpacity>}
    </View>
  )
}

// DIVIDER
export const Divider = ({ style }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return <View style={[{ height: 1, backgroundColor: dark ? COLORS.dark.border : COLORS.border, marginVertical: SIZES.sm }, style]} />
}

// INFO ROW
export const InfoRow = ({ label, value, icon, valueColor }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon && <Ionicons name={icon} size={15} color={COLORS.textTertiary} />}
        <Text style={{ fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: valueColor || (dark ? COLORS.dark.text : COLORS.text), maxWidth: '55%', textAlign: 'right' }}>{value || '—'}</Text>
    </View>
  )
}

// SCREEN HEADER
export const ScreenHeader = ({ title, subtitle, onBack, rightElement }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.screenPadding, paddingTop: 52, paddingBottom: 12, gap: 12 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? COLORS.dark.bgSecondary : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={dark ? COLORS.dark.text : COLORS.text} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: SIZES.fontXl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {rightElement}
    </View>
  )
}

// STAT CARD
export const StatCard = ({ title, value, icon, color, bg, style }) => {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <Card style={[{ flex: 1, gap: 8 }, style]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg || COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={color || COLORS.primary} />
      </View>
      <Text style={{ fontSize: SIZES.fontXxl, fontWeight: '800', color: dark ? COLORS.dark.text : COLORS.text }}>{value}</Text>
      <Text style={{ fontSize: SIZES.fontSm, color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginTop: -4 }}>{title}</Text>
    </Card>
  )
}
