import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'mini-ad-wall-secret-key'

// 注册
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) return res.status(400).json({ error: '用户名已存在' })

    const hashedPassword = await bcrypt.hash(password, 10)

    // 🚀 核心修改：如果是 'admin'，自动赋予 admin 权限
    const role = username === 'admin' ? 'admin' : 'user'

    const user = await prisma.user.create({
      data: { username, password: hashedPassword, role }
    })

    // 🚀 核心修改：Payload 中包含 role 和 id
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    // 🚀 核心修改：返回 id 和 role 给前端
    res.json({ token, username: user.username, id: user.id, role: user.role })
  } catch (error) {
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

    // 🚀 核心修改：返回 id 和 role
    res.json({ token, username: user.username, id: user.id, role: user.role })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
}