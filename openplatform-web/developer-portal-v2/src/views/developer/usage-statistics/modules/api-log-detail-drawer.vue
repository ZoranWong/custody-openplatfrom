<!--
  API 调用日志详情抽屉
  展示单次调用的请求体、响应体、耗时、错误与追踪信息。
-->
<template>
  <ElDrawer
    v-model="visible"
    :title="$t('developer.billing.apiLogDetail.title')"
    size="640px"
    :destroy-on-close="true"
    @closed="emit('closed')"
  >
    <div v-loading="loading" class="api-log-detail">
      <template v-if="detail">
        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.status')">
            <ElTag :type="statusTagType" size="small">{{ detail.responseStatus ?? '-' }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.responseTime')">
            {{ detail.responseTime != null ? `${detail.responseTime}ms` : '-' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.method')">
            {{ detail.method }}
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.createdAt')">
            {{ formatDate(detail.createdAt, 'datetime', locale) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.endpoint')" :span="2">
            <span class="mono">{{ detail.endpoint }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.ipAddress')">
            {{ detail.ipAddress || '-' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.traceId')">
            <span class="mono">{{ detail.traceId || '-' }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.apiLogDetail.userAgent')" :span="2">
            <span class="break-all">{{ detail.userAgent || '-' }}</span>
          </ElDescriptionsItem>
        </ElDescriptions>

        <section class="detail-section">
          <header class="detail-section__header">
            <h4>{{ $t('developer.billing.apiLogDetail.requestBody') }}</h4>
            <ElButton link type="primary" size="small" @click="copy(requestJson)">
              {{ $t('developer.billing.apiLogDetail.copy') }}
            </ElButton>
          </header>
          <pre class="detail-code">{{ requestJson }}</pre>
        </section>

        <section class="detail-section">
          <header class="detail-section__header">
            <h4>{{ $t('developer.billing.apiLogDetail.responseBody') }}</h4>
            <ElButton link type="primary" size="small" @click="copy(responseJson)">
              {{ $t('developer.billing.apiLogDetail.copy') }}
            </ElButton>
          </header>
          <pre class="detail-code" :class="{ 'is-error': detail.isError }">{{ responseJson }}</pre>
        </section>

        <section v-if="headersJson" class="detail-section">
          <header class="detail-section__header">
            <h4>{{ $t('developer.billing.apiLogDetail.requestHeaders') }}</h4>
          </header>
          <pre class="detail-code">{{ headersJson }}</pre>
        </section>
      </template>
    </div>

    <template #footer>
      <ElButton @click="visible = false">{{ $t('developer.billing.apiLogDetail.close') }}</ElButton>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import { fetchApiLogDetail } from '@/api/billing'
  import { formatDate } from '@/utils/date'

  defineOptions({ name: 'ApiLogDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    logId?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'closed'): void
  }>()

  const { t, locale } = useI18n()

  const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
  })

  const detail = ref<Record<string, any> | null>(null)
  const loading = ref(false)

  const statusTagType = computed(() => {
    const status = detail.value?.responseStatus ?? 0
    if (status >= 500) return 'danger'
    if (status >= 400) return 'warning'
    return 'success'
  })

  const toPrettyJson = (value: unknown) => {
    if (value === null || value === undefined) return t('developer.billing.apiLogDetail.empty')
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  const requestJson = computed(() => toPrettyJson(detail.value?.requestBody))
  const responseJson = computed(() => toPrettyJson(detail.value?.responseBody))
  const headersJson = computed(() => {
    const headers = detail.value?.requestHeaders
    if (!headers || (typeof headers === 'object' && Object.keys(headers).length === 0)) return ''
    return toPrettyJson(headers)
  })

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success(t('developer.billing.apiLogDetail.copied'))
    } catch {
      ElMessage.warning(t('developer.billing.apiLogDetail.empty'))
    }
  }

  watch(
    () => [props.modelValue, props.logId] as const,
    async ([open, id]) => {
      if (!open || !id) return
      loading.value = true
      detail.value = null
      try {
        detail.value = await fetchApiLogDetail(id)
      } finally {
        loading.value = false
      }
    },
    { immediate: true }
  )
</script>

<style scoped>
  .api-log-detail {
    min-height: 200px;
  }

  .detail-section {
    margin-bottom: 16px;
  }

  .detail-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .detail-section__header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .detail-code {
    max-height: 320px;
    margin: 0;
    padding: 12px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
  }

  .detail-code.is-error {
    color: var(--el-color-danger);
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }

  .break-all {
    word-break: break-all;
  }
</style>
