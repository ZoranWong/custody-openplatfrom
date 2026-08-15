<template>
  <div class="developer-list-page art-full-height">
    <ElCard class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElSelect
              v-model="searchForm.kybStatus"
              placeholder="KYB状态"
              clearable
              class="w-36"
              @change="handleSearch"
            >
              <ElOption label="待审核" value="pending" />
              <ElOption label="已通过" value="approved" />
              <ElOption label="已拒绝" value="rejected" />
            </ElSelect>
            <ElSelect
              v-model="searchForm.status"
              placeholder="账号状态"
              clearable
              class="w-36"
              @change="handleSearch"
            >
              <ElOption label="正常" value="active" />
              <ElOption label="已冻结" value="suspended" />
              <ElOption label="已封禁" value="banned" />
            </ElSelect>
            <ElInput
              v-model="searchForm.keyword"
              placeholder="搜索名称/邮箱/注册号"
              clearable
              class="w-60"
              @input="handleSearchDebounced"
              @clear="handleSearch"
            />
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
        @row-click="handleRowClick"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperList' })

import { useTable } from '@/hooks/core/useTable'
import { fetchDevelopers } from '@/api/developer'
import { useRouter } from 'vue-router'
import { ElTag } from 'element-plus'

const router = useRouter()

const KYB_STATUS_MAP: Record<string, { type: 'warning' | 'success' | 'danger' | 'info'; text: string }> = {
  pending: { type: 'warning', text: '待审核' },
  approved: { type: 'success', text: '已通过' },
  rejected: { type: 'danger', text: '已拒绝' },
}

const STATUS_MAP: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  active: { type: 'success', text: '正常' },
  suspended: { type: 'warning', text: '已冻结' },
  banned: { type: 'danger', text: '已封禁' },
}

const searchForm = ref({
  kybStatus: undefined as string | undefined,
  status: undefined as string | undefined,
  keyword: undefined as string | undefined,
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
    apiFn: fetchDevelopers,
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
      { prop: 'legalName', label: '公司名称', minWidth: 200 },
      { prop: 'contactEmail', label: '邮箱', width: 220 },
      { prop: 'registrationNumber', label: '注册号', width: 160 },
      { prop: 'jurisdiction', label: '注册地', width: 120 },
      {
        prop: 'kybStatus',
        label: 'KYB状态',
        width: 100,
        formatter: (row: any) => {
          const config = KYB_STATUS_MAP[row.kybStatus] || { type: 'info' as const, text: row.kybStatus }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      {
        prop: 'status',
        label: '账号状态',
        width: 100,
        formatter: (row: any) => {
          const config = STATUS_MAP[row.status] || { type: 'info' as const, text: row.status }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'createdAt', label: '注册时间', width: 180 },
    ] as any,
  },
})

const handleSearch = () => {
  replaceSearchParams({
    ...searchForm.value,
    page: undefined,
    pageSize: undefined,
  })
  getData()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
const handleSearchDebounced = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

const handleRowClick = (row: any) => {
  router.push({ name: 'DeveloperDetail', params: { id: row.id } })
}
</script>