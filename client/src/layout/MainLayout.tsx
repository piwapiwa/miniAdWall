import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Layout, Button } from '@arco-design/web-react'
import { IconHome } from '@arco-design/web-react/icon'

const { Header, Content, Footer } = Layout

const MainLayout = () => {
  const navigate = useNavigate()

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      
      {/* 顶部 Header */}
      <Header style={{ 
        padding: '0 20px', 
        backgroundColor: 'rgba(255, 255, 255, 0.6)', 
        backdropFilter: 'blur(10px)', 
        borderBottom: '1px solid rgba(229, 230, 235, 0.5)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/app" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              background: 'linear-gradient(45deg, #165DFF, #722ED1)', 
              borderRadius: 4, 
              marginRight: 12 
            }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d2129' }}>Mini 广告墙</span>
          </Link>
        </div>
        
        {/* 这里改成“回到首页” */}
        <Button icon={<IconHome />} onClick={() => navigate('/')}>
          回到首页
        </Button>
      </Header>
      
      <Content style={{ padding: '32px 24px', flex: 1, backgroundColor: 'transparent' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>
      
      <Footer style={{ textAlign: 'center', padding: '16px', color: '#4e5969' }}>
        Mini Ad Wall ©2024 Created by ByteDance Camp
      </Footer>
    </Layout>
  )
}

export default MainLayout