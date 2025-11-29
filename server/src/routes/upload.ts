import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + extension)
  }
})

// 创建 multer 实例
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/ogg'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

// 处理文件上传
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' })
    }

    // 构建文件 URL
    const fileUrl = `/uploads/${req.file.filename}`
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    res.status(500).json({ error: '文件上传失败' })
  }
})

// 获取已上传的文件列表
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
    res.json({ files })
  } catch (error) {
    console.error('获取文件列表失败:', error)
    res.status(500).json({ error: '获取文件列表失败' })
  }
})

// 删除文件
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    const filePath = path.join(uploadDir, filename)
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({ message: '文件删除成功' })
    } else {
      res.status(404).json({ error: '文件不存在' })
    }
  } catch (error) {
    console.error('文件删除失败:', error)
    res.status(500).json({ error: '文件删除失败' })
  }
})

export default router