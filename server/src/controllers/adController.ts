import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// 初始化 Prisma 客户端
const prisma = new PrismaClient()

// 辅助函数：尝试解析 JSON 字符串
const safeParse = (str: string | null) => {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [str];
  } catch (e) {
    return str ? [str] : [];
  }
};

// 1. 创建广告
export const createAd = async (req: Request, res: Response) => {
  try {
    // 注意：这里我们通常不接受 status，默认就是 Active
    const { title, description, imageUrls, videoUrls, targetUrl, price, author } = req.body

    // 验证必填字段
    if (!title || !description || !targetUrl || !price || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ error: '标题、描述、图片、目标链接和价格为必填字段' })
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        author: author || '匿名用户', // 支持发布人
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]),
        videoUrls: JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : [])),
        targetUrl,
        price,
        clicks: 0,
        status: 'Active' // 默认状态
      }
    })

    res.status(201).json(ad)
  } catch (error) {
    console.error('创建广告失败:', error)
    res.status(500).json({ error: '创建广告失败' })
  }
}

// 2. 获取所有广告 (支持筛选、搜索、排序)
export const getAllAds = async (req: Request, res: Response) => {
  try {
    const { search, status, sortBy } = req.query

    // 构建查询条件
    const where: any = {}
    
    // 模糊搜索
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { author: { contains: String(search) } }
      ]
    }

    // 状态筛选
    if (status && status !== 'All') {
      where.status = String(status)
    }

    // 排序逻辑
    let orderBy: any = { createdAt: 'desc' } // 默认按创建时间倒序
    if (sortBy === 'price') orderBy = { price: 'desc' }
    if (sortBy === 'clicks') orderBy = { clicks: 'desc' }
    // 注意：如果是“竞价排名”(bid)，通常在内存中计算，或者在这里不做处理，由前端排序

    const ads = await prisma.ad.findMany({
      where,
      orderBy
    })

    // 解析 JSON 字符串
    const parsedAds = ads.map((ad: any) => ({
      ...ad,
      imageUrls: safeParse(ad.imageUrls),
      videoUrls: safeParse(ad.videoUrls)
    }))

    res.json(parsedAds)
  } catch (error) {
    console.error('获取广告列表失败:', error)
    res.status(500).json({ error: '获取广告列表失败' })
  }
}

// 3. 获取单个广告
export const getAdById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const ad = await prisma.ad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!ad) {
      return res.status(404).json({ error: '广告不存在' })
    }

    const parsedAd = {
      ...ad,
      imageUrls: safeParse(ad.imageUrls),
      videoUrls: safeParse(ad.videoUrls)
    }

    res.json(parsedAd)
  } catch (error) {
    console.error('获取广告详情失败:', error)
    res.status(500).json({ error: '获取广告详情失败' })
  }
}

// 4. 更新广告 (关键修改：加入 status 支持)
export const updateAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    // 🚀 关键修正：这里加入了 status，否则前端无法切换状态
    const { title, description, imageUrls, videoUrls, targetUrl, price, author, status } = req.body

    const existingAd = await prisma.ad.findUnique({ where: { id: parseInt(id) } })
    if (!existingAd) return res.status(404).json({ error: '广告不存在' })

    // 构建更新数据对象
    const dataToUpdate: any = {}
    
    if (title) dataToUpdate.title = title
    if (description) dataToUpdate.description = description
    if (targetUrl) dataToUpdate.targetUrl = targetUrl
    if (price) dataToUpdate.price = price
    if (author) dataToUpdate.author = author
    // 允许单独更新状态
    if (status) dataToUpdate.status = status 
    
    // 处理媒体文件
    if (imageUrls) dataToUpdate.imageUrls = JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls])
    if (videoUrls) dataToUpdate.videoUrls = JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : []))

    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    })

    res.json(updatedAd)
  } catch (error) {
    console.error('更新广告失败:', error)
    res.status(500).json({ error: '更新广告失败' })
  }
}

// 5. 删除广告 (包含文件清理)
export const deleteAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const ad = await prisma.ad.findUnique({ where: { id: parseInt(id) } })

    if (!ad) return res.status(404).json({ error: '广告不存在' })

    // --- 开始清理文件 ---
    const images = safeParse(ad.imageUrls)
    const videos = safeParse(ad.videoUrls)
    const allFiles = [...images, ...videos]

    allFiles.forEach((fileUrl: string) => {
      // 假设 url 格式为 /uploads/filename.ext
      const fileName = fileUrl.split('/').pop()
      if (fileName) {
        // 找到物理路径
        const filePath = path.join(__dirname, '../../uploads', fileName)
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath)
            console.log(`[文件清理] 已删除: ${filePath}`)
          } catch (err) {
            console.error(`[文件清理] 删除失败: ${filePath}`, err)
          }
        }
      }
    })
    // --- 清理结束 ---

    await prisma.ad.delete({ where: { id: parseInt(id) } })

    res.json({ message: '广告及关联文件删除成功' })
  } catch (error) {
    console.error('删除广告失败:', error)
    res.status(500).json({ error: '删除广告失败' })
  }
}

// 6. 增加点击量
export const incrementClicks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: { clicks: { increment: 1 } }
    })
    res.json(updatedAd)
  } catch (error) {
    console.error('增加点击量失败:', error)
    res.status(500).json({ error: '增加点击量失败' })
  }
}

// 7. (新增) 获取统计数据
export const getAdStats = async (req: Request, res: Response) => {
  try {
    const totalAds = await prisma.ad.count()
    const activeAds = await prisma.ad.count({ where: { status: 'Active' } })
    
    const aggregations = await prisma.ad.aggregate({
      _sum: { clicks: true },
      _avg: { price: true }
    })

    // 获取点击量最高的5个广告作为趋势示例
    const recentAds = await prisma.ad.findMany({
      take: 5,
      orderBy: { clicks: 'desc' }, 
      select: { title: true, clicks: true }
    })

    res.json({
      total: totalAds,
      active: activeAds,
      totalClicks: aggregations._sum.clicks || 0,
      avgPrice: aggregations._avg.price || 0,
      trend: recentAds
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({ error: '获取统计数据失败' })
  }
}