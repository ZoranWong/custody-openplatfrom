<!--
  日志设置抽屉：原始日志保留天数 + 错误预警配置 + 告警历史。
  入口在“日志追踪”页右上角。
-->
<template>
  <ElDrawer
    v-model="visible"
    :title="$t('developer.apiLogSettings.title')"
    size="620px"
    :destroy-on-close="true"
    @open="loadAll"
  >
    <div v-loading="loading" class="log-settings">
      <!-- 日志保留 -->
      <section class="art-card p-5 mb-4">
        <h4 class="mb-1">{{ $t('developer.apiLogSettings.retentionTitle') }}</h4>
        <p class="text-xs text-gray-400 mb-4">{{ $t('developer.apiLogSettings.retentionHint') }}</p>
        <ElForm label-width="120px">
          <ElFormItem :label="$t('developer.apiLogSettings.retentionDays')">
            <div class="flex items-center gap-2">
              <ElInputNumber
                v-model="form.logRetentionDays"
                :min="1"
                :max="maxLogRetentionDays"
                :step="1"
                step-strictly
              />
              <span class="text-sm text-gray-400">
                {{ $t('developer.apiLogSettings.retentionRange', { max: maxLogRetentionDays }) }}
              </span>
            </div>
          </ElFormItem>
        </ElForm>
        <p v-if="cappedByPackage" class="text-xs text-orange-500">
          {{ $t('developer.apiLogSettings.capped', { effective: effectiveDays, configured: form.logRetentionDays }) }}
        </p>
      </section>

      <!-- 错误预警 -->
      <section class="art-card p-5 mb-4">
        <h4 class="mb-4">{{ $t('developer.settings.alertTitle') }}</h4>
        <ElForm :model="form" label-width="120px">
          <ElFormItem :label="$t('developer.settings.alertEnabled')">
            <ElSwitch v-model="form.enabled" />
          </ElFormItem>
          <ElFormItem :label="$t('developer.settings.alertEmail')">
            <ElInput v-model="form.alertEmail" placeholder="dev@example.com" />
          </ElFormItem>
          <ElFormItem :label="$t('developer.settings.windowSeconds')">
            <ElInputNumber v-model="form.windowSeconds" :min="60" :step="60" />
            <span class="ml-2 text-sm text-gray-400">{{ $t('developer.settings.windowHint') }}</span>
          </ElFormItem>
          <ElFormItem :label="$t('developer.settings.errorThreshold')">
            <ElInputNumber v-model="form.errorThreshold" :min="1" :step="1" />
          </ElFormItem>
          <ElFormItem :label="$t('developer.settings.cooldownSeconds')">
            <ElInputNumber v-model="form.cooldownSeconds" :min="60" :step="60" />
            <span class="ml-2 text-sm text-gray-400">{{ $t('developer.settings.cooldownHint') }}</span>
          </ElFormItem>
        </ElForm>
      </section>

      <div class="mb-4">
        <ElButton type="primary" :loading="saving" @click="handleSave">
          {{ $t('developer.settings.save') }}
        </ElButton>
      </div>

      <!-- 告警历史 -->
      <section class="art-card p-5">
        <h4 class="mb-4">{{ $t('developer.settings.alertHistory') }}</h4>
        <ElTable :data="events" size="small" stripe v-loading="eventsLoading">
          <ElTableColumn
            prop="windowEnd"
            :label="$t('developer.settings.windowEnd')"
            width="160"
          >
            <template #default="{ row }">{{ formatDate(row.windowEnd, 'datetime', locale) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="errorCount" :label="$t('developer.settings.errorCount')" width="80" />
          <ElTableColumn prop="totalCount" :label="$t('developer.settings.totalCount')" width="80" />
          <ElTableColumn
            prop="sent"
            :label="$t('developer.settings.sent')"
            width="70"
            align="center"
          >
            <template #default="{ row }">
              <ElTag :type="row.sent ? 'success' : 'danger'" size="small">
                {{ row.sent ? $t('developer.settings.yes') : $t('developer.settings.no') }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="createdAt"
            :label="$t('developer.settings.createdAt')"
            width="160"
          >
            <template #default="{ row }">{{ formatDate(row.createdAt, 'datetime', locale) }}</template>
          </ElTableColumn>
        </ElTable>
        <ElPagination
          v-if="eventTotal > 0"
          :current-page="eventPage"
          :page-size="eventPageSize"
          :total="eventTotal"
          layout="prev, pager, next"
          class="mt-4 flex justify-end"
          @current-change="loadEvents"
        />
      </section>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApiLogSettingsDrawer' })

  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { formatDate } from '@/utils/date'
  import { fetchAlertSettings, updateAlertSettings, fetchAlertEvents } from '@/api/billing'

  const visible = defineModel<boolean>({ default: false })
  const emit = defineEmits<{ (e: 'saved'): void }>()

  const { t, locale } = useI18n()

  const loading = ref(false)
  const saving = ref(false)
  const maxLogRetentionDays = ref(3)
  const effectiveDays = ref(3)

  const form = ref({
    alertEmail: '',
    enabled: false,
    windowSeconds: 300,
    errorThreshold: 10,
    cooldownSeconds: 3600,
    logRetentionDays: 3,
  })

  const events = ref<any[]>([])
  const eventsLoading = ref(false)
  const eventPage = ref(1)
  const eventPageSize = 20
  const eventTotal = ref(0)

  /** The package ceiling clamps what the rollup actually keeps. */
  const cappedByPackage = computed(() => effectiveDays.value < form.value.logRetentionDays)

  const loadSettings = async () => {
    const res = (await fetchAlertSettings()) as any
    form.value.alertEmail = res?.alertEmail ?? ''
    form.value.enabled = res?.enabled ?? false
    form.value.windowSeconds = res?.windowSeconds ?? 300
    form.value.errorThreshold = res?.errorThreshold ?? 10
    form.value.cooldownSeconds = res?.cooldownSeconds ?? 3600
    maxLogRetentionDays.value = res?.maxLogRetentionDays ?? 3
    effectiveDays.value = res?.effectiveLogRetentionDays ?? form.value.logRetentionDays
    form.value.logRetentionDays = res?.logRetentionDays ?? effectiveDays.value
  }

  const loadEvents = async (page = 1) => {
    eventPage.value = page
    eventsLoading.value = true
    try {
      const res = (await fetchAlertEvents({ page, pageSize: eventPageSize })) as any
      events.value = res?.list ?? []
      eventTotal.value = res?.total ?? 0
    } catch {
      events.value = []
      eventTotal.value = 0
    } finally {
      eventsLoading.value = false
    }
  }

  const loadAll = async () => {
    loading.value = true
    try {
      await loadSettings()
      await loadEvents()
    } catch {
      // settings not yet configured — defaults are already in the form
    } finally {
      loading.value = false
    }
  }

  const handleSave = async () => {
    if (form.value.enabled && form.value.alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.alertEmail)) {
      ElMessage.warning(t('developer.settings.invalidEmail'))
      return
    }
    saving.value = true
    try {
      await updateAlertSettings(form.value)
      ElMessage.success(t('developer.settings.saved'))
      await loadSettings()
      emit('saved')
    } catch {
      ElMessage.error(t('common.saveFailed'))
    } finally {
      saving.value = false
    }
  }
</script>
