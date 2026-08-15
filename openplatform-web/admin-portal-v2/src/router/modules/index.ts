import { AppRouteRecord } from '@/types/router'
import { dashboardRoutes } from './dashboard'
import { developerRoutes } from './developer'
import { statsRoutes } from './stats'
import { subscriptionRoutes } from './subscription'
import { monitorRoutes } from './monitor'
import { ticketRoutes } from './ticket'
import { settingsRoutes } from './settings'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  dashboardRoutes,
  developerRoutes,
  statsRoutes,
  subscriptionRoutes,
  monitorRoutes,
  ticketRoutes,
  settingsRoutes
]