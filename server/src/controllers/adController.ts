// server/src/controllers/adController.ts

import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

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
export const createAd = async (req: AuthRequest, res: Response) => {
  try {
    // 🟢 增加 category
    const { title, description, imageUrls, videoUrls, targetUrl, price, isAnonymous, category } = req.body

    if (!req.user) return res.status(401).json({ error: '请先登录' })
    if (!title || !description || !targetUrl || !price || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ error: '请填写所有必填项' })
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        author: isAnonymous ? '匿名用户' : req.user.username,
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]),
        videoUrls: JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : [])),
        targetUrl,
        price,
        // 🟢 写入分类，默认为"其他"
        category: category || '其他',
        clicks: 0,
        likes: 0, // 初始点赞为 0
        status: 'Active',
        userId: req.user.id
      }
    })
    res.status(201).json(ad)
  } catch (error) {
    res.status(500).json({ error: '创建广告失败' })
  }
}

// 2. 获取广告列表 (🚀 修复：加入发布人搜索)
export const getAllAds = async (req: AuthRequest, res: Response) => {
  try {
    // 🟢 增加 category 参数
    const { search, status, sortBy, mine, targetUser, category } = req.query
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { author: { contains: String(search) } }
      ]
    }

    if (status && status !== 'All') where.status = String(status)
    
    // 🟢 增加分类筛选逻辑
    if (category && category !== 'All') {
      where.category = String(category)
    }

    if (req.user?.role === 'admin' && targetUser) {
      if (targetUser !== 'All') where.author = String(targetUser)
    } else if (mine === 'true') {
      if (!req.user) return res.status(401).json({ error: '请先登录' })
      where.userId = req.user.id
    }

    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'price') orderBy = { price: 'desc' }
    if (sortBy === 'clicks') orderBy = { clicks: 'desc' }
    // 🟢 增加按点赞排序 (可选)
    if (sortBy === 'likes') orderBy = { likes: 'desc' }

    const ads = await prisma.ad.findMany({ 
      where, 
      orderBy,
      include: { user: { select: { username: true } } }
    })

    const parsedAds = ads.map((ad: any) => {
      // 🚀 管理员特权逻辑：如果是管理员，且广告是匿名的，显示真实用户名
      let displayAuthor = ad.author;
      if (req.user?.role === 'admin' && ad.author === '匿名用户' && ad.user) {
        displayAuthor = `${ad.user.username} (匿名)`;
      }

      return {
        ...ad,
        author: displayAuthor, // 覆盖用于显示的 author 字段
        imageUrls: safeParse(ad.imageUrls),
        videoUrls: safeParse(ad.videoUrls),
        user: undefined // 清理掉 user 对象，保持返回结构整洁
      }
    })

    res.json(parsedAds)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '获取列表失败' })
  }
}

// 3. 获取单个广告 (🚀 优化：详情页管理员也能看到真名)
export const getAdById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const ad = await prisma.ad.findUnique({ 
      where: { id: parseInt(id) },
      include: { 
        user: { select: { username: true } } // 关联查询
      }
    })

    if (!ad) {
      return res.status(404).json({ error: '广告不存在' })
    }

    // 🚀 管理员特权逻辑
    let displayAuthor = ad.author;
    if (req.user?.role === 'admin' && ad.author === '匿名用户' && ad.user) {
      displayAuthor = `${ad.user.username} (匿名)`;
    }

    const parsedAd = {
      ...ad,
      author: displayAuthor,
      imageUrls: safeParse(ad.imageUrls),
      videoUrls: safeParse(ad.videoUrls),
      user: undefined
    }
    
    res.json(parsedAd)
  } catch (error) {
    res.status(500).json({ error: '获取详情失败' })
  }
}

