<template>
  <div class="payment-history-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElSelect
              v-model="searchForm.status"
              :placeholder="$t('developer.billing.payment.status')"
              clearable
              class="w-36"
              @change="handleSearch"
            >
              <ElOption :label="$t('developer.billing.payment.pending')" value="pending" />
              <ElOption :label="$t('developer.billing.payment.confirmed')" value="confirmed" />
              <ElOption :label="$t('developer.billing.payment.rejected')" value="rejected" />
            </ElSelect>
          </ElSpace>
        </template>
        <template #right>
          <ElButton type="primary" @click="openSubmitDialog()">
            <ElIcon><Plus /></ElIcon>
            {{ $t('developer.billing.payment.submitPayment') }}
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data as Record<string, any>[]"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('common.noData')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- Submit Payment Proof Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="$t('developer.billing.payment.submitPayment')"
      width="592px"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <ElForm ref="formRef" :model="form" label-width="162px">
        <ElFormItem :label="$t('developer.billing.payment.externalPaymentId')" required>
          <ElInput
            v-model="form.externalPaymentId"
            :placeholder="$t('developer.billing.payment.externalPaymentIdPlaceholder')"
          />
        </ElFormItem>

        <ElFormItem :label="$t('developer.paymentHistory.totalAmount')" required>
          <ElInputNumber v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
        </ElFormItem>

        <ElFormItem :label="$t('developer.billing.payment.paymentMethod')" required>
          <ElSelect v-model="form.paymentMethod">
            <ElOption :label="$t('developer.billing.payment.bankTransfer')" value="bank_transfer" />
            <ElOption :label="$t('developer.billing.payment.web3')" value="web3" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem :label="$t('developer.billing.payment.paidAt')" required>
          <ElDatePicker
            v-model="form.paidAt"
            type="datetime"
            :placeholder="$t('developer.billing.payment.paidAtPlaceholder')"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </ElFormItem>

        <ElFormItem :label="$t('developer.billing.payment.proof')" required>
          <ElUpload
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
            :file-list="fileList"
          >
            <ElButton type="primary" plain>{{
              $t('developer.billing.payment.uploadProof')
            }}</ElButton>
            <template #tip>
              <div class="text-xs text-gray-400 mt-1">{{
                $t('developer.billing.payment.proofHint')
              }}</div>
            </template>
          </ElUpload>
        </ElFormItem>

        <ElFormItem :label="$t('developer.billing.payment.remark')">
          <ElInput
            v-model="form.remark"
            type="textarea"
            :rows="2"
            :placeholder="$t('developer.billing.payment.remarkPlaceholder')"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogVisible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'OrderManagement' })

  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchPaymentHistory,
    fetchUploadProof,
    fetchSubmitPaymentProof,
    fetchOrderDetail
  } from '@/api/billing'
  import { ElTag, ElButton } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { formatDate } from '@/utils/date'

  const { t, locale } = useI18n()
  const route = useRoute()

  const searchForm = ref({ status: undefined as string | undefined })
  const dialogVisible = ref(false)
  const submitting = ref(false)
  const pendingOrder = ref<any>(null)
  const fileList = ref<any[]>([])

  const form = reactive({
    externalPaymentId: '',
    amount: 0,
    paymentMethod: 'bank_transfer' as string,
    paidAt: '' as string,
    proof: null as any,
    remark: ''
  })

  const STATUS_MAP: Record<
    string,
    { type: 'success' | 'warning' | 'danger' | 'info'; text: string }
  > = {
    pending: { type: 'warning', text: t('developer.billing.payment.pending') },
    confirmed: { type: 'success', text: t('developer.billing.payment.confirmed') },
    rejected: { type: 'danger', text: t('developer.billing.payment.rejected') }
  }

  const PAYMENT_METHOD_MAP: Record<string, string> = {
    bank_transfer: t('developer.billing.payment.bankTransfer'),
    web3: t('developer.billing.payment.web3')
  }

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
    refreshData
  } = useTable({
    core: {
      apiFn: fetchPaymentHistory,
      apiParams: { page: 1, pageSize: 20 },
      paginationKey: { current: 'page', size: 'pageSize' },
      columnsFactory: () =>
        [
          { type: 'index' as const, width: 60, label: '#' },
          { prop: 'id', label: t('developer.billing.payment.orderId'), minWidth: 260 },
          {
            prop: 'externalPaymentId',
            label: t('developer.billing.payment.externalPaymentId'),
            minWidth: 200
          },
          {
            prop: 'amount',
            label: t('developer.paymentHistory.totalAmount'),
            minWidth: 120,
            formatter: (row: any) => `${row.currency || 'USD'} ${row.amount?.toFixed(2) || '0.00'}`
          },
          {
            prop: 'paymentMethod',
            label: t('developer.billing.payment.paymentMethod'),
            minWidth: 140,
            formatter: (row: any) => PAYMENT_METHOD_MAP[row.paymentMethod] || row.paymentMethod
          },
          {
            prop: 'status',
            label: t('developer.billing.payment.status'),
            minWidth: 110,
            formatter: (row: any) => {
              const config = STATUS_MAP[row.status] || { type: 'info' as const, text: row.status }
              return h(ElTag, { type: config.type }, () => config.text)
            }
          },
          {
            prop: 'createdAt',
            label: t('developer.billing.payment.submittedAt'),
            minWidth: 180,
            formatter: (row: any) => formatDate(row.createdAt, undefined, locale)
          },
          {
            label: t('package.actions'),
            minWidth: 140,
            fixed: 'right',
            formatter: (row: any) => {
              if (row.status === 'pending') {
                return h(
                  ElButton,
                  { type: 'primary', size: 'small', onClick: () => openSubmitDialog(row) },
                  () => t('developer.billing.payment.submitPayment')
                )
              }
              return h('span', '-')
            }
          }
        ] as any
    },
    transform: {
      responseAdapter: (res: any) => ({ records: res?.list || [], total: res?.total || 0 })
    }
  })

  const openSubmitDialog = (order?: any) => {
    if (order) {
      pendingOrder.value = order
      form.externalPaymentId = order.externalPaymentId || ''
      form.amount = order.amount || 0
      form.paymentMethod = order.paymentMethod || 'bank_transfer'
    } else {
      pendingOrder.value = null
      resetForm()
    }
    dialogVisible.value = true
  }

  const resetForm = () => {
    form.externalPaymentId = ''
    form.amount = 0
    form.paymentMethod = 'bank_transfer'
    form.paidAt = ''
    form.proof = null
    form.remark = ''
    fileList.value = []
  }

  const handleFileChange = (file: any) => {
    form.proof = file.raw
    fileList.value = [file]
  }
  const handleFileRemove = () => {
    form.proof = null
    fileList.value = []
  }

  const handleSubmit = async () => {
    if (!form.externalPaymentId.trim()) {
      ElMessage.warning('请输入外部支付单号')
      return
    }
    if (!form.amount || form.amount <= 0) {
      ElMessage.warning('请输入金额')
      return
    }
    if (!form.paidAt) {
      ElMessage.warning('请选择支付时间')
      return
    }
    if (!form.proof) {
      ElMessage.warning('请上传支付凭证')
      return
    }

    submitting.value = true
    try {
      const uploadResult = await fetchUploadProof(form.proof)
      const proofUrl = uploadResult?.url

      const orderId = pendingOrder.value?.id
      await fetchSubmitPaymentProof(orderId, {
        externalPaymentId: form.externalPaymentId,
        proofUrl,
        paidAt: form.paidAt,
        remark: form.remark || undefined
      })

      ElMessage.success(t('developer.billing.payment.submitSuccess'))
      dialogVisible.value = false
      resetForm()
      getData()
    } catch (e: any) {
      ElMessage.error(e?.message || 'Submit failed')
    } finally {
      submitting.value = false
    }
  }

  const handleSearch = () => {
    replaceSearchParams({ ...searchForm.value, page: undefined, pageSize: undefined })
    getData()
  }

  // Auto-open submit dialog if navigated from subscription purchase
  onMounted(async () => {
    if (route.query.openSubmit === '1') {
      const targetPaymentId = route.query.paymentId as string
      if (targetPaymentId) {
        try {
          const order = await fetchOrderDetail(targetPaymentId)
          pendingOrder.value = order
          form.externalPaymentId = order.externalPaymentId || ''
          form.amount = order.amount || 0
        } catch {
          pendingOrder.value = { id: targetPaymentId }
        }
      }
      openSubmitDialog(pendingOrder.value)
    }
  })
</script>
