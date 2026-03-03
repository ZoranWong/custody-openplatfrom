<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { OfficeBuilding, CreditCard, UserFilled, Clock, ArrowRight } from '@element-plus/icons-vue'
import { applicationTypeConfig, type Application } from '@/services/api'

interface Props {
  application: Application
}

const props = defineProps<Props>()

const router = useRouter()

const statusConfig = computed(() => {
  const configs: Record<string, { type: string; text: string }> = {
    pending_review: { type: 'warning', text: '审核中' },
    active: { type: 'success', text: '已启用' },
    inactive: { type: 'info', text: '已停用' },
    suspended: { type: 'danger', text: '已暂停' }
  }
  return configs[props.application.status] || configs.pending_review
})

const typeConfig = computed(() => {
  return applicationTypeConfig[props.application.type] || applicationTypeConfig.corporate
})

const typeGradient = computed(() => {
  const gradients: Record<string, string> = {
    amber: 'from-amber-500 to-amber-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600'
  }
  return gradients[typeConfig.value.color] || gradients.amber
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const handleClick = () => {
  router.push(`/applications/${props.application.id}`)
}
</script>

<template>
  <div
    class="card p-4 hover:shadow-md transition-shadow cursor-pointer"
    @click="handleClick"
  >
    <div class="flex items-center justify-between">
      <!-- Left: App Info -->
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <!-- Type Icon -->
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="typeGradient"
        >
          <el-icon class="w-6 h-6 text-white">
            <OfficeBuilding v-if="application.type === 'corporate'" />
            <CreditCard v-else-if="application.type === 'payment'" />
            <UserFilled v-else />
          </el-icon>
        </div>

        <!-- Details -->
        <div class="min-w-0 flex-1">
          <h3 class="text-lg font-medium text-gray-900 truncate">
            {{ application.name }}
          </h3>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-sm text-gray-500 font-mono">
              {{ application.appId }}
            </span>
            <el-tag :type="statusConfig.type" size="small">
              {{ statusConfig.text }}
            </el-tag>
            <el-tag type="info" size="small" effect="plain">
              {{ typeConfig.label }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- Right: Date & Arrow -->
      <div class="flex items-center gap-4 flex-shrink-0">
        <div class="flex items-center gap-1 text-gray-400 text-sm">
          <el-icon><Clock /></el-icon>
          <span>{{ formatDate(application.createdAt) }}</span>
        </div>
        <el-icon class="w-5 h-5 text-gray-400">
          <ArrowRight />
        </el-icon>
      </div>
    </div>
  </div>
</template>