export const updateAd = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrls, videoUrls, targetUrl, price, status, isAnonymous, category } = req.body;
    // 查询广告时，同时查询关联的 user 信息，以便获取原始作者名
    const existingAd = await prisma.ad.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: true } 
    });

    if (!existingAd) return res.status(404).json({ error: '广告不存在' });

    const isOwner = req.user && existingAd.userId === req.user.id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: '无权操作此广告' });
    }

    const dataToUpdate: any = {};
    if (title) dataToUpdate.title = title;
    if (description) dataToUpdate.description = description;
    if (targetUrl) dataToUpdate.targetUrl = targetUrl;
    if (price) dataToUpdate.price = price;
    if (status) dataToUpdate.status = status;
    if (category) dataToUpdate.category = category;

    // 发布人逻辑修正
    if (typeof isAnonymous === 'boolean') {
      if (isAnonymous) {
        // 如果设为匿名，直接改为“匿名用户”
        dataToUpdate.author = '匿名用户';
      } else {
        if (existingAd.user) {
          dataToUpdate.author = existingAd.user.username;
        } else {
        }
      }
    }

    if (imageUrls) dataToUpdate.imageUrls = JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]);
    if (videoUrls) dataToUpdate.videoUrls = JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : []));

    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    res.json(updatedAd);
  } catch (error) {
    console.error(error); // 建议加上日志打印，方便调试
    res.status(500).json({ error: '更新失败' });
  }
};

export const likeAd = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(id) },
      data: { likes: { increment: 1 } }
    });
    res.json({ success: true, likes: updatedAd.likes });
  } catch (error) {
    res.status(500).json({ error: '点赞失败' });
  }
};

export const deleteAd = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const ad = await prisma.ad.findUnique({ where: { id: parseInt(id) } });
        if (!ad)
            return res.status(404).json({ error: '广告不存在' });
        const isOwner = req.user && ad.userId === req.user.id;
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: '无权操作此广告' });
        }
        const images = safeParse(ad.imageUrls);
        const videos = safeParse(ad.videoUrls);
        const allFiles = [...images, ...videos];
        allFiles.forEach((fileUrl) => {
            const fileName = fileUrl.split('/').pop();
            if (fileName) {
                const filePath = path.join(__dirname, '../../uploads', fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    }
                    catch (e) { }
                }
            }
        });
        await prisma.ad.delete({ where: { id: parseInt(id) } });
        res.json({ message: '删除成功' });
    }
    catch (error) {
        res.status(500).json({ error: '删除失败' });
    }
};
export const incrementClicks = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.ad.update({
            where: { id: parseInt(id) },
            data: { clicks: { increment: 1 } }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: '操作失败' });
    }
};

export const getAdStats = async (req: AuthRequest, res: Response) => {
  try {
    const { mine } = req.query
    const where: any = {}
    
    if (mine === 'true' && req.user) {
      where.userId = req.user.id
    }

    const totalAds = await prisma.ad.count({ where })
    const activeWhere = { ...where, status: 'Active' }
    const activeAds = await prisma.ad.count({ where: activeWhere })

    const aggregations = await prisma.ad.aggregate({
      _sum: { clicks: true, likes: true }, // 🟢 增加 likes 统计
      _avg: { price: true },
      where
    })

    // 1. 点击热度排行
    const recentAds = await prisma.ad.findMany({
      take: 5,
      orderBy: { clicks: 'desc' },
      select: { title: true, clicks: true },
      where
    })

    // 🟢 2. 新增：点赞排行
    const topLikedAds = await prisma.ad.findMany({
      take: 5,
      orderBy: { likes: 'desc' },
      select: { title: true, likes: true },
      where
    })

    // 🟢 3. 新增：分类分布
    const categoryGroup = await prisma.ad.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      where,
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    })

    // 格式化分类数据
    const categoryDistribution = categoryGroup.map(item => ({
      name: item.category,
      value: item._count.category
    }))

    res.json({
      total: totalAds,
      active: activeAds,
      totalClicks: aggregations._sum.clicks || 0,
      totalLikes: aggregations._sum.likes || 0, // 🟢 新增
      avgPrice: aggregations._avg.price || 0,
      trend: recentAds,
      topLiked: topLikedAds,           // 🟢 新增
      categoryStats: categoryDistribution // 🟢 新增
    })
  } catch (error) {
    console.error(error) // 建议打印错误日志
    res.status(500).json({ error: '获取统计失败' })
  }
}

export const getAuthors = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ error: '无权操作' });
        const users = await prisma.user.findMany({
            select: { username: true, role: true },
            distinct: ['username']
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: '获取用户列表失败' });
    }
};