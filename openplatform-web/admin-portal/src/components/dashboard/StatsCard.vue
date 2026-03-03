<template>
  <el-card class="stats-card" shadow="hover">
    <div class="stats-content">
      <div class="stats-icon" :style="{ backgroundColor: iconBgColor }">
        <el-icon :size="24" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stats-info">
        <div class="stats-value">{{ formattedValue }}</div>
        <div class="stats-label">{{ label }}</div>
      </div>
    </div>
    <div v-if="trend !== undefined" class="stats-trend" :class="trendClass">
      <el-icon v-if="trend >= 0"><ArrowUp /></el-icon>
      <el-icon v-else><ArrowDown /></el-icon>
      <span>{{ Math.abs(trend) }}%</span>
      <span class="trend-label">vs last period</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown, User, Folder, Clock, Connection, Warning } from '@element-plus/icons-vue'

const props = defineProps<{
  label: string
  value: number | string
  icon?: string
  trend?: number
  iconBgColor?: string
  iconColor?: string
  format?: 'number' | 'percent' | 'currency'
}>()

const icons: Record<string, any> = {
  user: User,
  folder: Folder,
  clock: Clock,
  connection: Connection,
  warning: Warning
}

const icon = computed(() => {
  return props.icon ? icons[props.icon] || User : User
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  switch (props.format) {
    case 'percent':
      return `${props.value.toFixed(2)}%`
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(props.value)
    default:
      return new Intl.NumberFormat('en-US').format(props.value)
  }
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'trend-up' : 'trend-down'
})
</script>

<style scoped>
.stats-card {
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e6f4ff;
  color: #1677ff;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.2;
}

.stats-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-top: 4px;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #ff4d4f;
}

.trend-label {
  color: #8c8c8c;
  font-weight: 400;
  margin-left: 4px;
}
</style>
