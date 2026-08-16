import { Router } from 'express'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import {
  getTickets,
  getTicketById,
  addTicketReply,
  updateTicketStatus,
} from '../../controllers/admin/ticket.controller'

const router = Router()

router.get('/tickets', adminAuthMiddleware, getTickets)
router.get('/tickets/:id', adminAuthMiddleware, getTicketById)
router.post('/tickets/:id/reply', adminAuthMiddleware, addTicketReply)
router.put('/tickets/:id/status', adminAuthMiddleware, updateTicketStatus)

export default router