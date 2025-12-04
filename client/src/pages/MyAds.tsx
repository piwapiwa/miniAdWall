// client/src/pages/MyAds.tsx
import { useEffect } from 'react'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import AdList from './AdList' // 复用 AdList 组件，但通过 props 控制行为

const MyAds = () => {
  const { fetchAds, setFilter } = useAdStore()
  const { role } = useUserStore()

  useEffect(() => {
    // 强制筛选“我的广告”
    // 如果是管理员，这里可以不传 mine=true，而是提供一个搜索框搜用户名
    if (role !== 'admin') {
      fetchAds({ mine: 'true' })
    } else {
      fetchAds({}) // 管理员看所有，但可以管理所有
    }
    
    return () => {
      // 离开页面时重置筛选
      fetchAds({})
    }
  }, [])

  return (
    <div>
      {/* 可以在这里传参给 AdList，告诉它是管理模式 */}
      <AdList mode="manage" /> 
    </div>
  )
}
export default MyAds