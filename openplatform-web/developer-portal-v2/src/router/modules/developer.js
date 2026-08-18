/**
 * 主菜单路由 - 直接作为顶级菜单，无需外层 Developer Portal 包装
 * 每个菜单项使用 component: '/index/index' 共享布局
 */
// 工作台
const dashboardRoute = {
    name: 'DeveloperDashboard',
    path: '/dashboard',
    component: '/index/index',
    meta: {
        title: 'menus.developer.dashboard',
        icon: 'ri:dashboard-line',
        roles: ['R_SUPER', 'R_ADMIN'],
        fixedTab: true
    },
    children: [
        {
            path: '',
            name: 'DashboardConsole',
            component: '/dashboard/console',
            meta: {
                title: 'menus.developer.dashboard',
                keepAlive: false,
                fixedTab: true
            }
        }
    ]
};
// 应用管理
const applicationsRoute = {
    name: 'DeveloperApplications',
    path: '/applications',
    component: '/index/index',
    meta: {
        title: 'menus.developer.applications',
        icon: 'ri:apps-line',
        roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: '',
            name: 'ApplicationsList',
            component: '/developer/applications',
            meta: {
                title: 'menus.developer.applications',
                keepAlive: false
            }
        },
        {
            path: 'new',
            name: 'DeveloperApplicationCreate',
            component: '/developer/applications/create',
            meta: {
                title: 'menus.developer.applicationsCreate',
                isHide: true
            }
        },
        {
            path: ':id',
            name: 'DeveloperApplicationDetail',
            component: '/developer/applications/detail',
            meta: {
                title: 'menus.developer.applicationsDetail',
                isHide: true
            }
        },
        {
            path: ':id/edit',
            name: 'DeveloperApplicationEdit',
            component: '/developer/applications/edit',
            meta: {
                title: 'menus.developer.applicationsEdit',
                isHide: true
            }
        }
    ]
};
// 用量统计
const usageStatsRoute = {
    name: 'DeveloperUsageStatistics',
    path: '/usage-statistics',
    component: '/index/index',
    meta: {
        title: 'menus.developer.usageStatistics',
        icon: 'ri:line-chart-line',
        roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: '',
            name: 'UsageStatisticsConsole',
            component: '/developer/usage-statistics',
            meta: {
                title: 'menus.developer.usageStatistics',
                keepAlive: false
            }
        }
    ]
};
// 账单管理
const billingRoute = {
    name: 'DeveloperBilling',
    path: '/billing',
    component: '/index/index',
    meta: {
        title: 'menus.developer.billing',
        icon: 'ri:bill-line',
        roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: 'invoice',
            name: 'DeveloperInvoiceGeneration',
            component: '/developer/invoice-generation',
            meta: {
                title: 'menus.developer.invoiceGeneration',
                keepAlive: false
            }
        },
        {
            path: 'payment-history',
            name: 'DeveloperPaymentHistory',
            component: '/developer/payment-history',
            meta: {
                title: 'menus.developer.paymentHistory',
                keepAlive: false
            }
        }
    ]
};
// 订阅管理
const subscriptionRoute = {
    name: 'DeveloperSubscription',
    path: '/subscription',
    component: '/index/index',
    meta: {
        title: 'menus.developer.subscriptionManagement',
        icon: 'ri:vip-crown-line',
        roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: '',
            redirect: '/subscription/current',
            meta: {
                title: 'menus.developer.subscription'
            }
        },
        {
            path: 'current',
            name: 'SubscriptionCurrent',
            component: '/developer/subscription',
            meta: {
                title: 'menus.developer.subscription',
                keepAlive: false
            }
        },
        {
            path: 'history',
            name: 'SubscriptionHistory',
            component: '/developer/subscription-history',
            meta: {
                title: 'menus.developer.subscriptionHistory',
                keepAlive: false
            }
        }
    ]
};
// 账户管理
const accountRoute = {
    name: 'DeveloperAccount',
    path: '/account',
    component: '/index/index',
    meta: {
        title: 'menus.developer.account',
        icon: 'ri:user-settings-line',
        roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: 'profile',
            name: 'DeveloperProfile',
            component: '/developer/profile',
            meta: {
                title: 'menus.developer.profile',
                keepAlive: false
            }
        },
        {
            path: 'api-keys',
            name: 'DeveloperApiKeys',
            component: '/developer/api-keys',
            meta: {
                title: 'menus.developer.apiKeys',
                keepAlive: false
            }
        },
        {
            path: 'settings',
            name: 'DeveloperSettings',
            component: '/developer/settings',
            meta: {
                title: 'menus.developer.settings',
                keepAlive: false
            }
        }
    ]
};
export const developerPortalRoutes = [
    dashboardRoute,
    applicationsRoute,
    usageStatsRoute,
    billingRoute,
    subscriptionRoute,
    accountRoute
];
//# sourceMappingURL=developer.js.map