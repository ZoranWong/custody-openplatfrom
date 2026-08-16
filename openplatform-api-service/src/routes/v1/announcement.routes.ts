import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../controllers/admin/announcement.controller'

const router = Router()

router.get('/announcements', adminAuthMiddleware, getAnnouncements)
router.post('/announcements', adminAuthMiddleware, createAnnouncement)
router.put('/announcements/:id', adminAuthMiddleware, updateAnnouncement)
router.delete('/announcements/:id', adminAuthMiddleware, deleteAnnouncement)

export default router