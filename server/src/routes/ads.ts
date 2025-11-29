import { Router } from 'express'
import {
  createAd,
  getAllAds,
  getAdById,
  updateAd,
  deleteAd,
  incrementClicks
} from '../controllers/adController'

const router: Router = Router()

// 获取所有广告
router.get('/', getAllAds)

// 获取单个广告
router.get('/:id', getAdById)

// 创建广告
router.post('/', createAd)

// 更新广告
router.put('/:id', updateAd)

// 删除广告
router.delete('/:id', deleteAd)

// 增加点击量
router.post('/:id/clicks', incrementClicks)

export default router