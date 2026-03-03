import { Router } from 'express'
import {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  adminChangePassword,
  getAdminProfile
} from '../../controllers/admin-auth.controller'
import { adminAuthMiddleware, requireRole } from '../../middleware/admin-auth.middleware'
import {
  getDevelopers,
  getDeveloperById,
  approveDeveloper,
  rejectDeveloper,
  activateDeveloper,
  suspendDeveloper,
  banDeveloper,
  getDeveloperHistory,
  getDeveloperStats
} from '../../controllers/developer.controller'

const router = Router()

// Admin auth routes (public)
router.post('/auth/login', adminLogin)
router.post('/auth/refresh', adminRefreshToken)

// Protected routes (require authentication)
router.post('/auth/logout', adminAuthMiddleware, adminLogout)
router.post('/auth/change-password', adminAuthMiddleware, adminChangePassword)
router.get('/profile', adminAuthMiddleware, getAdminProfile)

// Admin management routes (super_admin only)
router.get('/admins', adminAuthMiddleware, requireRole('super_admin'), getAdminProfile)

// Developer management routes
router.get('/developers', adminAuthMiddleware, getDevelopers)
router.get('/developers/stats', adminAuthMiddleware, getDeveloperStats)
router.get('/developers/:id', adminAuthMiddleware, getDeveloperById)
router.get('/developers/:id/history', adminAuthMiddleware, getDeveloperHistory)
router.post('/developers/:id/approve', adminAuthMiddleware, approveDeveloper)
router.post('/developers/:id/reject', adminAuthMiddleware, rejectDeveloper)
router.post('/developers/:id/activate', adminAuthMiddleware, activateDeveloper)
router.post('/developers/:id/suspend', adminAuthMiddleware, suspendDeveloper)
router.post('/developers/:id/ban', adminAuthMiddleware, banDeveloper)

export default router
