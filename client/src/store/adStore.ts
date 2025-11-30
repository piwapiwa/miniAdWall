import { create } from 'zustand'
import axios from 'axios'
import { Ad, AdState } from '../types'

export const useAdStore = create<AdState>((set, get) => ({
  // --- State ---
  ads: [],
  stats: null, // 新增：仪表盘统计数据
  loading: false,
  error: null,
  selectedAd: null,
  filter: { search: '', status: 'All' }, // 新增：筛选状态

  // --- Actions ---

  // 设置筛选条件
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),

  // 获取广告列表 (支持搜索、筛选)
  fetchAds: async (params) => {
    set({ loading: true, error: null })
    try {
      // 合并 store 中的 filter 和传入的 params
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

  // 获取仪表盘统计数据
  fetchStats: async () => {
    try {
      const response = await axios.get('/api/ads/stats')
      set({ stats: response.data })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  },

  // 获取单个广告详情
  fetchAdById: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`/api/ads/${id}`)
      const ad = response.data
      set({ selectedAd: ad, loading: false })
      return ad
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取广告详情失败', 
        loading: false 
      })
      return null
    }
  },

  // 创建广告
  createAd: async (adData: any) => {
    set({ loading: true })
    try {
      const response = await axios.post('/api/ads', adData)
      const newAd = response.data
      
      // 更新本地列表
      set((state) => ({ 
        ads: [newAd, ...state.ads], 
        loading: false 
      }))
      
      // 刷新统计数据
      get().fetchStats()
      
      return newAd
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  // 更新广告 (支持更新内容和状态)
  updateAd: async (id: number, adData: Partial<Ad>) => {
    set({ loading: true })
    try {
      const response = await axios.put(`/api/ads/${id}`, adData)
      const updatedAd = response.data
      
      set((state) => ({
        ads: state.ads.map(ad => ad.id === id ? updatedAd : ad),
        selectedAd: state.selectedAd?.id === id ? updatedAd : state.selectedAd,
        loading: false
      }))

      // 刷新统计数据 (因为状态或价格可能改变)
      get().fetchStats()

      return updatedAd
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  // 删除广告
  deleteAd: async (id: number) => {
    set({ loading: true })
    try {
      await axios.delete(`/api/ads/${id}`)
      set((state) => ({
        ads: state.ads.filter(ad => ad.id !== id),
        selectedAd: state.selectedAd?.id === id ? null : state.selectedAd,
        loading: false
      }))
      
      // 刷新统计数据
      get().fetchStats()

    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  // 增加点击量
  incrementClicks: async (id: number) => {
    try {
      await axios.post(`/api/ads/${id}/clicks`)
      set((state) => ({
        ads: state.ads.map(ad => 
          ad.id === id ? { ...ad, clicks: ad.clicks + 1 } : ad
        ),
        selectedAd: state.selectedAd?.id === id 
          ? { ...state.selectedAd, clicks: state.selectedAd.clicks + 1 }
          : state.selectedAd
      }))
      
      // 刷新统计数据
      get().fetchStats()

    } catch (error) {
      console.error('增加点击量失败:', error)
    }
  }
}))

export default useAdStore