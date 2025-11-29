import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Spin, Message, Carousel } from '@arco-design/web-react'
import { IconArrowLeft, IconHeart, IconEye } from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'

const AdDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedAd, loading, error, fetchAdById, incrementClicks } = useAdStore()
  const [activeTab, setActiveTab] = useState('images')

  useEffect(() => {
    if (id) fetchAdById(Number(id))
  }, [id, fetchAdById])

  const handleAdAction = async (url: string) => {
    if (id) {
      await incrementClicks(Number(id))
      window.open(url, '_blank')
      Message.success('跳转成功')
    }
  }

  if (loading || !selectedAd) return <div style={{ display: 'flex', height: '400px', justifyContent: 'center', alignItems: 'center' }}><Spin size={40}/></div>
  if (error) return <div style={{ textAlign: 'center', marginTop: 40, color: 'red' }}>{error}</div>

  const hasImages = selectedAd.imageUrls && selectedAd.imageUrls.length > 0;
  const hasVideos = selectedAd.videoUrls && selectedAd.videoUrls.length > 0;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* 顶部导航与标题 */}
      <div style={{ marginBottom: 24 }}>
        <Button onClick={() => navigate('/app')} icon={<IconArrowLeft />} type="text">
          返回列表
        </Button>
        {/* 标题直接放在页面上，去掉丑陋的框，居中显示，加大字号 */}
        <div style={{ textAlign: 'center', marginTop: -32, marginBottom: 20 }}>
          <Typography.Title heading={2} style={{ margin: 0, color: '#1d2129' }}>
            {selectedAd.title}
          </Typography.Title>
        </div>
      </div>

      <Card 
        style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: 'none',
          overflow: 'hidden',
          background: '#fff' // 确保卡片背景是白的
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* 媒体展示区域 */}
          {/* 背景改为浅灰，比纯黑更柔和，适合展示各类图片 */}
          <div style={{ background: '#f7f8fa', position: 'relative', height: '500px' }}>
            
            <div style={{ height: '100%', width: '100%' }}>
              {activeTab === 'images' && hasImages ? (
                <Carousel
                  style={{ width: '100%', height: '100%' }}
                  autoPlay={false}
                  indicatorType="dot"
                  showArrow="hover"
                >
                  {selectedAd.imageUrls.map((src, index) => (
                    <div key={index} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* 使用原生 img 标签，确保 object-fit 生效，保证图片完整显示不裁剪 */}
                      <img
                        src={src}
                        alt={`展示图-${index}`}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain', // 关键：确保长图宽图都能完整显示
                          display: 'block' 
                        }}
                      />
                    </div>
                  ))}
                </Carousel>
              ) : activeTab === 'videos' && hasVideos ? (
                <Carousel
                  style={{ width: '100%', height: '100%' }}
                  autoPlay={false}
                  indicatorType="line"
                  trigger="click"
                >
                  {selectedAd.videoUrls.map((src, index) => (
                    <div key={index} style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <video
                        src={src}
                        controls
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </div>
                  ))}
                </Carousel>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  暂无内容
                </div>
              )}
            </div>

            {/* 切换 Tab 的 UI - 悬浮在底部 */}
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <Space size="large" style={{ background: 'rgba(255,255,255,0.8)', padding: '4px', borderRadius: '30px', backdropFilter: 'blur(4px)' }}>
                <Button 
                  shape="round" 
                  type={activeTab === 'images' ? 'primary' : 'text'}
                  onClick={() => setActiveTab('images')}
                  disabled={!hasImages}
                >
                  图片 ({selectedAd.imageUrls?.length || 0})
                </Button>
                <Button 
                  shape="round" 
                  type={activeTab === 'videos' ? 'primary' : 'text'}
                  onClick={() => setActiveTab('videos')}
                  disabled={!hasVideos}
                >
                  视频 ({selectedAd.videoUrls?.length || 0})
                </Button>
              </Space>
            </div>
          </div>

          {/* 信息区域 */}
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '40px' }}>
                <Typography.Title heading={5} style={{ marginTop: 0 }}>广告创意描述</Typography.Title>
                <Typography.Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: '#4e5969' }}>
                  {selectedAd.description}
                </Typography.Paragraph>
              </div>
              
              <div style={{ 
                background: '#f2f3f5', 
                padding: '24px', 
                borderRadius: '12px', 
                minWidth: '280px',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#86909c' }}>当前出价</div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#165DFF', marginBottom: '24px', fontFamily: 'Arial' }}>
                  <span style={{ fontSize: '20px', marginRight: 4 }}>¥</span>
                  {Number(selectedAd.price).toFixed(2)}
                </div>
                <Button type="primary" long size="large" onClick={() => handleAdAction(selectedAd.targetUrl)} style={{ height: 48, fontSize: 16 }}>
                  立即查看详情
                </Button>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px', color: '#86909c', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><IconEye style={{ marginRight: 4 }}/> {selectedAd.clicks} 热度</span>
                  <span style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><IconHeart style={{ marginRight: 4 }}/> 收藏</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #f0f0f0', color: '#86909c', fontSize: '12px', display: 'flex', gap: 20 }}>
              <span>发布时间: {new Date(selectedAd.createdAt).toLocaleString()}</span>
              <span>最后更新: {new Date(selectedAd.updatedAt).toLocaleString()}</span>
            </div>
          </div>

        </div>
      </Card>
    </div>
  )
}

export default AdDetail