import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import prisma from '../prismaClient'

// const prisma = new PrismaClient()

// Zod Schema
const createAdSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100),
  description: z.string().min(1, "描述不能为空"),
  targetUrl: z.string().url("目标链接格式不正确"),
  price: z.number().nonnegative("价格不能为负数"),
  category: z.string().optional(),
  imageUrls: z.array(z.string()).min(1, "至少上传一张图片"), 
  videoUrls: z.array(z.string()).min(1, "至少上传一个视频"),
  isAnonymous: z.boolean().optional(),
  status: z.string().optional() 
});

const safeParse = (str: string | null) => {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [str];
  } catch (e) {
    return str ? [str] : [];
  }
};

const formatAdResponse = (ad: any, userRole?: string) => {
  let displayAuthor = '未知用户';
  if (ad.user) {
    if (ad.isAnonymous) {
      if (userRole === 'admin') {
        displayAuthor = `${ad.user.username} (匿名)`;
      } else {
        displayAuthor = '匿名用户';
      }
    } else {
      displayAuthor = ad.user.username;
    }
  }
  return {
    ...ad,
    author: displayAuthor,
    imageUrls: safeParse(ad.imageUrls),
    videoUrls: safeParse(ad.videoUrls),
    user: undefined
  }
}

// 🟢 1. 创建广告 (含余额风控)
export const createAd = async (req: AuthRequest, res: Response) => {
  const data = createAdSchema.parse(req.body); 
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 初始状态逻辑：默认为 Active，但如果余额不足则强制 Paused
  let initialStatus = data.status || 'Active';
  const currentBalance = Number(user.balance);
  const adPrice = Number(data.price);

  // 如果想上架但钱不够，强制暂停
  if (initialStatus === 'Active' && currentBalance < adPrice) {
    initialStatus = 'Paused';
  }
  
  const ad = await prisma.ad.create({
    data: {
      title: data.title,
      description: data.description,
      imageUrls: JSON.stringify(data.imageUrls || []),
      videoUrls: JSON.stringify(data.videoUrls || []),
      targetUrl: data.targetUrl,
      price: data.price,
      category: data.category || '其他',
      userId: userId,
      clicks: 0,
      likes: 0,
      status: initialStatus,
      isAnonymous: data.isAnonymous || false 
    },
    include: {
      user: { select: { username: true } }
    }
  })
  
  res.status(201).json(formatAdResponse(ad, req.user?.role))
}

export const getAllAds = async (req: AuthRequest, res: Response) => {
  const { search, status, sortBy, mine, targetUser, category } = req.query
  const where: any = {}

  if (search) {
    const searchStr = String(search);
    const orConditions: any[] = [
      { title: { contains: searchStr } },
      { description: { contains: searchStr } }
    ];
    if (req.user?.role === 'admin') {
      orConditions.push({ user: { username: { contains: searchStr } } });
    } else {
      orConditions.push({
        AND: [
          { user: { username: { contains: searchStr } } },
          { isAnonymous: false } 
        ]
      });
    }
    where.OR = orConditions;
  }

  if (status && status !== 'All') where.status = String(status)
  if (category && category !== 'All') where.category = String(category)

  if (req.user?.role === 'admin' && targetUser && targetUser !== 'All') {
    where.user = { username: String(targetUser) }
  } else if (mine === 'true') {
    if (!req.user) throw new Error('请先登录');
    where.userId = req.user.id
  }

  let orderBy: any = { createdAt: 'desc' }
  if (sortBy === 'price') orderBy = { price: 'desc' }
  if (sortBy === 'clicks') orderBy = { clicks: 'desc' }
  if (sortBy === 'likes') orderBy = { likes: 'desc' }

  const ads = await prisma.ad.findMany({ 
    where, 
    orderBy,
    include: { user: { select: { username: true } } }
  })

  const parsedAds = ads.map(ad => formatAdResponse(ad, req.user?.role))
  res.json(parsedAds)
}

