import { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Space, Typography, Spin, Modal, Message, Divider, Input, 
  Select, Tag, Checkbox, Grid, Switch, Avatar, Tooltip
} from '@arco-design/web-react'
import { 
  IconDelete, IconCopy, IconEdit, IconPlus, IconClose, IconPlayCircle, 
  IconThunderbolt, IconSettings, IconSearch
} from '@arco-design/web-react/icon'
import { useAdStore } from '../store/adStore'
import { useUserStore } from '../store/userStore'
import { Ad } from '../types'
import DynamicForm from '../components/DynamicForm'

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

const { Text } = Typography

// 🎨 辅助函数：生成随机渐变背景
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

  const getStatsParams = () => (role === 'admin' ? undefined : { mine: 'true' });
  
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
  
  // 🟢 [核心修复] 用于拦截初始脏数据的引用标记
  // 即使组件重新渲染，ref 的值也会保持，直到我们手动修改它
  const isMounting = useRef(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    // 进入页面时，无论 Store 中残留什么状态，先尝试重置 UI 状态为 All
    setFilter({ search: '', status: 'All', category: 'All' })
    
    return () => window.removeEventListener('resize', handleResize)
  }, [setFilter]) 

  // 🟢 核心数据请求逻辑 (含强制参数纠偏)
  useEffect(() => {
    const fetchData = async () => {
      // 1. 获取当前 Store 中的状态
      // 注意：由于 setFilter 是异步的，这里可能还没变更为 'All'
      let effectiveStatus = filter.status || 'All';
      
      // 🛑 [修复核心逻辑]：挂载拦截
      // 如果处于组件刚加载阶段 (isMounting 为 true)，
      // 无论 store 里记录的是什么（比如 'Active' 残留），我们都强制认为用户想看 'All'。
      if (isMounting.current) {
           effectiveStatus = 'All';
           
           // 如果发现 store 里的状态确实不对，再次强制同步一次 store，确保 UI 下拉框显示正确
           if (filter.status !== 'All') {
               setFilter({ ...filter, status: 'All' });
           }
      }

      // 构造请求参数
      const queryParams = {
        search: filter.search || '',
        category: filter.category || 'All',
        status: effectiveStatus, // <--- 使用修正后的 status 发起请求
      };

      if (role === 'admin') {
        await fetchAuthors()
        await fetchAds({ 
          ...queryParams,
          targetUser: targetUser === 'All' ? undefined : targetUser 
        })
        await fetchStats()
      } else {
        await fetchAds({ 
          ...queryParams,
          mine: 'true' 
        })
        await fetchStats({ mine: 'true' })
      }
      
      // 请求发起后，标记挂载阶段结束
      isMounting.current = false;
    }
    
    fetchData()
  // 依赖项包含 filter 的所有属性，确保后续用户手动筛选时能正常触发
  }, [role, targetUser, filter.status, filter.search, filter.category, fetchAds, fetchStats, fetchAuthors, setFilter, filter])

  const handleStatusToggle = async (ad: Ad, checked: boolean) => {
    try {
      const targetStatus = checked ? 'Active' : 'Paused';
      const updatedAd = await updateAd(ad.id, { status: targetStatus });
      
      // 🟢 风控拦截检测
      if (targetStatus === 'Active' && updatedAd.status === 'Paused') {
        Modal.warning({
          title: '上架失败',
          content: '当前账户余额不足以支付该广告的单次点击费用，无法开启投放。请充值后再试。',
          okText: '知道了'
        });
        // 刷新列表以回滚 UI
        const refreshParams = { ...filter, status: filter.status || 'All' };
        if (role === 'admin') fetchAds({ ...refreshParams, targetUser: targetUser === 'All' ? undefined : targetUser })
        else fetchAds({ ...refreshParams, mine: 'true' })
        
      } else {
        Message.success(checked ? '广告已上架' : '广告已暂停')
        fetchStats(getStatsParams());
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
      isAnon = ad.isAnonymous ?? (ad.author === '匿名用户' || ad.author.includes(' (匿名)'))
    } else if (mode === 'copy' && ad) {
      const { id, createdAt, updatedAt, clicks, status, userId, isAnonymous, ...rest } = ad
      initialData = { ...rest }
      initialData.author = username || '未知用户'
    } else {
      initialData.author = username || '未知用户'
    }
    
    setCurrentAd(initialData)
    setIsAnonymous(isAnon) 
    setFormVisible(true)
  }

  const handleFormSubmit = async (values: any) => {
    try {
      const payload = { ...values, price: Number(values.price), isAnonymous }
      
      // 🟢 智能上架逻辑
      if (formMode === 'edit' && currentAd?.status === 'Paused') {
          const currentBalance = useUserStore.getState().balance;
          if (Number(currentBalance) >= payload.price) {
              payload.status = 'Active'; 
          }
      }

      let res; 
      if (formMode === 'create' || formMode === 'copy') {
        res = await createAd(payload)
      } else {
        if (currentAd) res = await updateAd(currentAd.id, payload)
      }

      // 🟢 状态不一致检测
      let intendedStatus = payload.status;
      if (!intendedStatus && (formMode === 'create' || formMode === 'copy')) intendedStatus = 'Active';

      if (res && res.status === 'Paused' && intendedStatus === 'Active') {
          Modal.warning({
              title: '余额不足提示',
              content: '操作已完成，但由于当前账户余额不足以支付该广告的单次点击费用，系统已将其自动暂停。请充值后手动开启。',
              okText: '知道了'
          });
      } else {
          Message.success('操作成功')
      }
      
      setFormVisible(false)
      setIsAnonymous(false)

      // 刷新列表
      const refreshParams = { ...filter, status: filter.status || 'All' };
      if (role === 'admin') {
        fetchAds({ ...refreshParams, targetUser: targetUser === 'All' ? undefined : targetUser })
      } else {
        fetchAds({ ...refreshParams, mine: 'true' })
      }
      fetchStats(getStatsParams())

    } catch (error: any) {
      console.error(error)
      const errorMsg = error.response?.data?.error || '操作失败，请重试'
      Message.error(errorMsg)

      throw error;
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
          // 使用当前实际的 filter 刷新
          const refreshParams = { ...filter, status: filter.status || 'All' };
          if (role === 'admin') {
            fetchAds({ ...refreshParams, targetUser: targetUser === 'All' ? undefined : targetUser })
            fetchStats() 
          } else {
            fetchAds({ ...refreshParams, mine: 'true' })
            fetchStats({ mine: 'true' }) 
          }
        } catch (e) {
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
              value={filter.search}
              onChange={(val) => setFilter({ ...filter, search: val })} 
            />
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <Select 
                placeholder="状态筛选" 
                style={{ width: isMobile ? '100%' : 140 }} 
                value={filter.status || 'All'} 
                onChange={(val) => setFilter({ ...filter, status: val || 'All' })} 
                allowClear
              >
                <Select.Option value="All">💠  全部状态</Select.Option>
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
                {/* 顶部状态栏 (保持不变) */}
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
                  {/* 左侧缩略图 (保持不变) */}
                  <div 
                    onClick={() => handleTestClick(ad)}
                    className="manager-thumbnail"
                    style={{ 
                      width: 72, height: 72, 
                      background: ad.imageUrls?.[0] ? '#f7f8fa' : getRandomGradient(ad.id),
                      borderRadius: 12, overflow: 'hidden', flexShrink: 0, 
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
                  
                  {/* 右侧信息 */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'hidden', 
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    height: 72 
                  }}>
                    
                    {/* 上半部分：标题 + 描述 */}
                      <div>
                        {/* 🟢 [修复点 1] 标题 Tooltip */}
                        <Tooltip 
                          content={ad.title}
                          color="rgba(255,255,255,0)" // 让默认背景透明，防止遮挡毛玻璃
                          triggerProps={{ 
                            showArrow: false,
                            popupStyle: transparentBubbleStyle // 👈 样式移到这里
                          }}
                        >
                          <div style={{ 
                            fontSize: 16, fontWeight: 700, color: '#1d2129', 
                            lineHeight: 1.2, marginBottom: 4,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: 'default' 
                          }}>
                            {ad.title}
                          </div>
                        </Tooltip>
                        
                        {/* 🟢 [修复点 2] 描述 Tooltip */}
                        <Tooltip 
                          content={ad.description || '暂无描述'}
                          color="rgba(255,255,255,0)"
                          triggerProps={{ 
                            showArrow: false,
                            popupStyle: transparentBubbleStyle // 👈 样式移到这里
                          }}
                        >
                          <div style={{ 
                            fontSize: 13, color: '#86909c',
                            lineHeight: 1.5,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: 'default'
                          }}>
                            {ad.description || '暂无描述'}
                          </div>
                        </Tooltip>
                      </div>

                      {/* 下半部分：发布者 + 价格热度 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        
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
                            fontSize: 12, color: '#86909c', display: 'flex', alignItems: 'center',
                            maxWidth: '50%', 
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: 'default'
                          }}>
                            <Avatar size={16} style={{ backgroundColor: '#C9CDD4', marginRight: 4, flexShrink: 0 }}>
                              {ad.author[0]}
                            </Avatar>
                            {ad.author}
                          </div>
                        </Tooltip>

                      {/* 价格与热度 (保持不变) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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

                {/* 底部操作栏 (保持不变) */}
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