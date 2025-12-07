// client/src/pages/Dashboard.tsx

import { useEffect } from 'react'
import { Card, Grid, Statistic, Typography, Space, Spin, Progress } from '@arco-design/web-react'
import { IconTags, IconSound, IconFire, IconHeartFill, IconApps } from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'

const { Row, Col } = Grid
const { Title } = Typography

const Dashboard = () => {
  const { stats, fetchStats } = useAdStore()

  useEffect(() => {
    fetchStats()
  }, [])

  if (!stats) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}><Spin tip="加载数据中..." /></div>

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', paddingBottom: 40 }}>
      <Title heading={4} style={{ marginTop: 0 }}>数据看板</Title>
      
      {/* 1. 核心指标概览 (保持不变) */}
      <Row gutter={[16, 16]}>
        <Col span={6}><Card hoverable><Statistic title="总广告数" value={stats.total} prefix={<IconTags style={{ color: '#165DFF' }} />} groupSeparator /></Card></Col>
        <Col span={6}><Card hoverable><Statistic title="投放中" value={stats.active} prefix={<IconSound style={{ color: '#00B42A' }} />} /></Card></Col>
        <Col span={6}><Card hoverable><Statistic title="总热度" value={stats.totalClicks} prefix={<IconFire style={{ color: '#FF7D00' }} />} groupSeparator /></Card></Col>
        <Col span={6}><Card hoverable><Statistic title="总获赞" value={stats.totalLikes} prefix={<IconHeartFill style={{ color: '#F53F3F' }} />} groupSeparator /></Card></Col>
      </Row>

      {/* 2. 分类分布分析 */}
      {/* 🟢 修复：这里将 IconPieChart 替换为 IconApps */}
      <Card title={<span><IconApps style={{ marginRight: 8, color: '#165DFF' }} /> 广告投放分布</span>}>
        <Row gutter={40}>
          {stats.categoryStats.length > 0 ? stats.categoryStats.map((item, index) => (
            <Col span={12} key={item.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{item.name}</span>
                <span style={{ color: '#86909c' }}>{item.value} 个</span>
              </div>
              <Progress 
                percent={Math.round((item.value / stats.total) * 100)} 
                color={['#165DFF', '#00B42A', '#FF7D00', '#F53F3F', '#722ED1'][index % 5]}
                animation
              />
            </Col>
          )) : <div style={{padding: 20, color: '#999'}}>暂无分类数据</div>}
        </Row>
      </Card>

      {/* 3. 双榜单 (保持不变) */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title={<span><IconFire style={{ marginRight: 8, color: '#FF7D00' }} /> 点击热度 Top 5</span>}>
            {stats.trend.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: index < 3 ? '#FF7D00' : '#F2F3F5', color: index < 3 ? '#fff' : '#86909c', textAlign: 'center', lineHeight: '24px', marginRight: 12, fontSize: 12, fontWeight: 'bold' }}>{index + 1}</div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </div>
                <div style={{ fontWeight: 'bold', color: '#165DFF' }}>{item.clicks}</div>
              </div>
            ))}
            {stats.trend.length === 0 && <div style={{textAlign:'center', color:'#ccc', padding: 20}}>暂无数据</div>}
          </Card>
        </Col>

        <Col span={12}>
          <Card title={<span><IconHeartFill style={{ marginRight: 8, color: '#F53F3F' }} /> 最受喜爱 Top 5</span>}>
            {stats.topLiked.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: index < 3 ? '#F53F3F' : '#F2F3F5', color: index < 3 ? '#fff' : '#86909c', textAlign: 'center', lineHeight: '24px', marginRight: 12, fontSize: 12, fontWeight: 'bold' }}>{index + 1}</div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </div>
                <div style={{ fontWeight: 'bold', color: '#F53F3F' }}>{item.likes}</div>
              </div>
            ))}
            {stats.topLiked.length === 0 && <div style={{textAlign:'center', color:'#ccc', padding: 20}}>暂无数据</div>}
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

export default Dashboard