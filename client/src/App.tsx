import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import MainLayout from './layout/MainLayout'
import AdList from './pages/AdList'
import AdDetail from './pages/AdDetail'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<MainLayout />}>
        {/* 默认列表页：公共查看模式 */}
        <Route index element={<AdList isManagePage={false} />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* 我的广告/管理页：管理模式 */}
        {/* 注意：这里没有 MyAds 组件了，直接复用 AdList */}
        <Route path="my-ads" element={<AdList isManagePage={true} />} />

        <Route path="ad/:id" element={<AdDetail />} />
      </Route>

      <Route path="/ad/:id" element={<Navigate to="/app/ad/:id" replace />} />
    </Routes>
  )
}

export default App