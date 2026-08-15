import { AppRouteRecord } from '@/types/router'
import { dashboardRoutes } from './dashboard'
import { systemRoutes } from './system'
import { developerRoutes } from './developer'
import { monitorRoutes } from './monitor'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  dashboardRoutes,
  developerRoutes,
  monitorRoutes,
  systemRoutes
]
