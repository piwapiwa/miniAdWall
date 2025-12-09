import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import adsRouter from './routes/ads'
import uploadRouter from './routes/upload'
import formSchemaRouter from './routes/form-schema'
import authRouter from './routes/auth'
import 'express-async-errors';
import { errorHandler } from './middleware/errorHandler';
import prisma from './prismaClient'

// 加载环境变量
dotenv.config()

// 初始化 Prisma 客户端
// const prisma = new PrismaClient()

// 创建 Express 应用
const app = express()

// 配置中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 设置静态文件服务 (上传文件的目录)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 注册 API 路由
app.use('/api/ads', adsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/form-schema', formSchemaRouter);
app.use('/api/auth', authRouter);

const frontendPath = path.join(__dirname, '../../client/dist')

// 1. 静态资源托管
app.use(express.static(frontendPath))

// 2. 所有其他请求返回前端 index.html (支持 React 路由刷新)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

app.use(errorHandler);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' })
})

// 获取端口号
const PORT = process.env.PORT || 5000

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})