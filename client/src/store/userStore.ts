import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  token: string | null;
  username: string | null;
  id: number | null; // 新增：用户ID
  role: string | null; // 新增：角色
  login: (data: { token: string; username: string; id: number; role: string }) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      id: null,
      role: null,
      
      login: (data) => set({ 
        token: data.token, 
        username: data.username,
        id: data.id,
        role: data.role 
      }),
      
      logout: () => set({ token: null, username: null, id: null, role: null }),
      
      isLoggedIn: () => !!get().token
    }),
    {
      name: 'user-storage',
    }
  )
)