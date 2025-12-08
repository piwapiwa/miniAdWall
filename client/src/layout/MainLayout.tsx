import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, Message, Divider, Drawer } from '@arco-design/web-react'
import { 
  IconApps, IconDashboard, IconUser, IconExport, IconSettings, 
  IconThunderbolt, IconHome, IconMenu 
} from '@arco-design/web-react/icon'
import AuthModal from '../components/AuthModal'
import { useUserStore } from '../store/userStore'

const { Header, Content, Footer } = Layout
const MenuItem = Menu.Item

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [authVisible, setAuthVisible] = useState(false)
  const { username, isLoggedIn, logout, role } = useUserStore()
  const [scrolled, setScrolled] = useState(false)
  
  // 📱 移动端状态
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerVisible, setDrawerVisible] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    const handleScroll = () => setScrolled(window.scrollY > 20)
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const selectedKey = location.pathname.startsWith('/app/my-ads') ? 'my-ads' : (location.pathname.startsWith('/app/dashboard') ? 'dashboard' : 'home');

  const handleLogout = () => {
    logout()
    Message.success('已退出登录')
    setDrawerVisible(false)
    navigate('/app')
  }

  // 渲染菜单项（复用逻辑）
  const renderMenuItems = (isVertical = false) => {
    // const itemStyle = isVertical ? { marginBottom: 16, fontSize: 16, padding: '12px 16px' } : { cursor: 'pointer' }
    
    // 移动端垂直菜单的渲染
    if (isVertical) {
      return (
        <Menu 
          selectedKeys={[selectedKey]} 
          onClickMenuItem={(key) => {
            if (key === 'home') navigate('/app')
            if (key === 'dashboard') navigate('/app/dashboard')
            if (key === 'my-ads') navigate('/app/my-ads')
            setDrawerVisible(false) // 点击后关闭抽屉
          }}
          style={{ width: '100%', border: 'none' }}
        >
          <MenuItem key="home"><IconApps /> 广告画廊</MenuItem>
          <MenuItem key="dashboard"><IconDashboard /> 数据看板</MenuItem>
          {isLoggedIn() && (
            <MenuItem key="my-ads">
              {role === 'admin' ? <IconSettings /> : <IconUser />} 
              {role === 'admin' ? '后台管理' : '我的投放'}
            </MenuItem>
          )}
        </Menu>
      )
    }

    // 桌面端多彩胶囊菜单
    const renderColorfulMenuItem = (key: string, icon: any, label: string, color: string) => {
      const isSelected = selectedKey === key;
      return (
        <div style={{
          display: 'flex', alignItems: 'center', fontWeight: isSelected ? 600 : 500,
          color: isSelected ? color : '#4E5969',
          background: isSelected ? `${color}15` : 'transparent',
          padding: '6px 16px', borderRadius: '20px', transition: 'all 0.3s'
        }}>
          <span style={{ marginRight: 8, fontSize: 16, display: 'flex' }}>{icon}</span>
          {label}
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/app')}>
          {renderColorfulMenuItem('home', <IconApps />, '广告画廊', '#165DFF')}
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/app/dashboard')}>
          {renderColorfulMenuItem('dashboard', <IconDashboard />, '数据看板', '#722ED1')}
        </div>
        {isLoggedIn() && (
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/app/my-ads')}>
            {renderColorfulMenuItem('my-ads', role === 'admin' ? <IconSettings /> : <IconUser />, role === 'admin' ? '后台管理' : '我的投放', '#00B42A')}
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      
      <Header 
        className="glass-effect"
        style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: 72, zIndex: 1000,
          padding: isMobile ? '0 16px' : '0 32px', // 📱 移动端减小内边距
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}
      >
        {/* 左侧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 40 }}>
          
          {/* 📱 移动端汉堡菜单按钮 */}
          {isMobile && (
            <Button shape="circle" type="text" onClick={() => setDrawerVisible(true)}>
              <IconMenu style={{ fontSize: 20, color: '#1D2129' }} />
            </Button>
          )}

          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/app')}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #165DFF 0%, #00B42A 100%)', borderRadius: 10, marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <IconThunderbolt style={{ fontSize: 18 }} />
            </div>
            {!isMobile && ( // 📱 手机端如果空间不够可以隐藏文字，或者保留
              <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(90deg, #1D2129 0%, #333 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5 }}>
                Mini AdWall
              </span>
            )}
          </div>

          {/* 💻 桌面端菜单 (手机端隐藏) */}
          {!isMobile && renderMenuItems(false)}
        </div>
        
        {/* 右侧 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!isMobile && <Button type="text" icon={<IconHome />} style={{ color: '#4E5969', marginRight: 16 }} onClick={() => navigate('/')}>首页</Button>}
          {!isMobile && <Divider type="vertical" style={{ height: 20, borderColor: '#E5E6EB', marginRight: 20 }} />}

          {isLoggedIn() ? (
            <Dropdown droplist={
              <Menu>
                <Menu.Item key="logout" onClick={handleLogout} style={{ color: '#F53F3F' }}>
                  <IconExport style={{marginRight: 8}}/> 退出登录
                </Menu.Item>
              </Menu>
            }>
              <div className="hover-card-effect" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 12px 4px 4px', borderRadius: 30, background: '#fff', border: '1px solid #F2F3F5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Avatar size={32} style={{ backgroundColor: '#165DFF', marginRight: isMobile ? 0 : 8 }}>{username?.[0]?.toUpperCase()}</Avatar>
                {!isMobile && <span style={{ fontWeight: 600, color: '#1d2129', fontSize: 14 }}>{username}</span>}
              </div>
            </Dropdown>
          ) : (
            <Button type="primary" shape="round" onClick={() => setAuthVisible(true)} style={{ padding: '0 20px', fontWeight: 600, height: 36 }}>
              {isMobile ? '登录' : '登录 / 注册'}
            </Button>
          )}
        </div>
      </Header>

      {/* 📱 移动端抽屉菜单 */}
      <Drawer
        width={280}
        title={<span><IconThunderbolt style={{ color: '#165DFF', marginRight: 8 }} /> 菜单导航</span>}
        visible={drawerVisible}
        placement="left"
        onCancel={() => setDrawerVisible(false)}
        footer={null}
      >
        {renderMenuItems(true)}
        <div style={{ position: 'absolute', bottom: 40, left: 24 }}>
          <Button type="text" icon={<IconHome />} onClick={() => {navigate('/'); setDrawerVisible(false)}}>返回首页</Button>
        </div>
      </Drawer>

      <Layout style={{ marginTop: 72, padding: isMobile ? '20px 16px' : '32px 40px', transition: 'all 0.3s' }}>
        <Content style={{ maxWidth: 1280, margin: '0 auto', width: '100%', minHeight: 'calc(100vh - 180px)' }}>
          <Outlet />
        </Content>
        <Footer style={{ textAlign: 'center', padding: '40px 0 20px', color: '#86909c', fontSize: 12 }}>
          ©2025 Mini AdWall Project
        </Footer>
      </Layout>

      <AuthModal visible={authVisible} onCancel={() => setAuthVisible(false)} onSuccess={() => setAuthVisible(false)} />
    </Layout>
  )
}
export default MainLayout