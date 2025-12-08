import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import '@arco-design/web-react/dist/css/arco.css'
import axios from 'axios'
import './styles/components.css'

// --- 🚀 新增 Axios 拦截器配置 ---
axios.interceptors.request.use((config) => {
  // 从 localStorage 读取 zustand 持久化的数据
  const storage = localStorage.getItem('user-storage')
  if (storage) {
    const { state } = JSON.parse(storage)
    if (state && state.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})
// ------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)