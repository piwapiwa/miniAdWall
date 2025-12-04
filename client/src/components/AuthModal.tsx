import { useState } from 'react'
import { Modal, Form, Input, Button, Message, Tabs } from '@arco-design/web-react'
import { IconUser, IconLock } from '@arco-design/web-react/icon'
import axios from 'axios'
import { useUserStore } from '../store/userStore'

const TabPane = Tabs.TabPane

interface AuthModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

const AuthModal = ({ visible, onCancel, onSuccess }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const { login } = useUserStore()

  const handleSubmit = async () => {
    try {
      const values = await form.validate()
      setLoading(true)
      
      const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await axios.post(endpoint, values)
      
      // 🚀 核心修复：传入完整的对象结构
      login({
        token: res.data.token,
        username: res.data.username,
        id: res.data.id,
        role: res.data.role
      })

      Message.success(activeTab === 'login' ? '登录成功' : '注册成功')
      onSuccess()
      form.resetFields()
    } catch (error: any) {
      Message.error(error.response?.data?.error || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={activeTab === 'login' ? '用户登录' : '用户注册'}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 400 }}
    >
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <TabPane key="login" title="登录" />
        <TabPane key="register" title="注册" />
      </Tabs>
      
      <Form form={form} style={{ marginTop: 20 }} onSubmit={handleSubmit}>
        <Form.Item field="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input prefix={<IconUser />} placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item field="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password prefix={<IconLock />} placeholder="请输入密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" long loading={loading}>
            {activeTab === 'login' ? '登录' : '注册'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AuthModal