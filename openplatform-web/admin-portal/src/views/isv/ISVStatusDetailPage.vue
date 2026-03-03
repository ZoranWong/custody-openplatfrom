<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { isvStatusApiService, type ISVStatusResponse, ISVStatus } from '@/services/isv-status-api'
import { usePermissionStore } from '@/stores/permission.store'
import {
  ArrowLeft,
  Check,
  Close,
  Warning,
  OfficeBuilding,
  Message,
  User
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const actionLoading = ref(false)
const isvData = ref<ISVStatusResponse | null>(null)

// Dialogs
const activateDialogVisible = ref(false)
const suspendDialogVisible = ref(false)
const banDialogVisible = ref(false)
const activateReason = ref('')
const suspendReason = ref('')
const banReason = ref('')

// Computed
const canActivate = computed(() => {
  return isvData.value?.status === ISVStatus.SUSPENDED ||
    isvData.value?.status === ISVStatus.BANNED
})

const canSuspend = computed(() => {
  return isvData.value?.status === ISVStatus.ACTIVE
})

const canBan = computed(() => {
  return isvData.value?.status === ISVStatus.ACTIVE ||
    isvData.value?.status === ISVStatus.SUSPENDED
})

const isPreviouslyBanned = computed(() => {
  const history = isvData.value?.statusHistory || []
  return history.some(h => h.newStatus === ISVStatus.BANNED)
})

// Methods
async function fetchISVStatus() {
  const id = route.params.id as string
  if (!id) {
    router.push('/kyb')
    return
  }

  try {
    loading.value = true
    const response = await isvStatusApiService.getISVStatus(id)

    if (response.code === 0 && response.data) {
      isvData.value = response.data
    } else {
      ElMessage.error('ISV not found')
      router.push('/kyb')
    }
  } catch (err: any) {
    console.error('Failed to fetch ISV status:', err)
    ElMessage.error('Failed to load ISV data')
    router.push('/kyb')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/kyb')
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusType(status: ISVStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case ISVStatus.ACTIVE:
      return 'success'
    case ISVStatus.SUSPENDED:
      return 'warning'
    case ISVStatus.BANNED:
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusLabel(status: ISVStatus): string {
  switch (status) {
    case ISVStatus.ACTIVE:
      return 'Active'
    case ISVStatus.SUSPENDED:
      return 'Suspended'
    case ISVStatus.BANNED:
      return 'Banned'
    default:
      return status
  }
}

async function handleActivate() {
  if (!isvData.value) return

  const warning = isPreviouslyBanned.value
    ? 'This ISV was previously banned. Are you sure you want to re-activate their account?'
    : 'Are you sure you want to activate this ISV?'

  try {
    await ElMessageBox.confirm(
      warning,
      'Confirm Activation',
      {
        confirmButtonText: 'Activate',
        cancelButtonText: 'Cancel',
        type: 'success'
      }
    )

    actionLoading.value = true
    const response = await isvStatusApiService.activateISV(isvData.value.id, activateReason.value)

    if (response.code === 0) {
      ElMessage.success('ISV activated successfully')
      activateDialogVisible.value = false
      activateReason.value = ''
      await fetchISVStatus()
    } else {
      ElMessage.error(response.message || 'Failed to activate ISV')
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('Activate error:', err)
      ElMessage.error('Failed to activate ISV')
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleSuspend() {
  if (!isvData.value) return

  try {
    await ElMessageBox.confirm(
      'Are you sure you want to suspend this ISV? They will lose access to the platform.',
      'Confirm Suspension',
      {
        confirmButtonText: 'Suspend',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )

    actionLoading.value = true
    const response = await isvStatusApiService.suspendISV(isvData.value.id, suspendReason.value)

    if (response.code === 0) {
      ElMessage.success('ISV suspended successfully')
      suspendDialogVisible.value = false
      suspendReason.value = ''
      await fetchISVStatus()
    } else {
      ElMessage.error(response.message || 'Failed to suspend ISV')
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('Suspend error:', err)
      ElMessage.error('Failed to suspend ISV')
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleBan() {
  if (!isvData.value || !banReason.value.trim()) {
    ElMessage.warning('Please provide a reason for banning this ISV')
    return
  }

  try {
    await ElMessageBox.confirm(
      'Are you sure you want to ban this ISV? This action cannot be undone and the ISV will lose all access to the platform.',
      'Confirm Ban',
      {
        confirmButtonText: 'Ban ISV',
        cancelButtonText: 'Cancel',
        type: 'error'
      }
    )

    actionLoading.value = true
    const response = await isvStatusApiService.banISV(isvData.value.id, banReason.value)

    if (response.code === 0) {
      ElMessage.success('ISV banned successfully')
      banDialogVisible.value = false
      banReason.value = ''
      await fetchISVStatus()
    } else {
      ElMessage.error(response.message || 'Failed to ban ISV')
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('Ban error:', err)
      ElMessage.error('Failed to ban ISV')
    }
  } finally {
    actionLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchISVStatus()
})
</script>

<template>
  <div class="isv-status-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-spinner" :size="40"><OfficeBuilding /></el-icon>
      <p>Loading ISV data...</p>
    </div>

    <!-- Content -->
    <template v-else-if="isvData">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <el-button
            type="primary"
            text
            :icon="ArrowLeft"
            @click="goBack"
            class="back-button"
          >
            Back to List
          </el-button>
          <h1 class="page-title">{{ isvData.companyName }}</h1>
          <div class="header-meta">
            <span class="meta-item">
              <el-icon><OfficeBuilding /></el-icon>
              {{ isvData.developerId }}
            </span>
            <el-tag :type="getStatusType(isvData.status)" size="small">
              {{ getStatusLabel(isvData.status) }}
            </el-tag>
          </div>
        </div>
        <div class="header-actions">
          <el-button
            v-if="canActivate"
            type="success"
            :icon="Check"
            :loading="actionLoading"
            @click="activateDialogVisible = true"
          >
            Activate
          </el-button>
          <el-button
            v-if="canSuspend"
            type="warning"
            :icon="Warning"
            :loading="actionLoading"
            @click="suspendDialogVisible = true"
          >
            Suspend
          </el-button>
          <el-button
            v-if="canBan"
            type="danger"
            :icon="Close"
            :loading="actionLoading"
            @click="banDialogVisible = true"
          >
            Ban
          </el-button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Column: ISV Info -->
        <div class="content-left">
          <el-card class="info-card">
            <template #header>
              <span class="card-title">ISV Information</span>
            </template>
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Company Name</span>
                <span class="info-value">{{ isvData.companyName }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Developer ID</span>
                <span class="info-value">{{ isvData.developerId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email</span>
                <span class="info-value">{{ isvData.email }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">KYB Status</span>
                <span class="info-value">{{ isvData.kybStatus }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Created</span>
                <span class="info-value">{{ formatDate(isvData.createdAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Last Updated</span>
                <span class="info-value">{{ formatDate(isvData.updatedAt) }}</span>
              </div>
            </div>
          </el-card>

          <!-- Status History -->
          <el-card class="history-card">
            <template #header>
              <span class="card-title">Status Change History</span>
            </template>
            <div class="status-timeline">
              <div
                v-for="entry in isvData.statusHistory"
                :key="entry.id"
                class="timeline-entry"
              >
                <div class="timeline-marker" :class="getStatusType(entry.newStatus)"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <el-tag :type="getStatusType(entry.newStatus)" size="small">
                      {{ getStatusLabel(entry.newStatus) }}
                    </el-tag>
                    <span class="timeline-time">{{ formatDate(entry.timestamp) }}</span>
                  </div>
                  <div class="timeline-details">
                    <span class="timeline-admin">
                      <el-icon><User /></el-icon>
                      {{ entry.adminId }}
                    </span>
                    <span v-if="entry.reason" class="timeline-reason">
                      <el-icon><Message /></el-icon>
                      {{ entry.reason }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- Right Column: Actions Info -->
        <div class="content-right">
          <el-card class="actions-card">
            <template #header>
              <span class="card-title">Available Actions</span>
            </template>
            <div class="actions-list">
              <div class="action-item">
                <el-icon class="action-icon success"><Check /></el-icon>
                <div class="action-info">
                  <div class="action-name">Activate</div>
                  <div class="action-desc">Restore platform access for suspended or banned ISV</div>
                </div>
              </div>
              <div class="action-item">
                <el-icon class="action-icon warning"><Warning /></el-icon>
                <div class="action-info">
                  <div class="action-name">Suspend</div>
                  <div class="action-desc">Temporarily restrict ISV access</div>
                </div>
              </div>
              <div class="action-item">
                <el-icon class="action-icon danger"><Close /></el-icon>
                <div class="action-info">
                  <div class="action-name">Ban</div>
                  <div class="action-desc">Permanently revoke ISV access (requires reason)</div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </template>

    <!-- Activate Dialog -->
    <el-dialog
      v-model="activateDialogVisible"
      title="Activate ISV"
      width="480px"
    >
      <div v-if="isPreviouslyBanned" class="warning-banner">
        <el-icon><Warning /></el-icon>
        This ISV was previously banned. Please ensure compliance review is complete before re-activating.
      </div>
      <el-form label-position="top">
        <el-form-item label="Reason (Optional)">
          <el-input
            v-model="activateReason"
            type="textarea"
            :rows="3"
            placeholder="Enter reason for activation..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activateDialogVisible = false">Cancel</el-button>
        <el-button
          type="success"
          :loading="actionLoading"
          @click="handleActivate"
        >
          Activate ISV
        </el-button>
      </template>
    </el-dialog>

    <!-- Suspend Dialog -->
    <el-dialog
      v-model="suspendDialogVisible"
      title="Suspend ISV"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item label="Reason (Optional)">
          <el-input
            v-model="suspendReason"
            type="textarea"
            :rows="3"
            placeholder="Enter reason for suspension..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="suspendDialogVisible = false">Cancel</el-button>
        <el-button
          type="warning"
          :loading="actionLoading"
          @click="handleSuspend"
        >
          Suspend ISV
        </el-button>
      </template>
    </el-dialog>

    <!-- Ban Dialog -->
    <el-dialog
      v-model="banDialogVisible"
      title="Ban ISV"
      width="480px"
    >
      <div class="danger-banner">
        <el-icon><Close /></el-icon>
        This action will permanently revoke ISV access and cannot be undone.
      </div>
      <el-form label-position="top">
        <el-form-item label="Ban Reason (Required)" required>
          <el-input
            v-model="banReason"
            type="textarea"
            :rows="4"
            placeholder="Please provide a detailed reason for banning this ISV..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="banDialogVisible = false">Cancel</el-button>
        <el-button
          type="danger"
          :loading="actionLoading"
          :disabled="!banReason.trim()"
          @click="handleBan"
        >
          Ban ISV
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.isv-status-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
  color: #8c8c8c;
}

.loading-spinner {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.back-button {
  margin-bottom: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8c8c8c;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

.content-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.content-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card, .history-card, .actions-card {
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-label {
  width: 140px;
  color: #8c8c8c;
  font-size: 14px;
  flex-shrink: 0;
}

.info-value {
  color: #1a1a1a;
  font-size: 14px;
  font-weight: 500;
}

.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-entry {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-left: 2px solid #e8e8e8;
  padding-left: 16px;
  margin-left: 8px;
}

.timeline-entry:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.timeline-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  left: -6px;
  background: #e8e8e8;
}

.timeline-marker.success { background: #52c41a; }
.timeline-marker.warning { background: #fa8c16; }
.timeline-marker.danger { background: #ff4d4f; }

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.timeline-time {
  font-size: 12px;
  color: #8c8c8c;
}

.timeline-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #595959;
}

.timeline-admin, .timeline-reason {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.action-icon {
  font-size: 20px;
  padding: 8px;
  border-radius: 8px;
}

.action-icon.success {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.action-icon.warning {
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
}

.action-icon.danger {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.action-info {
  flex: 1;
}

.action-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: #8c8c8c;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(250, 140, 22, 0.1);
  border-radius: 8px;
  color: #fa8c16;
  margin-bottom: 16px;
  font-size: 14px;
}

.danger-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 8px;
  color: #ff4d4f;
  margin-bottom: 16px;
  font-size: 14px;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .content-right {
    order: -1;
  }
}
</style>
