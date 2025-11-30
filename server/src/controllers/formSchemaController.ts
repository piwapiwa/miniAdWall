import { Request, Response } from 'express'

// 模拟表单配置数据（实际项目中可以存储在数据库中）
const formSchemas: Record<string, any> = {
  // 1. 用于新建和复制的表单配置
  'ad-form': {
    id: 'ad-form',
    title: '创建广告表单',
    fields: [
      {
        name: 'title',
        label: '广告标题',
        type: 'text',
        required: true,
        placeholder: '请输入广告标题',
        maxLength: 100
      },
      {
        name: 'author',
        label: '发布人',
        type: 'text',
        required: true,
        placeholder: '请输入发布人姓名',
        maxLength: 50
      },
      {
        name: 'description',
        label: '内容文案',
        type: 'textarea',
        required: true,
        placeholder: '请输入内容文案',
        maxLength: 500
      },
      {
        name: 'imageUrls',
        label: '广告图片 (支持多张)',
        type: 'file',
        required: true,
        multiple: true,
        placeholder: '请上传广告图片'
      },
      {
        name: 'videoUrls',
        label: '广告视频 (支持多个)',
        type: 'file',
        required: true,
        multiple: true,
        placeholder: '请上传广告视频'
      },
      // ⬇️⬇️⬇️ 修复点：这里也要改成 "落地页" ⬇️⬇️⬇️
      {
        name: 'targetUrl',
        label: '落地页', 
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后的落地页链接',
        maxLength: 255
      },
      {
        name: 'price',
        label: '广告出价',
        type: 'number',
        required: true,
        placeholder: '请输入广告出价（元）',
        minLength: 0
      }
    ]
  },
  
  // 2. 用于编辑的表单配置
  'update-ad-form': {
    id: 'update-ad-form',
    title: '更新广告表单',
    fields: [
      {
        name: 'title',
        label: '广告标题',
        type: 'text',
        required: true,
        placeholder: '请输入广告的名称',
        maxLength: 100
      },
      {
        name: 'author',
        label: '发布人',
        type: 'text',
        required: true,
        placeholder: '请输入广告发布者信息',
        maxLength: 50
      },
      {
        name: 'description',
        label: '内容文案',
        type: 'textarea',
        required: true,
        placeholder: '请输入广告推广文案',
        maxLength: 500
      },
      {
        name: 'imageUrls',
        label: '广告图片 (支持多张)',
        type: 'file',
        required: true,
        multiple: true,
        placeholder: '请上传广告图片'
      },
      {
        name: 'videoUrls',
        label: '广告视频 (支持多个)',
        type: 'file',
        required: true,
        multiple: true,
        placeholder: '请上传广告视频'
      },
      // ⬇️⬇️⬇️ 这里的 "落地页" 保持不变 ⬇️⬇️⬇️
      {
        name: 'targetUrl',
        label: '落地页',
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后落地页的url地址',
        maxLength: 255
      },
      {
        name: 'price',
        label: '广告出价',
        type: 'number',
        required: true,
        placeholder: '请输入广告出价（元）',
        minLength: 0
      }
    ]
  }
}

// 获取所有表单配置
export const getAllFormSchemas = (req: Request, res: Response) => {
  try {
    const schemas = Object.values(formSchemas)
    res.json(schemas)
  } catch (error) {
    console.error('获取表单配置列表失败:', error)
    res.status(500).json({ error: '获取表单配置列表失败' })
  }
}

// 获取单个表单配置
export const getFormSchema = (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const schema = formSchemas[id]

    if (!schema) {
      return res.status(404).json({ error: '表单配置不存在' })
    }

    res.json(schema)
  } catch (error) {
    console.error('获取表单配置失败:', error)
    res.status(500).json({ error: '获取表单配置失败' })
  }
}