import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthRequest } from '../middleware/auth' 
import prisma from '../prismaClient'

// const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'mini-ad-wall-secret-key'


// 注册
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) return res.status(400).json({ error: '用户名已存在' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const role = username === 'admin' ? 'admin' : 'user'

    // ✨ 使用事务：创建用户 + 记录第一笔流水
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { username, password: hashedPassword, role, balance: 100 }
      })
      
      await tx.transaction.create({
        data: {
          userId: newUser.id,
          amount: 100,
          type: '系统赠送',
          description: '新用户注册体验金'
        }
      })
      return newUser
    })

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    res.json({ token, username: user.username, id: user.id, role: user.role, balance: Number(user.balance) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '注册失败' })
  }
}

// 登录
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(400).json({ error: '用户不存在' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(400).json({ error: '密码错误' })

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    res.json({ 
      token, 
      username: user.username, 
      id: user.id, 
      role: user.role,
      balance: Number(user.balance)
    })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
}

// 获取当前用户信息
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } })
    if (!user) return res.status(404).json({ error: '用户不存在' })
    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      balance: Number(user.balance) 
    })
  } catch (error) {
    res.status(500).json({ error: '获取信息失败' })
  }
}

// 用户自我充值
export const topUpMe = async (req: AuthRequest, res: Response) => {
  const { amount } = req.body
  const userId = req.user?.id

  if (!userId) return res.status(401).json({ error: '未登录' })
  if (!amount || amount <= 0) return res.status(400).json({ error: '金额无效' })

  try {
    // ✨ 使用事务
    const user = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: Number(amount) } }
        })
        
        await tx.transaction.create({
            data: {
                userId: userId,
                amount: Number(amount),
                type: '充值',
                description: '用户自助充值'
            }
        })
        return updatedUser
    })
    
    res.json({ success: true, balance: Number(user.balance) })
  } catch (error) {
    res.status(500).json({ error: '充值失败' })
  }
}

// 获取我的交易记录
export const getMyTransactions = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: '未登录' })

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, // 最新在通过
            take: 50 // 只取最近50条，避免数据过多
        })
        res.json(transactions)
    } catch (error) {
        res.status(500).json({ error: '获取记录失败' })
    }
}

// ✨ 新增：修改个人信息 (用户名、密码)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  const { username, oldPassword, newPassword } = req.body // 接收三个参数

  if (!userId) return res.status(401).json({ error: '未登录' })

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: '用户不存在' })

    const updateData: any = {}

    // 🟢 场景 A: 修改用户名
    if (username && username !== user.username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: userId } }
      })
      if (existing) return res.status(400).json({ error: '用户名已被占用' })
      updateData.username = username
    }

    // 🟢 场景 B: 修改密码 (必须提供旧密码)
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: '修改密码必须提供旧密码' })
      }
      
      const isValid = await bcrypt.compare(oldPassword, user.password)
      if (!isValid) {
        return res.status(400).json({ error: '旧密码错误' })
      }

      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    // 如果没有任何修改
    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: '无变更' })
    }

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })
    
    // 签发新 Token
    const newToken = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    )

    res.json({ 
      success: true, 
      token: newToken,
      username: updatedUser.username,
      balance: Number(updatedUser.balance)
    })
  } catch (error) {
    res.status(500).json({ error: '更新失败' })
  }
}