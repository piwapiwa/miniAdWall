// client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import MainLayout from './layout/MainLayout'
import AdList from './pages/AdList'
import AdDetail from './pages/AdDetail'

function App() {
  return (
    <Routes>
      {/* 首屏路由 */}
      <Route path="/" element={<Landing />} />

      {/* 应用主界面路由（嵌套路由） */}
      <Route path="/app" element={<MainLayout />}>
        {/* /app 默认显示广告列表 */}
        <Route index element={<AdList />} />
        {/* /app/ad/:id 显示详情 */}
        <Route path="ad/:id" element={<AdDetail />} />
      </Route>

      {/* 兼容旧的路由，如果有旧链接访问 /ad/:id 重定向到新的结构 */}
      <Route path="/ad/:id" element={<Navigate to="/app/ad/:id" replace />} />
    </Routes>
  )
}

export default App