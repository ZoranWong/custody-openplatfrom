/**
 * ISV Routes
 * ISV Owner/Developer authentication and management
 */

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'
import { isvAuth, requireOwner, ISVAuthRequest } from '../../middleware/isv-auth.middleware'
import { captchaMiddleware } from '../../middleware/captcha.middleware'
import { validateRegister, validateISVLogin, validateCreateApplication } from '../../validate/rules'

import {
  ownerLogin,
  register,
  logout,
  getProfile,
  updateProfile,
  getISVInfo,
  getMyApplications
} from '../../controllers/isv/isv-auth.controller'
import { isvUserService, isvApplicationService, isvService } from '../../services/isv-user.service'
import { getPackageRepository, getOrderRepository, getSubscriptionRepository } from '../../repositories/repository.factory'

const router = Router()

// ============================================
// Public Routes (No Auth Required)
// ============================================

/**
 * POST /isv/auth/register
 * ISV Owner registration
 */
router.post('/auth/register', validateRegister, register)

/**
 * POST /isv/auth/login
 * ISV Owner/Developer login
 */
router.post('/auth/login', captchaMiddleware, validateISVLogin, ownerLogin)

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
      code: BusinessCodes.PARAM_REQUIRED,
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
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Token and password are required'
    })
    return
  }

  if (password.length < 8) {
    res.status(400).json({
      code: BusinessCodes.PARAM_INVALID_FORMAT,
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
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found'
      })
      return
    }

    const canAccess = isvUser?.role === 'owner' || app.isvDeveloperId === isvUser?.isvDeveloperId

    if (!canAccess) {
      res.status(403).json({
        code: BusinessCodes.AUTHZ_ACCESS_DENIED,
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
      code: BusinessCodes.SERVER_INTERNAL,
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
  const users = await isvUserService.getUsersByISV(isvUser!.isvDeveloperId)
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
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Missing required fields: email, password, name'
      })
      return
    }

    const result = await isvUserService.addDeveloper({
      isvDeveloperId: isvUser!.isvDeveloperId,
      email,
      password,
      name,
      phone,
      allowedApplications
    })

    if (!result.success) {
      res.status(400).json({
        code: BusinessCodes.PARAM_INVALID_FORMAT,
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
      code: BusinessCodes.SERVER_INTERNAL,
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
  const apps = await isvApplicationService.getApplicationsByISV(isvUser!.isvDeveloperId)
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
router.post('/applications', isvAuth, requireOwner, validateCreateApplication, async (req, res) => {
  try {
    const isvUser = (req as ISVAuthRequest).isvUser
    const { appName, appDescription, appType, callbackUrl } = req.body

    if (!appType || !['corporate', 'payment', 'custody'].includes(appType)) {
      res.status(400).json({
        code: BusinessCodes.PARAM_INVALID_FORMAT,
        message: 'Application type is required and must be corporate, payment, or custody'
      })
      return
    }

    // Check KYB status
    const isv = await isvService.getISVById(isvUser!.isvDeveloperId)
    if (!isv) {
      res.status(404).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'ISV not found'
      })
      return
    }

    if (isv.kybStatus !== 'approved') {
      res.status(403).json({
        code: BusinessCodes.AUTHZ_OPERATOR_DENIED,
        message: 'KYB approval required before creating applications'
      })
      return
    }

    const app = await isvApplicationService.createApplication({
      isvDeveloperId: isvUser!.isvDeveloperId,
      appName,
      appDescription,
      appType,
      callbackUrl
    })

    res.status(201).json({
      code: 0,
      message: 'Application created successfully',
      data: { application: app }
    })
  } catch (error) {
    console.error('Create application error:', error)
    res.status(500).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /isv/applications/:appId/permissions
 * Update application user permissions (Owner only)
 */
router.put('/applications/:appId/permissions', isvAuth, requireOwner, async (req, res) => {
  res.status(HttpCodes.NOT_IMPLEMENTED).json({ code: BusinessCodes.NOT_IMPLEMENTED, message: 'User-level application permissions not supported' })
})

/**
 * PUT /isv/applications/:id
 * Update application (Owner only)
 */
router.put('/applications/:id', isvAuth, requireOwner, async (req, res) => {
  try {
    const { id } = req.params
    const { appName, appDescription, callbackUrl } = req.body
    const isvUser = (req as ISVAuthRequest).isvUser

    const app = await isvApplicationService.getApplicationById(id)
    if (!app) {
      res.status(404).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found'
      })
      return
    }

    if (app.isvDeveloperId !== isvUser!.isvDeveloperId) {
      res.status(403).json({
        code: BusinessCodes.AUTHZ_ACCESS_DENIED,
        message: 'Access denied'
      })
      return
    }

    const updateData: Record<string, any> = {}
    if (appName !== undefined) updateData.appName = appName
    if (appDescription !== undefined) updateData.appDescription = appDescription
    if (callbackUrl !== undefined) updateData.callbackUrl = callbackUrl

    const updated = await isvApplicationService.updateApplication(id, updateData)
    const { appSecret: _, ...result } = updated!
    res.json({
      code: 0,
      message: 'Application updated successfully',
      data: { application: result }
    })
  } catch (error) {
    console.error('Update application error:', error)
    res.status(500).json({
      code: BusinessCodes.SERVER_INTERNAL,
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
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found'
      })
      return
    }

    if (app.isvDeveloperId !== isvUser!.isvDeveloperId) {
      res.status(403).json({
        code: BusinessCodes.AUTHZ_ACCESS_DENIED,
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
      code: BusinessCodes.SERVER_INTERNAL,
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
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found'
      })
      return
    }

    if (app.isvDeveloperId !== isvUser!.isvDeveloperId) {
      res.status(403).json({
        code: BusinessCodes.AUTHZ_ACCESS_DENIED,
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
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
})

// ============================================
// Subscription Routes
// ============================================

/**
 * GET /isv/packages
 * Get available packages for subscription
 */
router.get('/packages', isvAuth, async (req, res) => {
  try {
    const repo = getPackageRepository()
    const packages = await repo.findByStatus('active')
    res.json({
      code: 0, message: 'Success',
      data: packages.map(p => ({
        id: p.id, packageCode: p.packageCode, name: p.name,
        description: p.description, monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice, dailyApiLimit: p.dailyApiLimit,
        maxApplications: p.maxApplications, isTrial: p.isTrial,
        features: p.features, supportLevel: p.supportLevel,
        webhook: p.webhook, customDomain: p.customDomain,
        whiteLabel: p.whiteLabel, sla: p.sla, ipWhitelist: p.ipWhitelist,
        autoRenew: p.autoRenew, logRetention: p.logRetention,
      })),
    })
  } catch (error) {
    console.error('Get packages error:', error)
    res.status(500).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' })
  }
})

/**
 * POST /isv/orders
 * Create a new order for subscription purchase
 */
router.post('/orders', isvAuth, async (req, res) => {
  try {
    const isvUser = (req as any).isvUser
    const { packageId, period, paymentMethod } = req.body

    if (!packageId || !period) {
      res.status(400).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'packageId and period are required', data: null })
      return
    }

    // Validate package exists
    const pkgRepo = getPackageRepository()
    const pkg = await pkgRepo.findById(packageId)
    if (!pkg) {
      res.status(404).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Package not found', data: null })
      return
    }

    // Calculate amount
    const amount = period === 'yearly'
      ? Number(pkg.yearlyPrice || pkg.monthlyPrice)
      : Number(pkg.monthlyPrice)

    const orderRepo = getOrderRepository()
    const order = await orderRepo.create({
      developerId: isvUser.isvId,
      packageId,
      period,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: paymentMethod || 'bank_transfer',
    } as any)

    res.json({
      code: 0, message: 'success',
      data: {
        id: order.id,
        packageId: order.packageId,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' })
  }
})

/**
 * GET /isv/orders/:id
 * Get order detail
 */
router.get('/orders/:id', isvAuth, async (req, res) => {
  try {
    const isvUser = (req as any).isvUser
    const orderRepo = getOrderRepository()
    const order = await orderRepo.findById(req.params.id)

    if (!order || order.developerId !== isvUser.isvId) {
      res.status(404).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Order not found', data: null })
      return
    }

    res.json({
      code: 0, message: 'success',
      data: {
        id: order.id,
        packageId: order.packageId,
        period: order.period,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        externalPaymentId: order.externalPaymentId,
        paymentMethod: order.paymentMethod,
        proofUrl: order.proofUrl,
        remark: order.remark,
        createdAt: order.createdAt?.toISOString(),
        paidAt: order.paidAt?.toISOString() || null,
        confirmedAt: order.confirmedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Get order detail error:', error)
    res.status(500).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' })
  }
})

/**
 * GET /isv/subscriptions
 * Get all developer's subscriptions (active + inactive history)
 */
router.get('/subscriptions', isvAuth, async (req, res) => {
  try {
    const isvUser = (req as any).isvUser
    const repo = getSubscriptionRepository()
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const { list, total } = await repo.findByFilters(
      { developerId: isvUser.isvId },
      page,
      pageSize
    )

    res.json({
      code: 0, message: 'Success',
      data: {
        list: list.map(s => ({
          id: s.id,
          status: s.status,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          billingCycle: s.billingCycle,
          autoRenew: s.autoRenew,
          dailyApiUsage: s.dailyApiUsage,
          packageCode: (s as any).package?.packageCode,
          name: (s as any).package?.name,
          createdAt: s.createdAt.toISOString(),
        })),
        total, page, pageSize,
      },
    })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    res.status(500).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' })
  }
})

/**
 * GET /isv/subscription/current
 * Get current developer's active subscription
 */
router.get('/subscription/current', isvAuth, async (req, res) => {
  try {
    const isvUser = (req as any).isvUser
    const repo = getSubscriptionRepository()
    const subscription = await repo.findByDeveloperId(isvUser.isvId)

    res.json({
      code: 0, message: 'Success',
      data: subscription ? {
        id: subscription.id, status: subscription.status,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate.toISOString(),
        billingCycle: subscription.billingCycle,
        autoRenew: subscription.autoRenew,
        dailyApiUsage: subscription.dailyApiUsage,
        package: (subscription as any).package,
      } : null,
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' })
  }
})

export default router
