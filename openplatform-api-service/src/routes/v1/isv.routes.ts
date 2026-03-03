/**
 * ISV Routes
 * ISV Owner/Developer authentication and management
 */

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { isvAuth, requireOwner, ISVAuthRequest } from '../../middleware/isv-auth.middleware'
import {
  ownerLogin,
  register,
  logout,
  getProfile,
  updateProfile,
  getISVInfo,
  getMyApplications
} from '../../controllers/isv-auth.controller'
import { isvUserService, isvApplicationService, isvService } from '../../services/isv-user.service'

const router = Router()

// ============================================
// Public Routes (No Auth Required)
// ============================================

/**
 * POST /isv/auth/register
 * ISV Owner registration
 */
router.post('/auth/register', register)

/**
 * POST /isv/auth/login
 * ISV Owner/Developer login
 */
router.post('/auth/login', ownerLogin)

/**
 * POST /isv/auth/logout
 * ISV Owner/Developer logout
 */
router.post('/auth/logout', isvAuth, logout)

/**
 * POST /isv/auth/forgot-password
 * Request password reset email
 */
router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body

  if (!email) {
    res.status(400).json({
      code: 40001,
      message: 'Email is required'
    })
    return
  }

  console.log(`[Demo] Password reset requested for: ${email}`)

  res.json({
    code: 0,
    message: 'Password reset link sent to email'
  })
})

/**
 * POST /isv/auth/reset-password
 * Reset password with token
 */
router.post('/auth/reset-password', (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    res.status(400).json({
      code: 40001,
      message: 'Token and password are required'
    })
    return
  }

  if (password.length < 8) {
    res.status(400).json({
      code: 40002,
      message: 'Password must be at least 8 characters'
    })
    return
  }

  console.log(`[Demo] Password reset with token: ${token.substring(0, 8)}...`)

  res.json({
    code: 0,
    message: 'Password reset successfully'
  })
})

// ============================================
// Protected Routes (Auth Required)
// ============================================

/**
 * GET /isv/profile
 * Get current user profile
 */
router.get('/profile', isvAuth, getProfile)

/**
 * PUT /isv/profile
 * Update current user profile
 */
router.put('/profile', isvAuth, updateProfile)

/**
 * GET /isv/info
 * Get ISV company info
 */
router.get('/info', isvAuth, getISVInfo)

/**
 * GET /isv/applications
 * Get applications accessible to current user
 */
router.get('/applications', isvAuth, getMyApplications)

/**
 * GET /isv/applications/:id
 * Get application detail
 */
