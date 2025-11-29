import { Router } from 'express'
import { getFormSchema, getAllFormSchemas } from '../controllers/formSchemaController'

const router = Router()

// 获取所有表单配置
router.get('/', getAllFormSchemas)

// 获取单个表单配置
router.get('/:id', getFormSchema)

export default router