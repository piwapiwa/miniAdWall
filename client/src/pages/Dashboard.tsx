import { useEffect, useMemo } from 'react'
import { Card, Grid, Typography, Space, Spin, Progress, Tooltip, Tag } from '@arco-design/web-react'
import { 
  IconTags, IconSound, IconFire, IconHeartFill, IconApps, 
  IconThunderbolt, IconUser
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'

const { Row, Col } = Grid
const { Title } = Typography

// 辅助组件：多彩统计卡片
const ColorStatCard = ({ title, value, icon, colorStart, colorEnd }: any) => (
  <div className="hover-card-effect" style={{
    background: `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`,
    borderRadius: 16, padding: '20px 24px', color: '#fff',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
    height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
      <span style={{ fontSize: 14, opacity: 0.9, fontWeight: 500 }}>{title}</span>
      <div style={{ 
        background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 32, height: 32, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
      }}>
        {icon}
      </div>
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>{value}</div>
  </div>
)

const Dashboard = () => {
  const { stats, fetchStats, ads, fetchAds } = useAdStore()

  useEffect(() => {
    fetchStats()
    fetchAds()
  }, [])

  // 🎯 核心逻辑：计算竞价排名 Top 10
  const topBiddingAds = useMemo(() => {
    if (!ads || ads.length === 0) return []
    // 竞价公式：Score = Price + (Price * Clicks * 0.42)
    const calculateScore = (ad: Ad) => {
      const price = Number(ad.price) || 0
      const clicks = ad.clicks || 0
      return price + (price * clicks * 0.42)
    }
    return [...ads]
      .map(ad => ({ ...ad, score: calculateScore(ad) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [ads])

  const maxScore = topBiddingAds.length > 0 ? topBiddingAds[0].score : 1

  // 🔄 复用渲染函数：排名列表项
  const renderRankingList = (list: typeof topBiddingAds, startIndex: number) => (
    list.map((ad, i) => {
      const index = startIndex + i;
      return (
        <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid #f9f9f9', marginBottom: 14 }}>
          {/* 排名序号 */}
          <div style={{ 
            width: 24, height: 24, 
            background: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : '#F2F3F5',
            color: index < 3 ? '#fff' : '#86909c',
            borderRadius: '4px', fontSize: 13, fontWeight: 'bold', fontFamily: 'DIN Alternate',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {index + 1}
          </div>
          
          {/* 信息主体 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1d2129', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
              {ad.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f7f8fa', padding: '2px 6px', borderRadius: 4 }}>
                <IconUser style={{ fontSize: 10, marginRight: 4, color: '#86909c' }} />
                <span style={{ fontSize: 11, color: '#86909c' }}>{ad.author}</span>
              </div>
              <span style={{ fontSize: 11, color: '#86909c', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ad.description}
              </span>
            </div>
          </div>

          {/* 数据 + Tooltip */}
          <div style={{ width: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#165DFF', fontFamily: 'DIN Alternate' }}>
              {ad.score.toFixed(0)}
            </div>
            <Tooltip 
              position="top"
              content={
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{ad.title}</div>
                  <div>💰 出价: <span style={{color:'#4ADE80'}}>¥{Number(ad.price).toFixed(2)}</span></div>
                  <div>🔥 点击: <span style={{color:'#FF7D00'}}>{ad.clicks}</span></div>
                  <div style={{ fontSize: 12, opacity: 0.7, borderTop:'1px dashed #ffffff50', marginTop:4, paddingTop:4 }}>Score = Price + Click*0.42</div>
                </div>
              }
            >
              <div style={{ width: '100%', height: 6, background: '#F2F3F5', borderRadius: 3, marginTop: 4, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${(ad.score / maxScore) * 100}%`,
                  background: 'linear-gradient(90deg, #722ED1 0%, #165DFF 100%)',
                  borderRadius: 3
                }} />
              </div>
            </Tooltip>
          </div>
        </div>
      )
    })
  )

  if (!stats) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}><Spin tip="加载数据中..." /></div>

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', paddingBottom: 40 }}>
      
      {/* 标题 */}
      <div style={{ marginBottom: 8 }}>
        <Title heading={4} style={{ margin: 0, fontWeight: 600 }}>数据看板</Title>
        <span style={{ color: '#86909c', fontSize: 13 }}>实时监控广告投放效果与趋势</span>
      </div>
      
      {/* 1. 核心指标概览 */}
      <Row gutter={[20, 20]}>
        <Col xs={12} sm={12} md={6}>
          <ColorStatCard title="总广告数" value={stats.total} icon={<IconTags />} colorStart="#4facfe" colorEnd="#00f2fe" />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <ColorStatCard title="投放中" value={stats.active} icon={<IconSound />} colorStart="#43e97b" colorEnd="#38f9d7" />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <ColorStatCard title="总热度" value={stats.totalClicks} icon={<IconFire />} colorStart="#fa709a" colorEnd="#fee140" />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <ColorStatCard title="总获赞" value={stats.totalLikes} icon={<IconHeartFill />} colorStart="#f093fb" colorEnd="#f5576c" />
        </Col>
      </Row>

      {/* 2. 中部：三个卡片并列 (广告分布 / 点击热度 / 最受喜爱) */}
      <Row gutter={20}>
        {/* 卡片1：广告投放分布 */}
        <Col xs={24} lg={8} style={{ marginBottom: 20 }}>
          <Card 
            bordered={false} className="hover-card-effect"
            style={{ borderRadius: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.02)', height: '100%' }}
            title={<span><IconApps style={{ marginRight: 8, color: '#165DFF' }} /> 广告投放分布</span>}
          >
            <div style={{ height: 320, overflowY: 'auto', paddingRight: 4 }}>
              {stats.categoryStats.length > 0 ? stats.categoryStats.map((item, index) => (
                <div key={item.name} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, color: '#4E5969' }}>{item.name}</span>
                    <span style={{ color: '#165DFF', fontWeight: 'bold' }}>{item.value} <span style={{fontSize:12, fontWeight:400, color:'#86909c'}}>个</span></span>
                  </div>
                  <Progress 
                    percent={Math.round((item.value / stats.total) * 100)} 
                    color={['#165DFF', '#00B42A', '#FF7D00', '#F53F3F', '#722ED1'][index % 5]}
                    animation strokeWidth={8} trailColor="#F2F3F5"
                  />
                </div>
              )) : <div style={{padding: 20, color: '#999'}}>暂无数据</div>}
            </div>
          </Card>
        </Col>

        {/* 卡片2：点击热度 Top 5 */}
        <Col xs={24} lg={8} style={{ marginBottom: 20 }}>
          <Card 
            bordered={false} className="hover-card-effect"
            style={{ borderRadius: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.02)', height: '100%' }}
            title={<span><IconFire style={{ marginRight: 8, color: '#FF7D00' }} /> 点击热度 Top 5</span>}
          >
            <div style={{ height: 320, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {stats.trend.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: 4, 
                      background: index < 3 ? 'rgba(255, 125, 0, 0.1)' : 'transparent', 
                      color: index < 3 ? '#FF7D00' : '#86909c', 
                      textAlign: 'center', lineHeight: '24px', marginRight: 12, 
                      fontWeight: 'bold', fontSize: 14, flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#1d2129' }}>{item.title}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#FF7D00', background: '#FFF7E8', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                    {item.clicks} 热度
                  </div>
                </div>
              ))}
              {stats.trend.length === 0 && <div style={{textAlign:'center', color:'#ccc', padding: 20}}>暂无数据</div>}
            </div>
          </Card>
        </Col>

        {/* 卡片3：最受喜爱 Top 5 */}
        <Col xs={24} lg={8} style={{ marginBottom: 20 }}>
          <Card 
            bordered={false} className="hover-card-effect"
            style={{ borderRadius: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.02)', height: '100%' }}
            title={<span><IconHeartFill style={{ marginRight: 8, color: '#F53F3F' }} /> 最受喜爱 Top 5</span>}
          >
            <div style={{ height: 320, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {stats.topLiked.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: 4, 
                      background: index < 3 ? 'rgba(245, 63, 63, 0.1)' : 'transparent', 
                      color: index < 3 ? '#F53F3F' : '#86909c', 
                      textAlign: 'center', lineHeight: '24px', marginRight: 12, 
                      fontWeight: 'bold', fontSize: 14, flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#1d2129' }}>{item.title}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F53F3F', background: '#FFF0F0', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                    {item.likes} 赞
                  </div>
                </div>
              ))}
              {stats.topLiked.length === 0 && <div style={{textAlign:'center', color:'#ccc', padding: 20}}>暂无数据</div>}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. 底部：竞价排名 Top 10 (独占一行，双列展示) */}
      <Row>
        <Col span={24}>
          <Card 
            bordered={false} className="hover-card-effect"
            style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            title={
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight: 600}}><IconThunderbolt style={{ marginRight: 8, color: '#722ED1' }} /> 竞价排名 Top 10</span>
                <Tag color="purple" bordered size="small">实时计算</Tag>
              </div>
            }
          >
            <div style={{ padding: '10px 0' }}>
              <Row gutter={60}> {/* 加大列间距，更美观 */}
                {/* 左列：1-5 名 */}
                <Col xs={24} lg={12}>
                  {topBiddingAds.length > 0 ? renderRankingList(topBiddingAds.slice(0, 5), 0) : <div style={{padding: 20, color: '#999'}}>暂无数据</div>}
                </Col>
                
                {/* 右列：6-10 名 (大屏显示) */}
                <Col xs={24} lg={12}>
                  {topBiddingAds.length > 5 && renderRankingList(topBiddingAds.slice(5, 10), 5)}
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

    </Space>
  )
}

export default Dashboard