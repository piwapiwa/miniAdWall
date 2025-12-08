import { useEffect, useRef, useState, useMemo } from 'react'
import { 
  Card, Space, Typography, Spin, Input,
  Carousel, Tabs, Button, Modal, Avatar 
} from '@arco-design/web-react'
import { 
  IconPlayCircle, IconClose, IconHeart, IconHeartFill, IconUser, IconThunderbolt 
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'

const { Title, Text } = Typography

// 🎨 配合冰川蓝主题，使用清新的浅色渐变占位符
const getRandomCoolGradient = (id: number) => {
  const gradients = [
    'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)', // 浅青
    'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', // 浅蓝
    'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)', // 浅紫
    'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', // 浅绿
  ];
  return gradients[id % gradients.length];
};

const AdGallery = () => {
  const { ads, loading, fetchAds, filter, setFilter, incrementClicks, likeAd } = useAdStore() 
  const [likedAds, setLikedAds] = useState<number[]>([]) 
  const [keyword, setKeyword] = useState('') 
  
  // 📱 移动端适配状态
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // 视频播放相关状态
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetchAds({ mine: undefined, targetUser: undefined })
    
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 🟢 核心逻辑补全：竞价排名算法
  // 规则：权重 = 出价 + (出价 * 点击数 * 0.42)
  const calculateBidScore = (ad: Ad) => {
    const price = Number(ad.price) || 0
    const clicks = ad.clicks || 0
    // 神秘系数 0.42
    return price + (price * clicks * 0.42)
  }

  // 🟢 使用 useMemo 对广告列表进行排序，避免重复计算
  const sortedAds = useMemo(() => {
    // 浅拷贝一份数据，避免修改原数组
    const list = [...ads]
    return list.sort((a, b) => {
      const scoreA = calculateBidScore(a)
      const scoreB = calculateBidScore(b)
      // 降序排列：分数高的在前面
      return scoreB - scoreA
    })
  }, [ads])

  const handleSearch = () => {
    setFilter({ ...filter, search: keyword })
    fetchAds({ search: keyword })
  }

  const handleCategoryChange = (key: string) => {
    setFilter({ ...filter, category: key })
    fetchAds({ category: key })
  }

  const handleLike = (e: any, adId: number) => {
    e.stopPropagation()
    if (likedAds.includes(adId)) return
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

  // 渲染媒体区域
  const renderMedia = (ad: Ad) => {
    const images = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
    
    const containerStyle = { 
      width: '100%', height: 220, 
      background: '#fff', 
      position: 'relative' as const, overflow: 'hidden',
      borderTopLeftRadius: 16, borderTopRightRadius: 16
    };
    
    const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block', transition: 'transform 0.5s ease' };

    const glacierOverlay = (
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px',
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 85%)',
        zIndex: 2, pointerEvents: 'none'
      }} />
    );

    if (images.length === 0) {
      return (
        <div style={{ ...containerStyle, background: getRandomCoolGradient(ad.id), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, color: 'rgba(22, 93, 255, 0.2)', fontWeight: 800, textTransform: 'uppercase' }}>
            {ad.title[0] || 'AD'}
          </div>
          {glacierOverlay} 
        </div>
      )
    }

    return (
      <div style={containerStyle} className="media-container">
        <style>{`
          .media-container:hover .card-hover-overlay { opacity: 1 !important; }
          .media-container:hover img { transform: scale(1.05); }
        `}</style>
        
        <div className="card-hover-overlay" style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.3s', zIndex: 5
        }}>
          <div style={{ background: '#165DFF', borderRadius: '50%', padding: 14, boxShadow: '0 4px 12px rgba(22,93,255,0.4)' }}>
            <IconPlayCircle style={{ fontSize: 32, color: '#fff' }} />
          </div>
        </div>

        {images.length > 1 ? (
          <Carousel style={{ width: '100%', height: '100%' }} autoPlay indicatorType="dot" trigger="hover">
            {images.map((src, index) => (
              <div key={index} style={{ width: '100%', height: '100%' }}><img src={src} style={imgStyle} /></div>
            ))}
          </Carousel>
        ) : (
          <img src={images[0]} style={imgStyle} />
        )}
        
        {glacierOverlay}
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      
      {/* 1. Hero 区域 */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: isMobile ? 24 : 40,
        padding: isMobile ? '40px 16px' : '60px 0 40px',
        background: 'linear-gradient(180deg, #F0F7FF 0%, rgba(247,248,250,0) 100%)', 
        borderRadius: '24px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, background: '#165DFF', opacity: 0.05, borderRadius: '50%', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: -50, right: -50, width: 300, height: 300, background: '#00B42A', opacity: 0.05, borderRadius: '50%', filter: 'blur(100px)' }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Title heading={1} style={{ 
            color: '#1d2129', marginBottom: 16, fontWeight: 800, 
            fontSize: isMobile ? 28 : 36, letterSpacing: -1 
          }}>
            发现无限创意灵感
          </Title>
          <Text style={{ fontSize: isMobile ? 14 : 16, color: '#86909c', display: 'block', marginBottom: isMobile ? 24 : 40 }}>
            汇聚全网优质创意，激发你的营销灵感
          </Text>
          
          <div style={{ 
            maxWidth: 600, margin: '0 auto', padding: '0 6px 0 20px', 
            display: 'flex', alignItems: 'center',
            boxShadow: '0 8px 24px rgba(22,93,255,0.08)', borderRadius: 100, background: '#fff',
            border: '1px solid #f2f3f5', height: 56
          }}>
            {!isMobile && <IconUser style={{fontSize: 20, color: '#C9CDD4', marginRight: 8}}/>}
            <Input 
              placeholder="搜索品牌、创意或关键词..." 
              style={{ flex: 1, border: 'none', height: '100%', background: 'transparent', fontSize: 15 }}
              value={keyword}
              onChange={setKeyword}
              onPressEnter={handleSearch}
            />
            <Button 
              type="primary" shape="round"
              style={{ height: 44, padding: isMobile ? '0 16px' : '0 28px', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 10px rgba(22,93,255,0.2)' }}
              onClick={handleSearch}
            >
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 分类筛选 */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '4px' }}>
        <Tabs activeTab={filter.category} onChange={handleCategoryChange} type="capsule" style={{ whiteSpace: 'nowrap' }}>
          <Tabs.TabPane key="All" title="全部" />
          <Tabs.TabPane key="科技数码" title="💻 科技数码" />
          <Tabs.TabPane key="生活日常" title="🏠 生活日常" />
          <Tabs.TabPane key="游戏娱乐" title="🎮 游戏娱乐" />
          <Tabs.TabPane key="知识分享" title="📚 知识分享" />
          <Tabs.TabPane key="其他" title="✨ 其他" />
        </Tabs>
      </div>

      {/* 3. 广告列表 (已应用 sortedAds 竞价排序) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin dot /></div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 24, paddingBottom: 40 
        }}>
          {/* 🟢 修改：渲染 sortedAds 而不是 ads */}
          {sortedAds.map(ad => (
            <Card
              key={ad.id}
              hoverable
              className="hover-card-effect"
              cover={renderMedia(ad)}
              onClick={() => handleCardClick(ad)}
              style={{ 
                borderRadius: 16, border: 'none',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F7FF 100%)',
                boxShadow: '0 4px 16px rgba(22, 93, 255, 0.08), inset 0 1px 2px #fff',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
              }}
              bodyStyle={{ padding: '16px 24px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#1D2129', lineHeight: 1.4, flex: 1, marginRight: 12, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ad.title}
                </div>
                <div style={{ color: '#165DFF', fontWeight: 800, fontSize: 18, fontFamily: 'DIN Alternate, sans-serif' }}>
                  <span style={{ fontSize: 13, marginRight: 2 }}>¥</span>{Number(ad.price).toFixed(0)}
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#86909c', marginBottom: 20, lineHeight: '22px', height: 44, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {ad.description}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(22, 93, 255, 0.08)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar size={20} style={{ backgroundColor: '#E8F3FF', color: '#165DFF', marginRight: 8 }}>{ad.author[0]}</Avatar>
                  <span style={{ fontSize: 12, color: '#86909c' }}>{ad.author}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* 可选：显示竞价分值，用于调试，或者只保留点击数 */}
                  <Space size={4} style={{ color: '#86909c', fontSize: 12 }}>
                    <IconThunderbolt /> {Math.round(calculateBidScore(ad))} {/* 显示竞价分 */}
                  </Space>
                  <div 
                    onClick={(e) => handleLike(e, ad.id)} 
                    style={{ 
                      cursor: 'pointer', 
                      color: likedAds.includes(ad.id) ? '#F53F3F' : '#C9CDD4',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    {likedAds.includes(ad.id) ? <IconHeartFill style={{fontSize: 18}} /> : <IconHeart style={{fontSize: 18}} />}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <Modal
        visible={videoModalVisible} footer={null} title={null} closable={false}
        onCancel={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }}
        autoFocus={false}
        className="video-player-modal"
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(20px)' }}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={videoRef} src={playingVideoUrl} autoPlay controls
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', outline: 'none' }}
            onEnded={async () => { if(playingAdId) try{await incrementClicks(playingAdId)}catch(e){}; window.location.href = targetRedirectUrl; }}
          />
          <div onClick={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }} style={{ marginTop: 32, width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(10px)' }}>
            <IconClose style={{ fontSize: 24 }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdGallery