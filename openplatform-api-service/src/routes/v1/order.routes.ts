import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import { getOrders } from '../../controllers/admin/order.controller'

const router = Router()

router.get('/orders', adminAuthMiddleware, getOrders)

export default router