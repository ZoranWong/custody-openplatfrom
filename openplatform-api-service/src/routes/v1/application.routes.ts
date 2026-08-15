import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import { requirePermission } from '../../middleware/admin-permission.middleware'
import { Resource } from '../../constants/admin-permissions'
import {
  getApplications,
  getApplicationStats,
  getApplicationById,
  approveApplication,
  rejectApplication,
} from '../../controllers/admin/application.controller'

const router = Router()

// List applications with filters
router.get(
  '/applications',
  adminAuthMiddleware,
  requirePermission(Resource.ISV_KYB),
  getApplications
)

// Get application statistics
router.get(
  '/applications/stats',
  adminAuthMiddleware,
  requirePermission(Resource.ISV_KYB),
  getApplicationStats
)

// Get application by ID
router.get(
  '/applications/:id',
  adminAuthMiddleware,
  requirePermission(Resource.ISV_KYB),
  getApplicationById
)

// Approve application
router.post(
  '/applications/:id/approve',
  adminAuthMiddleware,
  requirePermission(Resource.ISV_KYB),
  approveApplication
)

// Reject application
router.post(
  '/applications/:id/reject',
  adminAuthMiddleware,
  requirePermission(Resource.ISV_KYB),
  rejectApplication
)

export default router