<!-- API 统计页面 -->
<template>
  <div v-loading="loading" class="api-stats-page art-full-height">
    <!-- 统计卡片区域 -->
    <ElRow :gutter="20">
      <ElCol :sm="12" :md="8" :lg="8">
        <ArtStatsCard
          class="mb-5"
          icon="ri:flashlight-line"
          :icon-style="'bg-blue-500'"
          title="今日调用"
          :count="summary.todayCalls ?? 0"
          description="今日 API 调用总量"
          :show-arrow="false"
        />
      </ElCol>
      <ElCol :sm="12" :md="8" :lg="8">
        <ArtStatsCard
          class="mb-5"
          icon="ri:calendar-line"
          :icon-style="'bg-green-500'"
          title="本周调用"
          :count="summary.weekCalls ?? 0"
          description="本周 API 调用总量"
          :show-arrow="false"
        />
      </ElCol>
      <ElCol :sm="12" :md="8" :lg="8">
        <ArtStatsCard
          class="mb-5"
          icon="ri:pie-chart-line"
          :icon-style="'bg-purple-500'"
          title="本月调用"
          :count="summary.monthCalls ?? 0"
          description="本月 API 调用总量"
          :show-arrow="false"
        />
      </ElCol>
    </ElRow>

    <!-- 图表区域 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>Top 应用</h4>
              <p>调用量排名靠前的应用</p>
            </div>
          </div>
          <ArtBarChart
            height="280px"
            :data="topAppsData"
            :x-axis-data="topAppsNames"
            :show-axis-line="false"
          />
        </div>
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>响应时间趋势</h4>
              <p>近30天平均响应时间变化</p>
            </div>
          </div>
          <ArtLineChart
            height="280px"
            :data="responseTimeTrendData"
            :x-axis-data="responseTimeTrendDates"
            :show-area-color="true"
            :show-axis-line="false"
            :colors="['#67c23a']"
          />
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { fetchAPIStatsSummary, fetchAPITopApps, fetchAPIResponseTimeTrend } from '@/api/stats'

defineOptions({ name: 'APIStats' })

const summary = ref<Record<string, any>>({})
const topApps = ref<any[]>([])
const responseTimeTrend = ref<Record<string, any>>({})
const loading = ref(true)

const topAppsData = computed(() => {
  return topApps.value.map((item: any) => item.callCount ?? item.count ?? 0)
})

const topAppsNames = computed(() => {
  return topApps.value.map((item: any) => item.appName ?? item.name ?? '')
})

const responseTimeTrendData = computed(() => {
  return responseTimeTrend.value.data ?? []
})

const responseTimeTrendDates = computed(() => {
  return responseTimeTrend.value.dates ?? []
})

onMounted(async () => {
  try {
    const [summaryData, topAppsData, responseTimeData] = await Promise.all([
      fetchAPIStatsSummary(),
      fetchAPITopApps(),
      fetchAPIResponseTimeTrend()
    ])
    summary.value = summaryData
    topApps.value = topAppsData ?? []
    responseTimeTrend.value = responseTimeData
  } finally {
    loading.value = false
  }
})
</script>