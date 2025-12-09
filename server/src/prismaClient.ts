import { PrismaClient } from '@prisma/client'

// 创建全局单例
const prisma = new PrismaClient()

// 👇 必须有这一行导出语句！
export default prisma