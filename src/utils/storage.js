import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export const storage = {
  getItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key)
      } catch (e) {
        console.error('Error reading from localStorage', e)
        return null
      }
    }
    return await SecureStore.getItemAsync(key)
  },

  setItemAsync: async (key, value) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value)
      } catch (e) {
        console.error('Error writing to localStorage', e)
      }
      return
    }
    await SecureStore.setItemAsync(key, value)
  },

  deleteItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.error('Error deleting from localStorage', e)
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  }
}

export default storage
