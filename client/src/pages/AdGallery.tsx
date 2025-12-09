import { useEffect, useRef, useState, useMemo } from 'react'
import { 
  Card, Space, Typography, Spin, Input,
  Carousel, Tabs, Button, Modal, Avatar, Tooltip
} from '@arco-design/web-react'
import { 
  IconPlayCircle, IconClose, IconHeart, IconHeartFill, IconUser, IconThunderbolt,
  IconCloseCircle 
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'
import { sortAdsByScore, calculateBidScore } from '../utils/adUtils'

const { Title, Text } = Typography

// 放在文件顶部 import 下方
const transparentBubbleStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.75)', // 半透明白背景
  backdropFilter: 'blur(16px) saturate(180%)', // 毛玻璃模糊效果
  WebkitBackdropFilter: 'blur(16px) saturate(180%)', //兼容 Safari
  color: '#1D2129', // 深色文字，保证阅读清晰
  borderRadius: '16px', // 大圆角
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)', // 柔和的投影增加层次感
  border: '1px solid rgba(255, 255, 255, 0.3)', // 微弱的白边框增加精致感
  padding: '10px 14px', // 增加一点内边距让气泡更饱满
  fontSize: '13px',
};

// 🎨 渐变背景生成
const getRandomCoolGradient = (id: number) => {
  const gradients = [
    'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)', 
    'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', 
    'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)', 
    'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', 
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
    // 🟢 核心修复：进入画廊页，强制重置筛选条件，且只获取 'Active' 状态的广告
    setFilter({ search: '', status: 'Active', category: 'All' })
    fetchAds({ search: '', status: 'Active', category: 'All' })
    
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 排序逻辑
  const sortedAds = useMemo(() => sortAdsByScore(ads), [ads])

  // 🟢 搜索时保持只搜 Active
  const handleSearch = () => {
    setFilter({ ...filter, search: keyword })
    fetchAds({ search: keyword, status: 'Active' }) 
  }

  // 🟢 清除搜索时保持只搜 Active
  const handleClearSearch = () => {
    setKeyword('')
    setFilter({ ...filter, search: '' })
    fetchAds({ search: '', status: 'Active' })
  }

  // 🟢 切换分类时保持只搜 Active
  const handleCategoryChange = (key: string) => {
    setFilter({ ...filter, category: key })
    fetchAds({ category: key, status: 'Active' })
  }

  const handleLike = (e: any, adId: number) => {
    e.stopPropagation()
    if (likedAds.includes(adId)) return
    likeAd(adId)
    setLikedAds([...likedAds, adId])
  }

  const handleCardClick = async (ad: Ad) => {
    // 1. 如果有视频，逻辑保持原样（弹窗播放，播放完再扣费）
    if (ad.videoUrls?.length) { 
      setPlayingVideoUrl(ad.videoUrls[Math.floor(Math.random() * ad.videoUrls.length)])
      setTargetRedirectUrl(ad.targetUrl)
      setPlayingAdId(ad.id)
      setVideoModalVisible(true)
      return 
    }

    // 2. 🟢 核心修复：针对普通图片/无媒体广告
    // 必须等待 incrementClicks 完成，确保扣费成功才跳转
    try {
      await incrementClicks(ad.id);
      // 扣费成功，进行跳转
      window.location.href = ad.targetUrl; 
    } catch (error: any) {
      // 🔴 3. 捕获余额不足错误
      if (error.response?.status === 402) {
        Modal.error({
          title: '访问失败',
          content: '该广告由于发布者余额不足，已暂停投放。',
          okText: '刷新列表',
          onOk: () => {
            // 刷新列表，移除这个已暂停的广告
            fetchAds({ search: keyword, status: 'Active', category: filter.category })
          }
        });
      } else {
        // 其他错误（如网络问题），还是允许跳转（为了不阻碍用户，或者选择提示错误）
        // 这里选择允许跳转，避免影响用户体验，或者你可以选择 Message.error('记录点击失败');
        window.location.href = ad.targetUrl;
      }
    }
  }

  const renderMedia = (ad: Ad) => {
    const images = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
    
    const containerStyle = { 
      width: '100%', height: 220, 
      background: '#fff', 
      position: 'relative' as const, overflow: 'hidden',
      borderTopLeftRadius: 16, borderTopRightRadius: 16
    };
    
    const imgStyle = { 
      width: '100%', height: '100%', 
      objectFit: 'cover' as const, 
      display: 'block', 
      transition: 'transform 0.5s ease' 
    };

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
              <div key={index} style={{ width: '100%', height: '100%' }}>
                <img src={src} style={imgStyle} loading="lazy" decoding="async" alt="" />
              </div>
            ))}
          </Carousel>
        ) : (
          <img src={images[0]} style={imgStyle} loading="lazy" decoding="async" alt="" />
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
              placeholder="搜索标题、发布人、内容" 
              style={{ flex: 1, border: 'none', height: '100%', background: 'transparent', fontSize: 15 }}
              value={keyword}
              onChange={setKeyword}
              onPressEnter={handleSearch}
            />

            {keyword && (
              <IconCloseCircle
                onClick={handleClearSearch}
                style={{ fontSize: 18, color: '#C9CDD4', marginRight: 12, cursor: 'pointer', flexShrink: 0 }}
              />
            )}

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

      {/* 3. 广告列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin dot /></div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 24, paddingBottom: 40 
        }}>
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
                {/* 标题 Tooltip */}
                <Tooltip 
                  content={ad.title}
                  color="rgba(255,255,255,0)" // 确保背景透明
                  triggerProps={{ 
                    showArrow: false,
                    popupStyle: transparentBubbleStyle // 👈 样式移到这里
                  }}
                >
                  <div style={{ 
                    fontWeight: 700, fontSize: 17, color: '#1D2129', lineHeight: 1.4, 
                    flex: 1, marginRight: 12, 
                    display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                  }}>
                    {ad.title}
                  </div>
                </Tooltip>
                
                <div style={{ color: '#165DFF', fontWeight: 800, fontSize: 18, fontFamily: 'DIN Alternate, sans-serif' }}>
                  <span style={{ fontSize: 13, marginRight: 2 }}>¥</span>{Number(ad.price).toFixed(0)}
                </div>
              </div>

              {/* 🟢 [修复点 2] 描述 Tooltip */}
              <Tooltip 
                content={ad.description}
                color="rgba(255,255,255,0)"
                triggerProps={{ 
                  showArrow: false,
                  popupStyle: transparentBubbleStyle // 👈 样式移到这里
                }}
              >
                <div style={{ 
                  fontSize: 13, color: '#86909c', marginBottom: 20, lineHeight: '22px', 
                  height: 44, overflow: 'hidden', 
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' 
                }}>
                  {ad.description}
                </div>
              </Tooltip>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(22, 93, 255, 0.08)', paddingTop: 16 }}>
                
                {/* 🟢 [修复点 3] 发布人 Tooltip */}
                <Tooltip 
                  content={ad.author}
                  color="rgba(255,255,255,0)"
                  triggerProps={{ 
                    showArrow: false,
                    popupStyle: transparentBubbleStyle // 👈 样式移到这里
                  }}
                >
                  <div style={{ 
                    display: 'flex', alignItems: 'center',
                    maxWidth: '50%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                  }}>
                    <Avatar size={20} style={{ backgroundColor: '#E8F3FF', color: '#165DFF', marginRight: 8, flexShrink: 0 }}>
                      {ad.author[0]}
                    </Avatar>
                    <span style={{ fontSize: 12, color: '#86909c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ad.author}
                    </span>
                  </div>
                </Tooltip>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Space size={4} style={{ color: '#86909c', fontSize: 12 }}>
                    <IconThunderbolt /> {Math.round(calculateBidScore(ad))}
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
      
      {/* Video Modal */}
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
            onEnded={async () => { 
              if(playingAdId) {
                try {
                    await incrementClicks(playingAdId)
                    window.location.href = targetRedirectUrl; // 成功才跳转
                } catch(e: any) {
                    if(e.response?.status === 402) {
                      setVideoModalVisible(false); // 关闭视频
                      Modal.error({
                          title: '访问失败',
                          content: '该广告已失效（发布者余额不足）。',
                          onOk: () => fetchAds({ search: keyword, status: 'Active', category: filter.category })
                      });
                    } else {
                      window.location.href = targetRedirectUrl;
                    }
                }
              }
            }}
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