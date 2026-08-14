import { Router } from 'express'
import {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  adminChangePassword,
  getAdminProfile,
  listAdmins
} from '../../controllers/admin/admin-auth.controller'
import { adminAuthMiddleware, requireRole } from '../../middleware/admin-auth.middleware'
import { requirePermission } from '../../middleware/admin-permission.middleware'
import { Resource } from '../../constants/admin-permissions'
import { validateLogin, validateRefreshToken, validateChangePassword, validateBanDeveloper } from '../../validate/rules'
import {
  getDevelopers,
  getDeveloperById,
  approveDeveloper,
  rejectDeveloper,
  activateDeveloper,
  suspendDeveloper,
  banDeveloper,
  getDeveloperStats
} from '../../controllers/admin/developer.controller'

const router = Router()

// Admin auth routes (public)
router.post('/auth/login', validateLogin, adminLogin)
router.post('/auth/refresh', validateRefreshToken, adminRefreshToken)

// Protected routes (require authentication)
router.post('/auth/logout', adminAuthMiddleware, adminLogout)
router.post('/auth/change-password', adminAuthMiddleware, validateChangePassword, adminChangePassword)
router.get('/profile', adminAuthMiddleware, getAdminProfile)

// Admin management routes (super_admin only)
router.get('/admins', adminAuthMiddleware, requireRole('super_admin'), listAdmins)

// Developer management routes

// Query routes - all logged-in admins can view
router.get('/developers', adminAuthMiddleware, getDevelopers)
router.get('/developers/stats', adminAuthMiddleware, getDeveloperStats)
router.get('/developers/:id', adminAuthMiddleware, getDeveloperById)

// Mutation routes - need KYB approval permission
router.post('/developers/:id/approve', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), approveDeveloper)
router.post('/developers/:id/reject', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), validateBanDeveloper, rejectDeveloper)
router.post('/developers/:id/ban', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), validateBanDeveloper, banDeveloper)

// Status management routes - need ISV status permission
router.post('/developers/:id/activate', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), activateDeveloper)
router.post('/developers/:id/suspend', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), suspendDeveloper)

export default router
