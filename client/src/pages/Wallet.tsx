import { useEffect, useState } from 'react'
import { Card, Statistic, Button, InputNumber, Modal, Message, Table, Tag } from '@arco-design/web-react'
import { 
  IconSafe, IconPlus, IconClockCircle 
} from '@arco-design/web-react/icon'
import { useUserStore } from '../store/userStore'
import axios from 'axios'

// 定义交易类型接口
interface Transaction {
    id: number;
    amount: string; // 后端 Decimal 返回可能是 string
    type: string;
    description: string;
    createdAt: string;
}

const Wallet = () => {
  const { balance, updateBalance, fetchMe } = useUserStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [amount, setAmount] = useState(100)
  const [loading, setLoading] = useState(false)
  
  // ✨ 新增：交易记录状态
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // 获取交易记录
  const fetchTransactions = async () => {
      setLoadingTransactions(true)
      try {
          const res = await axios.get('/api/auth/transactions')
          setTransactions(res.data)
      } catch (error) {
          console.error('获取交易记录失败', error)
      } finally {
          setLoadingTransactions(false)
      }
  }

  useEffect(() => {
    fetchMe()
    fetchTransactions() // 初始化加载记录
    
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleTopUp = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/topup', { amount })
      updateBalance(res.data.balance)
      Message.success(`充值成功，当前余额 ¥${res.data.balance}`)
      setModalVisible(false)
      fetchTransactions() // ✨ 充值成功后刷新记录
    } catch (error) {
      Message.error('充值失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20, paddingLeft: isMobile ? 16 : 0, paddingRight: isMobile ? 16 : 0 }}>
      {/* 余额卡片 (保持不变) */}
      <Card 
        title={<span><IconSafe style={{marginRight:8, color:'#165DFF'}}/>我的钱包</span>} 
        bordered={false} 
        style={{ borderRadius: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
      >
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', padding: '10px 0', gap: 20 }}>
          <div>
            <div style={{ color: '#86909c', marginBottom: 8, fontSize: 14 }}>账户余额 (CNY)</div>
            <Statistic value={balance} precision={2} prefix="¥" styleValue={{ fontSize: isMobile ? 36 : 48, fontWeight: 'bold', color: '#165DFF' }} />
          </div>
          <Button type="primary" size="large" shape="round" icon={<IconPlus />} onClick={() => setModalVisible(true)} style={{ width: isMobile ? '100%' : 'auto', height: 48, fontSize: 16 }}>
            立即充值
          </Button>
        </div>
      </Card>

      {/* 交易记录区域 (更新数据源) */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display:'flex', alignItems:'center', color: '#1D2129' }}>
            <IconClockCircle style={{marginRight: 6}}/> 交易明细
        </div>
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <Table 
              loading={loadingTransactions}
              scroll={{ x: true }}
              columns={[
                  { title: '类型', dataIndex: 'type', width: 100, render: (val) => (
                      <Tag color={val === '广告扣费' ? 'orange' : 'green'}>{val}</Tag>
                  )},
                  { title: '金额', dataIndex: 'amount', render: (val) => {
                      const num = Number(val);
                      return <span style={{color: num > 0 ? '#00B42A' : '#F53F3F', fontWeight:'bold', fontFamily: 'DIN Alternate'}}>
                          {num > 0 ? '+' : ''}{num.toFixed(2)}
                      </span>
                  }},
                  { title: '详情', dataIndex: 'description', width: 200 },
                  { title: '时间', dataIndex: 'createdAt', width: 180, render: (val) => new Date(val).toLocaleString() },
              ]}
              data={transactions} // ✨ 使用真实数据
              rowKey="id"
              pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>

      <Modal
        title="余额充值"
        visible={modalVisible}
        onOk={handleTopUp}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        style={{ width: isMobile ? '90%' : 400 }}
      >
        <div style={{ marginBottom: 12, color: '#1d2129' }}>请输入充值金额（模拟）：</div>
        <InputNumber mode="button" defaultValue={100} step={100} min={1} style={{ width: '100%' }} value={amount} onChange={setAmount} prefix="¥" size="large" />
      </Modal>
    </div>
  )
}

export default Wallet