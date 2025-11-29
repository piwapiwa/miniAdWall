import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 原有的 API 代理
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      // ⬇️⬇️⬇️ 新增这一段：静态资源代理 ⬇️⬇️⬇️
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})