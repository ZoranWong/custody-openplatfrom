import { AppRouteRecord } from '@/types/router'
import { dashboardRoutes } from './dashboard'
import { systemRoutes } from './system'
import { resultRoutes } from './result'
import { exceptionRoutes } from './exception'
import { developerRoutes } from './developer'
import { kybRoutes } from './kyb'
import { isvRoutes } from './isv'
import { statsRoutes } from './stats'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  dashboardRoutes,
  developerRoutes,
  kybRoutes,
  isvRoutes,
  statsRoutes,
  systemRoutes,
  resultRoutes,
  exceptionRoutes
]
