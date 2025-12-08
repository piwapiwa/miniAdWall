import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface UserState {
  token: string | null;
  username: string | null;
  id: number | null;
  role: string | null;
  
  balance: number; // ✨
  login: (data: { token: string; username: string; id: number; role: string; balance: number }) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  updateBalance: (newBalance: number) => void; // ✨ 用于实时更新
  fetchMe: () => Promise<void>; // ✨ 用于刷新个人信息

  updateProfile: (data: { username?: string; password?: string }) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      id: null,
      role: null,

      balance:0,
      
      login: (data) => set({ 
        token: data.token, 
        username: data.username,
        id: data.id,
        role: data.role,
        balance: data.balance
      }),

      updateBalance: (val) => set({ balance: val }),

      fetchMe: async () => {
        const { token } = get();
        if(!token) return;
        try {
            const res = await axios.get('/api/auth/me');
            set({ balance: res.data.balance });
        } catch(e) {}
      },

      updateProfile: async (data) => {
        const res = await axios.put('/api/auth/profile', data)
        // 更新本地状态，包括新 Token
        set({ 
          token: res.data.token, 
          username: res.data.username 
        })
        // 更新 Axios 默认 Header，防止后续请求失败
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      },
      
      logout: () => set({ token: null, username: null, id: null, role: null, balance: 0 }),
      
      isLoggedIn: () => !!get().token
    }),
    {
      name: 'user-storage',
    }
  )
)