import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Typography, Grid, Space, Card, Avatar, Tag } from '@arco-design/web-react'
import { 
  IconRight, IconApps, IconThunderbolt, IconExperiment, IconDashboard
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import AuthModal from '../components/AuthModal'

const { Title, Text } = Typography
const { Row, Col } = Grid

const Landing = () => {
  const navigate = useNavigate()
  const { ads, fetchAds } = useAdStore()
  const { isLoggedIn, username, logout } = useUserStore()
  const [authVisible, setAuthVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // 📱 移动端状态
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    fetchAds()
    setTimeout(() => setMounted(true), 100)
    
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fetchAds])

  const totalAds = ads.length
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0)

  // 顶部导航栏
  const Navbar = () => (
    <div style={{ 
      position: 'absolute', top: 0, left: 0, right: 0, 
      padding: isMobile ? '20px' : '24px 48px', 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #165DFF 0%, #00B42A 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(22,93,255,0.3)' }}>
          <IconThunderbolt style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#1D2129', letterSpacing: -0.5 }}>Mini AdWall</span>
      </div>
      
      <div>
        {isLoggedIn() ? (
          <Space size={isMobile ? 10 : 20}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.8)', padding: '4px 12px 4px 4px', borderRadius: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <Avatar size={32} style={{ backgroundColor: '#165DFF', marginRight: isMobile ? 0 : 8 }}>{username?.[0]?.toUpperCase()}</Avatar>
              {!isMobile && <span style={{ fontWeight: 600, color: '#1d2129' }}>{username}</span>}
            </div>
            {!isMobile && <Button type="secondary" shape="round" onClick={logout}>退出</Button>}
            <Button type="primary" shape="round" onClick={() => navigate('/app')}>{isMobile ? '控制台' : '进入控制台'}</Button>
          </Space>
        ) : (
          <Space>
            {!isMobile && <Button type="text" style={{ color: '#4E5969' }} onClick={() => navigate('/app')}>游客访问</Button>}
            <Button type="primary" shape="round" style={{ padding: isMobile ? '0 16px' : '0 24px' }} onClick={() => setAuthVisible(true)}>登录 / 注册</Button>
          </Space>
        )}
      </div>
    </div>
  )

  // 特性卡片
  const FeatureCard = ({ icon, title, desc }: any) => (
    <Card 
      hoverable 
      style={{ 
        borderRadius: 16, border: 'none', background: '#fff', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%',
        transition: 'transform 0.3s ease'
      }}
      bodyStyle={{ padding: '32px 24px', textAlign: 'center' }}
    >
      <div style={{ 
        width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', 
        background: '#F0F7FF', color: '#165DFF', display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1D2129' }}>{title}</div>
      <div style={{ fontSize: 14, color: '#86909c', lineHeight: 1.6 }}>{desc}</div>
    </Card>
  )

  return (
    <div style={{ 
      position: 'relative', width: '100vw', minHeight: '100vh', 
      background: '#F7F8FA', overflowX: 'hidden', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(22,93,255,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,180,42,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />

      <Navbar />

      <div style={{ 
        maxWidth: 1200, margin: '0 auto', padding: isMobile ? '120px 20px 40px' : '160px 24px 60px', 
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(40px)', 
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        
        {/* 2. Hero 主视觉区域 */}
        <div style={{ textAlign: 'center', marginBottom: 100 }}>
          <Tag color="arcoblue" style={{ borderRadius: 20, padding: '4px 12px', marginBottom: 24, border: '1px solid #165DFF' }}>
            🚀 全新升级 v2.0
          </Tag>
          <Title style={{ 
            fontSize: isMobile ? 42 : 64, fontWeight: 800, margin: '0 0 24px', 
            background: 'linear-gradient(90deg, #1D2129 0%, #165DFF 100%)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: -2, lineHeight: 1.1
          }}>
            激发无限创意<br/>连接品牌价值
          </Title>
          <Text style={{ fontSize: isMobile ? 16 : 20, color: '#4E5969', maxWidth: 600, display: 'block', margin: '0 auto 48px', lineHeight: 1.6 }}>
            Mini AdWall 是一个智能化的广告投放与展示平台，为您提供从创意展示到数据分析的一站式解决方案。
          </Text>
          
          <Space size={24} direction={isMobile ? 'vertical' : 'horizontal'}>
            <Button 
              type="primary" size="large" shape="round" 
              style={{ height: 56, padding: '0 48px', fontSize: 18, fontWeight: 600, boxShadow: '0 10px 20px rgba(22,93,255,0.2)', width: isMobile ? '100%' : 'auto' }}
              onClick={() => navigate('/app')}
            >
              开始探索 <IconRight style={{ marginLeft: 8 }} />
            </Button>
            <Button 
              size="large" shape="round" 
              style={{ height: 56, padding: '0 48px', fontSize: 18, background: '#fff', border: '1px solid #E5E6EB', color: '#4E5969', width: isMobile ? '100%' : 'auto' }}
              onClick={() => window.open('https://github.com', '_blank')}
            >
              了解更多
            </Button>
          </Space>

          {/* 实时数据条：手机端垂直排列 */}
          <div style={{ 
            marginTop: 80, display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center', gap: isMobile ? 32 : 60 
          }}>
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1D2129' }}>{totalAds}+</div>
              <div style={{ color: '#86909c' }}>精选广告案例</div>
            </div>
            {!isMobile && <div style={{ width: 1, height: 50, background: '#E5E6EB' }} />}
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#165DFF' }}>{totalClicks}</div>
              <div style={{ color: '#86909c' }}>累计点击热度</div>
            </div>
            {!isMobile && <div style={{ width: 1, height: 50, background: '#E5E6EB' }} />}
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#00B42A' }}>100%</div>
              <div style={{ color: '#86909c' }}>数据实时更新</div>
            </div>
          </div>
        </div>

        {/* 3. 核心特性区域：手机端占满一行 */}
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <FeatureCard 
              icon={<IconApps style={{ fontSize: 32 }} />}
              title="沉浸式画廊"
              desc="采用最新的流体布局与毛玻璃视效，让每一个广告创意都能得到最完美的展示效果。"
            />
          </Col>
          <Col xs={24} md={8}>
            {/* 🚀 修复点：使用 IconDashboard 代替不存在的图标 */}
            <FeatureCard 
              icon={<IconDashboard style={{ fontSize: 32 }} />}
              title="多维数据洞察"
              desc="实时监控点击、热度与转化趋势，可视化的数据看板助您做出更明智的投放决策。"
            />
          </Col>
          <Col xs={24} md={8}>
            <FeatureCard 
              icon={<IconExperiment style={{ fontSize: 32 }} />}
              title="智能投放管理"
              desc="支持多种媒体格式上传，一键发布、编辑与管理，让广告投放变得前所未有的简单。"
            />
          </Col>
        </Row>

      </div>

      <div style={{ textAlign: 'center', padding: '40px 0', color: '#C9CDD4', fontSize: 13, background: '#fff', borderTop: '1px solid #F2F3F5' }}>
        <div style={{ marginBottom: 8, fontWeight: 600, color: '#86909c' }}>Mini AdWall Project</div>
        <div>© 2025 Designed & Developed by YangBo</div>
      </div>

      <AuthModal visible={authVisible} onCancel={() => setAuthVisible(false)} onSuccess={() => setAuthVisible(false)} />
    </div>
  )
}

export default Landing