import { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Space, Typography, Spin, Modal, Message, Divider, Input, 
  Select, Tag, Checkbox, Grid, Switch, Avatar 
} from '@arco-design/web-react'
import { 
  IconDelete, IconCopy, IconEdit, IconPlus, IconClose, IconPlayCircle, 
  IconThunderbolt, IconSettings, IconSearch
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

const { Text } = Typography

// 🎨 辅助函数：生成随机渐变背景（用于没有封面的缩略图）
const getRandomGradient = (id: number) => {
  const gradients = [
    'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  ];
  return gradients[id % gradients.length];
};

const AdManager = () => {
  const { 
    ads, loading, fetchAds, deleteAd, createAd, updateAd, incrementClicks,
    filter, setFilter, stats, fetchStats, authors, fetchAuthors 
  } = useAdStore()
  
  const { role, username } = useUserStore()
  
  const [formVisible, setFormVisible] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'copy' | 'edit'>('create')
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [targetUser, setTargetUser] = useState<string>('All')

  // 📱 移动端状态
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // 视频播放相关
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('')
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('')
  const [playingAdId, setPlayingAdId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // 🟢 修复 1：进入页面时，强制重置搜索条件
    // 这样就不会把画廊页的搜索关键词带进来了
    setFilter({ search: '', status: 'All', category: 'All' })

    // 稍微延迟一点点执行 fetch，确保 store 状态已更新（虽然 zustand 是同步的，但在 effect 中这样更稳妥）
    const fetchData = async () => {
        if (role === 'admin') {
            await fetchAuthors()
            // 显式传参覆盖 store 中的值，双重保险
            await fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser, search: '' })
            await fetchStats()
        } else {
            await fetchAds({ mine: 'true', search: '' })
            await fetchStats({ mine: 'true' })
        }
    }
    fetchData()
  }, [role, targetUser]) // 移除 fetchAds 等作为依赖，防止死循环

  const handleStatusToggle = async (ad: Ad, checked: boolean) => {
    try {
      const targetStatus = checked ? 'Active' : 'Paused';
      
      // 调用更新接口
      const updatedAd = await updateAd(ad.id, { status: targetStatus });
      
      // 🟢 核心修复：检查“我想要的状态”和“后端给的状态”是否一致
      if (targetStatus === 'Active' && updatedAd.status === 'Paused') {
        // 说明后端风控拦截了，强制设为了 Paused
        Modal.warning({
          title: '上架失败',
          content: '当前账户余额不足以支付该广告的单次点击费用，无法开启投放。请充值后再试。',
          okText: '知道了'
        });
        // 刷新列表以回滚开关状态 UI
        if (role === 'admin') fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
        else fetchAds({ mine: 'true' })
        
      } else {
        // 正常情况
        Message.success(checked ? '广告已上架' : '广告已暂停')
        // 这里不需要全量刷新，本地乐观更新即可，提升体验
        // 但为了保险（因为 updateAd 已经更新了 store），这里可以不做操作或者简单刷新
      }
      
    } catch (e) {
      Message.error('操作失败')
    }
  }

  const openForm = (mode: 'create' | 'copy' | 'edit', ad?: Ad) => {
    setFormMode(mode)
    let initialData: any = {}
    let isAnon = false
    
    if (mode === 'edit' && ad) {
      initialData = { ...ad }
      // 优先使用字段判断
      if (ad.isAnonymous !== undefined) {
        isAnon = ad.isAnonymous
      } else {
        isAnon = ad.author === '匿名用户' || ad.author.includes(' (匿名)')
      }
    } else if (mode === 'copy' && ad) {
      const { id, createdAt, updatedAt, clicks, status, userId, isAnonymous, ...rest } = ad
      initialData = { ...rest }
      initialData.author = username || '未知用户'
      isAnon = false
    } else {
      initialData.author = username || '未知用户'
      isAnon = false
    }
    
    setCurrentAd(initialData)
    setIsAnonymous(isAnon) 
    setFormVisible(true)
  }

  const handleFormSubmit = async (values: any) => {
    try {
      // 1. 构造基础 Payload
      const payload = { ...values, price: Number(values.price), isAnonymous }
      
      // 🟢 2. 智能上架逻辑 (修复 Bug 核心)
      // 如果是编辑模式，且当前广告处于 Paused 状态
      if (formMode === 'edit' && currentAd?.status === 'Paused') {
          // 获取当前余额 (可以直接读取 store 的最新状态)
          const currentBalance = useUserStore.getState().balance;
          
          // 如果 余额 >= 新设定的价格，我们假设用户是想恢复上架的
          if (Number(currentBalance) >= payload.price) {
              payload.status = 'Active'; 
          }
      }

      let res; 

      if (formMode === 'create' || formMode === 'copy') {
        res = await createAd(payload)
      } else {
        if (currentAd) {
          res = await updateAd(currentAd.id, payload)
        }
      }

      // 🟢 3. 修正后的弹窗判断逻辑
      // 我们定义 "用户期望的状态" (Intended Status)
      // - 如果 payload 里显式传了 Active，期望就是 Active
      // - 如果 payload 里没传 status (undefined)，但在创建模式下，默认期望是 Active
      // - 如果是编辑模式且没传 status，默认期望是维持原状 (如果是 Paused 就 Paused，不应弹窗)
      
      let intendedStatus = payload.status;
      if (!intendedStatus && (formMode === 'create' || formMode === 'copy')) {
          intendedStatus = 'Active';
      }

      // 触发报警条件：我期望是 Active，但后端强行返回了 Paused
      if (res && res.status === 'Paused' && intendedStatus === 'Active') {
          Modal.warning({
              title: '余额不足提示',
              content: '操作已完成，但由于当前账户余额不足以支付该广告的单次点击费用，系统已将其自动暂停（或保持暂停）。请充值后手动开启。',
              okText: '知道了'
          });
      } else {
          Message.success('操作成功')
      }
      
      setFormVisible(false)
      setIsAnonymous(false)

      if (role === 'admin') {
        fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
      } else {
        fetchAds({ mine: 'true' })
      }
      fetchStats({ mine: role === 'admin' ? undefined : 'true' })

    } catch (error: any) {
      console.error(error)
      // 如果后端返回了具体的错误信息，尝试显示它
      const errorMsg = error.response?.data?.error || '操作失败，请重试'
      Message.error(errorMsg)
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      onOk: async () => {
        try {
          await deleteAd(id)
          Message.success('删除成功')
          
          // 🟢 核心修复：根据当前角色，手动刷新对应的数据
          if (role === 'admin') {
            // 管理员：刷新列表（带筛选） + 刷新全站统计
            fetchAds({ targetUser: targetUser === 'All' ? undefined : targetUser })
            fetchStats() // 管理员默认看全站
          } else {
            // 普通用户：刷新列表（只看自己） + 刷新个人统计
            fetchAds({ mine: 'true' })
            fetchStats({ mine: 'true' }) // ✨ 关键：带上 mine 参数
          }
          
        } catch (e) {
          // 错误处理已在 store 中抛出，这里虽然不用做太多，但加上 catch 更安全
          console.error(e)
        }
      }
    })
  }

  const handleTestClick = (ad: Ad) => {
    if (!ad.videoUrls?.length) { 
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
        
        {/* 1. 顶部统计概览 */}
        {stats && (
          <div style={{ 
            background: 'linear-gradient(90deg, #165DFF 0%, #4E8AFF 100%)', 
            padding: isMobile ? '20px' : '24px 32px', borderRadius: 16, 
            color: '#fff', boxShadow: '0 8px 20px rgba(22, 93, 255, 0.2)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <IconSettings style={{ marginRight: 8, opacity: 0.9 }} /> 
                {role === 'admin' ? '全站投放概览' : '我的投放概览'}
              </div>
              {!isMobile && (
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 12, backdropFilter: 'blur(4px)' }}>
                  {new Date().toLocaleDateString()}
                </div>
              )}
            </div>
            
            <Grid.Row gutter={[16, 16]}>
              {[
                { label: '在投 / 总数', val: `${stats.active} / ${stats.total}` },
                { label: '总点击热度', val: stats.totalClicks },
                { label: '平均出价', val: `¥${Number(stats.avgPrice).toFixed(2)}` },
                { label: '总获赞数', val: stats.totalLikes },
              ].map((item, idx) => (
                <Grid.Col xs={12} sm={12} md={6} key={idx}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: 12, padding: '16px', 
                    border: '1px solid rgba(255,255,255,0.15)' 
                  }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>{item.val}</div>
                  </div>
                </Grid.Col>
              ))}
            </Grid.Row>
          </div>
        )}

        {/* 2. 筛选操作栏 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          justifyContent: 'space-between', alignItems: 'center', 
          background: '#fff', padding: '16px 24px', borderRadius: 16, 
          boxShadow: '0 4px 10px rgba(0,0,0,0.02)' 
        }}>
          <Button type="primary" size="large" icon={<IconPlus />} onClick={() => openForm('create')} style={{ width: isMobile ? '100%' : 'auto', borderRadius: 8, padding: '0 24px' }}>
            发布新广告
          </Button>
          
          <Space size="medium" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Input 
              prefix={<IconSearch />} 
              placeholder="搜索广告标题..." 
              style={{ width: isMobile ? '100%' : 240, borderRadius: 8 }} 
              onChange={(val) => setFilter({ ...filter, search: val })} 
            />
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <Select placeholder="状态筛选" style={{ width: isMobile ? '100%' : 140 }} onChange={(val) => setFilter({ ...filter, status: val })} allowClear>
                <Select.Option value="Active">🟢 投放中</Select.Option>
                <Select.Option value="Paused">⚪ 已暂停</Select.Option>
              </Select>
              {role === 'admin' && (
                <Select placeholder="发布人" style={{ width: isMobile ? '100%' : 140 }} value={targetUser} onChange={setTargetUser}>
                  <Select.Option value="All">所有用户</Select.Option>
                  {authors.map(u => <Select.Option key={u.username} value={u.username}>{u.username}</Select.Option>)}
                </Select>
              )}
            </div>
          </Space>
        </div>

        {/* 3. 广告列表 */}
        {loading ? <div style={{textAlign: 'center', padding: 40}}><Spin/></div> : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: 20 
          }}>
            {ads.map(ad => (
              <Card 
                key={ad.id} 
                className="hover-card-effect"
                style={{ 
                  borderRadius: 16, border: 'none', background: '#fff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                  opacity: ad.status === 'Active' ? 1 : 0.75,
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: 20 }}
              >
                {/* 顶部状态栏 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Tag color="arcoblue" size="small" style={{ borderRadius: 4 }}>{ad.category}</Tag>
                  <Switch 
                    checked={ad.status === 'Active'} 
                    checkedText="开启" uncheckedText="暂停"
                    onChange={(val) => handleStatusToggle(ad, val)}
                    style={{ backgroundColor: ad.status === 'Active' ? '#00B42A' : undefined }}
                  />
                </div>

                {/* 内容区 */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* 左侧缩略图 */}
                  <div 
                    onClick={() => handleTestClick(ad)}
                    className="manager-thumbnail"
                    style={{ 
                      width: 72, height: 72, 
                      background: ad.imageUrls?.[0] ? '#f7f8fa' : getRandomGradient(ad.id),
                      borderRadius: 12, 
                      overflow: 'hidden', 
                      flexShrink: 0, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', position: 'relative'
                    }}
                  >
                    {ad.imageUrls?.[0] ? (
                      <>
                        <img src={ad.imageUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div className="hover-play" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <IconPlayCircle style={{ color: '#fff', fontSize: 20 }} />
                        </div>
                      </>
                    ) : (
                      <span style={{color:'#fff', fontSize: 24, fontWeight: 'bold', opacity: 0.8}}>
                        {ad.title[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* 这里不需要再写内联 style，已经移到 components.css */}
                  
                  {/* 右侧信息 */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    height: 72 
                  }}>
                    
                    {/* 上半部分：标题 + 描述 */}
                    <div>
                      <div style={{ 
                        fontSize: 16, fontWeight: 700, color: '#1d2129', 
                        lineHeight: 1.2, marginBottom: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                      }}>
                        {ad.title}
                      </div>
                      
                      <div style={{ 
                        fontSize: 13, color: '#86909c',
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {ad.description || '暂无描述'}
                      </div>
                    </div>

                    {/* 下半部分：发布者(左) + 价格热度(右) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      
                      {/* 发布者 */}
                      <div style={{ fontSize: 12, color: '#86909c', display: 'flex', alignItems: 'center' }}>
                        <Avatar size={16} style={{ backgroundColor: '#C9CDD4', marginRight: 4 }}>
                          {ad.author[0]}
                        </Avatar>
                        {ad.author}
                      </div>

                      {/* 价格与热度 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Space size={4} style={{ fontSize: 12, color: '#C9CDD4' }}>
                          <IconThunderbolt /> {ad.clicks}
                        </Space>
                        <Text style={{ color: '#165DFF', fontWeight: 'bold', fontSize: 16, lineHeight: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 'normal', marginRight: 1 }}>¥</span>
                          {Number(ad.price).toFixed(2)}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* 底部操作栏 */}
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Button type="text" size="small" style={{ color: '#4E5969' }} onClick={() => openForm('copy', ad)}>
                    <IconCopy style={{ marginRight: 4 }} /> 复制
                  </Button>
                  <div style={{ width: 1, height: 14, background: '#E5E6EB' }} />
                  <Button type="text" size="small" style={{ color: '#165DFF' }} onClick={() => openForm('edit', ad)}>
                    <IconEdit style={{ marginRight: 4 }} /> 编辑
                  </Button>
                  <div style={{ width: 1, height: 14, background: '#E5E6EB' }} />
                  <Button type="text" size="small" style={{ color: '#F53F3F' }} onClick={() => handleDelete(ad.id)}>
                    <IconDelete style={{ marginRight: 4 }} /> 删除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Space>

      {/* 视频播放弹窗 */}
      <Modal
        visible={videoModalVisible} footer={null} title={null} closable={false}
        onCancel={() => { setVideoModalVisible(false); if(videoRef.current) videoRef.current.pause(); }}
        autoFocus={false} className="video-player-modal"
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

      {/* 表单弹窗 */}
      <Modal 
        title={formMode === 'edit' ? '编辑广告' : formMode === 'copy' ? '复制广告' : '创建广告'} 
        visible={formVisible} onCancel={() => setFormVisible(false)} footer={null} unmountOnExit style={{ width: isMobile ? '90%' : 500 }} 
      >
        <div style={{ marginBottom: 16, textAlign: 'right' }}><Checkbox checked={isAnonymous} onChange={setIsAnonymous}>匿名发布</Checkbox></div>
        <DynamicForm 
          schemaId={formMode === 'edit' ? 'update-ad-form' : 'ad-form'} 
          onSubmit={handleFormSubmit} initialData={currentAd || {}} 
          onCancel={() => setFormVisible(false)}
          okText={formMode === 'edit' ? '保存修改' : (formMode === 'copy' ? '复制并创建' : '立即发布')}
        />
      </Modal>
    </div>
  )
}

export default AdManager