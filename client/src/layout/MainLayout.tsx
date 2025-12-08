import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { 
  Layout, Menu, Button, Dropdown, Avatar, Message, Divider, Drawer, Modal, Form, Input, Tabs 
} from '@arco-design/web-react'
import { 
  IconApps, IconDashboard, IconUser, IconExport, IconSettings, 
  IconThunderbolt, IconHome, IconMenu, IconSafe, IconEdit 
} from '@arco-design/web-react/icon'
import AuthModal from '../components/AuthModal'
import { useUserStore } from '../store/userStore'

const { Header, Content, Footer } = Layout
const MenuItem = Menu.Item
const TabPane = Tabs.TabPane

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, isLoggedIn, logout, role, updateProfile } = useUserStore()
  
  // 状态管理
  const [authVisible, setAuthVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerVisible, setDrawerVisible] = useState(false)
  
  // 个人信息修改弹窗状态
  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [baseForm] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('basic')

  // 🟢 1. 专注模式检测：如果是钱包页，不显示导航
  const isFocusPage = location.pathname === '/app/wallet';

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

  // 🟢 3. 处理个人信息/密码更新
  const handleProfileUpdate = async (values: any) => {
    try {
      await updateProfile(values)
      Message.success('更新成功')
      setProfileModalVisible(false)
      baseForm.resetFields()
      securityForm.resetFields()
    } catch (error: any) {
      Message.error(error.response?.data?.error || '更新失败')
    }
  }

  // 下拉菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="wallet" onClick={() => navigate('/app/wallet')}>
        <IconSafe style={{marginRight: 8, color: '#FF7D00'}}/> 我的钱包
      </Menu.Item>
      <Menu.Item key="profile" onClick={() => {
        baseForm.setFieldsValue({ username }); // 回填用户名
        setActiveTab('basic');
        setProfileModalVisible(true);
      }}>
        <IconEdit style={{marginRight: 8}}/> 修改资料
      </Menu.Item>
      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="logout" onClick={handleLogout} style={{ color: '#F53F3F' }}>
        <IconExport style={{marginRight: 8}}/> 退出登录
      </Menu.Item>
    </Menu>
  );

  // 渲染菜单项
  const renderMenuItems = (isVertical = false) => {
    if (isVertical) {
      return (
        <Menu 
          selectedKeys={[selectedKey]} 
          onClickMenuItem={(key) => {
            if (key === 'home') navigate('/app')
            if (key === 'dashboard') navigate('/app/dashboard')
            if (key === 'my-ads') navigate('/app/my-ads')
            setDrawerVisible(false)
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
          padding: isMobile ? '0 16px' : '0 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}
      >
        {/* 左侧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 40 }}>
          {/* 移动端菜单：专注模式下隐藏 */}
          {isMobile && !isFocusPage && (
            <Button shape="circle" type="text" onClick={() => setDrawerVisible(true)}>
              <IconMenu style={{ fontSize: 20, color: '#1D2129' }} />
            </Button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/app')}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #165DFF 0%, #00B42A 100%)', borderRadius: 10, marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <IconThunderbolt style={{ fontSize: 18 }} />
            </div>
            {!isMobile && (
              <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(90deg, #1D2129 0%, #333 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5 }}>
                Mini Ad Wall
              </span>
            )}
          </div>

          {/* 桌面端菜单：专注模式下隐藏 */}
          {!isMobile && !isFocusPage && renderMenuItems(false)}
        </div>
        
        {/* 右侧 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 专注模式下显示退出按钮 */}
          {isFocusPage && !isMobile && (
             <Button type="text" onClick={() => navigate('/app')} style={{marginRight: 16, color: '#86909c'}}>
               退出钱包
             </Button>
          )}

          {!isMobile && !isFocusPage && <Button type="text" icon={<IconHome />} style={{ color: '#4E5969', marginRight: 16 }} onClick={() => navigate('/')}>首页</Button>}
          {!isMobile && <Divider type="vertical" style={{ height: 20, borderColor: '#E5E6EB', marginRight: 20 }} />}

          {isLoggedIn() ? (
            <Dropdown droplist={userMenu} trigger="click" position="br">
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
          ©2025 Mini-Ad-Wall Project
        </Footer>
      </Layout>

      {/* 修改资料弹窗 (Tabs分离) */}
      <Modal
        title="账号设置"
        visible={profileModalVisible}
        onCancel={() => {
            setProfileModalVisible(false);
            baseForm.resetFields();
            securityForm.resetFields();
        }}
        footer={null}
      >
        <Tabs defaultActiveTab="basic" activeTab={activeTab} onChange={setActiveTab}>
          
          <TabPane key="basic" title="基本信息">
            <Form form={baseForm} layout="vertical" style={{ marginTop: 20 }} onSubmit={handleProfileUpdate}>
              <Form.Item label="用户名" field="username" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="请输入新用户名" />
              </Form.Item>
              <div style={{ color: '#86909c', fontSize: 12, marginBottom: 24 }}>
                * 修改用户名后，您发布的所有广告将自动显示新名称。
              </div>
              <Form.Item>
                <Button type="primary" htmlType="submit" long>保存基本信息</Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane key="security" title="安全设置">
            <Form form={securityForm} layout="vertical" style={{ marginTop: 20 }} onSubmit={handleProfileUpdate}>
              <Form.Item label="旧密码" field="oldPassword" rules={[{ required: true, message: '请输入旧密码以验证身份' }]}>
                <Input.Password placeholder="请输入当前使用的密码" />
              </Form.Item>
              <Form.Item label="新密码" field="newPassword" rules={[{ required: true, message: '请输入新密码' }, { minLength: 6, message: '密码最少6位' }]}>
                <Input.Password placeholder="请输入新密码" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" status="warning" htmlType="submit" long>修改密码</Button>
              </Form.Item>
            </Form>
          </TabPane>

        </Tabs>
      </Modal>

      <AuthModal visible={authVisible} onCancel={() => setAuthVisible(false)} onSuccess={() => setAuthVisible(false)} />
    </Layout>
  )
}
export default MainLayout