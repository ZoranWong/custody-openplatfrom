import { AppRouteRecord } from '@/types/router'

export const settingsRoutes: AppRouteRecord = {
  path: '/settings',
  name: 'Settings',
  component: '/index/index',
  meta: {
    title: 'menus.settings.title',
    icon: 'ri:settings-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'admin',
      name: 'SettingsAdmin',
      component: '/settings/admin',
      meta: {
        title: 'menus.settings.admin',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'role',
      name: 'SettingsRole',
      component: '/settings/role',
      meta: {
        title: 'menus.settings.role',
        keepAlive: true,
        roles: ['R_SUPER']
      }
    },
    {
      path: 'menu',
      name: 'SettingsMenu',
      component: '/settings/menu',
      meta: {
        title: 'menus.settings.menu',
        keepAlive: true,
        roles: ['R_SUPER'],
        authList: [
          { title: '新增', authMark: 'add' },
          { title: '编辑', authMark: 'edit' },
          { title: '删除', authMark: 'delete' }
        ]
      }
    },
    {
      path: 'config',
      name: 'SettingsConfig',
      component: '/settings/config',
      meta: {
        title: 'menus.settings.config',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'audit-log',
      name: 'SettingsAuditLog',
      component: '/settings/audit-log',
      meta: {
        title: 'menus.settings.auditLog',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'announcement',
      name: 'SettingsAnnouncement',
      component: '/settings/announcement',
      meta: {
        title: 'menus.settings.announcement',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}