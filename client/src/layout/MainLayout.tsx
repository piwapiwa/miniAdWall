import { Outlet, Link, useLocation } from 'react-router-dom'
import { Layout, Button, Modal } from '@arco-design/web-react'
import { IconPlus } from '@arco-design/web-react/icon'
import { useState } from 'react'
import DynamicForm from '../components/DynamicForm'
import useAdStore from '../store/adStore'

const { Header, Content, Footer } = Layout

const MainLayout = () => {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const { createAd, fetchAds } = useAdStore()

  const handleCreateSubmit = async (values: any) => {
    try {
      await createAd({ ...values, price: Number(values.price) })
      setVisible(false)
      if (location.pathname === '/app') fetchAds()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    // Layout 设为透明
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      
      {/* Header 设为半透明毛玻璃效果，提升高级感 */}
      <Header style={{ 
        padding: '0 20px', 
        backgroundColor: 'rgba(255, 255, 255, 0.6)', // 半透明白
        backdropFilter: 'blur(10px)', // 毛玻璃模糊
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
        
        <Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>
          新增广告
        </Button>
      </Header>
      
      {/* Content 设为透明，padding 稍微加大 */}
      <Content style={{ padding: '32px 24px', flex: 1, backgroundColor: 'transparent' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>
      
      <Footer style={{ textAlign: 'center', padding: '16px', color: '#4e5969' }}>
        Mini Ad Wall ©2024 Created by ByteDance Camp
      </Footer>

      <Modal
        title={null}
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        style={{ width: 600 }}
        unmountOnExit
      >
        <DynamicForm 
          schemaId="ad-form" 
          onSubmit={handleCreateSubmit} 
        />
      </Modal>
    </Layout>
  )
}

export default MainLayout