import { useState, useEffect, useRef } from 'react'
import { Card, Button, Space, Typography, Empty, Spin, Dropdown, Menu, Modal, Message, Divider } from '@arco-design/web-react'
import { IconMore, IconDelete, IconCopy, IconEdit, IconPlus, IconEye } from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

const { Title, Text } = Typography

const AdList = () => {
  const { ads, loading, fetchAds, deleteAd, createAd, updateAd, incrementClicks } = useAdStore()
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

  // 初始加载
  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // 新的竞价排名公式：价格 + (价格 * 点击量 * 0.42)
  const calculateBidScore = (ad: Ad): number => {
    const price = Number(ad.price) || 0
    const clicks = ad.clicks || 0
    return price + (price * clicks * 0.42)
  }

  // 排序逻辑
  const sortedAds = [...ads].sort((a, b) => {
    const priceA = Number(a.price) || 0
    const priceB = Number(b.price) || 0
    
    if (sortBy === 'price') {
      return priceB - priceA
    } else if (sortBy === 'clicks') {
      return b.clicks - a.clicks
    } else {
      // 默认按竞价分倒序
      return calculateBidScore(b) - calculateBidScore(a)
    }
  })

  // 处理广告卡片点击：随机播放视频 -> 播放结束 -> 跳转
  const handleCardClick = (ad: Ad) => {
    // 1. 检查是否有视频
    if (!ad.videoUrls || ad.videoUrls.length === 0) {
      Message.warning('该广告暂无视频，直接跳转');
      handleRedirect(ad.id, ad.targetUrl);
      return;
    }

    // 2. 随机选择一个视频
    const randomIndex = Math.floor(Math.random() * ad.videoUrls.length);
    const videoUrl = ad.videoUrls[randomIndex];

    // 3. 设置状态并打开模态框
    setPlayingVideoUrl(videoUrl);
    setTargetRedirectUrl(ad.targetUrl);
    setPlayingAdId(ad.id);
    setVideoModalVisible(true);
  }

  // 视频播放结束时的回调
  const handleVideoEnded = () => {
    if (playingAdId && targetRedirectUrl) {
      // 关闭弹窗并跳转
      setVideoModalVisible(false);
      handleRedirect(playingAdId, targetRedirectUrl);
    }
  }

  // 执行跳转和计数逻辑
  const handleRedirect = async (id: number, url: string) => {
    try {
      await incrementClicks(id);
      window.open(url, '_blank');
      Message.success('广告展示完成，正在跳转...');
    } catch (error) {
      console.error(error);
    }
  }

  // 删除功能
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

  // 打开复制模态框
  const handleCopy = (ad: Ad) => {
    // 复制时去掉 id 等字段
    const { id, createdAt, updatedAt, clicks, ...rest } = ad
    setCurrentAd(rest as Ad) 
    setModalType('copy')
    setFormVisible(true)
  }

  // 打开编辑模态框
  const handleEdit = (ad: Ad) => {
    setCurrentAd(ad)
    setModalType('edit')
    setFormVisible(true)
  }

  // 表单提交
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
      // 抛出错误以阻止 DynamicForm 清空表单
      throw error;
    }
  }

  // 渲染操作菜单
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
      <Button 
        type="text" 
        icon={<IconMore />} 
        onClick={(e) => e.stopPropagation()} 
        style={{ color: '#86909c' }}
      />
    </Dropdown>
  )

  // 渲染列表页的媒体预览（仅封面图）
  const renderMediaPreview = (ad: Ad) => {
    const coverImage = ad.imageUrls && ad.imageUrls.length > 0 ? ad.imageUrls[0] : null;
    
    if (coverImage) {
      return (
        <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
          <img 
            src={coverImage} 
            alt={ad.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
          />
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
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 顶部工具栏 - 重新设计 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.8)', // 微透明背景
          backdropFilter: 'blur(8px)',
          padding: '16px 24px',
          borderRadius: '12px', // 更圆润的边角
          border: '1px solid rgba(255,255,255,0.5)', // 玻璃质感边框
          boxShadow: '0 4px 10px rgba(0,0,0,0.02)' // 极淡的阴影
        }}>
          {/* 左侧：标题 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 4, height: 16, background: '#165DFF', borderRadius: 2, marginRight: 8 }}></div>
            <Title heading={5} style={{ margin: 0 }}>广告列表</Title>
          </div>
          
          {/* 右侧：功能区 */}
          <Space split={<Divider type='vertical' style={{ margin: '0 12px' }} />}>
            {/* 排序组 */}
            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>排序：</Text>
              <Button.Group>
                <Button 
                  size="small"
                  type={sortBy === 'bid' ? 'primary' : 'secondary'}
                  onClick={() => setSortBy('bid')}
                >
                  竞价
                </Button>
                <Button 
                  size="small"
                  type={sortBy === 'price' ? 'primary' : 'secondary'}
                  onClick={() => setSortBy('price')}
                >
                  价格
                </Button>
                <Button 
                  size="small"
                  type={sortBy === 'clicks' ? 'primary' : 'secondary'}
                  onClick={() => setSortBy('clicks')}
                >
                  热度
                </Button>
              </Button.Group>
            </Space>

            {/* 核心操作：新增 */}
            <Button 
              type="primary" 
              icon={<IconPlus />} 
              onClick={() => {
                setModalType('copy'); 
                setCurrentAd(null);
                setFormVisible(true);
              }}
              style={{ padding: '0 20px', fontWeight: 500 }}
            >
              新增广告
            </Button>
          </Space>
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              bodyStyle={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}
              extra={renderDropdown(ad)}
              title={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 500 }}>{ad.title}</span>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal', marginTop: 4 }}>
                    发布人: {ad.author}
                  </Text>
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
        style={{ width: '800px', backgroundColor: '#000', padding: 0 }}
      >
        <div style={{ height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '-24px' }}>
          <video
            ref={videoRef}
            src={playingVideoUrl}
            autoPlay
            controls
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onEnded={handleVideoEnded}
          />
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