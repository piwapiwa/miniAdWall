import { useEffect, useRef, useState } from 'react'
import { 
  Card, Space, Typography, Spin, Input, Tag, 
  Carousel, Avatar, Tabs
} from '@arco-design/web-react'
import { 
  IconEye, IconPlayCircle, IconClose, IconHeart, IconHeartFill
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'
import { Modal } from '@arco-design/web-react'

const { Title } = Typography

const AdGallery = () => {
  const { ads, loading, fetchAds, filter, setFilter, incrementClicks, likeAd } = useAdStore() 
  const [likedAds, setLikedAds] = useState<number[]>([]) 
  
  // 视频播放相关状态
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // 仅获取公共广告
    fetchAds({ mine: undefined, targetUser: undefined })
  }, [])

  const handleSearch = (val: string) => {
    setFilter({ ...filter, search: val })
    fetchAds({ search: val })
  }

  const handleCategoryChange = (key: string) => {
    setFilter({ ...filter, category: key })
    fetchAds({ category: key })
  }

  const handleLike = (e: any, adId: number) => {
    e.stopPropagation() // 防止触发卡片点击跳转
    if (likedAds.includes(adId)) return // 防止重复点
    likeAd(adId)
    setLikedAds([...likedAds, adId])
  }

  const handleCardClick = (ad: Ad) => {
    if (!ad.videoUrls?.length) { 
      incrementClicks(ad.id); 
      window.location.href = ad.targetUrl; 
      return 
    }
    setPlayingVideoUrl(ad.videoUrls[Math.floor(Math.random() * ad.videoUrls.length)])
    setTargetRedirectUrl(ad.targetUrl)
    setPlayingAdId(ad.id)
    setVideoModalVisible(true)
  }

  // 纯展示用的 renderMedia
  const renderMedia = (ad: Ad) => {
    const images = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
    
    // 悬停时显示播放图标，引导用户点击
    const hoverOverlay = (
      <div className="card-hover-overlay" style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0, transition: 'opacity 0.3s', zIndex: 5
      }}>
        <IconPlayCircle style={{ fontSize: 48, color: '#fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
      </div>
    );

    const containerStyle = { 
      width: '100%', height: 220, // 预览页图片可以稍微高一点
      backgroundColor: '#f7f8fa', position: 'relative' as const, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    };
    
    const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' }; // 画廊模式可以用 cover 充满，视觉冲击力更强

    if (images.length === 0) return <div style={{...containerStyle, color: '#ccc'}}>无封面</div>

    return (
      <div style={containerStyle} className="media-container">
        <style>{`.media-container:hover .card-hover-overlay { opacity: 1 !important; }`}</style>
        {images.length > 1 ? (
          <Carousel style={{ width: '100%', height: '100%' }} autoPlay indicatorType="dot" trigger="hover">
            {images.map((src, index) => (
              <div key={index} style={{ width: '100%', height: '100%' }}><img src={src} style={imgStyle} /></div>
            ))}
          </Carousel>
        ) : (
          <img src={images[0]} style={imgStyle} />
        )}
        {hoverOverlay}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 顶部大标题栏 */}
      <div style={{ 
        textAlign: 'center', marginBottom: 40, padding: '40px 0', 
        background: 'url(https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/cd7a1a23e38248e74a8d0527393d3957.png~tplv-uwbnlip3yd-webp.webp) no-repeat center',
        backgroundSize: 'cover', borderRadius: 16
      }}>
        <Title heading={2} style={{ color: '#1d2129', marginBottom: 10 }}>发现精彩广告</Title>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <Input.Search 
            placeholder="搜索感兴趣的内容..." 
            size="large"
            searchButton 
            onSearch={handleSearch}
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      {/* 🟢 新增：分类筛选 Tabs */}
      <div style={{ marginBottom: 24 }}>
        <Tabs activeTab={filter.category} onChange={handleCategoryChange} type="capsule">
          <Tabs.TabPane key="All" title="全部" />
          <Tabs.TabPane key="科技数码" title="科技数码" />
          <Tabs.TabPane key="生活日常" title="生活日常" />
          <Tabs.TabPane key="游戏娱乐" title="游戏娱乐" />
          <Tabs.TabPane key="知识分享" title="知识分享" />
          <Tabs.TabPane key="其他" title="其他" />
        </Tabs>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}><Spin dot /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {ads.map(ad => (
            <Card
                key={ad.id}
                hoverable
                cover={renderMedia(ad)}
                onClick={() => handleCardClick(ad)}
                style={{ borderRadius: 12, overflow: 'hidden', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.3s' }}
                bodyStyle={{ padding: '16px' }}
                >
                {/* 分类标签*/}
                <div style={{ marginBottom: 8 }}>
                  <Tag color="arcoblue" size="small" bordered>{ad.category}</Tag>
                </div>
                {/* 1. 第一优先级：广告标题 (加大加粗) */}
                <div style={{ 
                    fontWeight: 700, 
                    fontSize: 18, 
                    color: '#1d2129', 
                    marginBottom: 8, 
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                }}>
                    {ad.title}
                </div>

                {/* 2. 第二优先级：发布人 (缩小，作为辅助信息) */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Avatar size={20} style={{ backgroundColor: '#165DFF', marginRight: 6 }}>
                    {ad.author[0]}
                    </Avatar>
                    <div style={{ fontSize: 13, color: '#86909c' }}>
                    {ad.author}
                    </div>
                </div>

                {/* 3. 第三优先级：内容文案 */}
                <div style={{ 
                    fontSize: 14, 
                    color: '#4E5969', 
                    marginBottom: 16, 
                    lineHeight: '22px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: 44 // 固定高度防止抖动
                }}>
                    {ad.description}
                </div>

                {/* 底部数据栏保持不变 */}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f2f3f5', paddingTop: 12 }}>
                    <Tag color="arcoblue" size="small">推广</Tag>
                    <Space size={4}>
                    <IconEye style={{ color: '#86909c' }} />
                    <span style={{ fontSize: 12, color: '#86909c' }}>{ad.clicks}</span>
                    </Space>
                    {/* 点赞按钮 */}
                    <div 
                      onClick={(e) => handleLike(e, ad.id)} 
                      style={{ 
                        cursor: 'pointer', 
                        color: likedAds.includes(ad.id) ? '#F53F3F' : '#86909c', 
                        transition: 'all 0.2s',
                        display: 'inline-block' // 保持行内显示
                      }}
                    >
                      {/* 将 onClick 从 Space 移到外层 div */}
                      <Space size={4}>
                        {likedAds.includes(ad.id) ? <IconHeartFill /> : <IconHeart />}
                        <span style={{ fontSize: 12 }}>{ad.likes}</span>
                      </Space>
                    </div>
                </div>
                </Card>
          ))}
        </div>
      )}
      
      {/* 视频播放 Modal (复用你之前的完美版本) */}
      <Modal
        visible={videoModalVisible}
        footer={null}
        title={null}
        closable={false}
        onCancel={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }}
        autoFocus={false}
        className="video-player-modal"
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)' }}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        {/* ... Modal 内容保持你之前的最新版代码 ... */}
        <style>{`.video-player-modal .arco-modal { background: transparent !important; box-shadow: none !important; padding: 0 !important; }`}</style>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={videoRef}
            src={playingVideoUrl}
            autoPlay
            controls
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 0 30px rgba(0,0,0,0.5)', outline: 'none' }}
            onEnded={async () => { if(playingAdId) try{await incrementClicks(playingAdId)}catch(e){}; window.location.href = targetRedirectUrl; }}
          />
          <div onClick={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }} style={{ marginTop: 24, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#fff' }}>
            <IconClose />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdGallery