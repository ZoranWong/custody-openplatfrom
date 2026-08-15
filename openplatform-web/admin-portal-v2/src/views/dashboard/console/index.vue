<!-- 仪表盘页面 -->
<template>
  <div v-loading="loading">
    <!-- 统计卡片区域 -->
    <ElRow :gutter="20">
      <ElCol v-for="item in statCards" :key="item.key" :sm="12" :md="6" :lg="6">
        <ArtStatsCard
          class="mb-5"
          :icon="item.icon"
          :icon-style="item.iconStyle"
          :title="item.title"
          :count="item.count"
          :description="item.description"
          :show-arrow="true"
        />
      </ElCol>
    </ElRow>

    <!-- 趋势图表区域 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>API 调用趋势</h4>
              <p>近30天调用量统计</p>
            </div>
          </div>
          <ArtLineChart
            height="280px"
            :data="apiCallsTrend"
            :x-axis-data="trendDates"
            :show-area-color="true"
            :show-axis-line="false"
          />
        </div>
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>错误率趋势</h4>
              <p>近30天错误率变化</p>
            </div>
          </div>
          <ArtLineChart
            height="280px"
            :data="errorRateTrend"
            :x-axis-data="trendDates"
            :show-area-color="true"
            :show-axis-line="false"
            :colors="['#f56c6c']"
          />
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { fetchDashboardStats, fetchDashboardTrends } from '@/api/dashboard'

defineOptions({ name: 'DashboardConsole' })

const stats = ref<any>({})
const trends = ref<any>({ apiCalls: [], errorRate: [] })
const loading = ref(true)

/** 统计卡片配置 */
const statCards = computed(() => [
  {
    key: 'developers',
    icon: 'ri:user-settings-line',
    iconStyle: 'bg-blue-500',
    title: '开发者',
    count: stats.value.developerTotal ?? 0,
    description: '注册开发者总数'
  },
  {
    key: 'apps',
    icon: 'ri:apps-line',
    iconStyle: 'bg-green-500',
    title: '应用',
    count: stats.value.appTotal ?? 0,
    description: '已创建应用总数'
  },
  {
    key: 'pending',
    icon: 'ri:file-list-3-line',
    iconStyle: 'bg-orange-500',
    title: '待审核',
    count: stats.value.pendingTotal ?? 0,
    description: '待审核申请数'
  },
  {
    key: 'apiCalls',
    icon: 'ri:bar-chart-line',
    iconStyle: 'bg-purple-500',
    title: 'API 调用量',
    count: stats.value.apiCallsToday ?? 0,
    description: '今日调用量',
    separator: ','
  }
])

/** 趋势日期 */
const trendDates = computed(() => {
  return trends.value.dates ?? []
})

/** API 调用趋势数据 */
const apiCallsTrend = computed(() => {
  return trends.value.apiCalls ?? []
})

/** 错误率趋势数据 */
const errorRateTrend = computed(() => {
  return trends.value.errorRate ?? []
})

onMounted(async () => {
  try {
    const [statsData, trendsData] = await Promise.all([
      fetchDashboardStats(),
      fetchDashboardTrends()
    ])
    stats.value = statsData
    trends.value = trendsData
  } finally {
    loading.value = false
  }
})
</script>