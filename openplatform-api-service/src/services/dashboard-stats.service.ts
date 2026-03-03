import { Request, Response } from 'express'

// ============================================
// Dashboard Statistics Service
// ============================================

// In-memory statistics storage (use database in production)
interface PlatformStats {
  totalDevelopers: number
  totalApplications: number
  pendingKYBReviews: number
  apiCallsToday: number
  apiCallsThisWeek: number
  apiCallsThisMonth: number
  errorRate: number
  lastUpdated: string
}

interface TrendData {
  timestamp: string
  value: number
}

// ============================================
// API Statistics Types (B.3.1)
// ============================================

interface APIStatsSummary {
  totalCalls: number
  todayCalls: number
  weekCalls: number
  monthCalls: number
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  lastUpdated: string
}

interface ResponseTimeTrend {
  timestamp: string
  avg: number
  p50: number
  p95: number
  p99: number
}

interface ErrorTrend {
  timestamp: string
  total: number
  byType: { [key: string]: number }
}

interface APITopApp {
  appId: string
  appName: string
  calls: number
  errorRate: number
  avgResponseTime: number
}

interface AppStatsDetail {
  appId: string
  appName: string
  totalCalls: number
  avgResponseTime: number
  errorRate: number
  errorBreakdown: { [key: string]: number }
  dailyTrend: {
    timestamp: string
    calls: number
    errors: number
  }[]
}

// In-memory storage for demo
class DashboardStatsService {
  private readonly MAX_HEALTH_HISTORY = 168 // 7 days * 24 hours
  private stats: PlatformStats = {
    totalDevelopers: 0,
    totalApplications: 0,
    pendingKYBReviews: 0,
    apiCallsToday: 0,
    apiCallsThisWeek: 0,
    apiCallsThisMonth: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  }

  private apiCallHistory: TrendData[] = []
  private errorRateHistory: TrendData[] = []
  private responseTimeHistory: ResponseTimeTrend[] = []
  private errorTypeHistory: { timestamp: string; errors: { [key: string]: number } }[] = []
  private revenueHistory: RevenueTrend[] = []
  private healthHistory: HealthHistory[] = []
  private cacheExpiry: number = 0
  private readonly CACHE_TTL_MS = 60 * 1000 // 1 minute cache

  /**
   * Get cached stats or fetch fresh data
   */
  async getStats(): Promise<PlatformStats> {
    const now = Date.now()

    // Return cached data if still valid
    if (now < this.cacheExpiry && this.stats.totalDevelopers > 0) {
      return this.stats
    }

    // Fetch fresh data (in production, this would query databases)
    await this.refreshStats()

    return this.stats
  }

  /**
   * Refresh statistics from data sources
   */
  async refreshStats(): Promise<void> {
    // Simulate data aggregation from multiple sources
    // In production, this would query:
    // - Developer database (for totalDevelopers, pendingKYBReviews)
    // - Application database (for totalApplications)
    // - API Gateway metrics (for apiCalls statistics, errorRate)

    this.stats = {
      totalDevelopers: this.generateRandomCount(50, 500),
      totalApplications: this.generateRandomCount(100, 1000),
      pendingKYBReviews: this.generateRandomCount(0, 20),
      apiCallsToday: this.generateRandomCount(1000, 50000),
      apiCallsThisWeek: this.generateRandomCount(50000, 200000),
      apiCallsThisMonth: this.generateRandomCount(200000, 1000000),
      errorRate: parseFloat((Math.random() * 2).toFixed(2)), // 0-2% error rate
      lastUpdated: new Date().toISOString()
    }

    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS

    // Generate trend data
    this.generateTrendData()
  }

  /**
   * Get API calls trend for charting
   */
  async getApiCallsTrend(days: number = 7): Promise<TrendData[]> {
    if (this.apiCallHistory.length === 0) {
      this.generateTrendData()
    }

    // Return last N days of data
    return this.apiCallHistory.slice(-days * 24)
  }

  /**
   * Get error rate trend for charting
   */
  async getErrorRateTrend(days: number = 7): Promise<TrendData[]> {
    if (this.errorRateHistory.length === 0) {
      this.generateTrendData()
    }

    return this.errorRateHistory.slice(-days * 24)
  }

