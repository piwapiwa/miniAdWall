import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography} from '@arco-design/web-react'
import { IconHome, IconDashboard, IconApps, IconMenuFold, IconMenuUnfold } from '@arco-design/web-react/icon'

const { Header, Content, Footer, Sider } = Layout
const MenuItem = Menu.Item

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const selectedKeys = location.pathname === '/app/dashboard' ? ['dashboard'] : ['home']

  return (
    <Layout style={{ minHeight: '100vh' }}>
      
      {/* 顶部 Header */}
      <Header style={{ 
        height: 60, 
        borderBottom: '1px solid var(--color-border)', 
        backgroundColor: '#fff',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 移动端/桌面端通用的折叠按钮 - 放在 Logo 左边 */}
          <Button 
            shape="circle" 
            type="text"
            style={{ marginRight: 12 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
          </Button>

          <div style={{ 
            width: 32, 
            height: 32, 
            background: 'linear-gradient(45deg, #165DFF, #722ED1)', 
            borderRadius: 8, 
            marginRight: 12 
          }} />
          <Typography.Text bold style={{ fontSize: 18 }}>Mini 广告墙</Typography.Text>
        </div>
        
        <Button type="text" icon={<IconHome />} onClick={() => navigate('/')}>
          退出
        </Button>
      </Header>

      <Layout>
        <Sider
          collapsible
          trigger={null}
          collapsed={collapsed}
          breakpoint="lg" // 关键：在宽屏下显示，窄屏下自动触发响应式
          width={220}
          collapsedWidth={0} // 关键：手机上收起时宽度为0（完全隐藏），不占地
          onCollapse={(val) => setCollapsed(val)}
          style={{ 
            height: 'calc(100vh - 60px)', 
            background: '#fff', 
            borderRight: '1px solid var(--color-border)',
            position: 'fixed', // 手机上建议改为 fixed 或 absolute 覆盖在内容上，但在 Arco Layout 中默认表现尚可
            zIndex: 99,
            left: 0
          }}
        >
          <Menu
            selectedKeys={selectedKeys}
            onClickMenuItem={(key) => {
              if (key === 'home') navigate('/app')
              if (key === 'dashboard') navigate('/app/dashboard')
              // 手机上点击菜单后自动收起
              if (window.innerWidth < 992) setCollapsed(true)
            }}
            style={{ width: '100%', marginTop: 10 }}
          >
            <MenuItem key="home">
              <IconApps />
              广告列表
            </MenuItem>
            <MenuItem key="dashboard">
              <IconDashboard />
              数据看板
            </MenuItem>
          </Menu>
        </Sider>

        {/* 右侧内容区域 - 增加左边距适配 Sider */}
        <Layout style={{ 
          padding: '0 24px 24px', 
          backgroundColor: '#f2f3f5',
          marginLeft: collapsed ? 0 : 220, // 手动处理 Margin，实现推挤效果（桌面）
          transition: 'all 0.2s',
          // 移动端适配：手机上无论侧边栏是否展开，都不加 margin (侧边栏会浮在上面)
          ...(window.innerWidth < 992 ? { marginLeft: 0 } : {})
        }}>
          <div style={{ height: 24 }} /> 
          <Content style={{ borderRadius: 4, minHeight: 280 }}>
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', padding: '24px 0', color: '#86909c' }}>
            Mini Ad Wall ©2024 Created by ByteDance Camp
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default MainLayout