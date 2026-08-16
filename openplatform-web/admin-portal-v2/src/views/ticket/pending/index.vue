<template>
  <div class="ticket-pending-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElSelect
              v-model="searchForm.status"
              placeholder="工单状态"
              clearable
              class="w-32"
              @change="handleSearch"
            >
              <ElOption label="待处理" value="pending" />
              <ElOption label="处理中" value="in_progress" />
              <ElOption label="已解决" value="resolved" />
              <ElOption label="已关闭" value="closed" />
            </ElSelect>
            <ElSelect
              v-model="searchForm.type"
              placeholder="工单类型"
              clearable
              class="w-32"
              @change="handleSearch"
            >
              <ElOption label="技术问题" value="technical" />
              <ElOption label="账单问题" value="billing" />
              <ElOption label="账号问题" value="account" />
              <ElOption label="其他" value="other" />
            </ElSelect>
            <ElSelect
              v-model="searchForm.priority"
              placeholder="优先级"
              clearable
              class="w-28"
              @change="handleSearch"
            >
              <ElOption label="低" value="low" />
              <ElOption label="普通" value="normal" />
              <ElOption label="高" value="high" />
              <ElOption label="紧急" value="urgent" />
            </ElSelect>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- Detail Dialog -->
    <ElDialog
      v-model="detailVisible"
      title="工单详情"
      width="720px"
      :close-on-click-modal="false"
    >
      <template v-if="currentTicket">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="标题">{{ currentTicket.title }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="TICKET_STATUS_MAP[currentTicket.status]?.type || 'info'">
              {{ TICKET_STATUS_MAP[currentTicket.status]?.text || currentTicket.status }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="类型">
            {{ TICKET_TYPE_MAP[currentTicket.type] || currentTicket.type }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="优先级">
            <ElTag :type="PRIORITY_MAP[currentTicket.priority]?.type || 'info'">
              {{ PRIORITY_MAP[currentTicket.priority]?.text || currentTicket.priority }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间" :span="2">{{ currentTicket.createdAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="描述" :span="2">{{ currentTicket.description }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElDivider />
        <div class="mb-4">
          <strong>回复记录 ({{ currentTicket.replies?.length || 0 }})</strong>
        </div>
        <div v-if="currentTicket.replies?.length" class="replies-container">
          <div
            v-for="reply in currentTicket.replies"
            :key="reply.id"
            class="reply-item mb-3 p-3 rounded"
            :class="reply.isAdmin ? 'bg-blue-50' : 'bg-gray-50'"
          >
            <div class="flex items-center justify-between mb-1">
              <ElTag :type="reply.isAdmin ? 'primary' : 'info'" size="small">
                {{ reply.isAdmin ? '管理员' : '用户' }}
              </ElTag>
              <span class="text-xs text-gray-400">{{ reply.createdAt }}</span>
            </div>
            <div class="text-sm">{{ reply.content }}</div>
          </div>
        </div>
        <ElEmpty v-else description="暂无回复" />
        <ElDivider />
        <div class="flex gap-2">
          <ElInput
            v-model="replyContent"
            type="textarea"
            :rows="3"
            placeholder="输入回复内容..."
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <ElSpace>
            <ElSelect
              v-model="newStatus"
              placeholder="更改状态"
              class="w-28"
            >
              <ElOption label="待处理" value="pending" />
              <ElOption label="处理中" value="in_progress" />
              <ElOption label="已解决" value="resolved" />
              <ElOption label="已关闭" value="closed" />
            </ElSelect>
            <ElButton type="warning" @click="handleUpdateStatus">更新状态</ElButton>
          </ElSpace>
          <ElSpace>
            <ElButton @click="detailVisible = false">关闭</ElButton>
            <ElButton type="primary" :loading="replyLoading" @click="handleReply">回复</ElButton>
          </ElSpace>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'TicketPending' })

import { useTable } from '@/hooks/core/useTable'
import { fetchTickets, fetchTicketById, fetchAddTicketReply, fetchUpdateTicketStatus } from '@/api/subscription'
import { ElTag, ElButton, ElMessage } from 'element-plus'

const TICKET_STATUS_MAP: Record<string, { type: 'warning' | 'primary' | 'success' | 'info' | 'danger'; text: string }> = {
  pending: { type: 'warning', text: '待处理' },
  in_progress: { type: 'primary', text: '处理中' },
  resolved: { type: 'success', text: '已解决' },
  closed: { type: 'info', text: '已关闭' },
}

const TICKET_TYPE_MAP: Record<string, string> = {
  technical: '技术问题',
  billing: '账单问题',
  account: '账号问题',
  other: '其他',
}

const PRIORITY_MAP: Record<string, { type: 'warning' | 'success' | 'info' | 'danger'; text: string }> = {
  low: { type: 'info', text: '低' },
  normal: { type: 'info', text: '普通' },
  high: { type: 'warning', text: '高' },
  urgent: { type: 'danger', text: '紧急' },
}

const searchForm = ref({
  status: undefined as string | undefined,
  type: undefined as string | undefined,
  priority: undefined as string | undefined,
})

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  getData,
  replaceSearchParams,
  handleSizeChange,
  handleCurrentChange,
  refreshData,
} = useTable({
  core: {
    apiFn: fetchTickets,
    apiParams: {
      page: 1,
      pageSize: 20,
    },
    paginationKey: {
      current: 'page',
      size: 'pageSize',
    },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '序号' },
      { prop: 'title', label: '标题', minWidth: 200 },
      {
        prop: 'type',
        label: '类型',
        width: 100,
        formatter: (row: any) => TICKET_TYPE_MAP[row.type] || row.type,
      },
      {
        prop: 'priority',
        label: '优先级',
        width: 80,
        formatter: (row: any) => {
          const config = PRIORITY_MAP[row.priority] || { type: 'info', text: row.priority }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      {
        prop: 'status',
        label: '状态',
        width: 100,
        formatter: (row: any) => {
          const config = TICKET_STATUS_MAP[row.status] || { type: 'info', text: row.status }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'replyCount', label: '回复数', width: 80 },
      { prop: 'createdAt', label: '创建时间', width: 180 },
      {
        label: '操作',
        width: 120,
        fixed: 'right',
        formatter: (row: any) => {
          return h(ElButton, { type: 'primary', size: 'small', onClick: () => handleViewDetail(row) }, () => '查看详情')
        },
      },
    ],
  },
})

// Detail dialog
const detailVisible = ref(false)
const currentTicket = ref<any>(null)
const replyContent = ref('')
const replyLoading = ref(false)
const newStatus = ref('')

const handleViewDetail = async (row: any) => {
  try {
    const response = await fetchTicketById(row.id)
    if (response) {
      currentTicket.value = response
      newStatus.value = response.status
      replyContent.value = ''
      detailVisible.value = true
    }
  } catch {
    // error handled by interceptor
  }
}

const handleReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!currentTicket.value) return
  replyLoading.value = true
  try {
    await fetchAddTicketReply(currentTicket.value.id, replyContent.value)
    ElMessage.success('回复成功')
    replyContent.value = ''
    // Refresh ticket detail
    const response = await fetchTicketById(currentTicket.value.id)
    if (response) {
      currentTicket.value = response
    }
    refreshData()
  } catch {
    // error handled by interceptor
  } finally {
    replyLoading.value = false
  }
}

const handleUpdateStatus = async () => {
  if (!newStatus.value || !currentTicket.value) return
  try {
    await fetchUpdateTicketStatus(currentTicket.value.id, newStatus.value)
    ElMessage.success('状态更新成功')
    const response = await fetchTicketById(currentTicket.value.id)
    if (response) {
      currentTicket.value = response
    }
    refreshData()
  } catch {
    // error handled by interceptor
  }
}

const handleSearch = () => {
  replaceSearchParams({
    status: searchForm.value.status,
    type: searchForm.value.type,
    priority: searchForm.value.priority,
  })
}
</script>

<style scoped>
.replies-container {
  max-height: 300px;
  overflow-y: auto;
}
</style>