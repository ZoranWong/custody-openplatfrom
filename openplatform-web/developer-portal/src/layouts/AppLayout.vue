<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  HomeFilled,
  Grid,
  TrendCharts,
  Document,
  Wallet,
  User,
  SwitchButton,
  Menu
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarCollapsed = ref(false)
const isMobileMenuOpen = ref(false)

const isvInfo = computed(() => authStore.isvInfo)
const user = computed(() => authStore.user)

const menuItems = [
  { name: 'Home', path: '/dashboard', icon: HomeFilled },
  { name: 'Applications', path: '/applications', icon: Grid },
  { name: 'Usage Stats', path: '/usage-statistics', icon: TrendCharts },
  { name: 'Billing', path: '/invoice-generation', icon: Document },
  { name: 'Payments', path: '/payment-history', icon: Wallet },
  { name: 'Profile', path: '/profile', icon: User },
]

const isActiveRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const handleLogout = async () => {
  await authStore.logout()
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="app-layout">
    <!-- Top Header -->
    <header class="top-header">
      <div class="header-left">
        <div class="logo" @click="router.push('/dashboard')">
          <img src="/logo.svg"  alt="Cregis" class="logo-icon" />
          <!-- <span class="logo-text">Cregis</span> -->
        </div>
      </div>
      <div class="header-right">
        <el-dropdown trigger="click">
          <div class="user-dropdown">
            <el-avatar :size="32" :src="''">
              {{ user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <span class="user-name">{{ user?.name || 'User' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">
                <el-icon><User /></el-icon> Profile
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> Log Out
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Main Container -->
    <div class="main-container">
      <!-- Left Sidebar -->
      <aside :class="['left-sidebar', { collapsed: sidebarCollapsed }]">
        <!-- Menu -->
        <nav class="sidebar-menu">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            :class="['menu-item', { active: isActiveRoute(item.path) }]"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span v-if="!sidebarCollapsed" class="menu-text">{{ item.name }}</span>
          </router-link>
        </nav>
      </aside>

      <!-- Page Content -->
      <main class="page-content">
        <RouterView class=" rounded-t-md " />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f0f1f1;
}

/* Top Header */
.top-header {
  height: 64px;
  background: #f0f1f1;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-icon {
  /* width: 32px; */
  height: 32px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-dropdown:hover {
  background: rgba(0, 0, 0, 0.05);
}

.user-name {
  color: #1a1a2e;
  font-size: 14px;
}

/* Main Container */
.main-container {
  display: flex;
  flex: 1;
}

/* Left Sidebar */
.left-sidebar {
  width: 200px;
  background: #f0f1f1;
  color: #1a1a2e;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
}

.left-sidebar.collapsed {
  width: 64px;
}

.sidebar-menu {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #000000;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.menu-item:hover {
  background: #e0e0e0;
}

.menu-item.active {
  background: #0000000d;
}

.menu-icon {
  font-size: 20px;
  flex-shrink: 0;
  color: #00be78;
}

.menu-text {
  font-size: 14px;
  white-space: nowrap;
}

/* Page Content */
.page-content {
  flex: 1;
  padding: 24px 12px 24px 0;
  overflow-y: auto;
  min-height: calc(100vh - 64px);
}

.page-content :deep(.card) {
  background: #fff;
  border-radius: 8px 8px 0 0;
}
</style>
