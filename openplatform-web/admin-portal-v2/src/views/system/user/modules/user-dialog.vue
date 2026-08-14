<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
    width="30%"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <ElFormItem label="用户名" prop="username">
        <ElInput v-model="formData.username" placeholder="请输入用户名" />
      </ElFormItem>
      <ElFormItem label="手机号" prop="phone">
        <ElInput v-model="formData.phone" placeholder="请输入手机号" />
      </ElFormItem>
      <ElFormItem label="性别" prop="gender">
        <ElSelect v-model="formData.gender">
          <ElOption label="男" value="男" />
          <ElOption label="女" value="女" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="角色" prop="role">
        <ElSelect v-model="formData.role" multiple>
          <ElOption
            v-for="role in roleList"
            :key="role.roleCode"
            :value="role.roleCode"
            :label="role.roleName"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'

  interface RoleItem {
    roleName: string
    roleCode: string
    des: string
    date: string
    enable: boolean
  }

  // 角色列表数据
  const ROLE_LIST_DATA: RoleItem[] = [
    { roleName: '超级管理员', roleCode: 'R_SUPER', des: '拥有系统全部权限', date: '2025-05-15 12:30:45', enable: true },
    { roleName: '管理员', roleCode: 'R_ADMIN', des: '拥有系统管理权限', date: '2025-05-15 12:30:45', enable: true },
    { roleName: '普通用户', roleCode: 'R_USER', des: '拥有系统普通权限', date: '2025-05-15 12:30:45', enable: true },
    { roleName: '财务管理员', roleCode: 'R_FINANCE', des: '管理财务相关权限', date: '2025-05-16 09:15:30', enable: true },
    { roleName: '数据分析师', roleCode: 'R_ANALYST', des: '拥有数据分析权限', date: '2025-05-16 11:45:00', enable: false },
    { roleName: '客服专员', roleCode: 'R_SUPPORT', des: '处理客户支持请求', date: '2025-05-17 14:30:22', enable: true },
    { roleName: '营销经理', roleCode: 'R_MARKETING', des: '管理营销活动权限', date: '2025-05-17 15:10:50', enable: true },
    { roleName: '访客用户', roleCode: 'R_GUEST', des: '仅限浏览权限', date: '2025-05-18 08:25:40', enable: false },
    { roleName: '系统维护员', roleCode: 'R_MAINTAINER', des: '负责系统维护和更新', date: '2025-05-18 09:50:12', enable: true },
    { roleName: '项目经理', roleCode: 'R_PM', des: '管理项目相关权限', date: '2025-05-19 13:40:35', enable: true }
  ]

  interface Props {
    visible: boolean
    type: string
    userData?: Partial<Api.SystemManage.UserListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 角色列表数据
  const roleList = ref(ROLE_LIST_DATA)

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()

  // 表单数据
  const formData = reactive({
    username: '',
    phone: '',
    gender: '男',
    role: [] as string[]
  })

  // 表单验证规则
  const rules: FormRules = {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
    ],
    gender: [{ required: true, message: '请选择性别', trigger: 'blur' }],
    role: [{ required: true, message: '请选择角色', trigger: 'blur' }]
  }

  /**
   * 初始化表单数据
   * 根据对话框类型（新增/编辑）填充表单
   */
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.userData
    const row = props.userData

    Object.assign(formData, {
      username: isEdit && row ? row.userName || '' : '',
      phone: isEdit && row ? row.userPhone || '' : '',
      gender: isEdit && row ? row.userGender || '男' : '男',
      role: isEdit && row ? (Array.isArray(row.userRoles) ? row.userRoles : []) : []
    })
  }

  /**
   * 监听对话框状态变化
   * 当对话框打开时初始化表单数据并清除验证状态
   */
  watch(
    () => [props.visible, props.type, props.userData],
    ([visible]) => {
      if (visible) {
        initFormData()
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    },
    { immediate: true }
  )

  /**
   * 提交表单
   * 验证通过后触发提交事件
   */
  const handleSubmit = async () => {
    if (!formRef.value) return

    await formRef.value.validate((valid) => {
      if (valid) {
        ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
        dialogVisible.value = false
        emit('submit')
      }
    })
  }
</script>
