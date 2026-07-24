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
// Mirrors the backend's calculateParkingFee (parking-backend/src/utils/helpers.js):
// 4-hour blocks, daytime (06:00–18:00) vs nighttime (18:00–06:00) rate, so the
// estimate shown before booking matches what the server will actually charge.
export const calcEstimatedFee = (scheduledDate, startTime, endTime, pricing) => {
  if (!scheduledDate || !startTime || !endTime || !pricing?.dayBlockRate) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const entry = new Date(scheduledDate)
  entry.setHours(sh, sm, 0, 0)
  let exit = new Date(scheduledDate)
  exit.setHours(eh, em, 0, 0)
  if (exit <= entry) exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000)

  const dayBlockRate = pricing.dayBlockRate
  const nightBlockRate = pricing.nightBlockRate || dayBlockRate * 1.5

  let fee = 0
  let cursor = new Date(entry)
  while (cursor < exit) {
    const blockEnd = new Date(Math.min(exit.getTime(), cursor.getTime() + 4 * 60 * 60 * 1000))
    const effectiveEnd = new Date(blockEnd.getTime() - 1)
    const isStartNight = cursor.getHours() >= 18 || cursor.getHours() < 6
    const isEndNight = effectiveEnd.getHours() >= 18 || effectiveEnd.getHours() < 6
    fee += (isStartNight || isEndNight) ? nightBlockRate : dayBlockRate
    cursor = new Date(cursor.getTime() + 4 * 60 * 60 * 1000)
  }
  return Math.round(fee)
}
