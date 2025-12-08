import { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Space, Typography, Spin, Dropdown, Menu, 
  Modal, Message, Divider, Input, Select, Tag, Checkbox, 
  Statistic, Grid, Carousel // ⬅️ 1. 新增 Carousel 组件
} from '@arco-design/web-react'
import { 
  IconMore, IconDelete, IconCopy, IconEdit, IconPlus, IconEye, 
  IconPause, IconUser, IconFilter, IconClose
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'
import AuthModal from '../components/AuthModal'
import { calculateBidScore } from '../utils/adUtils'

const { Title, Text } = Typography

interface AdListProps {
  isManagePage?: boolean;
}

const lightButtonStyle = {
  backgroundColor: '#E8F3FF', 
  color: '#165DFF', 
  border: 'none',
  fontWeight: 400
}

const AdList = ({ isManagePage = false }: AdListProps) => {
  const { 
    ads, loading, fetchAds, deleteAd, createAd, updateAd, incrementClicks,
    filter, setFilter, stats, fetchStats, authors, fetchAuthors
  } = useAdStore()
  
  const { isLoggedIn, username, role } = useUserStore()
  const [authVisible, setAuthVisible] = useState(false)

  const [sortBy, setSortBy] = useState<'price' | 'clicks' | 'bid'>('bid')
  const [targetUser, setTargetUser] = useState<string>('All')
  
  const [formVisible, setFormVisible] = useState(false)
  const [modalType, setModalType] = useState<'copy' | 'edit'>('copy')
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isManagePage && !isLoggedIn()) {
      Message.warning('请先登录')
      setAuthVisible(true)
      return
    }

    if (!isManagePage) {
      fetchAds({ mine: undefined, targetUser: undefined })
    } else {
      if (role === 'admin') {
        fetchAuthors()
        fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      } else {
        fetchAds({ mine: 'true' })
        fetchStats({ mine: 'true' })
      }
    }
  }, [isManagePage, isLoggedIn, role, targetUser, fetchAds, fetchStats, fetchAuthors])

  const checkAuth = (action: () => void) => {
    if (isLoggedIn()) action();
    else {
      Modal.confirm({
        title: '需要登录',
        content: '操作需登录，是否立即登录？',
        onOk: () => setAuthVisible(true)
      })
    }
  }

  const handleSearch = (val: string) => {
    setFilter({ ...filter, search: val })
    const commonParams = { search: val }
    if (isManagePage) {
      if (role === 'admin') fetchAds({ ...commonParams, targetUser: targetUser === 'All' ? undefined : targetUser })
      else fetchAds({ ...commonParams, mine: 'true' })
    } else {
      fetchAds({ ...commonParams })
    }
  }

  const handleStatusChange = (val: string) => {
    setFilter({ ...filter, status: val })
    const commonParams = { status: val }
    if (isManagePage) {
      if (role === 'admin') fetchAds({ ...commonParams, targetUser: targetUser === 'All' ? undefined : targetUser })
      else fetchAds({ ...commonParams, mine: 'true' })
    } else {
      fetchAds({ ...commonParams })
    }
  }

  const handleUserFilterChange = (val: string) => {
    setTargetUser(val)
  }

  const refreshList = () => {
    if (isManagePage) {
      if (role === 'admin') fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      else fetchAds({ mine: 'true' })
    } else {
      fetchAds({})
    }
  }

  const handleFormSubmit = async (values: any) => {
    try {
      const payload = { ...values, price: Number(values.price), isAnonymous }
      if (modalType === 'copy') {
        await createAd(payload)
        Message.success('创建成功')
      } else {
        await updateAd(currentAd!.id, payload)
        Message.success('更新成功')
      }
      setFormVisible(false)
      setIsAnonymous(false)
      refreshList()
    } catch (error: any) {
      Message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定删除吗？',
      onOk: async () => {
        try { await deleteAd(id); Message.success('删除成功'); refreshList(); }
        catch (e) { Message.error('删除失败'); }
      }
    })
  }

  const toggleStatus = (ad: Ad, e: any) => {
    e.stopPropagation()
    checkAuth(async () => {
      try {
        await updateAd(ad.id, { status: ad.status === 'Active' ? 'Paused' : 'Active' })
        Message.success('状态更新')
        refreshList()
      } catch (e) { Message.error('更新失败') }
    })
  }

  // const calculateBidScore = (ad: Ad) => (Number(ad.price) || 0) + (Number(ad.price) * (ad.clicks || 0) * 0.42)
  const sortedAds = [...ads].sort((a, b) => {
    const pA = Number(a.price), pB = Number(b.price)
    
    if (sortBy === 'price') return pB - pA
    if (sortBy === 'clicks') return b.clicks - a.clicks
    
    return calculateBidScore(b) - calculateBidScore(a)
  })

  // ⬇️ 2. 重写 renderMedia 函数：支持 contain 模式和多图轮播
  const renderMedia = (ad: Ad) => {
    const images = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
    
    // 容器样式
    const containerStyle = { 
      width: '100%', 
      height: 180, 
      backgroundColor: '#f7f8fa', // 浅灰背景，填充非图片区域
      position: 'relative' as const, 
      overflow: 'hidden',
      display: 'flex',            // 居中显示图片
      alignItems: 'center',
      justifyContent: 'center'
    };

    // 图片样式
    const imgStyle = { 
      width: '100%', 
      height: '100%', 
      objectFit: 'contain' as const, // 核心修改：完整显示，不裁切
      filter: ad.status === 'Paused' ? 'grayscale(100%)' : 'none',
      display: 'block'
    };

    // 暂停状态遮罩
    const renderPausedOverlay = () => (
      ad.status === 'Paused' && (
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'rgba(0,0,0,0.3)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <IconPause style={{ fontSize: 32, color: '#fff' }} />
        </div>
      )
    );

    // 情况A: 无图片
    if (images.length === 0) {
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', color: '#ccc' }}>
          无封面
        </div>
      );
    }

    // 情况B: 多张图片 -> 显示轮播
    if (images.length > 1) {
      return (
        <div style={containerStyle}>
          <Carousel
            style={{ width: '100%', height: '100%' }}
            autoPlay
            indicatorType="dot"
            showArrow="hover"
            trigger="hover"
          >
            {images.map((src, index) => (
              <div key={index} style={{ width: '100%', height: '100%' }}>
                <img src={src} style={imgStyle} alt={`展示图-${index}`} />
              </div>
            ))}
          </Carousel>
          {renderPausedOverlay()}
        </div>
      );
    }

    // 情况C: 单张图片
    return (
      <div style={containerStyle}>
        <img src={images[0]} style={imgStyle} alt={ad.title} />
        {renderPausedOverlay()}
      </div>
    );
  }

  const handleCardClick = (ad: Ad) => {
    if (!ad.videoUrls?.length) { 
      incrementClicks(ad.id); 
      // 保持当前页跳转逻辑
      window.location.href = ad.targetUrl; 
      return 
    }
    setPlayingVideoUrl(ad.videoUrls[Math.floor(Math.random() * ad.videoUrls.length)])
    setTargetRedirectUrl(ad.targetUrl)
    setPlayingAdId(ad.id)
    setVideoModalVisible(true)
  }

  const getPageTitle = () => {
    if (!isManagePage) return '广告列表'
    return role === 'admin' ? '广告管理' : '我的广告'
  }

  const openForm = (type: 'copy' | 'edit', ad?: Ad) => {
    checkAuth(() => {
      setModalType(type)
      
      let initialData: any = {}
      let isAnon = false // 定义临时变量

      if (type === 'edit' && ad) {
        initialData = { ...ad }
        
        // ✅ 修正逻辑：同上，优先使用字段判断
        if (ad.isAnonymous !== undefined) {
          isAnon = ad.isAnonymous
        } else {
          isAnon = ad.author === '匿名用户'
        }

      } else {
        if (ad) {
          // copy 模式逻辑...
          const { id, createdAt, updatedAt, clicks, status, userId, isAnonymous, ...rest } = ad
          initialData = { ...rest }
        }
        initialData.author = username || '未知用户'
        isAnon = false
      }
      
      setCurrentAd(initialData)
      setIsAnonymous(isAnon) // ✅ 正确设置状态
      setFormVisible(true)
    })
  }

  const getSortButtonStyle = (type: string) => {
    if (sortBy === type) {
      return lightButtonStyle
    }
    return {}
  }

  if (loading && ads.length === 0) return <div style={{ display: 'flex', height: 400, justifyContent: 'center', alignItems: 'center' }}><Spin size={40} /></div>

  return (
    <div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计看板 */}
        {isManagePage && role !== 'admin' && isLoggedIn() && stats && (
          <div style={{ 
            background: 'linear-gradient(180deg, #F2F8FF 0%, #FFFFFF 100%)', 
            padding: 24, 
            borderRadius: 16, 
            border: '1px solid #E8F3FF',
            boxShadow: '0 4px 10px rgba(0,180,42,0.05)'
          }}>
            <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#165DFF', display: 'flex', alignItems: 'center', fontSize: 16 }}>
              <IconUser style={{ marginRight: 8 }} /> 我的投放数据
            </div>
            <Grid.Row gutter={24}>
              <Grid.Col span={6}><Statistic title="发布数" value={stats.total} styleValue={{ fontWeight: 'bold', fontSize: 28 }} /></Grid.Col>
              <Grid.Col span={6}><Statistic title="总热度" value={stats.totalClicks} styleValue={{ color: '#FF7D00', fontWeight: 'bold', fontSize: 28 }} /></Grid.Col>
              <Grid.Col span={6}><Statistic title="平均出价" value={stats.avgPrice} precision={2} prefix="¥" styleValue={{ fontWeight: 'bold', fontSize: 28 }} /></Grid.Col>
              <Grid.Col span={6}><Statistic title="投放中" value={stats.active} styleValue={{ color: '#00B42A', fontWeight: 'bold', fontSize: 28 }} /></Grid.Col>
            </Grid.Row>
          </div>
        )}

        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '20px', 
          background: '#fff', padding: '24px', borderRadius: 16, 
          border: '1px solid #f2f3f5', 
          boxShadow: '0 4px 10px rgba(0,0,0,0.02)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title heading={5} style={{ margin: 0, fontWeight: 600 }}>{getPageTitle()}</Title>
            
            <Button 
              icon={<IconPlus />} 
              size='large' 
              onClick={() => openForm('copy')}
              style={lightButtonStyle}
            >
              新增广告
            </Button>
          </div>
          
          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <Space size="large">
              <Input.Search 
                className="custom-search-wrapper"
                placeholder="搜索标题、描述或发布人" 
                style={{ width: 320, borderRadius: 4 }} 
                onSearch={handleSearch}
                allowClear
                searchButton="搜索"
              />
              
              <Select 
                placeholder="状态筛选" 
                style={{ width: 160 }} 
                defaultValue="All" 
                onChange={handleStatusChange}
                triggerProps={{ autoAlignPopupWidth: false, autoAlignPopupMinWidth: true }}
                prefix={<IconFilter />}
              >
                <Select.Option value="All">全部状态</Select.Option>
                <Select.Option value="Active">投放中</Select.Option>
                <Select.Option value="Paused">已暂停</Select.Option>
              </Select>

              {isManagePage && role === 'admin' && (
                <Select 
                  placeholder="筛选用户" 
                  style={{ width: 180 }} 
                  value={targetUser} 
                  onChange={handleUserFilterChange}
                  prefix={<IconUser />}
                >
                  <Select.Option value="All">所有用户</Select.Option>
                  {authors.map(u => (
                    <Select.Option key={u.username} value={u.username}>{u.username}</Select.Option>
                  ))}
                </Select>
              )}
            </Space>

            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>排序方式：</Text>
              <Button.Group>
                <Button 
                  size="small" 
                  type={sortBy === 'bid' ? 'primary' : 'secondary'} 
                  style={getSortButtonStyle('bid')}
                  onClick={() => setSortBy('bid')}
                >
                  竞价
                </Button>
                <Button 
                  size="small" 
                  type={sortBy === 'price' ? 'primary' : 'secondary'} 
                  style={getSortButtonStyle('price')}
                  onClick={() => setSortBy('price')}
                >
                  价格
                </Button>
                <Button 
                  size="small" 
                  type={sortBy === 'clicks' ? 'primary' : 'secondary'} 
                  style={getSortButtonStyle('clicks')}
                  onClick={() => setSortBy('clicks')}
                >
                  热度
                </Button>
              </Button.Group>
            </Space>
          </div>
        </div>

        {/* 广告列表 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {sortedAds.map(ad => {
            return (
              <Card
                key={ad.id}
                hoverable
                cover={renderMedia(ad)}
                onClick={() => handleCardClick(ad)}
                style={{ 
                  cursor: 'pointer', borderRadius: 12, 
                  border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                  transition: 'transform 0.2s',
                  opacity: ad.status === 'Paused' ? 0.7 : 1
                }}
                bodyStyle={{ padding: 16 }}
                actions={isManagePage ? [
                  <Button key="st" type="text" size="small" status={ad.status==='Active'?'default':'warning'} onClick={e => toggleStatus(ad, e)}>
                    {ad.status === 'Active' ? '暂停' : '开启'}
                  </Button>,
                  <Dropdown droplist={
                    <Menu>
                      <Menu.Item key="ed" onClick={e => { e.stopPropagation(); openForm('edit', ad) }}><IconEdit/> 编辑</Menu.Item>
                      <Menu.Item key="cp" onClick={e => { e.stopPropagation(); openForm('copy', ad) }}><IconCopy/> 复制</Menu.Item>
                      <Menu.Item key="rm" onClick={e => { e.stopPropagation(); handleDelete(ad.id) }}><IconDelete/> 删除</Menu.Item>
                    </Menu>
                  }>
                    <Button type="text" icon={<IconMore />} onClick={e => e.stopPropagation()} />
                  </Dropdown>
                ] : []}
              >
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ overflow: 'hidden', flex: 1, paddingRight: 8 }}> 
                      <div style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ad.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#86909c', marginTop: 4 }}>
                        发布人: {ad.author}
                      </div>
                      
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#4E5969', 
                        marginTop: '8px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.5',
                        minHeight: '3em'
                      }}>
                        {ad.description}
                      </div>
                    </div> 

                    <Tag size="small" color={ad.status==='Active'?'green':'gray'} style={{ borderRadius: 4, flexShrink: 0 }}>
                      {ad.status==='Active'?'投放中':'暂停'}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 16, borderTop: '1px solid #f2f3f5', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Space size={4}><IconEye style={{ color: '#86909c' }} /><Text type="secondary" style={{ fontSize: 13 }}>{ad.clicks}</Text></Space>
                    <Space align="baseline" size={2}><Text style={{ fontSize: 12, color: '#165DFF' }}>¥</Text><Text bold style={{ fontSize: 20, color: '#165DFF', fontFamily: 'DIN Alternate, Arial' }}>{Number(ad.price).toFixed(2)}</Text></Space>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </Space>

      <Modal
        visible={videoModalVisible}
        footer={null}
        title={null}
        closable={false}
        onCancel={() => { 
          setVideoModalVisible(false); 
          if(videoRef.current) videoRef.current.pause(); 
        }}
        autoFocus={false}
        className="video-player-modal"
        maskStyle={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          backdropFilter: 'blur(10px)' 
        }}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%'
        }}>
          
          <video
            ref={videoRef}
            src={playingVideoUrl}
            autoPlay
            controls
            style={{ 
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              backgroundColor: 'transparent', 
              borderRadius: '16px',
              boxShadow: '0 0 30px rgba(0,0,0,0.5)',
              outline: 'none'
            }}
            onEnded={async () => {
              if (playingAdId) {
                try { await incrementClicks(playingAdId); } catch (e) {}
              }
              window.location.href = targetRedirectUrl;
            }}
          />

          <div 
            onClick={() => {
              setVideoModalVisible(false);
              if(videoRef.current) videoRef.current.pause();
            }}
            style={{
              marginTop: 24,
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              color: '#fff',
              transition: 'all 0.2s'
            }}
          >
            <IconClose style={{ fontSize: 20 }} />
          </div>

        </div>
      </Modal>

      <Modal title={modalType === 'edit' ? '编辑' : '新建'} visible={formVisible} onCancel={() => setFormVisible(false)} footer={null} unmountOnExit>
        <div style={{ marginBottom: 16, textAlign: 'right' }}><Checkbox checked={isAnonymous} onChange={setIsAnonymous}>匿名发布</Checkbox></div>
        <DynamicForm schemaId={modalType === 'edit' ? 'update-ad-form' : 'ad-form'} onSubmit={handleFormSubmit} initialData={currentAd || {}} />
      </Modal>

      <AuthModal visible={authVisible} onCancel={() => setAuthVisible(false)} onSuccess={() => setAuthVisible(false)} />
    </div>
  )
}

export default AdList