  /**
   * Get developer statistics by status
   */
  async getDeveloperStats(): Promise<{
    active: number
    pending: number
    suspended: number
    total: number
  }> {
    // In production, this would query the developer database
    return {
      active: this.generateRandomCount(40, 400),
      pending: this.generateRandomCount(5, 50),
      suspended: this.generateRandomCount(0, 10),
      total: this.stats.totalDevelopers
    }
  }

  /**
   * Get application statistics by status
   */
  async getApplicationStats(): Promise<{
    active: number
    pendingReview: number
    suspended: number
    total: number
  }> {
    return {
      active: this.generateRandomCount(80, 800),
      pendingReview: this.generateRandomCount(10, 100),
      suspended: this.generateRandomCount(0, 20),
      total: this.stats.totalApplications
    }
  }

  /**
   * Get top applications by API usage
   */
  async getTopApplications(limit: number = 10): Promise<{
    appId: string
    appName: string
    calls: number
    errorRate: number
  }[]> {
    // Generate mock top apps data
    const apps: { appId: string; appName: string; calls: number; errorRate: number }[] = []
    const appNames = ['Payment Gateway', 'Trading Bot', 'Wallet Service', 'Analytics Platform', 'Custody System']

    for (let i = 0; i < limit; i++) {
      apps.push({
        appId: `app_${this.generateRandomString(8)}`,
        appName: `${appNames[i % appNames.length]} ${i + 1}`,
        calls: this.generateRandomCount(1000, 50000),
        errorRate: parseFloat((Math.random() * 3).toFixed(2))
      })
    }

    // Sort by calls descending
    apps.sort((a, b) => b.calls - a.calls)

    return apps
  }

  /**
   * Increment API call counter (called by API Gateway)
   */
  async recordApiCall(success: boolean): Promise<void> {
    const now = new Date()
    const timestamp = now.toISOString()

    // Add to history
    this.apiCallHistory.push({ timestamp, value: 1 })
    this.errorRateHistory.push({
      timestamp,
      value: success ? 0 : 1
    })

    // Update daily/monthly stats
    this.stats.apiCallsToday++
    this.stats.apiCallsThisMonth++

    // Update error rate
    const totalErrors = this.errorRateHistory.filter(d => d.value === 1).length
    this.stats.errorRate = parseFloat(
      ((totalErrors / Math.max(this.apiCallHistory.length, 1)) * 100).toFixed(2)
    )

    // Keep only last 30 days of history
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    this.apiCallHistory = this.apiCallHistory.filter(
      d => new Date(d.timestamp).getTime() > thirtyDaysAgo
    )
    this.errorRateHistory = this.errorRateHistory.filter(
      d => new Date(d.timestamp).getTime() > thirtyDaysAgo
    )
  }

  /**
   * Force cache refresh
   */
  async invalidateCache(): Promise<void> {
    this.cacheExpiry = 0
    await this.refreshStats()
  }

