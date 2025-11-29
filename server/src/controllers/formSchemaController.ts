import { Request, Response } from 'express'

// 模拟表单配置数据（实际项目中可以存储在数据库中）
const formSchemas: Record<string, any> = {
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
      // 1. 新增：发布人
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
        label: '内容文案', // 2. 修改：Label 改为 内容文案
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
        required: true, // 3. 修改：视频改为必填
        multiple: true,
        placeholder: '请上传广告视频'
      },
      {
        name: 'targetUrl',
        label: '目标链接',
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后的目标链接',
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
  
  // ⬇️⬇️⬇️ 重点修改这里 ⬇️⬇️⬇️
  'update-ad-form': {
    id: 'update-ad-form',
    title: '更新广告表单',
    fields: [
      {
        name: 'title',
        label: '广告标题',
        type: 'text',
        required: true,
        placeholder: '请输入广告标题',
        maxLength: 100
      },
      // 补上：发布人
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
        label: '内容文案', // 改名
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
        required: true, // 改为必填
        multiple: true,
        placeholder: '请上传广告视频'
      },
      {
        name: 'targetUrl',
        label: '目标链接',
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后的目标链接',
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