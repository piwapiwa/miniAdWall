import { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Space, Typography, Spin, Dropdown, Menu, 
  Modal, Message, Divider, Input, Select, Tag, Checkbox, 
  Statistic, Grid
} from '@arco-design/web-react'
import { 
  IconMore, IconDelete, IconCopy, IconEdit, IconPlus, IconEye, 
  IconPause, IconUser, IconFilter
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'
import AuthModal from '../components/AuthModal'

const { Title, Text } = Typography

interface AdListProps {
  isManagePage?: boolean;
}

// 🚀 优化：字体变细，fontWeight 改为 400 (Regular)
const lightButtonStyle = {
  backgroundColor: '#E8F3FF', 
  color: '#165DFF', 
  border: 'none',
  fontWeight: 400 // 变细
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
  const [videoPlayFinished, setVideoPlayFinished] = useState(false)

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

  // const canOperate = (ad: any) => {
  //   if (!isLoggedIn()) return false;
  //   if (role === 'admin') return true;
  //   return ad.userId === userId;
  // }

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

  const calculateBidScore = (ad: Ad) => (Number(ad.price) || 0) + (Number(ad.price) * (ad.clicks || 0) * 0.42)
  const sortedAds = [...ads].sort((a, b) => {
    const pA = Number(a.price), pB = Number(b.price)
    if (sortBy === 'price') return pB - pA
    if (sortBy === 'clicks') return b.clicks - a.clicks
    return calculateBidScore(b) - calculateBidScore(a)
  })

  const renderMedia = (ad: Ad) => {
    const src = ad.imageUrls?.[0]
    return src ? (
      <div style={{ width: '100%', height: 180, overflow: 'hidden', position: 'relative' }}>
        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: ad.status === 'Paused' ? 'grayscale(100%)' : 'none' }} />
        {ad.status === 'Paused' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPause style={{ fontSize: 32, color: '#fff' }} /></div>}
      </div>
    ) : <div style={{ width: '100%', height: 180, background: '#f2f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>无封面</div>
  }

  const handleCardClick = (ad: Ad) => {
    if (!ad.videoUrls?.length) { window.open(ad.targetUrl); incrementClicks(ad.id); return }
    setPlayingVideoUrl(ad.videoUrls[Math.floor(Math.random() * ad.videoUrls.length)])
    setTargetRedirectUrl(ad.targetUrl)
    setPlayingAdId(ad.id)
    setVideoPlayFinished(false)
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
      if (type === 'edit' && ad) {
        initialData = { ...ad }
        setIsAnonymous(ad.author === '匿名用户')
      } else {
        if (ad) {
          const { id, createdAt, updatedAt, clicks, status, userId, ...rest } = ad
          initialData = { ...rest }
        }
        initialData.author = username || '未知用户'
        setIsAnonymous(false)
      }
      
      setCurrentAd(initialData)
      setFormVisible(true)
    })
  }

  // 获取排序按钮样式
  const getSortButtonStyle = (type: string) => {
    if (sortBy === type) {
      return lightButtonStyle
    }
    return {}
  }

  if (loading && ads.length === 0) return <div style={{ display: 'flex', height: 400, justifyContent: 'center', alignItems: 'center' }}><Spin size={40} /></div>

  return (
    <div>
      <style>{`
        .video-player-modal .arco-modal-body { padding: 0 !important; background-color: #000; }
        /* 强制覆盖 Input.Search 的默认按钮样式 */
        .custom-search-wrapper .arco-input-search-btn {
            background-color: #E8F3FF !important;
            color: #165DFF !important;
            border: none !important;
            font-weight: 400; /* 🚀 优化：搜索按钮字体变细 */
        }
        .custom-search-wrapper .arco-input-search-btn:hover {
            background-color: #dbe9ff !important;
        }
      `}</style>

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
            
            {/* 1. 新增广告按钮：淡蓝色 */}
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
              {/* 2. 搜索按钮：使用 CSS 类覆盖默认样式 */}
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
                {/* 3. 排序按钮：选中态为淡蓝色 */}
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
            // const hasPermission = canOperate(ad)
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
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</div>
                      <div style={{ fontSize: 12, color: '#86909c', marginTop: 4 }}>发布人: {ad.author}</div>
                    </div>
                    <Tag size="small" color={ad.status==='Active'?'green':'gray'} style={{ borderRadius: 4 }}>{ad.status==='Active'?'投放中':'暂停'}</Tag>
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

      {/* Modal 代码保持不变 */}
      <Modal visible={videoModalVisible} footer={null} title={null} closable={false} onCancel={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }} autoFocus={false} style={{ maxWidth: '95vw', padding: 0, backgroundColor: '#000' }}>
        <div style={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <video ref={videoRef} src={playingVideoUrl} autoPlay controls style={{ maxWidth: '100%', maxHeight: '80%' }} onEnded={() => setVideoPlayFinished(true)} />
          {videoPlayFinished && <Button type="primary" style={{ marginTop: 20 }} onClick={async () => { await incrementClicks(playingAdId!); window.open(targetRedirectUrl) }}>前往目标网站</Button>}
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