// Load environment variables FIRST
import { config } from 'dotenv'
config()

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

// Import logging modules
import { initLoggerConfig } from './config/logger.config'
import { createRequestLoggingMiddleware, initRequestLogging } from './middleware/request-logging.middleware'
import { createAuditLoggingMiddleware, logSignatureFailure, logTokenFailure } from './middleware/audit-logging.middleware'
import { createRequestLoggerMiddleware } from './services/request-logger.service'

// Import database modules
import { initializeDatabase, checkDatabaseHealth, disconnectDatabase } from './database/prisma-client'

// Import routes
import adminAuthRoutes from './routes/v1/admin-auth.routes'
import adminRoutes from './routes/v1/admin.routes'
import isvRoutes from './routes/v1/isv.routes'
import billingRoutes from './routes/v1/billing.routes'
import usageRoutes from './routes/v1/usage.routes'
import webhookConfigRoutes from './routes/v1/webhook-config.routes'
import oauthRoutes from './routes/oauth.routes'
import authorizationRoutes from './routes/v1/authorization.routes'

// Import routing middleware
import { createRequestRoutingMiddleware, createBackendForwardingMiddleware } from './middleware/request-routing.middleware'

// Import metrics modules
import { createMetricsMiddleware } from './middleware/metrics.middleware'
import metricsRoutes from './routes/metrics.routes'
import { getMetricsCollector } from './services/metrics-collector.service'

// Import trace modules
import { createTraceMiddleware } from './middleware/trace.middleware'
import traceRoutes from './routes/v1/trace.routes'

// Initialize logger configuration
initLoggerConfig()

const app = express()
const PORT = Number(process.env.PORT || 1000)

// Trace middleware - handles distributed tracing
app.use(createTraceMiddleware())

// Security middleware
app.use(helmet())
app.use(cors({
    origin: true,
    credentials: true
}))

// Compression
app.use(compression())

// Cookie parser
app.use(cookieParser())

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Audit logging middleware (logs auth failures, rate limits, etc.)
app.use(createAuditLoggingMiddleware())

// Enhanced request logging with custom Morgan format
initRequestLogging()
app.use(createRequestLoggingMiddleware())

// Request logger service middleware (additional structured logging)
app.use(createRequestLoggerMiddleware())

// Metrics collection middleware
app.use(createMetricsMiddleware())

// Request routing middleware - handles backend service forwarding
const routingMiddleware = createRequestRoutingMiddleware()
const forwardingMiddleware = createBackendForwardingMiddleware()

// Apply routing middleware BEFORE routes
app.use(routingMiddleware)
app.use(forwardingMiddleware)

// Health check
app.get('/health', async (_req: Request, res: Response) => {
    const metricsCollector = getMetricsCollector()
    const summary = metricsCollector.getMetricsSummary()

    // Check database health if MySQL is enabled
    const dbHealthy = process.env.STORAGE_TYPE === 'mysql'
        ? await checkDatabaseHealth()
        : null

    res.json({
        status: dbHealthy === false ? 'degraded' : 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealthy !== null ? (dbHealthy ? 'connected' : 'disconnected') : 'not configured',
        metrics: {
            qps: summary.qps,
            errorRate: summary.errorRate,
            totalRequests: summary.totalRequests,
        }
    })
})

// API Routes
app.use('/api/v1/admin', adminAuthRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/admin', traceRoutes)
app.use('/api/v1/isv', isvRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/usage', usageRoutes)
app.use('/api/v1/isv', webhookConfigRoutes)

// OAuth routes (including appToken/validate)
app.use('/api/oauth', oauthRoutes)

// Authorization routes
app.use('/api/v1/authorizations', authorizationRoutes)

// Metrics routes (Prometheus endpoint)
app.use('/metrics', metricsRoutes)

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        code: 40401,
        message: 'Not found',
        trace_id: _req.headers['x-trace-id'] as string || ''
    })
})

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err)
    res.status(500).json({
        code: 50001,
        message: 'Internal server error',
        trace_id: _req.headers['x-trace-id'] as string || ''
    })
})

const HOST = process.env.HOST || 'localhost'
process.on('uncaughtException', (err) => {
    console.error('🔥 uncaughtException:', err)
})

process.on('unhandledRejection', (reason) => {
    console.error('🔥 unhandledRejection:', reason)
})
// Initialize database on startup (if MySQL is enabled)
async function startServer() {
    if (process.env.STORAGE_TYPE === 'mysql') {
        try {
            await initializeDatabase()
            console.log('Database initialized successfully')
        } catch (error) {
            console.error('Failed to initialize database:', error)
            // Don't start server if database initialization fails in production
            if (process.env.NODE_ENV === 'production') {
                process.exit(1)
            }
            console.warn('Starting server without database connection (development mode)')
        }
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`API Gateway running on port ${PORT}`)
        console.log(`Health check: http://localhost:${PORT}/health`)
    })
}

startServer()

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...')
    if (process.env.STORAGE_TYPE === 'mysql') {
        await disconnectDatabase()
        console.log('Database disconnected')
    }
    process.exit(0)
})

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...')
    if (process.env.STORAGE_TYPE === 'mysql') {
        await disconnectDatabase()
        console.log('Database disconnected')
    }
    process.exit(0)
})

export default app