export const getAdById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const ad = await prisma.ad.findUnique({ 
    where: { id: parseInt(id) },
    include: { user: { select: { username: true } } }
  })

  if (!ad) return res.status(404).json({ error: '广告不存在' })
  res.json(formatAdResponse(ad, req.user?.role))
}

// 🟢 2. 更新广告 (含余额风控)
export const updateAd = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { title, description, imageUrls, videoUrls, targetUrl, price, category, status, isAnonymous } = req.body;

  const existingAd = await prisma.ad.findUnique({ where: { id: parseInt(id) } });
  if (!existingAd) return res.status(404).json({ error: '广告不存在' });

  const isOwner = req.user && existingAd.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '无权操作' });
  }

  const dataToUpdate: any = {};
  if (title) dataToUpdate.title = title;
  if (description) dataToUpdate.description = description;
  if (targetUrl) dataToUpdate.targetUrl = targetUrl;
  if (price !== undefined) dataToUpdate.price = Number(price);
  if (category) dataToUpdate.category = category;
  if (status) dataToUpdate.status = status;
  if (isAnonymous !== undefined) dataToUpdate.isAnonymous = isAnonymous;

  if (imageUrls) dataToUpdate.imageUrls = JSON.stringify(imageUrls);
  if (videoUrls) dataToUpdate.videoUrls = JSON.stringify(videoUrls);

  // 余额风控：如果最终状态是 Active，检查余额是否足够
  const finalStatus = dataToUpdate.status !== undefined ? dataToUpdate.status : existingAd.status;
  const finalPrice = dataToUpdate.price !== undefined ? dataToUpdate.price : Number(existingAd.price);

  if (finalStatus === 'Active') {
      // 只有当有明确的 userId 时才检查 (防止数据异常)
      if (existingAd.userId) {
          const user = await prisma.user.findUnique({ where: { id: existingAd.userId } });
          if (user) {
              const balance = Number(user.balance);
              if (balance < finalPrice) {
                  dataToUpdate.status = 'Paused'; // 强制暂停
              }
          }
      }
  }

  const updatedAd = await prisma.ad.update({
    where: { id: parseInt(id) },
    data: dataToUpdate,
    include: {
      user: { select: { username: true } }
    }
  });

  res.json(formatAdResponse(updatedAd, req.user?.role));
}

export const deleteAd = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const ad = await prisma.ad.findUnique({ where: { id: parseInt(id) } });
    if (!ad) return res.status(404).json({ error: '广告不存在' });
    
    const isOwner = req.user && ad.userId === req.user.id;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: '无权操作' });

    const images = safeParse(ad.imageUrls);
    const videos = safeParse(ad.videoUrls);
    [...images, ...videos].forEach((fileUrl: string) => {
        const fileName = fileUrl.split('/').pop();
        if (fileName) {
            const filePath = path.join(__dirname, '../../uploads', fileName);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch(e) {}
            }
        }
    });

    await prisma.ad.delete({ where: { id: parseInt(id) } });
    res.json({ message: '删除成功' });
}

// 🟢 3. 点击扣费 (含实时风控)
export const incrementClicks = async (req: AuthRequest, res: Response) => {
    const adId = parseInt(req.params.id);

    try {
        const result = await prisma.$transaction(async (tx) => {
            // A. 获取广告
            const ad = await tx.ad.findUnique({ 
                where: { id: adId },
                include: { user: true }
            });

            if (!ad) throw new Error("广告不存在");
            
            // 匿名/无主广告不扣费
            if (!ad.userId || !ad.user) {
                return await tx.ad.update({
                    where: { id: adId },
                    data: { clicks: { increment: 1 } }
                });
            }

            // B. 扣费前检查当前广告
            const currentBalance = Number(ad.user.balance);
            const clickPrice = Number(ad.price);

            if (currentBalance < clickPrice) {
                // 余额不足以支付本次，暂停并报错
                await tx.ad.update({ where: { id: adId }, data: { status: 'Paused' } });
                throw new Error("INSUFFICIENT_FUNDS");
            }

            // C. 扣费 & 记录点击
            const updatedUser = await tx.user.update({
                where: { id: ad.userId },
                data: { balance: { decrement: ad.price } }
            });

            // 记录流水
            await tx.transaction.create({
                data: {
                    userId: ad.userId,
                    amount: -Number(ad.price),
                    type: '广告扣费',
                    description: `广告被点击: ${ad.title}`
                }
            });

            const updatedAd = await tx.ad.update({
                where: { id: adId },
                data: { clicks: { increment: 1 } }
            });

            // D. 扣费后批量风控：暂停所有单价 > 剩余余额的广告
            const remainingBalance = Number(updatedUser.balance);
            
            await tx.ad.updateMany({
                where: {
                    userId: ad.userId,
                    status: 'Active',
                    price: { gt: remainingBalance }
                },
                data: {
                    status: 'Paused'
                }
            });

            return updatedAd;
        });

        res.json(result);

    } catch (error: any) {
        if (error.message === "INSUFFICIENT_FUNDS") {
            return res.status(402).json({ error: '广告主余额不足，广告已自动暂停' });
        }
        console.error('增加点击量失败:', error);
        res.status(500).json({ error: '系统繁忙' });
    }
}

