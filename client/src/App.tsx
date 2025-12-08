import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import MainLayout from './layout/MainLayout'
import Dashboard from './pages/Dashboard'
import AdGallery from './pages/AdGallery' // 引入画廊页
import AdManager from './pages/AdManager' // 引入管理页
import AdDetail from './pages/AdDetail'
import Wallet from './pages/Wallet'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<MainLayout />}>
        {/* 1. 默认首页改为画廊模式 (AdGallery) */}
        <Route index element={<AdGallery />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* 2. 我的广告/管理页改为 AdManager */}
        <Route path="my-ads" element={<AdManager />} />

        <Route path="ad/:id" element={<AdDetail />} />

        <Route path="wallet" element={<Wallet />} />
      </Route>

      <Route path="/ad/:id" element={<Navigate to="/app/ad/:id" replace />} />
    </Routes>
  )
}

export default App