router.get('/applications/:id', isvAuth, async (req, res) => {
  try {
    const { id } = req.params
    const isvUser = (req as ISVAuthRequest).isvUser
    const app = await isvApplicationService.getApplicationById(id)

    if (!app) {
      res.status(404).json({
        code: 40401,
        message: 'Application not found'
      })
      return
    }

    const canAccess = isvUser?.role === 'owner' ||
      app.permittedUsers.length === 0 ||
      app.permittedUsers.includes(isvUser!.userId)

    if (!canAccess) {
      res.status(403).json({
        code: 40301,
        message: 'Access denied'
      })
      return
    }

    res.json({
      code: 0,
      message: 'Success',
      data: { application: app }
    })
  } catch (error) {
    console.error('Get application error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

// ============================================
// Owner-only Routes
// ============================================

/**
 * GET /isv/users
 * Get all users in ISV (Owner only)
 */
router.get('/users', isvAuth, requireOwner, async (req, res) => {
  const isvUser = (req as ISVAuthRequest).isvUser
  const users = await isvUserService.getUsersByISV(isvUser!.isvId)
  res.json({
    code: 0,
    message: 'Success',
    data: { list: users, total: users.length }
  })
})

/**
 * POST /isv/users
 * Add developer to ISV (Owner only)
 */
router.post('/users', isvAuth, requireOwner, async (req, res) => {
  try {
    const isvUser = (req as ISVAuthRequest).isvUser
    const { email, password, name, phone, allowedApplications } = req.body

    if (!email || !password || !name) {
      res.status(400).json({
        code: 40001,
        message: 'Missing required fields: email, password, name'
      })
      return
    }

    const result = await isvUserService.addDeveloper({
      isvId: isvUser!.isvId,
      email,
      password,
      name,
      phone,
      allowedApplications
    })

    if (!result.success) {
      res.status(400).json({
        code: 40002,
        message: result.error || 'Failed to add developer'
      })
      return
    }

    res.status(201).json({
      code: 0,
      message: 'Developer added successfully',
      data: { user: result.user }
    })
  } catch (error) {
    console.error('Add developer error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

/**
 * GET /isv/applications/all
 * Get all ISV applications (Owner only)
 */
router.get('/applications/all', isvAuth, requireOwner, async (req, res) => {
  const isvUser = (req as ISVAuthRequest).isvUser
  const apps = await isvApplicationService.getApplicationsByISV(isvUser!.isvId)
  res.json({
    code: 0,
    message: 'Success',
    data: { list: apps, total: apps.length }
  })
})

/**
 * POST /isv/applications
 * Create new application (Owner only)
 */
router.post('/applications', isvAuth, requireOwner, async (req, res) => {
  try {
    const isvUser = (req as ISVAuthRequest).isvUser
    const { name, description, callbackUrl, type } = req.body

    if (!name) {
      res.status(400).json({
        code: 40001,
        message: 'Application name is required'
      })
      return
    }

    if (!type || !['corporate', 'payment', 'custody'].includes(type)) {
      res.status(400).json({
        code: 40002,
        message: 'Application type is required and must be corporate, payment, or custody'
      })
      return
    }

    // Check KYB status
    const isv = await isvService.getISVById(isvUser!.isvId)
    if (!isv) {
      res.status(404).json({
        code: 40401,
        message: 'ISV not found'
      })
      return
    }

    if (isv.kybStatus !== 'approved') {
      res.status(403).json({
        code: 40303,
        message: 'KYB approval required before creating applications'
      })
      return
    }

    const app = await isvApplicationService.createApplication({
      isvId: isvUser!.isvId,
      name,
      description,
      callbackUrl,
      type
    })

    res.status(201).json({
      code: 0,
      message: 'Application created successfully',
      data: { application: app }
    })
  } catch (error) {
    console.error('Create application error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /isv/applications/:appId/permissions
 * Update application user permissions (Owner only)
 */
router.put('/applications/:appId/permissions', isvAuth, requireOwner, async (req, res) => {
  try {
    const { appId } = req.params
    const { userIds } = req.body

    if (!Array.isArray(userIds)) {
      res.status(400).json({
        code: 40001,
        message: 'userIds must be an array'
      })
      return
    }

    const app = await isvApplicationService.updateApplicationPermissions(appId, userIds)

    if (!app) {
      res.status(404).json({
        code: 40401,
        message: 'Application not found'
      })
      return
    }

    const { appSecret: _, ...result } = app
    res.json({
      code: 0,
      message: 'Permissions updated successfully',
      data: { application: result }
    })
  } catch (error) {
    console.error('Update permissions error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /isv/applications/:id
 * Update application (Owner only)
 */
router.put('/applications/:id', isvAuth, requireOwner, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status } = req.body
    const isvUser = (req as ISVAuthRequest).isvUser

    const app = await isvApplicationService.getApplicationById(id)
    if (!app) {
      res.status(404).json({
        code: 40401,
        message: 'Application not found'
      })
      return
    }

    if (app.isvId !== isvUser!.isvId) {
      res.status(403).json({
        code: 40301,
        message: 'Access denied'
      })
      return
    }

    const updated = await isvApplicationService.updateApplication(id, { name, description, status })
    const { appSecret: _, ...result } = updated!
    res.json({
      code: 0,
      message: 'Application updated successfully',
      data: { application: result }
    })
  } catch (error) {
    console.error('Update application error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

/**
 * DELETE /isv/applications/:id
 * Delete application (Owner only)
 */
router.delete('/applications/:id', isvAuth, requireOwner, async (req, res) => {
  try {
    const { id } = req.params
    const isvUser = (req as ISVAuthRequest).isvUser

    const app = await isvApplicationService.getApplicationById(id)
    if (!app) {
      res.status(404).json({
        code: 40401,
        message: 'Application not found'
      })
      return
    }

    if (app.isvId !== isvUser!.isvId) {
      res.status(403).json({
        code: 40301,
        message: 'Access denied'
      })
      return
    }

    await isvApplicationService.deleteApplication(id)
    res.json({
      code: 0,
      message: 'Application deleted successfully'
    })
  } catch (error) {
    console.error('Delete application error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

/**
 * POST /isv/applications/:id/regenerate-secret
 * Regenerate application secret (Owner only)
 */
router.post('/applications/:id/regenerate-secret', isvAuth, requireOwner, async (req, res) => {
  try {
    const { id } = req.params
    const isvUser = (req as ISVAuthRequest).isvUser

    const app = await isvApplicationService.getApplicationById(id)
    if (!app) {
      res.status(404).json({
        code: 40401,
        message: 'Application not found'
      })
      return
    }

    if (app.isvId !== isvUser!.isvId) {
      res.status(403).json({
        code: 40301,
        message: 'Access denied'
      })
      return
    }

    const newSecret = `sk_${uuidv4().replace(/-/g, '')}`
    const updated = await isvApplicationService.updateApplication(id, { appSecret: newSecret })

    res.json({
      code: 0,
      message: 'Secret regenerated successfully',
      data: { applicationSecret: newSecret }
    })
  } catch (error) {
    console.error('Regenerate secret error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error'
    })
  }
})

export default router
