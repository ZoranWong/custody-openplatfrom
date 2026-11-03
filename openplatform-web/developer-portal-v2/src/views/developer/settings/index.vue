<!--
  Developer Alert Settings: error alert email configuration + history
-->
<template>
  <div class="settings-page" style="padding: 24px; overflow-y: auto; height: 100%;">
    <h2 class="text-lg font-semibold mb-4">{{ $t('menus.developer.settings') }}</h2>

    <!-- Alert Settings -->
    <div class="art-card p-6 mb-6">
      <h3 class="text-base font-medium mb-4">{{ $t('developer.settings.alertTitle') }}</h3>
      <ElForm :model="form" label-width="120px" class="max-w-xl">
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
        <ElFormItem>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ $t('developer.settings.save') }}
          </ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <!-- Alert History -->
    <div class="art-card p-6">
      <h3 class="text-base font-medium mb-4">{{ $t('developer.settings.alertHistory') }}</h3>
      <ElTable :data="events" size="small" stripe v-loading="eventsLoading">
        <ElTableColumn
          prop="windowEnd"
          :label="$t('developer.settings.windowEnd')"
          width="180"
        >
          <template #default="{ row }">{{ formatDate(row.windowEnd, 'datetime', locale) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="errorCount" :label="$t('developer.settings.errorCount')" width="100" />
        <ElTableColumn prop="totalCount" :label="$t('developer.settings.totalCount')" width="100" />
        <ElTableColumn
          prop="sent"
          :label="$t('developer.settings.sent')"
          width="80"
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
          width="180"
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
        @current-change="loadEvents"
        class="mt-4 flex justify-end"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DeveloperSettings' })
  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { formatDate } from '@/utils/date'
  import { fetchAlertSettings, updateAlertSettings, fetchAlertEvents } from '@/api/billing'

  const { t, locale } = useI18n()

  const form = ref({
    alertEmail: '',
    enabled: false,
    windowSeconds: 300,
    errorThreshold: 10,
    cooldownSeconds: 3600,
  })
  const saving = ref(false)
  const events = ref<any[]>([])
  const eventsLoading = ref(false)
  const eventPage = ref(1)
  const eventPageSize = 20
  const eventTotal = ref(0)

  const loadSettings = async () => {
    try {
      const res = await fetchAlertSettings()
      const d = res as any
      form.value.alertEmail = d?.alertEmail ?? ''
      form.value.enabled = d?.enabled ?? false
      form.value.windowSeconds = d?.windowSeconds ?? 300
      form.value.errorThreshold = d?.errorThreshold ?? 10
      form.value.cooldownSeconds = d?.cooldownSeconds ?? 3600
    } catch {
      // settings not yet configured — use defaults
    }
  }

  const loadEvents = async (page = 1) => {
    eventPage.value = page
    eventsLoading.value = true
    try {
      const res = await fetchAlertEvents({ page, pageSize: eventPageSize }) as any
      events.value = res?.list ?? []
      eventTotal.value = res?.total ?? 0
    } catch {
      events.value = []
      eventTotal.value = 0
    } finally {
      eventsLoading.value = false
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
    } catch {
      ElMessage.error(t('common.saveFailed'))
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    loadSettings()
    loadEvents()
  })
</script>
