import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
} from '../../controllers/admin/package.controller'

const router = Router()

router.get('/packages', adminAuthMiddleware, getPackages)
router.post('/packages', adminAuthMiddleware, createPackage)
router.put('/packages/:id', adminAuthMiddleware, updatePackage)
router.delete('/packages/:id', adminAuthMiddleware, deletePackage)

export default router