export const topUpUser = async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: '无权操作' });
    }
    const { userId, amount } = req.body;
    try {
        const user = await prisma.$transaction(async (tx) => {
            const u = await tx.user.update({
                where: { id: Number(userId) },
                data: { balance: { increment: Number(amount) } }
            });
            await tx.transaction.create({
                data: {
                    userId: Number(userId),
                    amount: Number(amount),
                    type: '充值',
                    description: '管理员后台充值'
                }
            });
            return u;
        })
        res.json({ success: true, balance: Number(user.balance) });
    } catch (error) {
        res.status(500).json({ error: '充值失败' });
    }
}

export const likeAd = async (req: AuthRequest, res: Response) => {
    const updatedAd = await prisma.ad.update({
      where: { id: parseInt(req.params.id) },
      data: { likes: { increment: 1 } }
    });
    res.json({ success: true, likes: updatedAd.likes });
}

export const getAdStats = async (req: AuthRequest, res: Response) => {
    const { mine } = req.query
    const where: any = {}
    if (mine === 'true' && req.user) where.userId = req.user.id

    // 1. 基础统计（总数和在投数保持原逻辑）
    const totalAds = await prisma.ad.count({ where })
    const activeAds = await prisma.ad.count({ where: { ...where, status: 'Active' } })
    
    // 🟢 2. 定义“仅在投广告”的筛选条件
    const activeWhere = { ...where, status: 'Active' }; 

    // 3. 聚合数据（点击、获赞、均价）：使用 activeWhere
    const aggregations = await prisma.ad.aggregate({
      _sum: { clicks: true, likes: true },
      _avg: { price: true },
      where: activeWhere 
    })
    
    // 4. 趋势和热门：使用 activeWhere
    const recentAds = await prisma.ad.findMany({
      take: 5, orderBy: { clicks: 'desc' }, select: { title: true, clicks: true }, where: activeWhere
    })
    const topLikedAds = await prisma.ad.findMany({
        take: 5, orderBy: { likes: 'desc' }, select: { title: true, likes: true }, where: activeWhere
    })

    // 🟢 5. [修复核心] 分类分布：必须使用 activeWhere，否则会统计暂停的广告
    const categoryGroup = await prisma.ad.groupBy({
        by: ['category'], 
        _count: { category: true }, 
        where: activeWhere, // <--- 关键修复：只统计 Active
        orderBy: { _count: { category: 'desc' } }
    })

    res.json({
      total: totalAds,
      active: activeAds,
      totalClicks: aggregations._sum.clicks || 0,
      totalLikes: aggregations._sum.likes || 0,
      avgPrice: aggregations._avg.price || 0,
      trend: recentAds,
      topLiked: topLikedAds,
      categoryStats: categoryGroup.map(i => ({ name: i.category, value: i._count.category }))
    })
}

export const getAuthors = async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权操作' });
    const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true, balance: true }, 
        orderBy: { createdAt: 'desc' }
    });
    res.json(users);
}