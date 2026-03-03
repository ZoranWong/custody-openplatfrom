import { Router } from 'express'
import {
  getDashboardStats,
  getDashboardTrends,
  getDashboardDetails,
  refreshDashboardStats,
  getDashboardHealth
} from '../../controllers/dashboard.controller'
import adminAuditRouter from '../../controllers/admin.controller'
import {
  getPendingKYB,
  getAllKYB,
  getKYBById,
  approveKYB,
  rejectKYB,
  requestInfoKYB,
  getKYBStats
} from '../../controllers/kyb-review.controller'
import {
  getKYBHistory,
  getKYBHistoryById
} from '../../controllers/kyb-history.controller'
import {
  getISVStatus,
  activateISV,
  suspendISV,
  banISV,
  getISVStatusHistory
} from '../../controllers/isv-status.controller'
import {
  getAPIStatsSummary,
  getAPITopApps,
  getAPIResponseTimeTrend,
  getAPIErrorTrend,
  getAppStatsDetail,
  recordAPICall,
  exportAPIStats
} from '../../controllers/api-stats.controller'
import {
  getRevenueSummary,
  getRevenueByDeveloper,
  getRevenueTrends,
  getRevenueForecast,
  getDeveloperRevenueDetail,
  exportRevenueStats
} from '../../controllers/revenue-stats.controller'
import {
  getHealthStatus,
  getServicesHealth,
  getResourceUsage,
  getHealthHistory,
  getServiceDetail,
  refreshHealthData
} from '../../controllers/health.controller'
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware'
import { requirePermission } from '../../middleware/admin-permission.middleware'
import { Resource } from '../../constants/admin-permissions'

const router = Router()

// ============================================
// Dashboard Routes (requires ANALYTICS_VIEW permission)
// ============================================
router.get('/dashboard/stats', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getDashboardStats)
router.get('/dashboard/trends', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getDashboardTrends)
router.get('/dashboard/details', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getDashboardDetails)
router.post('/dashboard/refresh', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), refreshDashboardStats)
router.get('/dashboard/health', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getDashboardHealth)

// ============================================
// Audit Routes (mount from admin.controller)
// ============================================
router.use('/audit', adminAuditRouter)

// ============================================
// KYB Review Routes (requires ISV_KYB permission)
// ============================================

// List pending KYB applications
router.get('/kyb/pending', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getPendingKYB)

// List all KYB applications (with optional status filter)
router.get('/kyb', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getAllKYB)

// Get KYB application details
router.get('/kyb/:id', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getKYBById)

// Approve KYB application
router.post('/kyb/:id/approve', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), approveKYB)

// Reject KYB application (requires rejection reason)
router.post('/kyb/:id/reject', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), rejectKYB)

// Request additional information
router.post('/kyb/:id/request-info', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), requestInfoKYB)

// Get KYB statistics
router.get('/kyb/stats', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getKYBStats)

// ============================================
// KYB History Routes (requires ISV_KYB permission)
// ============================================

// List KYB history with filters
router.get('/kyb/history', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getKYBHistory)

// Get KYB history application detail
router.get('/kyb/history/:id', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), getKYBHistoryById)

// ============================================
// ISV Status Routes (requires ISV_STATUS permission)
// ============================================

// Get ISV status details
router.get('/isv/:id/status', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), getISVStatus)

// Activate ISV
router.post('/isv/:id/activate', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), activateISV)

// Suspend ISV
router.post('/isv/:id/suspend', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), suspendISV)

// Ban ISV
router.post('/isv/:id/ban', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), banISV)

// Get ISV status history
router.get('/isv/:id/status/history', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), getISVStatusHistory)

// ============================================
// API Statistics Routes (requires ANALYTICS_VIEW permission)
// ============================================

// Get API statistics summary
router.get('/stats/api/summary', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getAPIStatsSummary)

// Get top applications by API usage
router.get('/stats/api/top-apps', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getAPITopApps)

// Get response time trends
router.get('/stats/api/response-times', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getAPIResponseTimeTrend)

// Get error rate trends with type breakdown
router.get('/stats/api/errors', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getAPIErrorTrend)

// Get detailed statistics for a specific application
router.get('/stats/api/app/:appId', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getAppStatsDetail)

// Record an API call with metrics
router.post('/stats/api/record', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), recordAPICall)

// Export API statistics to CSV
router.get('/stats/api/export', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), exportAPIStats)

// ============================================
// Revenue Statistics Routes (requires ANALYTICS_VIEW permission)
// ============================================

// Get revenue summary
router.get('/stats/revenue/summary', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getRevenueSummary)

// Get revenue by developer
router.get('/stats/revenue/by-developer', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getRevenueByDeveloper)

// Get revenue trends
router.get('/stats/revenue/trends', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getRevenueTrends)

// Get revenue forecast
router.get('/stats/revenue/forecast', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getRevenueForecast)

// Get developer revenue detail
router.get('/stats/revenue/developer/:developerId', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getDeveloperRevenueDetail)

// Export revenue statistics
router.get('/stats/revenue/export', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), exportRevenueStats)

// ============================================
// Health Statistics Routes (requires ANALYTICS_VIEW permission)
// ============================================

// Get overall health status
router.get('/health/status', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getHealthStatus)

// Get service-level health status
router.get('/health/services', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getServicesHealth)

// Get resource usage metrics
router.get('/health/resources', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getResourceUsage)

// Get historical health data
router.get('/health/history', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getHealthHistory)

// Get specific service detail
router.get('/health/service/:serviceId', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), getServiceDetail)

// Force refresh health data
router.post('/health/refresh', adminAuthMiddleware, requirePermission(Resource.ANALYTICS_VIEW), refreshHealthData)

export default router
