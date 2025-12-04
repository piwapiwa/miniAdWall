import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Typography, Statistic, Grid, Space } from '@arco-design/web-react'
import { IconRight, IconApps, IconFire, IconThunderbolt } from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import AuthModal from '../components/AuthModal'

const { Title } = Typography
const { Row, Col } = Grid

const Landing = () => {
  const navigate = useNavigate()
  const { ads, fetchAds } = useAdStore()
  
  // 用户及登录弹窗状态
  const { isLoggedIn, username, logout } = useUserStore()
  const [authVisible, setAuthVisible] = useState(false)

  // 简单的入场动画状态
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    fetchAds()
    setTimeout(() => setMounted(true), 100)
  }, [fetchAds])

  // 计算一些统计数据
  const totalAds = ads.length
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0)
  const maxPrice = ads.length > 0 ? Math.max(...ads.map(ad => Number(ad.price))) : 0

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#fff'
    }}>
      {/* 注入动态背景的 CSS 动画 */}
      <style>
        {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glass-panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          }
        `}
      </style>

      {/* 右上角登录入口 */}
      <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 10 }}>
        {isLoggedIn() ? (
          <Space>
            <span style={{ color: '#fff', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              欢迎, {username}
            </span>
            <Button type="text" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={logout}>
              登出
            </Button>
          </Space>
        ) : (
          <Button 
            type="outline" 
            style={{ color: '#fff', borderColor: '#fff' }} 
            onClick={() => setAuthVisible(true)}
          >
            登录 / 注册
          </Button>
        )}
      </div>

      {/* 主要内容区域 */}
      <div 
        className="glass-panel"
        style={{
          padding: '60px 80px',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(50px)',
          transition: 'all 1s ease-out',
          maxWidth: '800px',
          width: '90%'
        }}
      >
        {/* 标题区域 */}
        <div style={{ marginBottom: '40px', position: 'relative', width: '100%', textAlign: 'center' }}>
          <Title 
            style={{ 
              color: '#fff', 
              fontSize: '64px', 
              fontWeight: 800, 
              letterSpacing: '4px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              margin: 0
            }}
          >
            Mini 广告墙
          </Title>
          <div style={{ 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.8)', 
            marginTop: '10px', 
            letterSpacing: '2px',
            textTransform: 'uppercase' 
          }}>
            Intelligent Advertising Platform
          </div>

          <div style={{ 
            position: 'absolute', 
            right: '10%', 
            bottom: '-40px',
            transform: 'rotate(-5deg)'
          }}>
            <Button
              type="primary"
              shape="round"
              size="large"
              style={{
                height: '56px',
                padding: '0 32px',
                fontSize: '20px',
                background: '#fff',
                color: '#e73c7e',
                border: 'none',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => navigate('/app')}
            >
              进入系统 <IconRight style={{ marginLeft: 8, strokeWidth: 5 }} />
            </Button>
          </div>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', margin: '40px 0' }} />

        <div style={{ width: '100%' }}>
          <Row gutter={40} justify="center">
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <IconApps style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }} />
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.7)' }}>在线广告</span>}
                  value={totalAds} 
                  styleValue={{ color: '#fff', fontWeight: 'bold', fontSize: '32px' }} 
                />
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <IconFire style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }} />
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.7)' }}>总热度</span>}
                  value={totalClicks} 
                  styleValue={{ color: '#fff', fontWeight: 'bold', fontSize: '32px' }} 
                />
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <IconThunderbolt style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }} />
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.7)' }}>最高出价</span>}
                  value={maxPrice} 
                  precision={2}
                  prefix="¥"
                  styleValue={{ color: '#fff', fontWeight: 'bold', fontSize: '32px' }} 
                />
              </div>
            </Col>
          </Row>
        </div>
      </div>

      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        color: 'rgba(255,255,255,0.5)', 
        fontSize: '12px' 
      }}>
        ©2024 ByteDance Camp - Mini Ad Wall Project
      </div>

      <AuthModal 
        visible={authVisible} 
        onCancel={() => setAuthVisible(false)} 
        onSuccess={() => setAuthVisible(false)} 
      />
    </div>
  )
}

export default Landing