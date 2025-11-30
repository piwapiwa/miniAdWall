import { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Space, Typography, Spin, Dropdown, Menu, 
  Modal, Message, Divider, Input, Select, Tag 
} from '@arco-design/web-react'
import { 
  IconMore, IconDelete, IconCopy, IconEdit, IconPlus, IconEye, 
  IconToTop, IconSearch, IconPlayArrow, IconPause 
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

const { Title, Text } = Typography

const AdList = () => {
  const { 
    ads, loading, fetchAds, deleteAd, createAd, updateAd, incrementClicks,
    filter, setFilter 
  } = useAdStore()
  
  const [sortBy, setSortBy] = useState<'price' | 'clicks' | 'bid'>('bid')
  
  // 表单模态框状态
  const [formVisible, setFormVisible] = useState(false)
  const [modalType, setModalType] = useState<'copy' | 'edit'>('copy')
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)

  // 视频播放模态框状态
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // 控制是否显示最终跳转按钮
  const [videoPlayFinished, setVideoPlayFinished] = useState(false);

  // 初始加载
  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // 处理搜索
  const handleSearch = (val: string) => {
    setFilter({ ...filter, search: val })
    fetchAds({ search: val })
  }

  // 处理状态筛选
  const handleStatusChange = (val: string) => {
    setFilter({ ...filter, status: val })
    fetchAds({ status: val })
  }

  // 切换广告状态 (暂停/开启)
  const toggleStatus = async (ad: Ad, e: any) => {
    e.stopPropagation()
    const newStatus = ad.status === 'Active' ? 'Paused' : 'Active'
    try {
      await updateAd(ad.id, { status: newStatus })
      Message.success(`广告已${newStatus === 'Active' ? '开启' : '暂停'}`)
      // 刷新列表以更新状态
      fetchAds()
    } catch (err) {
      Message.error('状态更新失败')
    }
  }

  // 新的竞价排名公式：价格 + (价格 * 点击量 * 0.42)
  const calculateBidScore = (ad: Ad): number => {
    const price = Number(ad.price) || 0
    const clicks = ad.clicks || 0
    return price + (price * clicks * 0.42)
  }

  // 本地排序逻辑 (针对已筛选的数据)
  const sortedAds = [...ads].sort((a, b) => {
    const priceA = Number(a.price) || 0
    const priceB = Number(b.price) || 0
    
    if (sortBy === 'price') {
      return priceB - priceA
    } else if (sortBy === 'clicks') {
      return b.clicks - a.clicks
    } else {
      return calculateBidScore(b) - calculateBidScore(a)
    }
  })

  // 处理广告卡片点击：打开视频弹窗
  const handleCardClick = (ad: Ad) => {
    if (!ad.videoUrls || ad.videoUrls.length === 0) {
      Message.warning('该广告暂无视频，直接跳转');
      window.open(ad.targetUrl, '_blank');
      incrementClicks(ad.id);
      return;
    }

    const randomIndex = Math.floor(Math.random() * ad.videoUrls.length);
    const videoUrl = ad.videoUrls[randomIndex];

    setVideoPlayFinished(false); 
    setPlayingVideoUrl(videoUrl);
    setTargetRedirectUrl(ad.targetUrl);
    setPlayingAdId(ad.id);
    setVideoModalVisible(true);
  }

  const handleVideoEnded = () => {
    if (videoRef.current) {
        videoRef.current.pause();
    }
    setVideoPlayFinished(true);
    Message.info('视频播放完毕，请点击按钮跳转');
  }
  
  const handleFinalRedirect = async () => {
    if (playingAdId && targetRedirectUrl) {
        await incrementClicks(playingAdId); 
        window.open(targetRedirectUrl, '_blank');
        setVideoModalVisible(false);
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条广告吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await deleteAd(id)
          Message.success('删除成功')
        } catch (error) {
          Message.error('删除失败')
        }
      }
    })
  }

  const handleCopy = (ad: Ad) => {
    const { id, createdAt, updatedAt, clicks, status, ...rest } = ad
    setCurrentAd(rest as Ad) 
    setModalType('copy')
    setFormVisible(true)
  }

  const handleEdit = (ad: Ad) => {
    setCurrentAd(ad)
    setModalType('edit')
    setFormVisible(true)
  }

  const handleFormSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        price: Number(values.price)
      }

      if (modalType === 'copy') {
        await createAd(payload)
        Message.success('复制并创建成功')
      } else if (modalType === 'edit' && currentAd) {
        await updateAd(currentAd.id, payload)
        Message.success('更新成功')
      }
      
      setFormVisible(false)
      fetchAds() 
    } catch (error: any) {
      console.error(error)
      const errorMsg = error.response?.data?.error || '操作失败';
      Message.error(errorMsg); 
    }
  }

  const renderDropdown = (ad: Ad) => (
    <Dropdown droplist={
      <Menu>
        <Menu.Item key="edit" onClick={(e) => { e.stopPropagation(); handleEdit(ad); }}>
          <IconEdit style={{ marginRight: 8 }} />
          编辑
        </Menu.Item>
        <Menu.Item key="copy" onClick={(e) => { e.stopPropagation(); handleCopy(ad); }}>
          <IconCopy style={{ marginRight: 8 }} />
          复制
        </Menu.Item>
        <Menu.Item key="delete" onClick={(e) => { e.stopPropagation(); handleDelete(ad.id); }}>
          <IconDelete style={{ marginRight: 8 }} />
          删除
        </Menu.Item>
      </Menu>
    }>
      <Button type="text" icon={<IconMore />} onClick={(e) => e.stopPropagation()} style={{ color: '#86909c' }} />
    </Dropdown>
  )

  const renderMediaPreview = (ad: Ad) => {
    const coverImage = ad.imageUrls && ad.imageUrls.length > 0 ? ad.imageUrls[0] : null;
    
    if (coverImage) {
      return (
        <div style={{ width: '100%', height: '180px', overflow: 'hidden', position: 'relative' }}>
          <img 
            src={coverImage} 
            alt={ad.title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transition: 'transform 0.3s',
              filter: ad.status === 'Paused' ? 'grayscale(100%)' : 'none' // 暂停时变灰
            }}
          />
          {ad.status === 'Paused' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <IconPause style={{ fontSize: 32, color: '#fff' }} />
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div style={{ 
          width: '100%', 
          height: '180px', 
          backgroundColor: '#f2f3f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#c9cdd4'
        }}>
          无封面图片
        </div>
      )
    }
  }

  if (loading && ads.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size={40} />
      </div>
    )
  }

  return (
    <div>
      <style>
        {`
          .video-player-modal .arco-modal-body {
              padding: 0 !important;
              background-color: #000;
          }
        `}
      </style>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 顶部工具栏 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(8px)',
          padding: '20px 24px',
          borderRadius: '12px', 
          border: '1px solid rgba(255,255,255,0.5)', 
          boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 4, height: 16, background: '#165DFF', borderRadius: 2, marginRight: 8 }}></div>
              <Title heading={5} style={{ margin: 0 }}>广告管理</Title>
            </div>
            
            <Button 
              type="primary" 
              icon={<IconPlus />} 
              onClick={() => {
                setCurrentAd(null);
                setModalType('copy'); 
                setFormVisible(true);
              }}
            >
              新增广告
            </Button>
          </div>
          
          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            {/* 筛选区域 */}
            <Space>
              <Input.Search 
                placeholder="搜索标题、描述或发布人" 
                style={{ width: 300 }} 
                onSearch={handleSearch}
                allowClear
                prefix={<IconSearch />}
              />
              <Select 
                placeholder="状态筛选" 
                style={{ width: 160 }} 
                defaultValue="All"
                onChange={handleStatusChange}
              >
                <Select.Option value="All">全部状态</Select.Option>
                <Select.Option value="Active">投放中 (Active)</Select.Option>
                <Select.Option value="Paused">已暂停 (Paused)</Select.Option>
              </Select>
            </Space>

            {/* 排序区域 */}
            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>排序：</Text>
              <Button.Group>
                <Button size="small" type={sortBy === 'bid' ? 'primary' : 'secondary'} onClick={() => setSortBy('bid')}>竞价</Button>
                <Button size="small" type={sortBy === 'price' ? 'primary' : 'secondary'} onClick={() => setSortBy('price')}>价格</Button>
                <Button size="small" type={sortBy === 'clicks' ? 'primary' : 'secondary'} onClick={() => setSortBy('clicks')}>热度</Button>
              </Button.Group>
            </Space>
          </div>
        </div>

        {/* 广告列表网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {sortedAds.map((ad) => (
            <Card
              key={ad.id}
              hoverable
              cover={renderMediaPreview(ad)}
              onClick={() => handleCardClick(ad)}
              style={{ 
                cursor: 'pointer', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: '8px', 
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                opacity: ad.status === 'Paused' ? 0.8 : 1
              }}
              bodyStyle={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}
              // 底部操作栏：包含状态切换和更多操作
              actions={[
                <Button 
                  key="status" 
                  type={ad.status === 'Active' ? 'text' : 'secondary'} 
                  status={ad.status === 'Active' ? 'default' : 'warning'}
                  size="small" 
                  onClick={(e) => toggleStatus(ad, e)}
                >
                  {ad.status === 'Active' ? <IconPause /> : <IconPlayArrow />}
                  {ad.status === 'Active' ? ' 暂停' : ' 开启'}
                </Button>,
                renderDropdown(ad)
              ]}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, marginRight: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 16 }}>{ad.title}</span>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal', marginTop: 4 }}>
                      发布人: {ad.author}
                    </Text>
                  </div>
                  <Tag color={ad.status === 'Active' ? 'green' : 'gray'} size="small">
                    {ad.status === 'Active' ? '投放中' : '暂停'}
                  </Tag>
                </div>
              }
            >
              <div style={{ marginTop: 'auto', borderTop: '1px solid #f7f8fa', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Space size={4}>
                    <IconEye style={{ color: '#86909c' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{ad.clicks}</Text>
                  </Space>
                  <Space align="baseline" size={2}>
                    <Text style={{ fontSize: '12px', color: '#165DFF' }}>¥</Text>
                    <Text bold style={{ fontSize: '18px', color: '#165DFF', fontFamily: 'DIN Alternate, Arial' }}>
                      {Number(ad.price).toFixed(2)}
                    </Text>
                  </Space>
                </div>
                {sortBy === 'bid' && (
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                      <Text type="success" style={{ fontSize: '12px', transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                      竞价分: {calculateBidScore(ad).toFixed(2)}
                    </Text>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Space>

      {/* 视频播放全屏弹窗 */}
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
        focusLock={true}
        className="video-player-modal"
        style={{ maxWidth: '95vw', padding: 0, backgroundColor: '#000', margin: '20px auto' }} 
      >
        <div style={{ 
          height: '70vh', 
          maxHeight: '450px', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
        }}>
          <video
            ref={videoRef}
            src={playingVideoUrl}
            autoPlay
            controls
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onEnded={handleVideoEnded}
          />

          {videoPlayFinished && (
            <Button
              type="primary"
              size="large"
              icon={<IconToTop />}
              onClick={handleFinalRedirect}
              style={{ 
                  marginTop: 20, 
                  padding: '0 30px', 
                  backgroundColor: '#165DFF', 
                  width: '90%', 
                  maxWidth: '400px' 
              }}
            >
              立即前往目标网站
            </Button>
          )}
        </div>
      </Modal>

      {/* 编辑/复制 弹窗 */}
      <Modal
        title={modalType === 'edit' ? '编辑广告' : (currentAd ? '复制广告' : '新增广告')}
        visible={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        style={{ width: 600 }}
        unmountOnExit
      >
        <DynamicForm 
          schemaId={modalType === 'edit' ? 'update-ad-form' : 'ad-form'} 
          onSubmit={handleFormSubmit}
          initialData={currentAd || {}}
        />
      </Modal>
    </div>
  )
}

export default AdList