  /**
   * Get service health status
   */
  getHealth(): { status: string; uptime: number; lastRefresh: string } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      lastRefresh: this.stats.lastUpdated
    }
  }

  /**
   * Generate random count within range
   */
  private generateRandomCount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Generate trend data for charts
   */
  private generateTrendData(): void {
    this.apiCallHistory = []
    this.errorRateHistory = []
    this.responseTimeHistory = []
    this.errorTypeHistory = []

    const now = new Date()

    // Generate 7 days of hourly data
    for (let day = 6; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(now)
        timestamp.setDate(timestamp.getDate() - day)
        timestamp.setHours(timestamp.getHours() - hour)
        timestamp.setMinutes(0)
        timestamp.setSeconds(0)
        timestamp.setMilliseconds(0)

        const ts = timestamp.toISOString()

        // Generate realistic API call pattern (higher during business hours)
        const hourFactor = hour >= 9 && hour <= 18 ? 1.5 : 0.5
        const baseCalls = this.generateRandomCount(500, 2000)
        const calls = Math.floor(baseCalls * hourFactor)

        // Generate error rate (0.5% - 2%)
        const errors = Math.random() > 0.8 ? Math.floor(Math.random() * 20) + 5 : 0

        // Generate response times (P50: 50-150ms, P95: 200-400ms, P99: 400-800ms)
        const p50 = this.generateRandomCount(50, 150)
        const p95 = this.generateRandomCount(200, 400)
        const p99 = this.generateRandomCount(400, 800)
        const avg = Math.floor((p50 + p95 + p99) / 3)

        // Generate error type breakdown
        const errorTypes: { [key: string]: number } = {}
        if (errors > 0) {
          const errorCount = Math.min(errors, 10)
          for (let i = 0; i < errorCount; i++) {
            const type = ['400', '401', '403', '404', '500'][this.generateRandomCount(0, 4)]
            errorTypes[type] = (errorTypes[type] || 0) + 1
          }
        }

        this.apiCallHistory.push({ timestamp: ts, value: calls })
        this.errorRateHistory.push({ timestamp: ts, value: errors })
        this.responseTimeHistory.push({ timestamp: ts, avg, p50, p95, p99 })
        this.errorTypeHistory.push({ timestamp: ts, errors: errorTypes })
      }
    }
  }

  // ============================================
  // API Statistics Methods (B.3.1)
  // ============================================

  /**
   * Get API statistics summary
   */
  async getAPIStatsSummary(): Promise<APIStatsSummary> {
    const now = Date.now()

    // Return cached data if still valid
    if (now < this.cacheExpiry && this.stats.totalDevelopers > 0) {
      return {
        totalCalls: this.stats.apiCallsThisMonth,
        todayCalls: this.stats.apiCallsToday,
        weekCalls: this.stats.apiCallsThisWeek,
        monthCalls: this.stats.apiCallsThisMonth,
        avgResponseTime: this.calculateAvgResponseTime(),
        p50ResponseTime: this.calculatePercentileResponseTime(50),
        p95ResponseTime: this.calculatePercentileResponseTime(95),
        p99ResponseTime: this.calculatePercentileResponseTime(99),
        errorRate: this.stats.errorRate,
        lastUpdated: this.stats.lastUpdated
      }
    }

    await this.refreshStats()

    return {
      totalCalls: this.stats.apiCallsThisMonth,
      todayCalls: this.stats.apiCallsToday,
      weekCalls: this.stats.apiCallsThisWeek,
      monthCalls: this.stats.apiCallsThisMonth,
      avgResponseTime: this.calculateAvgResponseTime(),
      p50ResponseTime: this.calculatePercentileResponseTime(50),
      p95ResponseTime: this.calculatePercentileResponseTime(95),
      p99ResponseTime: this.calculatePercentileResponseTime(99),
      errorRate: this.stats.errorRate,
      lastUpdated: this.stats.lastUpdated
    }
  }

  /**
   * Get response time trend for charting
   */
  async getResponseTimeTrend(days: number = 7): Promise<ResponseTimeTrend[]> {
    if (this.responseTimeHistory.length === 0) {
      this.generateTrendData()
    }

    return this.responseTimeHistory.slice(-days * 24)
  }

  /**
   * Get error rate trend with type breakdown
   */
  async getErrorTrend(days: number = 7): Promise<ErrorTrend[]> {
    if (this.errorTypeHistory.length === 0) {
      this.generateTrendData()
    }

    const trendData = this.errorTypeHistory.slice(-days * 24)

    return trendData.map(item => {
      const total = Object.values(item.errors).reduce((sum, count) => sum + count, 0)
      return {
        timestamp: item.timestamp,
        total,
        byType: item.errors
      }
    })
  }

  /**
   * Get top applications by API usage with stats
   */
  async getAPITopApplications(limit: number = 10): Promise<APITopApp[]> {
    const apps: APITopApp[] = []
    const appNames = ['Payment Gateway', 'Trading Bot', 'Wallet Service', 'Analytics Platform', 'Custody System']

    for (let i = 0; i < limit; i++) {
      apps.push({
        appId: `app_${this.generateRandomString(8)}`,
        appName: `${appNames[i % appNames.length]} ${i + 1}`,
        calls: this.generateRandomCount(1000, 50000),
        errorRate: parseFloat((Math.random() * 3).toFixed(2)),
        avgResponseTime: this.generateRandomCount(50, 200)
      })
    }

    // Sort by calls descending
    apps.sort((a, b) => b.calls - a.calls)

    return apps
  }

  /**
   * Get detailed statistics for a specific application
   */
  async getAppStatsDetail(appId: string): Promise<AppStatsDetail | null> {
    // Generate mock app detail data
    const appNames = ['Payment Gateway', 'Trading Bot', 'Wallet Service', 'Analytics Platform', 'Custody System']
    const appName = appNames[this.generateRandomCount(0, 4)] + ' Detail'

    // Generate daily trend
    const dailyTrend = []
    for (let day = 29; day >= 0; day--) {
      const timestamp = new Date()
      timestamp.setDate(timestamp.getDate() - day)
      timestamp.setHours(0, 0, 0, 0)

      dailyTrend.push({
        timestamp: timestamp.toISOString(),
        calls: this.generateRandomCount(500, 5000),
        errors: this.generateRandomCount(0, 50)
      })
    }

    // Generate error breakdown
    const errorBreakdown: { [key: string]: number } = {
      '400': this.generateRandomCount(0, 20),
      '401': this.generateRandomCount(0, 10),
      '403': this.generateRandomCount(0, 5),
      '404': this.generateRandomCount(0, 30),
      '500': this.generateRandomCount(0, 5)
    }

    return {
      appId,
      appName,
      totalCalls: dailyTrend.reduce((sum, d) => sum + d.calls, 0),
      avgResponseTime: this.generateRandomCount(50, 200),
      errorRate: parseFloat((Math.random() * 2).toFixed(2)),
      errorBreakdown,
      dailyTrend
    }
  }

  /**
   * Record API call with response time and error type
   */
  async recordApiCallWithMetrics(
    success: boolean,
    responseTimeMs: number,
    errorType?: string
  ): Promise<void> {
    const now = new Date()
    const timestamp = now.toISOString()

    // Record response time
    this.responseTimeHistory.push({
      timestamp,
      avg: responseTimeMs,
      p50: Math.floor(responseTimeMs * 0.9),
      p95: Math.floor(responseTimeMs * 1.1),
      p99: Math.floor(responseTimeMs * 1.2)
    })

    // Record error type
    const errors: { [key: string]: number } = {}
    if (!success && errorType) {
      errors[errorType] = 1
    }
    this.errorTypeHistory.push({ timestamp, errors })

    // Add to existing history
    this.apiCallHistory.push({ timestamp, value: 1 })
    this.errorRateHistory.push({
      timestamp,
      value: success ? 0 : 1
    })

    // Update stats
    this.stats.apiCallsToday++
    this.stats.apiCallsThisMonth++

    // Update error rate
    const totalErrors = this.errorRateHistory.filter(d => d.value === 1).length
    this.stats.errorRate = parseFloat(
      ((totalErrors / Math.max(this.apiCallHistory.length, 1)) * 100).toFixed(2)
    )

    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const cutoffTime = new Date(thirtyDaysAgo).toISOString()

    this.apiCallHistory = this.apiCallHistory.filter(d => d.timestamp > cutoffTime)
    this.errorRateHistory = this.errorRateHistory.filter(d => d.timestamp > cutoffTime)
    this.responseTimeHistory = this.responseTimeHistory.filter(d => d.timestamp > cutoffTime)
    this.errorTypeHistory = this.errorTypeHistory.filter(d => d.timestamp > cutoffTime)
  }

  /**
   * Export API stats to CSV format
   */
  async exportAPIStatsToCSV(timeRange: string): Promise<string> {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

    const responseTimes = await this.getResponseTimeTrend(days)
    const errors = await this.getErrorTrend(days)

    // CSV header
    let csv = 'Timestamp,Avg Response Time (ms),P50 (ms),P95 (ms),P99 (ms),Total Errors\n'

    // CSV rows
    for (let i = 0; i < responseTimes.length; i++) {
      const rt = responseTimes[i]
      const err = errors[i] || { total: 0, byType: {} }
      const errorTypesStr = Object.entries(err.byType)
        .map(([type, count]) => `${type}:${count}`)
        .join('; ')

      csv += `${rt.timestamp},${rt.avg},${rt.p50},${rt.p95},${rt.p99},${err.total} (${errorTypesStr})\n`
    }

    return csv
  }

  // ============================================
  // Helper Methods
  // ============================================

  private calculateAvgResponseTime(): number {
    if (this.responseTimeHistory.length === 0) {
      this.generateTrendData()
    }

    const total = this.responseTimeHistory.reduce((sum, item) => sum + item.avg, 0)
    return Math.floor(total / this.responseTimeHistory.length)
  }

  private calculatePercentileResponseTime(percentile: number): number {
    if (this.responseTimeHistory.length === 0) {
      this.generateTrendData()
    }

    const values = this.responseTimeHistory.map(item => item.p50).sort((a, b) => a - b)
    const index = Math.floor(values.length * percentile / 100)
    return values[Math.min(index, values.length - 1)]
  }

  // ============================================
  // Revenue Statistics Methods (B.3.2)
  // ============================================

  /**
   * Get revenue statistics summary
   */
  async getRevenueStatsSummary(): Promise<RevenueStatsSummary> {
    if (this.revenueHistory.length === 0) {
      this.generateRevenueData()
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const todayRevenue = this.revenueHistory
      .filter(r => r.timestamp.startsWith(today))
      .reduce((sum, r) => sum + r.revenue, 0)

    const weekRevenue = this.revenueHistory
      .filter(r => r.timestamp >= weekAgo)
      .reduce((sum, r) => sum + r.revenue, 0)

    const monthRevenue = this.revenueHistory
      .filter(r => r.timestamp >= monthAgo)
      .reduce((sum, r) => sum + r.revenue, 0)

    const totalRevenue = this.revenueHistory.reduce((sum, r) => sum + r.revenue, 0)

    // Calculate growth rates (comparing to previous periods)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const yesterdayRevenue = this.revenueHistory
      .filter(r => r.timestamp.startsWith(yesterday))
      .reduce((sum, r) => sum + r.revenue, 0)

    const lastWeekRevenue = this.revenueHistory
      .filter(r => r.timestamp >= lastWeekStart && r.timestamp < weekAgo)
      .reduce((sum, r) => sum + r.revenue, 0)

    const lastMonthRevenue = this.revenueHistory
      .filter(r => r.timestamp >= lastMonthStart && r.timestamp < monthAgo)
      .reduce((sum, r) => sum + r.revenue, 0)

    const todayGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
    const weekGrowth = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0
    const monthGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    return {
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      weekRevenue: parseFloat(weekRevenue.toFixed(2)),
      monthRevenue: parseFloat(monthRevenue.toFixed(2)),
      todayGrowth: parseFloat(todayGrowth.toFixed(2)),
      weekGrowth: parseFloat(weekGrowth.toFixed(2)),
      monthGrowth: parseFloat(monthGrowth.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      lastUpdated: now.toISOString()
    }
  }

  /**
   * Get revenue breakdown by developer
   */
  async getRevenueByDeveloper(limit: number = 10): Promise<RevenueByDeveloper[]> {
    if (this.revenueHistory.length === 0) {
      this.generateRevenueData()
    }

    const developerNames = ['Acme Corp', 'TechStart Inc', 'GlobalPay', 'SecureVault', 'CryptoFlow',
                          'BlockChain Pro', 'Digital Assets', 'FinTech Solutions', 'PayTech', 'FutureFinance']

    const result: RevenueByDeveloper[] = []

    for (let i = 0; i < Math.min(limit, developerNames.length); i++) {
      // Generate random revenue based on developer
      const baseRevenue = this.generateRandomCount(1000, 50000)
      const transactions = this.generateRandomCount(100, 5000)

      // Service type breakdown
      const apiCallFees = parseFloat((baseRevenue * 0.4).toFixed(2))
      const transactionFees = parseFloat((baseRevenue * 0.45).toFixed(2))
      const subscriptionFees = parseFloat((baseRevenue * 0.15).toFixed(2))

      result.push({
        developerId: `dev_${this.generateRandomString(8)}`,
        developerName: developerNames[i],
        revenue: baseRevenue,
        transactionCount: transactions,
        avgFeeRate: parseFloat((baseRevenue / transactions * 100).toFixed(4)),
        serviceTypes: {
          'api_calls': apiCallFees,
          'transaction_fees': transactionFees,
          'subscription': subscriptionFees
        }
      })
    }

    // Sort by revenue descending
    result.sort((a, b) => b.revenue - a.revenue)

    return result
  }

  /**
   * Get revenue trend for charting
   */
  async getRevenueTrend(days: number = 7): Promise<RevenueTrend[]> {
    if (this.revenueHistory.length === 0) {
      this.generateRevenueData()
    }

    return this.revenueHistory.slice(-days * 24)
  }

  /**
   * Get revenue forecast for next N days
   */
  async getRevenueForecast(days: number = 7): Promise<RevenueForecast[]> {
    if (this.revenueHistory.length === 0) {
      this.generateRevenueData()
    }

    // Calculate average daily revenue and trend
    const dailyRevenue = new Map<string, number>()
    for (const item of this.revenueHistory) {
      const date = item.timestamp.split('T')[0]
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + item.revenue)
    }

    const revenues = Array.from(dailyRevenue.values())
    const avgDailyRevenue = revenues.length > 0
      ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
      : 0

    // Calculate trend (simple linear regression slope)
    const n = revenues.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += revenues[i]
      sumXY += i * revenues[i]
      sumX2 += i * i
    }

    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0
    const intercept = n > 0 ? (sumY - slope * sumX) / n : avgDailyRevenue

    // Generate forecast with confidence intervals
    const forecast: RevenueForecast[] = []
    const now = new Date()

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(now)
      forecastDate.setDate(forecastDate.getDate() + i)
      forecastDate.setHours(0, 0, 0, 0)

      // Predict using trend + seasonality (weekly pattern)
      const dayOfWeek = forecastDate.getDay()
      const seasonalityFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.2

      const predictedRevenue = (intercept + slope * (n + i)) * seasonalityFactor

      // Confidence interval widens with distance
      const uncertainty = avgDailyRevenue * 0.1 * Math.sqrt(i)
      const lowerBound = Math.max(0, predictedRevenue - uncertainty * 2)
      const upperBound = predictedRevenue + uncertainty * 2

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedRevenue: parseFloat(predictedRevenue.toFixed(2)),
        lowerBound: parseFloat(lowerBound.toFixed(2)),
        upperBound: parseFloat(upperBound.toFixed(2))
      })
    }

    return forecast
  }

  /**
   * Export revenue stats to CSV format
   */
  async exportRevenueStatsToCSV(timeRange: string): Promise<string> {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

    const trend = await this.getRevenueTrend(days)
    const summary = await this.getRevenueStatsSummary()

    // CSV header
    let csv = '\uFEFF' // UTF-8 BOM for Excel
    csv += 'Revenue Statistics Export\n'
    csv += `Report Generated,${summary.lastUpdated}\n`
    csv += `Time Range,${days} days\n\n`
    csv += 'Period,Revenue ($),Transactions,Avg Fee ($)\n'

    // Aggregate by day
    const dailyData = new Map<string, { revenue: number; transactions: number }>()
    for (const item of trend) {
      const date = item.timestamp.split('T')[0]
      const existing = dailyData.get(date) || { revenue: 0, transactions: 0 }
      existing.revenue += item.revenue
      existing.transactions += item.transactionCount
      dailyData.set(date, existing)
    }

    for (const [date, data] of dailyData) {
      const avgFee = data.transactions > 0 ? data.revenue / data.transactions : 0
      csv += `${date},${data.revenue.toFixed(2)},${data.transactions},${avgFee.toFixed(2)}\n`
    }

    csv += '\nSummary\n'
    csv += `Today's Revenue,${summary.todayRevenue.toFixed(2)}\n`
    csv += `This Week,${summary.weekRevenue.toFixed(2)}\n`
    csv += `This Month,${summary.monthRevenue.toFixed(2)}\n`
    csv += `Total Revenue,${summary.totalRevenue.toFixed(2)}\n`
    csv += `Growth (Today),${summary.todayGrowth.toFixed(2)}%\n`
    csv += `Growth (Week),${summary.weekGrowth.toFixed(2)}%\n`
    csv += `Growth (Month),${summary.monthGrowth.toFixed(2)}%\n`

    return csv
  }

  /**
   * Generate revenue data for demo
   */
  private generateRevenueData(): void {
    this.revenueHistory = []

    const now = new Date()

    // Generate 30 days of hourly data
    for (let day = 29; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(now)
        timestamp.setDate(timestamp.getDate() - day)
        timestamp.setHours(timestamp.getHours() - hour, 0, 0, 0)

        // Business hours have higher revenue
        const hourFactor = hour >= 9 && hour <= 18 ? 2.0 : (hour >= 6 && hour <= 22 ? 1.2 : 0.3)

        // Weekend factor
        const dayOfWeek = timestamp.getDay()
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0

        const baseRevenue = this.generateRandomCount(100, 500)
        const revenue = parseFloat((baseRevenue * hourFactor * weekendFactor).toFixed(2))
        const transactions = Math.floor(revenue / this.generateRandomCount(1, 10))
        const avgFee = transactions > 0 ? parseFloat((revenue / transactions).toFixed(2)) : 0

        this.revenueHistory.push({
          timestamp: timestamp.toISOString(),
          revenue,
          transactionCount: transactions,
          avgFee
        })
      }
    }
  }

  // ============================================
  // Health Statistics Methods (B.3.3)
  // ============================================

  /**
   * Get overall health statistics summary
   */
  async getHealthStatsSummary(): Promise<HealthStatsSummary> {
    const services = await this.getAllServicesHealth()

    const healthyCount = services.filter(s => s.status === 'healthy').length
    const degradedCount = services.filter(s => s.status === 'degraded').length
    const downCount = services.filter(s => s.status === 'down').length

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (downCount > 0) {
      overallStatus = 'down'
    } else if (degradedCount > 0 || healthyCount < services.length / 2) {
      overallStatus = 'degraded'
    }

    return {
      overall: {
        status: overallStatus,
        lastCheck: new Date().toISOString(),
        uptime: process.uptime()
      },
      servicesCount: {
        healthy: healthyCount,
        degraded: degradedCount,
        down: downCount,
        total: services.length
      }
    }
  }

  /**
   * Get health status of all services
   * NOTE: This implementation generates simulated data for demo purposes.
   * In production, implement real health checks via HTTP/TCP ping,
   * service registry queries, or monitoring agent integration.
   */
  async getAllServicesHealth(): Promise<ServiceHealth[]> {
    const serviceNames = [
      'API Gateway',
      'Auth Service',
      'KYB Service',
      'Dashboard Service',
      'Payment Service',
      'Notification Service',
      'Cache Service',
      'Database'
    ]

    const services: ServiceHealth[] = []

    for (let i = 0; i < serviceNames.length; i++) {
      // Simulate health status based on random factors
      const random = Math.random()
      let status: 'healthy' | 'degraded' | 'down' = 'healthy'
      if (random > 0.9) {
        status = 'down'
      } else if (random > 0.7) {
        status = 'degraded'
      }

      // Response times vary by status
      let avgResponseTime: number
      let p50: number, p95: number, p99: number

      if (status === 'healthy') {
        avgResponseTime = this.generateRandomCount(20, 100)
        p50 = this.generateRandomCount(15, 80)
        p95 = this.generateRandomCount(50, 150)
        p99 = this.generateRandomCount(100, 300)
      } else if (status === 'degraded') {
        avgResponseTime = this.generateRandomCount(150, 500)
        p50 = this.generateRandomCount(100, 300)
        p95 = this.generateRandomCount(300, 800)
        p99 = this.generateRandomCount(500, 1500)
      } else {
        avgResponseTime = this.generateRandomCount(1000, 5000)
        p50 = this.generateRandomCount(800, 3000)
        p95 = this.generateRandomCount(2000, 6000)
        p99 = this.generateRandomCount(4000, 10000)
      }

      const errorRate = status === 'healthy'
        ? parseFloat((Math.random() * 0.5).toFixed(2))
        : status === 'degraded'
          ? parseFloat((Math.random() * 2 + 0.5).toFixed(2))
          : parseFloat((Math.random() * 5 + 5).toFixed(2))

      services.push({
        serviceId: `srv_${this.generateRandomString(6)}`,
        serviceName: serviceNames[i],
        status,
        responseTime: {
          avg: avgResponseTime,
          p50,
          p95,
          p99
        },
        errorRate,
        lastCheck: new Date().toISOString()
      })
    }

    return services
  }

  /**
   * Get resource usage metrics
   * NOTE: This implementation generates simulated data for demo purposes.
   * In production, use OS-level APIs (e.g., os.cpus(), os.totalmem())
   * or monitoring tools like Prometheus, CloudWatch, Datadog.
   */
  async getResourceUsage(): Promise<ResourceUsage> {
    // Simulate resource usage
    return {
      cpu: parseFloat((Math.random() * 40 + 20).toFixed(1)), // 20-60%
      memory: parseFloat((Math.random() * 30 + 40).toFixed(1)), // 40-70%
      disk: parseFloat((Math.random() * 20 + 30).toFixed(1)), // 30-50%
      network: {
        in: this.generateRandomCount(1000, 10000), // KB/s
        out: this.generateRandomCount(2000, 20000) // KB/s
      }
    }
  }

  /**
   * Get health history for charting
   */
  async getHealthHistory(hours: number = 24): Promise<HealthHistory[]> {
    if (this.healthHistory.length === 0) {
      this.generateHealthHistory()
    }

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.healthHistory
      .filter(h => new Date(h.timestamp) >= cutoff)
      .slice(-this.MAX_HEALTH_HISTORY) // Limit to max history records
  }

  /**
   * Generate health history data for demo
   */
  private generateHealthHistory(): void {
    this.healthHistory = []

    const now = new Date()

    // Generate health history (hourly for specified hours)
    for (let hour = 23; hour >= 0; hour--) {
      const timestamp = new Date(now)
      timestamp.setHours(timestamp.getHours() - hour, 0, 0, 0)

      // Simulate service health over time
      const servicesHealthy = this.generateRandomCount(5, 8)
      const servicesDegraded = this.generateRandomCount(0, 2)
      const servicesDown = 8 - servicesHealthy - servicesDegraded

      let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
      if (servicesDown > 0) {
        overallStatus = 'down'
      } else if (servicesDegraded > 0) {
        overallStatus = 'degraded'
      }

      this.healthHistory.push({
        timestamp: timestamp.toISOString(),
        overallStatus,
        servicesHealthy,
        servicesDegraded,
        servicesDown: Math.max(0, servicesDown),
        cpu: parseFloat((Math.random() * 30 + 25).toFixed(1)),
        memory: parseFloat((Math.random() * 20 + 45).toFixed(1))
      })
    }
  }
}

