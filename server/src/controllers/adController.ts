import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

// 初始化 Prisma 客户端
const prisma = new PrismaClient()

// 辅助函数：尝试解析 JSON 字符串，如果失败或为空则返回空数组
// 用于将数据库中存储的 JSON 字符串转回数组格式给前端
const safeParse = (str: string | null) => {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    // 确保解析出来的是数组，兼容旧数据可能存在的单字符串情况
    return Array.isArray(parsed) ? parsed : [str];
  } catch (e) {
    // 如果解析失败（比如旧数据是纯 URL 字符串），则包装成数组返回
    return str ? [str] : [];
  }
};

// 创建广告
export const createAd = async (req: Request, res: Response) => {
  try {
    const { title, description, imageUrls, videoUrls, targetUrl, price } = req.body

    // 验证必填字段：现在图片(imageUrls)是必填项，且必须有内容
    if (!title || !description || !targetUrl || !price || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ error: '标题、描述、图片、目标链接和价格为必填字段' })
    }

    // 创建广告
    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        // 将数组转换为 JSON 字符串存储到 SQLite
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]),
        videoUrls: JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : [])),
        targetUrl,
        price,
        clicks: 0
      }
    })

    res.status(201).json(ad)
  } catch (error) {
    console.error('创建广告失败:', error)
    res.status(500).json({ error: '创建广告失败' })
  }
}

// 获取所有广告
export const getAllAds = async (req: Request, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 遍历结果，将 JSON 字符串字段解析回数组
    const parsedAds = ads.map(ad => ({
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

// 获取单个广告
export const getAdById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const ad = await prisma.ad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!ad) {
      return res.status(404).json({ error: '广告不存在' })
    }

    // 解析单个广告的媒体字段
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

// 更新广告
// ↓↓↓ 修复点：这里加上了 : Request 和 : Response 类型注解
export const updateAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, imageUrls, videoUrls, targetUrl, price } = req.body

    // 检查广告是否存在
    const existingAd = await prisma.ad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingAd) {
      return res.status(404).json({ error: '广告不存在' })
    }

    // 校验图片必填
    if (!imageUrls || imageUrls.length === 0) {
       return res.status(400).json({ error: '图片不能为空' })
    }

    // 更新广告
    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]),
        videoUrls: JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : [])),
        targetUrl,
        price
      }
    })

    res.json(updatedAd)
  } catch (error) {
    console.error('更新广告失败:', error)
    res.status(500).json({ error: '更新广告失败' })
  }
}

// 删除广告
export const deleteAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existingAd = await prisma.ad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingAd) {
      return res.status(404).json({ error: '广告不存在' })
    }

    await prisma.ad.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: '广告删除成功' })
  } catch (error) {
    console.error('删除广告失败:', error)
    res.status(500).json({ error: '删除广告失败' })
  }
}

// 增加点击量
export const incrementClicks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existingAd = await prisma.ad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingAd) {
      return res.status(404).json({ error: '广告不存在' })
    }

    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: {
        clicks: { increment: 1 }
      }
    })

    res.json(updatedAd)
  } catch (error) {
    console.error('增加点击量失败:', error)
    res.status(500).json({ error: '增加点击量失败' })
  }
}