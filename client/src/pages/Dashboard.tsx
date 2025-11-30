import { useEffect } from 'react'
import { Card, Grid, Statistic, Typography, Space, Spin } from '@arco-design/web-react'
// ⚠️ 修改：引入 IconFire (已验证可用)，用于热度排行
import { IconThumbUp, IconTags, IconSound, IconFire } from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'

const { Row, Col } = Grid
const { Title } = Typography

const Dashboard = () => {
  const { stats, fetchStats } = useAdStore()

  useEffect(() => {
    fetchStats()
  }, [])

  if (!stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
      <Spin tip="加载数据中..." />
    </div>
  )

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title heading={4} style={{ marginTop: 0 }}>数据看板</Title>
      
      {/* 核心指标 - 响应式 Grid */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card>
            <Statistic 
              title="总广告数" 
              value={stats.total} 
              prefix={<IconTags style={{ color: '#165DFF' }} />} 
              groupSeparator
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card>
            <Statistic 
              title="投放中" 
              value={stats.active} 
              prefix={<IconSound style={{ color: '#00B42A' }} />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card>
            <Statistic 
              title="总热度 (Clicks)" 
              value={stats.totalClicks} 
              prefix={<IconThumbUp style={{ color: '#FF7D00' }} />} 
              groupSeparator
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card>
            <Statistic 
              title="平均出价" 
              value={stats.avgPrice} 
              precision={2} 
              prefix="¥" 
              styleValue={{ color: '#165DFF' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 - 使用 IconFire */}
      <Card title={<span><IconFire style={{ marginRight: 8, color: '#FF7D00' }} /> 热度排行榜 (Top 5)</span>}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          height: '260px', 
          gap: '2%', 
          padding: '20px 0',
          overflowX: 'auto' // 保证手机端可横向滚动
        }}>
          {stats.trend.length > 0 ? stats.trend.map((item, index) => {
             const maxClicks = Math.max(...stats.trend.map(t => t.clicks)) || 1;
             const heightPercent = Math.max((item.clicks / maxClicks) * 100, 5); 
             
             return (
              <div key={index} style={{ flex: 1, minWidth: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div 
                  style={{ 
                    background: index === 0 ? 'linear-gradient(to top, #165DFF, #4080FF)' : '#E5E6EB', 
                    width: '60%', 
                    margin: '0 auto',
                    height: `${heightPercent}%`, 
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.5s',
                    position: 'relative'
                  }} 
                >
                  <div style={{ position: 'absolute', top: -25, width: '100%', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>
                    {item.clicks}
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#4E5969', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {item.title}
                </div>
              </div>
            )
          }) : <div style={{width: '100%', textAlign: 'center', color: '#999'}}>暂无数据</div>}
        </div>
      </Card>
    </Space>
  )
}

export default Dashboard