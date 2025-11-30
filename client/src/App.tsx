import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import MainLayout from './layout/MainLayout'
import AdList from './pages/AdList'
import AdDetail from './pages/AdDetail'
import Dashboard from './pages/Dashboard' // ⚠️ 确保这个文件存在于 src/pages/Dashboard.tsx

function App() {
  return (
    <Routes>
      {/* 1. 落地页 (首页) */}
      <Route path="/" element={<Landing />} />

      {/* 2. 应用主区域 (包含侧边栏布局) */}
      <Route path="/app" element={<MainLayout />}>
        {/* 默认子路由：显示广告列表 */}
        <Route index element={<AdList />} />
        
        {/* 数据看板子路由：对应 /app/dashboard */}
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* 详情页子路由：对应 /app/ad/:id */}
        <Route path="ad/:id" element={<AdDetail />} />
      </Route>

      {/* 3. 重定向旧路由 (兼容性) */}
      <Route path="/ad/:id" element={<Navigate to="/app/ad/:id" replace />} />
      
      {/* 4. 404 兜底 (可选，防止乱输地址白屏) */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App