import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import {
  getActivePackages,
  getPackageHistory,
  createPackage,
  updatePackage,
  deletePackage,
} from '../../controllers/admin/package.controller'

const router = Router()

router.get('/packages/active', adminAuthMiddleware, getActivePackages)
router.get('/packages/history', adminAuthMiddleware, getPackageHistory)
router.post('/packages', adminAuthMiddleware, createPackage)
router.put('/packages/:id', adminAuthMiddleware, updatePackage)
router.delete('/packages/:id', adminAuthMiddleware, deletePackage)

export default router