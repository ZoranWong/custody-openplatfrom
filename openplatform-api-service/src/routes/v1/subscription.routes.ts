import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import {
  getSubscriptions,
  getSubscriptionById,
  getDeveloperSubscription,
} from '../../controllers/admin/subscription.controller'

const router = Router()

router.get('/subscriptions', adminAuthMiddleware, getSubscriptions)
router.get('/subscriptions/:id', adminAuthMiddleware, getSubscriptionById)
router.get('/developers/:id/subscription', adminAuthMiddleware, getDeveloperSubscription)

export default router