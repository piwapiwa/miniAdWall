import { useState, useEffect, useRef } from 'react' // 👈 引入 useRef
import { 
  Card, Button, Space, Typography, Spin, Modal, Message, Divider, Input, 
  Select, Tag, Checkbox, Statistic, Grid, Switch, Badge
} from '@arco-design/web-react'
import { 
  IconDelete, IconCopy, IconEdit, IconPlus, IconClose, IconPlayCircle, 
  IconThunderbolt, IconDashboard
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

const { Text } = Typography

const AdManager = () => {
  const { 
    ads, loading, fetchAds, deleteAd, createAd, updateAd, incrementClicks, // 👈 引入 incrementClicks
    filter, setFilter, stats, fetchStats, authors, fetchAuthors 
  } = useAdStore()
  
  const { role, username } = useUserStore()
  
  const [formVisible, setFormVisible] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'copy' | 'edit'>('create')
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [targetUser, setTargetUser] = useState<string>('All')

  // ⬇️⬇️⬇️ 新增：视频播放相关状态 (用于测试广告) ⬇️⬇️⬇️
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // ⬆️⬆️⬆️

  useEffect(() => {
    if (role === 'admin') {
      fetchAuthors()
      fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      fetchStats()
    } else {
      fetchAds({ mine: 'true' })
      fetchStats({ mine: 'true' })
    }
  }, [role, targetUser, fetchAds, fetchStats])

  // ... (handleStatusToggle, openForm, handleFormSubmit, handleDelete 保持不变)
  const handleStatusToggle = async (ad: Ad, checked: boolean) => {
    try {
      await updateAd(ad.id, { status: checked ? 'Active' : 'Paused' })
      Message.success(checked ? '广告已上架' : '广告已暂停')
      if (role === 'admin') fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      else fetchAds({ mine: 'true' })
    } catch (e) {
      Message.error('操作失败')
    }
  }

  const openForm = (mode: 'create' | 'copy' | 'edit', ad?: Ad) => {
  setFormMode(mode)
  let initialData: any = {}
  let isAnon = false // 默认不匿名
  
  if (mode === 'edit' && ad) {
    initialData = { ...ad }
    if (ad.author === '匿名用户') {
        isAnon = true
    } else if (ad.author.includes(' (匿名)')) { 
        // 兼容管理员看到 "真名 (匿名)" 的情况
        isAnon = true
    }
  } else if (mode === 'copy' && ad) {
    const { id, createdAt, updatedAt, clicks, status, userId, ...rest } = ad
    initialData = { ...rest }
    initialData.author = username || '未知用户'
    isAnon = false
  } else {
    initialData.author = username || '未知用户'
    isAnon = false
  }
  
  // 统一设置状态
  setCurrentAd(initialData)
  setIsAnonymous(isAnon) 
  setFormVisible(true)
}

  const handleFormSubmit = async (values: any) => {
    try {
      const payload = { ...values, price: Number(values.price), isAnonymous }
      if (formMode === 'create' || formMode === 'copy') {
        await createAd(payload)
      } else {
        await updateAd(currentAd!.id, payload)
      }
      Message.success('操作成功')
      setFormVisible(false)
      if (role === 'admin') fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      else fetchAds({ mine: 'true' })
      fetchStats({ mine: role === 'admin' ? undefined : 'true' })
    } catch (error) {
      Message.error('操作失败')
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除', content: '删除后无法恢复，是否继续？',
      onOk: async () => {
        await deleteAd(id)
        Message.success('删除成功')
        if (role === 'admin') fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
        else fetchAds({ mine: 'true' })
      }
    })
  }

  // ⬇️⬇️⬇️ 新增：点击卡片缩略图进行测试播放 ⬇️⬇️⬇️
  const handleTestClick = (ad: Ad) => {
    if (!ad.videoUrls?.length) { 
      // 如果没有视频，直接跳转
      window.location.href = ad.targetUrl; 
      return 
    }
    setPlayingVideoUrl(ad.videoUrls[Math.floor(Math.random() * ad.videoUrls.length)])
    setTargetRedirectUrl(ad.targetUrl)
    setPlayingAdId(ad.id)
    setVideoModalVisible(true)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 数据概览保持不变 */}
        {stats && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #f2f3f5', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <IconDashboard style={{ marginRight: 8, color: '#165DFF' }} /> 
                {role === 'admin' ? '全站数据概览' : '我的投放数据'}
              </div>
              <Tag color="arcoblue" bordered>{new Date().toLocaleDateString()}</Tag>
            </div>
            <Grid.Row gutter={24}>
              <Grid.Col span={6}><div style={{ background: '#F7F8FA', padding: 16, borderRadius: 8 }}><Statistic title="在投广告" value={stats.active} suffix={`/ ${stats.total}`} styleValue={{ fontWeight: 'bold' }} /></div></Grid.Col>
              <Grid.Col span={6}><div style={{ background: '#FFF7E8', padding: 16, borderRadius: 8 }}><Statistic title="总点击热度" value={stats.totalClicks} styleValue={{ color: '#FF7D00', fontWeight: 'bold' }} prefix={<IconThunderbolt />} /></div></Grid.Col>
              <Grid.Col span={6}><div style={{ background: '#F0F9FF', padding: 16, borderRadius: 8 }}><Statistic title="平均出价" value={stats.avgPrice} precision={2} prefix="¥" styleValue={{ color: '#165DFF', fontWeight: 'bold' }} /></div></Grid.Col>
              <Grid.Col span={6}><div style={{ background: '#F2F3F5', padding: 16, borderRadius: 8 }}><Statistic title="转化率 (模拟)" value={stats.totalClicks > 0 ? (stats.totalClicks * 0.12).toFixed(1) : 0} suffix="%" styleValue={{ fontWeight: 'bold' }} /></div></Grid.Col>
            </Grid.Row>
          </div>
        )}

        {/* 顶部操作栏保持不变 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 16, borderRadius: 8 }}>
          <Space>
            <Button type="primary" icon={<IconPlus />} onClick={() => openForm('create')}>发布新广告</Button>
            <Input.Search placeholder="搜索广告..." style={{ width: 240 }} onSearch={(val) => setFilter({ ...filter, search: val })} />
            <Select placeholder="状态" style={{ width: 120 }} onChange={(val) => setFilter({ ...filter, status: val })} allowClear>
              <Select.Option value="Active">投放中</Select.Option>
              <Select.Option value="Paused">已暂停</Select.Option>
            </Select>
            {role === 'admin' && (
              <Select placeholder="发布人" style={{ width: 140 }} value={targetUser} onChange={setTargetUser}>
                <Select.Option value="All">所有用户</Select.Option>
                {authors.map(u => <Select.Option key={u.username} value={u.username}>{u.username}</Select.Option>)}
              </Select>
            )}
          </Space>
        </div>

        {loading ? <div style={{textAlign: 'center', padding: 40}}><Spin/></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {ads.map(ad => (
              <Card 
                key={ad.id} 
                style={{ 
                  borderRadius: 8, 
                  border: ad.status === 'Active' ? '1px solid #165DFF' : '1px solid #e5e6eb',
                  position: 'relative',
                  opacity: ad.status === 'Active' ? 1 : 0.8
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ position: 'absolute', right: 16, top: 16 }}>
                  <Switch 
                    checked={ad.status === 'Active'} 
                    // checkedText="开启" 
                    // uncheckedText="暂停"
                    onChange={(val) => handleStatusToggle(ad, val)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  {/* ⬇️⬇️⬇️ 修复：缩略图区域改为可点击，并添加播放图标悬停效果 */}
                  <div 
                    onClick={() => handleTestClick(ad)} // 点击测试播放
                    className="manager-thumbnail"
                    style={{ 
                      width: 80, height: 80, 
                      background: '#f7f8fa', 
                      borderRadius: 4, 
                      overflow: 'hidden', 
                      flexShrink: 0, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', // 鼠标手势
                      position: 'relative'
                    }}
                  >
                    {ad.imageUrls?.[0] ? (
                      <>
                        <img src={ad.imageUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {/* 悬停时的播放按钮 */}
                        <div className="hover-play" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <IconPlayCircle style={{ color: '#fff', fontSize: 24 }} />
                        </div>
                      </>
                    ) : <span style={{color:'#ccc', fontSize: 12}}>无图</span>}
                  </div>
                  {/* 注入样式：悬停显示播放按钮 */}
                  <style>{`.manager-thumbnail:hover .hover-play { opacity: 1 !important; }`}</style>
                  
                  <div style={{ flex: 1, overflow: 'hidden' }}>
  {/* 1. 标题 */}
  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '80%' }}>
    {ad.title}
  </div>
  
  {/* 2. 发布人 (恢复显示) */}
  <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>
    发布人: {ad.author}
  </div>

  {/* 3. 价格 与 热度 (改为左对齐，热度在价格后面) */}
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <Text style={{ color: '#165DFF', fontWeight: 'bold', fontSize: 16, marginRight: 16 }}>
      ¥{Number(ad.price).toFixed(2)}
    </Text>
    
    <Badge 
      count={ad.clicks} 
      maxCount={999} 
      dotStyle={{ background: '#F53F3F' }} 
      offset={[5, -3]} // 微调偏移量，避免遮挡文字
    >
      <Tag size="small" icon={<IconThunderbolt />}>热度</Tag>
    </Badge>
  </div>
