import { create } from 'zustand'
import axios from 'axios'
import { AdState } from '../types'

export const useAdStore = create<AdState>((set, get) => ({
  ads: [],
  stats: null,
  authors: [],
  loading: false,
  error: null,
  selectedAd: null,
  filter: { search: '', status: 'All', category: 'All' },

  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),

  topUpUser: async (userId: number, amount: number) => {
    await axios.post('/api/ads/topup', { userId, amount });
    await get().fetchAuthors(); // 刷新列表
  },

  likeAd: async (id: number) => {
    try {
      await axios.post(`/api/ads/${id}/like`)
      // 本地乐观更新：直接 +1，不用等接口刷新列表，体验更好
      set((state) => ({
        ads: state.ads.map(ad => ad.id === id ? { ...ad, likes: ad.likes + 1 } : ad),
        selectedAd: state.selectedAd?.id === id ? { ...state.selectedAd, likes: state.selectedAd.likes + 1 } : state.selectedAd
      }))
    } catch (error) {
      console.error('点赞失败', error)
    }
  },

  fetchAds: async (params) => {
    set({ loading: true, error: null })
    try {
      const currentFilter = get().filter
      const queryParams = { ...currentFilter, ...params }
      const response = await axios.get('/api/ads', { params: queryParams })
      set({ ads: response.data, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取广告列表失败', 
        loading: false 
      })
    }
  },

  fetchStats: async (params) => {
    try {
      const response = await axios.get('/api/ads/stats', { params })
      set({ stats: response.data })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  },

  fetchAuthors: async () => {
    try {
      const response = await axios.get('/api/ads/authors')
      set({ authors: response.data })
    } catch (error) {
      console.error('获取用户列表失败', error)
    }
  },

  fetchAdById: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`/api/ads/${id}`)
      const ad = response.data
      set({ selectedAd: ad, loading: false })
      return ad
    } catch (error) {
      set({ loading: false })
      return null
    }
  },

  createAd: async (adData: any) => {
    set({ loading: true })
    try {
      const response = await axios.post('/api/ads', adData)
      const newAd = response.data
      set((state) => ({ ads: [newAd, ...state.ads], loading: false }))
      get().fetchStats()
      return newAd
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  updateAd: async (id: number, adData: any) => {
    set({ loading: true })
    try {
      const response = await axios.put(`/api/ads/${id}`, adData)
      const updatedAd = response.data
      set((state) => ({
        ads: state.ads.map(ad => ad.id === id ? updatedAd : ad),
        selectedAd: state.selectedAd?.id === id ? updatedAd : state.selectedAd,
        loading: false
      }))
      get().fetchStats()
      return updatedAd
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  deleteAd: async (id: number) => {
    set({ loading: true })
    try {
      await axios.delete(`/api/ads/${id}`)
      set((state) => ({
        ads: state.ads.filter(ad => ad.id !== id),
        selectedAd: state.selectedAd?.id === id ? null : state.selectedAd,
        loading: false
      }))
      get().fetchStats()
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  incrementClicks: async (id: number) => {
    try {
      await axios.post(`/api/ads/${id}/clicks`)
      // 成功：本地 +1
      set((state) => ({
        ads: state.ads.map(ad => ad.id === id ? { ...ad, clicks: ad.clicks + 1 } : ad)
      }))
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}))

export default useAdStore