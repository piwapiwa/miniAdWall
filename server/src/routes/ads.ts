import { Router } from 'express'
import {
  createAd, getAllAds, getAdById, updateAd, deleteAd, incrementClicks, getAdStats, getAuthors, likeAd, topUpUser
} from '../controllers/adController'
import { authenticateToken, optionalAuth } from '../middleware/auth'

const router: Router = Router()

router.get('/stats', optionalAuth, getAdStats)
router.get('/authors', authenticateToken, getAuthors)

router.get('/', optionalAuth, getAllAds)
router.get('/:id', getAdById)
router.post('/', authenticateToken, createAd)
router.put('/:id', authenticateToken, updateAd)
router.delete('/:id', authenticateToken, deleteAd)
router.post('/:id/clicks', incrementClicks)
router.post('/:id/like', likeAd)
router.post('/topup', authenticateToken, topUpUser) 

export default router