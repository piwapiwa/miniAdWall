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
    const { title, description, imageUrls, videoUrls, targetUrl, price, isAnonymous } = req.body

    if (!req.user) return res.status(401).json({ error: '请先登录' })
    if (!title || !description || !targetUrl || !price || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ error: '请填写所有必填项' })
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        author: isAnonymous ? '匿名用户' : req.user.username, // 强制使用当前用户
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]),
        videoUrls: JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : [])),
        targetUrl,
        price,
        clicks: 0,
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
    const { search, status, sortBy, mine, targetUser } = req.query
    const where: any = {}

    // 模糊搜索
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        // 🚀 核心修改：这里加入了 author 搜索
        { author: { contains: String(search) } }
      ]
    }

    // 状态筛选
    if (status && status !== 'All') where.status = String(status)

    // 权限与范围筛选
    if (req.user?.role === 'admin' && targetUser) {
      if (targetUser !== 'All') where.author = String(targetUser)
    } else if (mine === 'true') {
      if (!req.user) return res.status(401).json({ error: '请先登录' })
      where.userId = req.user.id
    }

    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'price') orderBy = { price: 'desc' }
    if (sortBy === 'clicks') orderBy = { clicks: 'desc' }

    const ads = await prisma.ad.findMany({ where, orderBy })

    const parsedAds = ads.map((ad: any) => ({
      ...ad,
      imageUrls: safeParse(ad.imageUrls),
      videoUrls: safeParse(ad.videoUrls)
    }))

    res.json(parsedAds)
  } catch (error) {
    res.status(500).json({ error: '获取列表失败' })
  }
}

// ... (getAdById, updateAd, deleteAd, incrementClicks, getAdStats, getAuthors 保持不变)
// 为节省篇幅，请保留原文件后面的其他函数
// 务必确保 updateAd 里也有 author 覆盖逻辑
export const getAdById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const ad = await prisma.ad.findUnique({ where: { id: parseInt(id) } });
        if (!ad)
            return res.status(404).json({ error: '广告不存在' });
        const parsedAd = {
            ...ad,
            imageUrls: safeParse(ad.imageUrls),
            videoUrls: safeParse(ad.videoUrls)
        };
        res.json(parsedAd);
    }
    catch (error) {
        res.status(500).json({ error: '获取详情失败' });
    }
};
export const updateAd = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, imageUrls, videoUrls, targetUrl, price, status, isAnonymous } = req.body;
        const existingAd = await prisma.ad.findUnique({ where: { id: parseInt(id) } });
        if (!existingAd)
            return res.status(404).json({ error: '广告不存在' });
        const isOwner = req.user && existingAd.userId === req.user.id;
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: '无权操作此广告' });
        }
        const dataToUpdate: any = {};
        if (title)
            dataToUpdate.title = title;
        if (description)
            dataToUpdate.description = description;
        if (targetUrl)
            dataToUpdate.targetUrl = targetUrl;
        if (price)
            dataToUpdate.price = price;
        if (status)
            dataToUpdate.status = status;
        if (typeof isAnonymous === 'boolean' && req.user) {
            dataToUpdate.author = isAnonymous ? '匿名用户' : req.user.username;
        }
        if (imageUrls)
            dataToUpdate.imageUrls = JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]);
        if (videoUrls)
            dataToUpdate.videoUrls = JSON.stringify(Array.isArray(videoUrls) ? videoUrls : (videoUrls ? [videoUrls] : []));
        const updatedAd = await prisma.ad.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });
        res.json(updatedAd);
    }
    catch (error) {
        res.status(500).json({ error: '更新失败' });
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
        const { mine } = req.query;
        const where: any = {};
        if (mine === 'true' && req.user) {
            where.userId = req.user.id;
        }
        const totalAds = await prisma.ad.count({ where });
        const activeWhere = Object.assign(Object.assign({}, where), { status: 'Active' });
        const activeAds = await prisma.ad.count({ where: activeWhere });
        const aggregations = await prisma.ad.aggregate({
            _sum: { clicks: true },
            _avg: { price: true },
            where
        });
        const recentAds = await prisma.ad.findMany({
            take: 5,
            orderBy: { clicks: 'desc' },
            select: { title: true, clicks: true },
            where
        });
        res.json({
            total: totalAds,
            active: activeAds,
            totalClicks: aggregations._sum.clicks || 0,
            avgPrice: aggregations._avg.price || 0,
            trend: recentAds
        });
    }
    catch (error) {
        res.status(500).json({ error: '获取统计失败' });
    }
};
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