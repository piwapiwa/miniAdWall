import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography, Dropdown, Avatar, Message, Tag } from '@arco-design/web-react'
import { IconHome, IconDashboard, IconApps, IconMenuFold, IconMenuUnfold, IconUser, IconSettings, IconExport } from '@arco-design/web-react/icon'
import AuthModal from '../components/AuthModal'
import { useUserStore } from '../store/userStore'

const { Header, Content, Footer, Sider } = Layout
const MenuItem = Menu.Item

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  
  const [authVisible, setAuthVisible] = useState(false)
  const { username, isLoggedIn, logout, role } = useUserStore()

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/app/my-ads')) return ['my-ads']
    if (location.pathname.startsWith('/app/dashboard')) return ['dashboard']
    return ['home']
  }

  const handleLogout = () => {
    logout()
    Message.success('已退出登录')
    if (location.pathname.includes('/my-ads')) {
      navigate('/app')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      
      {/* 顶部 Header - 使用淡蓝色 #E8F3FF */}
      <Header style={{ 
        height: 64, 
        borderBottom: '1px solid rgba(229,230,235, 0.5)', 
        backgroundColor: '#E8F3FF', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 24px',
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button shape="circle" type="text" style={{ marginRight: 16, color: '#1d2129' }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
          </Button>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #165DFF 0%, #722ED1 100%)', borderRadius: 10, marginRight: 12, boxShadow: '0 4px 10px rgba(22,93,255,0.3)' }} />
          <Typography.Text style={{ fontSize: 20, fontWeight: 600, color: '#1d2129' }}>Mini 广告墙</Typography.Text>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {isLoggedIn() ? (
            <Dropdown droplist={
              <Menu>
                <Menu.Item key="logout" onClick={handleLogout}>
                  <IconExport style={{marginRight: 8}}/> 退出登录
                </Menu.Item>
              </Menu>
            }>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.6)', transition: 'all 0.3s', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Avatar size={28} style={{ backgroundColor: '#165DFF', marginRight: 8 }}>{username?.[0]?.toUpperCase()}</Avatar>
                <span style={{ fontWeight: 500, color: '#1d2129' }}>{username}</span>
                {role === 'admin' && <Tag size="small" color="arcoblue" style={{marginLeft: 8, borderRadius: 4}}>Admin</Tag>}
              </div>
            </Dropdown>
          ) : (
            <Button 
              type="primary" 
              shape="round"
              style={{ padding: '0 24px', fontWeight: 500, height: 36 }}
              onClick={() => setAuthVisible(true)}
            >
              登录 / 注册
            </Button>
          )}
          
          <div style={{ width: 1, height: 20, background: '#c9cdd4' }} />

          {/* 🚀 优化：给返回首页按钮增加边框和圆角 */}
          <Button 
            type="outline" 
            shape="round"
            icon={<IconHome />} 
            onClick={() => navigate('/')} 
            style={{ 
              color: '#4e5969', 
              borderColor: '#c9cdd4', // 明显的灰色边框
              height: 36,
              fontWeight: 500
            }}
          >
            返回首页
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider
          collapsible trigger={null} collapsed={collapsed} breakpoint="lg" width={240} collapsedWidth={0}
          onCollapse={(val) => setCollapsed(val)}
          style={{ 
            height: 'calc(100vh - 64px)', 
            backgroundColor: '#F2F8FF', 
            borderRight: '1px solid var(--color-border)', 
            position: 'fixed', 
            zIndex: 99, 
            left: 0 
          }}
        >
          <Menu
            selectedKeys={getSelectedKey()}
            onClickMenuItem={(key) => {
              if (key === 'home') navigate('/app') // 跳转到 AdGallery
              if (key === 'dashboard') navigate('/app/dashboard')
              if (key === 'my-ads') navigate('/app/my-ads') // 跳转到 AdManager
              if (window.innerWidth < 992) setCollapsed(true)
            }}
            style={{ width: '100%', marginTop: 16, backgroundColor: 'transparent' }}
          >
            <MenuItem key="home"><IconApps /> 广告画廊</MenuItem> 
            <MenuItem key="dashboard"><IconDashboard /> 数据看板</MenuItem>
            {isLoggedIn() && (
              <MenuItem key="my-ads">
                {role === 'admin' ? <IconSettings /> : <IconUser />} 
                {role === 'admin' ? ' 后台管理' : ' 我的广告'} 
              </MenuItem>
            )}
          </Menu>
        </Sider>

        <Layout style={{ 
          padding: '24px', 
          backgroundColor: '#F7F8FA', 
          marginLeft: collapsed ? 0 : 240, 
          transition: 'all 0.2s', 
          ...(window.innerWidth < 992 ? { marginLeft: 0 } : {}) 
        }}>
          <Content style={{ 
            borderRadius: 16, 
            minHeight: 280,
          }}>
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', padding: '24px 0 0', color: '#86909c', fontSize: 13 }}>
            Mini Ad Wall ©2025 Created by YangBo
          </Footer>
        </Layout>
      </Layout>

      <AuthModal visible={authVisible} onCancel={() => setAuthVisible(false)} onSuccess={() => setAuthVisible(false)} />
    </Layout>
  )
}
export default MainLayout