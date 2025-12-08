import { Router } from 'express'
import { register, login, getMe, topUpMe, updateProfile, getMyTransactions } from '../controllers/authController'
import { authenticateToken } from '../middleware/auth'

const router: Router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticateToken, getMe)
router.post('/topup', authenticateToken, topUpMe)
router.put('/profile', authenticateToken, updateProfile)
router.get('/transactions', authenticateToken, getMyTransactions)

export default router