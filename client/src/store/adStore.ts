import { create } from 'zustand'
import axios from 'axios'
import { Ad, AdState } from '../types'

export const useAdStore = create<AdState>((set) => ({
  ads: [],
  loading: false,
  error: null,
  selectedAd: null,

  // 获取列表：这个保留 error 设置，因为如果列表都拉取失败，显示全屏报错是合理的
  fetchAds: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get('/api/ads')
      set({ ads: response.data, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取广告列表失败', 
        loading: false 
      })
    }
  },

  // 获取详情：也保留
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

  // 创建广告：移除 set({ error })，错误直接抛出给组件处理
  createAd: async (adData: any) => {
    set({ loading: true }) // 只设置 loading
    try {
      const response = await axios.post('/api/ads', adData)
      const newAd = response.data
      set((state) => ({ 
        ads: [newAd, ...state.ads], 
        loading: false 
      }))
      return newAd
    } catch (error) {
      set({ loading: false }) // 失败只取消 loading，不设置全局 error
      throw error // 抛出错误供组件捕获
    }
  },

  // 更新广告：移除 set({ error })
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
      return updatedAd
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  // 删除广告：移除 set({ error })
  deleteAd: async (id: number) => {
    set({ loading: true })
    try {
      await axios.delete(`/api/ads/${id}`)
      set((state) => ({
        ads: state.ads.filter(ad => ad.id !== id),
        selectedAd: state.selectedAd?.id === id ? null : state.selectedAd,
        loading: false
      }))
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

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
    } catch (error) {
      console.error('增加点击量失败:', error)
    }
  }
}))

export default useAdStore