import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mini-ad-wall-secret-key'

// 扩展 Express 的 Request 类型
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  }
}

// 强制鉴权中间件（必须登录）
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.sendStatus(401)

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// 可选鉴权中间件（允许游客，但如果带了 Token 会解析出用户身份）
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    next() // 没有 Token 也可以继续，只是 req.user 为空
    return
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err) {
      req.user = user
    }
    // Token 错误也不报错，当作游客处理
    next()
  })
}