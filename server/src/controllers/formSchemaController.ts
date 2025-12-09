import { Request, Response } from 'express'

// 模拟表单配置数据
const formSchemas: Record<string, any> = {
  // 1. 新建/复制 表单
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
        disabled: true, 
        placeholder: '自动填充当前用户',
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
      {
        name: 'targetUrl',
        label: '落地页', 
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后的落地页链接',
        maxLength: 255,
        // 🟢 [新增] 正则校验规则：前端会直接拦截错误的 URL
        rules: [
          { required: true, message: '落地页链接不能为空' },
          { 
            pattern: '^https?:\\/\\/.+', 
            message: '请输入正确的网址 (需包含 http:// 或 https://)' 
          }
        ]
      },
      {
        name: 'price',
        label: '广告出价',
        type: 'number',
        required: true,
        placeholder: '请输入广告出价（元）',
        minLength: 0
      },
      {
        name: 'category',
        label: '广告分类',
        type: 'select',
        required: true,
        placeholder: '请选择广告分类',
        options: [
          { label: '科技数码', value: '科技数码' },
          { label: '生活日常', value: '生活日常' },
          { label: '游戏娱乐', value: '游戏娱乐' },
          { label: '知识分享', value: '知识分享' },
          { label: '其他', value: '其他' }
        ]
      },
    ]
  },
  
  // 2. 编辑表单
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
        disabled: true,
        placeholder: '自动填充',
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
      {
        name: 'targetUrl',
        label: '落地页',
        type: 'text',
        required: true,
        placeholder: '请输入广告点击后落地页的url地址',
        maxLength: 255,
        // 正则校验规则
       rules: [
          { required: true, message: '落地页链接不能为空' },
          { 
            pattern: '^https?:\\/\\/.+', 
            message: '请输入正确的网址 (需包含 http:// 或 https://)' 
          }
        ]
      },
      {
        name: 'price',
        label: '广告出价',
        type: 'number',
        required: true,
        placeholder: '请输入广告出价（元）',
        minLength: 0
      },
      {
        name: 'category',
        label: '广告分类',
        type: 'select',
        required: true,
        placeholder: '请选择广告分类',
        options: [
          { label: '科技数码', value: '科技数码' },
          { label: '生活日常', value: '生活日常' },
          { label: '游戏娱乐', value: '游戏娱乐' },
          { label: '知识分享', value: '知识分享' },
          { label: '其他', value: '其他' }
        ]
      },
    ]
  }
}

export const getAllFormSchemas = (req: Request, res: Response) => {
  try {
    const schemas = Object.values(formSchemas)
    res.json(schemas)
  } catch (error) {
    res.status(500).json({ error: '获取表单配置列表失败' })
  }
}

export const getFormSchema = (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const schema = formSchemas[id]
    if (!schema) return res.status(404).json({ error: '表单配置不存在' })
    res.json(schema)
  } catch (error) {
    res.status(500).json({ error: '获取表单配置失败' })
  }
}