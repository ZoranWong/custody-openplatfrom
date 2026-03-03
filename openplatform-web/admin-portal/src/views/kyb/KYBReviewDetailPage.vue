<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { kybApiService, type KYBApplication, KYBStatus } from '@/services/kyb-api'
import { isvStatusApiService, type ISVStatusResponse, ISVStatus } from '@/services/isv-status-api'
import { usePermissionStore } from '@/stores/permission.store'
import { Resource } from '@/shared/admin-permissions'
import {
  Check,
  Close,
  Document,
  User,
  OfficeBuilding,
  Phone,
  Message,
  ArrowLeft,
  Warning
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const actionLoading = ref(false)
const application = ref<KYBApplication | null>(null)
const activeTab = ref('company')

// ISV Status State
const isvStatus = ref<ISVStatusResponse | null>(null)
const statusLoading = ref(false)
const activateDialogVisible = ref(false)
const suspendDialogVisible = ref(false)
const banDialogVisible = ref(false)
const activateReason = ref('')
const suspendReason = ref('')
const banReason = ref('')

// Dialogs
const rejectDialogVisible = ref(false)
const requestInfoDialogVisible = ref(false)
const documentPreviewVisible = ref(false)
const previewingDocument = ref<{ name: string; url: string } | null>(null)
const rejectReason = ref('')
const requestInfoComment = ref('')

// Computed
const canApprove = computed(() => {
  return application.value?.status === KYBStatus.PENDING ||
    application.value?.status === KYBStatus.PENDING_INFO
})

const canReject = computed(() => {
  return application.value?.status === KYBStatus.PENDING ||
    application.value?.status === KYBStatus.PENDING_INFO
})

const canActivateISV = computed(() => {
  return isvStatus.value?.status === ISVStatus.SUSPENDED ||
    isvStatus.value?.status === ISVStatus.BANNED
})

const canSuspendISV = computed(() => {
  return isvStatus.value?.status === ISVStatus.ACTIVE
})

const canBanISV = computed(() => {
  return isvStatus.value?.status === ISVStatus.ACTIVE ||
    isvStatus.value?.status === ISVStatus.SUSPENDED
})

const isPreviouslyBanned = computed(() => {
  const history = isvStatus.value?.statusHistory || []
  return history.some(h => h.newStatus === ISVStatus.BANNED)
})

const hasStatusPermission = computed(() => {
  return permissionStore.hasPermission(Resource.ISV_STATUS)
})

// Methods
async function fetchApplication() {
  const id = route.params.id as string
  if (!id || !isValidUUID(id)) {
    ElMessage.error('Invalid application ID')
    router.push('/kyb')
    return
  }

  try {
    loading.value = true
    const response = await kybApiService.getApplicationById(id)

    if (response.code === 0 && response.data) {
      application.value = response.data
    } else {
      ElMessage.error('Application not found')
      router.push('/kyb')
    }
  } catch (err: any) {
    console.error('Failed to fetch application:', err)
    ElMessage.error('Failed to load application')
    router.push('/kyb')
  } finally {
    loading.value = false
  }
}

async function fetchISVStatus() {
  const id = route.params.id as string
  if (!id || !hasStatusPermission.value) return

  try {
    statusLoading.value = true
    const response = await isvStatusApiService.getISVStatus(id)

    if (response.code === 0 && response.data) {
      isvStatus.value = response.data
    }
  } catch (err: any) {
    console.error('Failed to fetch ISV status:', err)
  } finally {
    statusLoading.value = false
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

async function handleApprove() {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to approve this KYB application?',
      'Confirm Approval',
      {
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
        type: 'success'
      }
    )

    if (!application.value) return

    actionLoading.value = true
    const response = await kybApiService.approveApplication(application.value.id)

    if (response.code === 0) {
      ElMessage.success('Application approved successfully')
      await fetchApplication()
    } else {
      ElMessage.error(response.message || 'Failed to approve application')
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('Approve error:', err)
      ElMessage.error('Failed to approve application')
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('Please provide a rejection reason')
    return
  }

  if (!application.value) return

  try {
    actionLoading.value = true
    const response = await kybApiService.rejectApplication(
      application.value.id,
      rejectReason.value
    )

    if (response.code === 0) {
      ElMessage.success('Application rejected')
      rejectDialogVisible.value = false
      rejectReason.value = ''
      await fetchApplication()
    } else {
      ElMessage.error(response.message || 'Failed to reject application')
    }
  } catch (err: any) {
    console.error('Reject error:', err)
    ElMessage.error('Failed to reject application')
  } finally {
    actionLoading.value = false
  }
}

async function handleRequestInfo() {
  if (!requestInfoComment.value.trim()) {
    ElMessage.warning('Please provide details about the information needed')
    return
  }

  if (!application.value) return

  try {
    actionLoading.value = true
    const response = await kybApiService.requestInfo(
      application.value.id,
      requestInfoComment.value
    )

    if (response.code === 0) {
      ElMessage.success('Information request sent')
      requestInfoDialogVisible.value = false
      requestInfoComment.value = ''
      await fetchApplication()
    } else {
      ElMessage.error(response.message || 'Failed to send request')
    }
  } catch (err: any) {
    console.error('Request info error:', err)
    ElMessage.error('Failed to send request')
  } finally {
    actionLoading.value = false
  }
}

function getStatusType(status: KYBStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case KYBStatus.APPROVED:
      return 'success'
    case KYBStatus.PENDING:
      return 'warning'
    case KYBStatus.PENDING_INFO:
      return 'info'
    case KYBStatus.REJECTED:
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusLabel(status: KYBStatus): string {
  switch (status) {
    case KYBStatus.APPROVED:
      return 'Approved'
    case KYBStatus.PENDING:
      return 'Pending Review'
    case KYBStatus.PENDING_INFO:
      return 'Pending Information'
    case KYBStatus.REJECTED:
      return 'Rejected'
    default:
      return status
  }
}

function getISVStatusType(status: ISVStatus): 'success' | 'warning' | 'danger' | 'info' {
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

function getISVStatusLabel(status: ISVStatus): string {
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

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function previewDocument(name: string, url: string) {
  previewingDocument.value = { name, url }
  documentPreviewVisible.value = true
}

function getDocumentUrl(docUrl: string): string {
  // In production, this would construct the full URL to the document server
  return docUrl.startsWith('http') ? docUrl : `${import.meta.env.VITE_API_BASE_URL || ''}${docUrl}`
}

// ISV Status Actions
async function handleActivateISV() {
  if (!isvStatus.value) return

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
    const response = await isvStatusApiService.activateISV(isvStatus.value.id, activateReason.value)

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

async function handleSuspendISV() {
  if (!isvStatus.value) return

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
    const response = await isvStatusApiService.suspendISV(isvStatus.value.id, suspendReason.value)

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

async function handleBanISV() {
  if (!isvStatus.value || !banReason.value.trim()) {
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
    const response = await isvStatusApiService.banISV(isvStatus.value.id, banReason.value)

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
  await fetchApplication()
  await fetchISVStatus()
})
</script>

<template>
  <div class="kyb-detail-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-spinner" :size="40"><Document /></el-icon>
      <p>Loading application details...</p>
    </div>

    <!-- Content -->
    <template v-else-if="application">
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
          <h1 class="page-title">{{ application.legalName }}</h1>
          <div class="header-meta">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ application.registrationNumber }}
            </span>
            <span class="meta-item">
              <el-icon><OfficeBuilding /></el-icon>
              {{ application.jurisdiction }}
            </span>
            <el-tag :type="getStatusType(application.status)" size="small">
              {{ getStatusLabel(application.status) }}
            </el-tag>
          </div>
        </div>
        <div class="header-actions" v-if="canApprove || canReject">
          <el-button
            v-if="canApprove"
            type="success"
            :icon="Check"
            :loading="actionLoading"
            @click="handleApprove"
          >
            Approve
          </el-button>
          <el-button
            v-if="canReject"
            type="primary"
            :icon="Message"
            :loading="actionLoading"
            @click="requestInfoDialogVisible = true"
          >
            Request Info
          </el-button>
          <el-button
            v-if="canReject"
            type="danger"
            :icon="Close"
            :loading="actionLoading"
            @click="rejectDialogVisible = true"
          >
            Reject
          </el-button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Column: Application Details -->
        <div class="content-left">
          <el-card class="detail-card">
            <template #header>
              <span class="card-title">Application Details</span>
            </template>

            <el-tabs v-model="activeTab">
              <el-tab-pane label="Company" name="company">
                <div class="info-section">
                  <div class="info-row">
                    <span class="info-label">Legal Name</span>
                    <span class="info-value">{{ application.legalName }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Registration #</span>
                    <span class="info-value">{{ application.registrationNumber }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Jurisdiction</span>
                    <span class="info-value">{{ application.jurisdiction }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Date of Incorporation</span>
                    <span class="info-value">{{ application.dateOfIncorporation }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Registered Address</span>
                    <span class="info-value">{{ application.registeredAddress }}</span>
                  </div>
                  <div class="info-row" v-if="application.website">
                    <span class="info-label">Website</span>
                    <span class="info-value">{{ application.website }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Submitted</span>
                    <span class="info-value">{{ formatDate(application.submittedAt) }}</span>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="UBO" name="ubo">
                <div class="ubo-list">
                  <div
                    v-for="(ubo, index) in application.uboInfo"
                    :key="index"
                    class="ubo-card"
                  >
                    <div class="ubo-header">
                      <el-icon><User /></el-icon>
                      <span class="ubo-name">{{ ubo.name }}</span>
                    </div>
                    <div class="ubo-details">
                      <div class="ubo-detail">
                        <span class="label">ID Type:</span>
                        <span class="value">{{ ubo.idType === 'passport' ? 'Passport' : 'National ID' }}</span>
                      </div>
                      <div class="ubo-detail">
                        <span class="label">ID Number:</span>
                        <span class="value">{{ ubo.idNumber }}</span>
                      </div>
                      <div class="ubo-detail">
                        <span class="label">Nationality:</span>
                        <span class="value">{{ ubo.nationality }}</span>
                      </div>
                      <div class="ubo-detail">
                        <span class="label">Phone:</span>
                        <span class="value">{{ ubo.phone }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="Structure" name="structure">
                <div class="structure-list">
                  <div
                    v-for="(entity, index) in application.companyStructure"
                    :key="index"
                    class="structure-card"
                  >
                    <el-icon><OfficeBuilding /></el-icon>
                    <div class="structure-info">
                      <div class="structure-name">{{ entity.entityName }}</div>
                      <div class="structure-meta">
                        {{ entity.relationship }} - {{ entity.ownershipPercentage }}%
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="Contact" name="contact">
                <div class="contact-info">
                  <div class="info-row">
                    <el-icon><User /></el-icon>
                    <span class="info-value">{{ application.contactInfo.name }}</span>
                    <span class="info-sublabel">({{ application.contactInfo.position }})</span>
                  </div>
                  <div class="info-row">
                    <el-icon><Message /></el-icon>
                    <span class="info-value">{{ application.contactInfo.email }}</span>
                  </div>
                  <div class="info-row">
                    <el-icon><Phone /></el-icon>
                    <span class="info-value">{{ application.contactInfo.phone }}</span>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="hasStatusPermission" label="Status" name="status">
                <div v-if="statusLoading" class="loading-state">
                  <p>Loading status information...</p>
                </div>
                <template v-else-if="isvStatus">
                  <div class="status-section">
                    <div class="status-header">
                      <el-tag :type="getISVStatusType(isvStatus.status)" size="large">
                        {{ getISVStatusLabel(isvStatus.status) }}
                      </el-tag>
                    </div>

                    <div class="status-actions" v-if="canActivateISV || canSuspendISV || canBanISV">
                      <el-button
                        v-if="canActivateISV"
                        type="success"
                        :icon="Check"
                        :loading="actionLoading"
                        @click="activateDialogVisible = true"
                      >
                        Activate
                      </el-button>
                      <el-button
                        v-if="canSuspendISV"
                        type="warning"
                        :icon="Warning"
                        :loading="actionLoading"
                        @click="suspendDialogVisible = true"
                      >
                        Suspend
                      </el-button>
                      <el-button
                        v-if="canBanISV"
                        type="danger"
                        :icon="Close"
                        :loading="actionLoading"
                        @click="banDialogVisible = true"
                      >
                        Ban
                      </el-button>
                    </div>

                    <div class="status-info">
                      <div class="info-row">
                        <span class="info-label">Developer ID</span>
                        <span class="info-value">{{ isvStatus.developerId }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">{{ isvStatus.email }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">KYB Status</span>
                        <span class="info-value">{{ isvStatus.kybStatus }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Created</span>
                        <span class="info-value">{{ formatDate(isvStatus.createdAt) }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Last Updated</span>
                        <span class="info-value">{{ formatDate(isvStatus.updatedAt) }}</span>
                      </div>
                    </div>

                    <div class="status-history">
                      <h4>Status Change History</h4>
                      <div class="history-timeline">
                        <div
                          v-for="entry in isvStatus.statusHistory"
                          :key="entry.id"
                          class="history-entry"
                        >
                          <div class="history-marker" :class="getISVStatusType(entry.newStatus)"></div>
                          <div class="history-content">
                            <div class="history-header">
                              <el-tag :type="getISVStatusType(entry.newStatus)" size="small">
                                {{ getISVStatusLabel(entry.newStatus) }}
                              </el-tag>
                              <span class="history-time">{{ formatDate(entry.timestamp) }}</span>
                            </div>
                            <div class="history-details">
                              <span class="history-admin">
                                <el-icon><User /></el-icon>
                                {{ entry.adminId }}
                              </span>
                              <span v-if="entry.reason" class="history-reason">
                                <el-icon><Message /></el-icon>
                                {{ entry.reason }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="no-status">
                  <p>No status information available</p>
                  <el-button type="primary" @click="fetchISVStatus">Load Status</el-button>
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>

          <!-- Review History -->
          <el-card class="detail-card">
            <template #header>
              <span class="card-title">Review History</span>
            </template>
            <div class="audit-trail">
              <div
                v-for="entry in application.auditTrail"
                :key="entry.id"
                class="audit-entry"
              >
                <div class="audit-time">{{ formatDate(entry.timestamp) }}</div>
                <div class="audit-action">{{ entry.action.replace('_', ' ') }}</div>
                <div class="audit-details" v-if="entry.details">
                  {{ entry.details }}
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- Right Column: Documents -->
        <div class="content-right">
          <el-card class="document-card">
            <template #header>
              <span class="card-title">Documents</span>
            </template>
            <div class="document-list">
              <div class="document-item">
                <el-icon class="document-icon"><Document /></el-icon>
                <div class="document-info">
                  <div class="document-name">Business License</div>
                  <div class="document-meta">PDF • {{ application.registrationNumber }}.pdf</div>
                </div>
                <el-button type="primary" size="small" @click="previewDocument('Business License', application.businessLicenseUrl)">
                  Preview
                </el-button>
              </div>
              <div
                v-for="(ubo, index) in application.uboInfo"
                :key="'ubo-' + index"
                class="document-item"
              >
                <el-icon class="document-icon"><Document /></el-icon>
                <div class="document-info">
                  <div class="document-name">{{ ubo.name }} - ID Document</div>
                  <div class="document-meta">PDF • ID.pdf</div>
                </div>
                <el-button type="primary" size="small" @click="previewDocument(ubo.name + ' - ID Document', ubo.documentUrl || '')">
                  Preview
                </el-button>
              </div>
            </div>
          </el-card>

          <!-- Reviewer Info (if reviewed) -->
          <el-card v-if="application.reviewerId" class="detail-card">
            <template #header>
              <span class="card-title">Review Decision</span>
            </template>
            <div class="review-decision">
              <div class="decision-header">
                <el-tag :type="getStatusType(application.status)">
                  {{ getStatusLabel(application.status) }}
                </el-tag>
                <span class="reviewer-name">by {{ application.reviewerId }}</span>
              </div>
              <div class="review-time">{{ formatDate(application.reviewedAt!) }}</div>
              <div class="review-comment" v-if="application.reviewerComment">
                {{ application.reviewerComment }}
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </template>

    <!-- Reject Dialog -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="Reject KYB Application"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item label="Rejection Reason (Required)" required>
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="4"
            placeholder="Please provide a detailed reason for rejection..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">Cancel</el-button>
        <el-button
          type="danger"
          :loading="actionLoading"
          :disabled="!rejectReason.trim()"
          @click="handleReject"
        >
          Reject Application
        </el-button>
      </template>
    </el-dialog>

    <!-- Request Info Dialog -->
    <el-dialog
      v-model="requestInfoDialogVisible"
      title="Request Additional Information"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item label="Information Requested (Required)" required>
          <el-input
            v-model="requestInfoComment"
            type="textarea"
            :rows="4"
            placeholder="Please describe what additional information is needed..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requestInfoDialogVisible = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="actionLoading"
          :disabled="!requestInfoComment.trim()"
          @click="handleRequestInfo"
        >
          Send Request
        </el-button>
      </template>
    </el-dialog>

    <!-- Document Preview Dialog -->
    <el-dialog
      v-model="documentPreviewVisible"
      :title="previewingDocument?.name || 'Document Preview'"
      width="640px"
    >
      <div class="document-preview-container">
        <div v-if="previewingDocument?.url" class="preview-content">
          <el-icon :size="48" class="preview-icon"><Document /></el-icon>
          <p class="preview-filename">{{ previewingDocument.name }}</p>
          <el-link :href="getDocumentUrl(previewingDocument.url)" target="_blank" type="primary">
            Open Document in New Tab
          </el-link>
        </div>
        <el-empty v-else description="No document available" />
      </div>
    </el-dialog>

    <!-- Activate ISV Dialog -->
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
          @click="handleActivateISV"
        >
          Activate ISV
        </el-button>
      </template>
    </el-dialog>

    <!-- Suspend ISV Dialog -->
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
          @click="handleSuspendISV"
        >
          Suspend ISV
        </el-button>
      </template>
    </el-dialog>

    <!-- Ban ISV Dialog -->
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
          @click="handleBanISV"
        >
          Ban ISV
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.kyb-detail-container {
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

.detail-card, .document-card {
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

.info-sublabel {
  color: #8c8c8c;
  font-size: 14px;
  margin-left: 4px;
}

.ubo-list, .structure-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ubo-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.ubo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 12px;
}

.ubo-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.ubo-detail .label {
  display: block;
  font-size: 12px;
  color: #8c8c8c;
}

.ubo-detail .value {
  font-size: 14px;
  color: #1a1a1a;
}

.structure-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.structure-info {
  flex: 1;
}

.structure-name {
  font-weight: 500;
}

.structure-meta {
  font-size: 13px;
  color: #8c8c8c;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contact-info .info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.audit-trail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audit-entry {
  border-left: 3px solid #e8e8e8;
  padding-left: 16px;
  padding-bottom: 16px;
}

.audit-entry:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.audit-time {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.audit-action {
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.audit-details {
  font-size: 14px;
  color: #595959;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.document-icon {
  font-size: 24px;
  color: #8c8c8c;
}

.document-info {
  flex: 1;
}

.document-name {
  font-weight: 500;
  font-size: 14px;
}

.document-meta {
  font-size: 12px;
  color: #8c8c8c;
}

.review-decision {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.decision-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-name {
  font-size: 14px;
  color: #8c8c8c;
}

.review-time {
  font-size: 13px;
  color: #8c8c8c;
}

.review-comment {
  margin-top: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
}

.document-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  min-height: 200px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.preview-icon {
  color: #8c8c8c;
}

.preview-filename {
  font-size: 14px;
  color: #595959;
  margin: 0;
}

/* ISV Status Section Styles */
.status-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-history h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-entry {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-left: 2px solid #e8e8e8;
  padding-left: 16px;
  margin-left: 8px;
}

.history-entry:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.history-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  left: -6px;
  background: #e8e8e8;
}

.history-marker.success { background: #52c41a; }
.history-marker.warning { background: #fa8c16; }
.history-marker.danger { background: #ff4d4f; }

.history-content {
  flex: 1;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.history-time {
  font-size: 12px;
  color: #8c8c8c;
}

.history-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #595959;
}

.history-admin, .history-reason {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-state {
  padding: 32px;
  text-align: center;
  color: #8c8c8c;
}

.no-status {
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
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