export const dashboardStatsService = new DashboardStatsService()

// ============================================
// Type definitions for responses
// ============================================

export interface DashboardStatsResponse {
  totalDevelopers: number
  totalApplications: number
  pendingKYBReviews: number
  apiCalls: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  errorRate: number
  lastUpdated: string
}

export interface DashboardTrendResponse {
  apiCalls: TrendData[]
  errorRate: TrendData[]
}

export interface DashboardDetailStatsResponse {
  developers: {
    active: number
    pending: number
    suspended: number
    total: number
  }
  applications: {
    active: number
    pendingReview: number
    suspended: number
    total: number
  }
  topApplications: {
    appId: string
    appName: string
    calls: number
    errorRate: number
  }[]
}

// ============================================
// Revenue Statistics Types (B.3.2)
// ============================================

interface RevenueStatsSummary {
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  todayGrowth: number
  weekGrowth: number
  monthGrowth: number
  totalRevenue: number
  lastUpdated: string
}

interface RevenueByDeveloper {
  developerId: string
  developerName: string
  revenue: number
  transactionCount: number
  avgFeeRate: number
  serviceTypes: { [key: string]: number }
}

interface RevenueTrend {
  timestamp: string
  revenue: number
  transactionCount: number
  avgFee: number
}

interface RevenueForecast {
  date: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
}

// ============================================
// Health Statistics Types (B.3.3)
// ============================================

interface HealthStatsSummary {
  overall: {
    status: 'healthy' | 'degraded' | 'down'
    lastCheck: string
    uptime: number
  }
  servicesCount: {
    healthy: number
    degraded: number
    down: number
    total: number
  }
}

interface ServiceHealth {
  serviceId: string
  serviceName: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  errorRate: number
  lastCheck: string
}

interface ResourceUsage {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
}

interface HealthHistory {
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'down'
  servicesHealthy: number
  servicesDegraded: number
  servicesDown: number
  cpu: number
  memory: number
}

// ============================================
// API Statistics Exports (B.3.1)
// ============================================

export {
  APIStatsSummary,
  ResponseTimeTrend,
  ErrorTrend,
  APITopApp,
  AppStatsDetail,
  RevenueStatsSummary,
  RevenueByDeveloper,
  RevenueTrend,
  RevenueForecast,
  HealthStatsSummary,
  ServiceHealth,
  ResourceUsage,
  HealthHistory
}
