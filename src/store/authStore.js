import { create } from 'zustand'
import storage from '../utils/storage'
import { authAPI } from '../services/api'

const useAuthStore = create((set, get) => ({
  user: null, isLoading: false, isInitialized: false,

  initialize: async () => {
    try {
      const userStr = await storage.getItemAsync('user')
      if (userStr) set({ user: JSON.parse(userStr), isInitialized: true })
      else set({ isInitialized: true })
    } catch { set({ isInitialized: true }) }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authAPI.login({ email, password })
      const { user, accessToken, refreshToken } = data.data
      await storage.setItemAsync('accessToken', accessToken)
      await storage.setItemAsync('refreshToken', refreshToken)
      await storage.setItemAsync('user', JSON.stringify(user))
      set({ user, isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, message: err.response?.data?.message || 'Đăng nhập thất bại' }
    }
  },

  register: async (formData) => {
    set({ isLoading: true })
    try {
      await authAPI.register(formData)
      set({ isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, message: err.response?.data?.message || 'Đăng ký thất bại' }
    }
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItemAsync('refreshToken')
      await authAPI.logout({ refreshToken })
    } catch {}
    await storage.deleteItemAsync('accessToken')
    await storage.deleteItemAsync('refreshToken')
    await storage.deleteItemAsync('user')
    set({ user: null })
  },

  updateUser: async (userData) => {
    const updated = { ...get().user, ...userData }
    await storage.setItemAsync('user', JSON.stringify(updated))
    set({ user: updated })
  },
}))

export default useAuthStore
