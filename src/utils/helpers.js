import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'

export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    if (!isValid(d)) return '—'
    return format(d, fmt, { locale: vi })
  } catch { return '—' }
}
export const formatDateTime = (date) => formatDate(date, 'HH:mm · dd/MM/yyyy')
export const formatTime = (date) => formatDate(date, 'HH:mm')
export const timeAgo = (date) => {
  if (!date) return '—'
  try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : new Date(date), { addSuffix: true, locale: vi }) }
  catch { return '—' }
}
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
export const formatDuration = (hours) => {
  if (!hours || isNaN(hours)) return '0 phút'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m} phút`
  if (m === 0) return `${h} giờ`
  return `${h}h ${m}p`
}
export const calcEstimatedFee = (startTime, endTime, hourlyRate) => {
  if (!startTime || !endTime || !hourlyRate) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const hours = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  return Math.ceil(hours) * hourlyRate
}
