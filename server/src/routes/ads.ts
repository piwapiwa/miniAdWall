import { Router } from 'express'
import {
  createAd,
  getAllAds,
  getAdById,
  updateAd,
  deleteAd,
  incrementClicks,
  getAdStats // 引入新控制器
} from '../controllers/adController'

const router: Router = Router()

// 1. 统计接口 (必须放在 /:id 之前)
router.get('/stats', getAdStats)

// 2. 列表接口
router.get('/', getAllAds)

// 3. 详情接口
router.get('/:id', getAdById)

// 4. 创建接口
router.post('/', createAd)

// 5. 更新接口
router.put('/:id', updateAd)

// 6. 删除接口
router.delete('/:id', deleteAd)

// 7. 点击计数接口
router.post('/:id/clicks', incrementClicks)

export default router