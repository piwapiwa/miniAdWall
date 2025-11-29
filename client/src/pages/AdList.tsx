import { useState, useEffect } from 'react'
import { Card, Button, Space, Typography, Empty, Spin, Dropdown, Menu, Modal, Message } from '@arco-design/web-react'
import { IconMore, IconDelete, IconCopy, IconEdit } from '@arco-design/web-react/icon'
import { useNavigate } from 'react-router-dom'
import { useAdStore } from '../store/adStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

const { Title, Text } = Typography

const AdList = () => {
  const navigate = useNavigate()
  const { ads, loading, error, fetchAds, deleteAd, createAd, updateAd } = useAdStore()
  const [sortBy, setSortBy] = useState<'price' | 'clicks' | 'bid'>('bid')
  
  // 模态框状态管理
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'copy' | 'edit'>('copy')
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)

  // 初始加载广告数据
  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // 计算竞价排名分数
  const calculateBidScore = (ad: Ad): number => {
    const price = Number(ad.price) || 0
    return price + price * ad.clicks * 0.42
  }

  // 排序广告
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

  // 处理删除
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
    // 复制时去掉 id, createdAt, updatedAt, clicks 等字段
    const { id, createdAt, updatedAt, clicks, ...rest } = ad
    setCurrentAd(rest as Ad) 
    setModalType('copy')
    setModalVisible(true)
  }

  // 打开编辑模态框
  const handleEdit = (ad: Ad) => {
    setCurrentAd(ad)
    setModalType('edit')
    setModalVisible(true)
  }

  // 处理表单提交（复制或编辑）
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
      
      setModalVisible(false)
      fetchAds() 
    } catch (error: any) {
      console.error(error)
      const errorMsg = error.response?.data?.error || '操作失败';
      Message.error(errorMsg); 
      // ⬇️⬇️⬇️ 新增这一行：将错误抛出，阻止 DynamicForm 清空表单 ⬇️⬇️⬇️
      throw error;
    }
  }

  // 渲染媒体内容
 const renderMedia = (ad: Ad) => {
    // 优先取 imageArray 的第一个元素作为封面
    const coverImage = ad.imageUrls && ad.imageUrls.length > 0 ? ad.imageUrls[0] : null;
    
    // 如果没有图片，尝试取第一个视频
    const coverVideo = !coverImage && ad.videoUrls && ad.videoUrls.length > 0 ? ad.videoUrls[0] : null;

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
              transition: 'transform 0.3s' 
            }}
            className="ad-cover-img"
          />
          {/* 如果还有多张图或者有视频，可以在右上角加个小图标提示用户不止一张 */}
          {(ad.imageUrls.length > 1 || ad.videoUrls.length > 0) && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              多媒体
            </div>
          )}
        </div>
      )
    } else if (coverVideo) {
      return (
        <div style={{ width: '100%', height: '180px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            src={coverVideo} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            muted
            // 列表页通常不建议自动播放，防止性能问题
          />
        </div>
      )
    } else {
      return (
        <div style={{ 
          width: '100%', 
          height: '180px', 
          backgroundColor: '#f7f8fa', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#c9cdd4'
        }}>
          无媒体内容
        </div>
      )
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

  if (loading && ads.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size={40} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
        <Text type="error" style={{ marginBottom: 16 }}>{error}</Text>
        <Button type="primary" onClick={fetchAds}>重试</Button>
      </div>
    )
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 顶部工具栏 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: '#fff',
          padding: '16px 24px',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <Title heading={4} style={{ margin: 0 }}>广告列表</Title>
          <Space>
            <Text type="secondary">排序方式：</Text>
            <Button.Group>
              <Button
                type={sortBy === 'bid' ? 'primary' : 'secondary'}
                onClick={() => setSortBy('bid')}
              >
                竞价排名
              </Button>
              <Button
                type={sortBy === 'price' ? 'primary' : 'secondary'}
                onClick={() => setSortBy('price')}
              >
                价格
              </Button>
              <Button
                type={sortBy === 'clicks' ? 'primary' : 'secondary'}
                onClick={() => setSortBy('clicks')}
              >
                点击量
              </Button>
            </Button.Group>
          </Space>
        </div>

        {/* 广告列表网格 */}
        {sortedAds.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {sortedAds.map((ad) => (
              <Card
                key={ad.id}
                hoverable
                cover={renderMedia(ad)}
                onClick={() => navigate(`/app/ad/${ad.id}`)}
                style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                bodyStyle={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}
                extra={renderDropdown(ad)} // 添加右上角操作菜单
                title={ad.title}
              >
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden',
                    marginBottom: '12px',
                    height: '44px' // 固定高度防止抖动
                  }}>
                    {ad.description}
                  </Text>
                </div>
                
                <div style={{ marginTop: 'auto', borderTop: '1px solid #f2f3f5', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>点击量 {ad.clicks}</Text>
                    <Space align="baseline" size={4}>
                      <Text style={{ fontSize: '12px' }}>¥</Text>
                      <Text bold style={{ fontSize: '18px', color: '#165DFF' }}>
                        {Number(ad.price).toFixed(2)}
                      </Text>
                    </Space>
                  </div>
                  {sortBy === 'bid' && (
                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                       <Text type="success" style={{ fontSize: '12px' }}>
                        竞价分: {calculateBidScore(ad).toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', background: '#fff', borderRadius: '4px' }}>
            <Empty description="暂无广告数据，点击右上角新增广告" />
          </div>
        )}
      </Space>

      {/* 复制/编辑 弹窗 */}
      <Modal
        title={modalType === 'copy' ? '复制广告' : '编辑广告'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
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