</div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button type="text" size="small" onClick={() => openForm('copy', ad)} icon={<IconCopy />}>复制</Button>
                  <Button type="text" size="small" onClick={() => openForm('edit', ad)} icon={<IconEdit />}>编辑</Button>
                  <Button type="text" size="small" status="danger" onClick={() => handleDelete(ad.id)} icon={<IconDelete />}>删除</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Space>

      {/* ⬇️⬇️⬇️ 新增：视频播放 Modal (用于测试) ⬇️⬇️⬇️ */}
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
        <style>{`.video-player-modal .arco-modal { background: transparent !important; box-shadow: none !important; padding: 0 !important; }`}</style>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={videoRef}
            src={playingVideoUrl}
            autoPlay
            controls
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 0 30px rgba(0,0,0,0.5)', outline: 'none' }}
            onEnded={async () => { 
              // 这里的逻辑和画廊页一致，用于测试跳转功能
              if(playingAdId) try{await incrementClicks(playingAdId)}catch(e){}; 
              window.location.href = targetRedirectUrl; 
            }}
          />
          <div onClick={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }} style={{ marginTop: 24, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#fff' }}>
            <IconClose />
          </div>
        </div>
      </Modal>

      {/* 表单弹窗 (复用) */}
      <Modal 
        // 动态设置标题：根据 mode 变化
        title={
          formMode === 'edit' ? '编辑广告' : 
          formMode === 'copy' ? '复制广告' : '创建广告'
        } 
        visible={formVisible} 
        onCancel={() => setFormVisible(false)} 
        footer={null} 
        unmountOnExit
        // 设置 Modal 宽度为 500px，适配常规表单大小
        style={{ width: 500 }} 
      >
        <div style={{ marginBottom: 16, textAlign: 'right' }}><Checkbox checked={isAnonymous} onChange={setIsAnonymous}>匿名发布</Checkbox></div>
        <DynamicForm 
          schemaId={formMode === 'edit' ? 'update-ad-form' : 'ad-form'} 
          onSubmit={handleFormSubmit} 
          initialData={currentAd || {}} 
          onCancel={() => setFormVisible(false)}
          okText={formMode === 'edit' ? '保存修改' : (formMode === 'copy' ? '复制并创建' : '立即发布')}
        />
      </Modal>
    </div>
  )
}

export default AdManager