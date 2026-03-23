<template>
  <div class="forbidden-page">
    <div class="forbidden-container">
      <div class="icon-container">
        <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 7v6M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <h1 class="title">403</h1>
      <h2 class="subtitle">Access Denied</h2>

      <p class="message">
        You don't have permission to access this page.
      </p>

      <p v-if="requiredPermission" class="permission-info">
        Required permission: <strong>{{ requiredPermission }}</strong>
      </p>

      <div class="current-role" v-if="userRole">
        Your current role: <strong>{{ formatRole(userRole) }}</strong>
      </div>

      <div class="actions">
        <el-button type="primary" @click="goBack">
          Go Back
        </el-button>

        <el-button v-if="canGoHome" type="primary" plain @click="goHome">
          Go to Dashboard
        </el-button>

        <el-button v-if="canLogout" type="danger" plain @click="logout">
          Logout
        </el-button>
      </div>

      <div v-if="isOperator" class="help-message">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
        >
          <template #title>
            Contact your administrator to upgrade your permissions.
          </template>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission.store'
import { Resource } from '@/shared/admin-permissions'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()

// Get required permission from route query
const requiredPermission = computed(() => {
  const perm = route.query.required as string
  return perm || null
})

// Get user role
const userRole = computed(() => authStore.user?.role)

// Check if user is operator
const isOperator = computed(() => permissionStore.isOperator)

// Navigation actions
const canGoHome = computed(() => {
  return permissionStore.hasPermission(Resource.DASHBOARD) || permissionStore.isSuperAdmin
})

const canLogout = computed(() => authStore.isAuthenticated)

function goBack(): void {
  router.back()
}

function goHome(): void {
  router.push({ name: 'dashboard' })
}

async function logout(): Promise<void> {
  await authStore.logout()
  router.push({ name: 'login' })
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    operator: 'Operator'
  }
  return roleMap[role] || role
}
</script>

<style scoped>
.forbidden-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.forbidden-container {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-width: 480px;
  width: 90%;
}

.icon-container {
  margin-bottom: 24px;
}

.icon {
  width: 80px;
  height: 80px;
  color: #e6a23c;
}

.title {
  font-size: 72px;
  font-weight: 700;
  color: #303133;
  margin: 0;
  line-height: 1;
}

.subtitle {
  font-size: 28px;
  font-weight: 500;
  color: #303133;
  margin: 16px 0;
}

.message {
  font-size: 16px;
  color: #606266;
  margin: 24px 0;
}

.permission-info,
.current-role {
  font-size: 14px;
  color: #909399;
  margin: 8px 0;
}

.permission-info strong,
.current-role strong {
  color: #409eff;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
  flex-wrap: wrap;
}

.help-message {
  margin-top: 24px;
  text-align: left;
}
</style>
