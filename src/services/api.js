import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'https://web-production-a1e70.up.railway.app/api/v1'

const api = axios.create({ baseURL: BASE_URL, timeout: 30000, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false, failedQueue = []
const processQueue = (error, token = null) => { failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token)); failedQueue = [] }

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }) }).then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original) })
      original._retry = true; isRefreshing = true
      const refreshToken = await SecureStore.getItemAsync('refreshToken')
      if (!refreshToken) { isRefreshing = false; await SecureStore.deleteItemAsync('accessToken'); await SecureStore.deleteItemAsync('refreshToken'); return Promise.reject(error) }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken })
        await SecureStore.setItemAsync('accessToken', data.data.accessToken)
        await SecureStore.setItemAsync('refreshToken', data.data.refreshToken)
        processQueue(null, data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch (err) { processQueue(err, null); return Promise.reject(err) } finally { isRefreshing = false }
    }
    return Promise.reject(error)
  }
)

export default api

export const authAPI = {
  login: (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  logout: (d) => api.post('/auth/logout', d),
  getMe: () => api.get('/auth/me'),
  changePassword: (d) => api.post('/auth/change-password', d),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
}
export const parkingLotAPI = {
  getAll: (params) => api.get('/parking-lots', { params }),
  getById: (id) => api.get(`/parking-lots/${id}`),
  getSlotsSummary: (id) => api.get(`/parking-lots/${id}/slots-summary`),
}
export const floorAPI = { getAll: (params) => api.get('/floors', { params }) }
export const zoneAPI = { getAll: (params) => api.get('/zones', { params }) }
export const vehicleTypeAPI = { getAll: () => api.get('/vehicle-types') }
export const slotAPI = {
  findAvailable: (params) => api.get('/parking-slots/available', { params }),
  getFloorMap: (floorId) => api.get(`/parking-slots/floor-map/${floorId}`),
}
export const bookingAPI = {
  myBookings: (params) => api.get('/bookings/my', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (d) => api.post('/bookings', d),
  cancel: (id, d) => api.patch(`/bookings/${id}/cancel`, d),
}
export const sessionAPI = {
  getAll: (params) => api.get('/parking-sessions', { params }),
  getById: (id) => api.get(`/parking-sessions/${id}`),
}
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  initiateMomo: (d) => api.post('/payments/momo/initiate', d),
}
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
}
export const feedbackAPI = { create: (d) => api.post('/feedbacks', d) }
export const userAPI = {
  updateProfile: (d) => api.put('/users/profile', d),
}
