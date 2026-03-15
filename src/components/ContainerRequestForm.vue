<template>
  <el-dialog
    v-model="dialogVisible"
    title="申请容器资源"
    width="600px"
    :before-close="handleClose"
    :close-on-click-modal="false"
  >
    <el-form
      ref="requestFormRef"
      :model="requestForm"
      :rules="requestRules"
      label-width="120px"
      @submit.prevent
    >
      <el-form-item label="服务器" prop="server_id">
        <el-select
          v-model="requestForm.server_id"
          placeholder="请选择服务器"
          style="width: 100%"
          @change="onServerChange"
        >
          <el-option
            v-for="server in servers"
            :key="server.id"
            :label="server.name"
            :value="server.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="serverResources.available" label="服务器资源">
        <div class="resource-info">
          <div class="resource-item">
            <span class="resource-label">CPU:</span>
            <span class="resource-value">{{ serverResources.max_cpu_cores }} 核心</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">内存:</span>
            <span class="resource-value">{{ Math.round(serverResources.max_memory_mb / 1024) }} GB</span>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="CPU核心数" prop="cpu_cores">
        <el-input-number
          v-model="requestForm.cpu_cores"
          :min="1"
          :max="Math.max(1, maxCpuCores)"
          placeholder="请输入CPU核心数"
          style="width: 100%"
        />
        <div v-if="maxCpuCores > 0" class="form-tip">
          最大可申请: {{ maxCpuCores }} 核心
        </div>
      </el-form-item>

      <el-form-item label="内存大小" prop="memory_mb">
        <el-input-number
          v-model="requestForm.memory_mb"
          :min="1"
          :max="Math.max(1, maxMemoryMb)"
          :step="1024"
          placeholder="请输入内存大小(MB)"
          style="width: 100%"
        />
        <div v-if="maxMemoryMb > 0" class="form-tip">
          最大可申请: {{ Math.round(maxMemoryMb / 1024) }} GB ({{ maxMemoryMb }} MB)
        </div>
      </el-form-item>

      <el-form-item label="申请理由" prop="request_reason">
        <el-input
          v-model="requestForm.request_reason"
          type="textarea"
          :rows="3"
          placeholder="请简要说明申请容器资源的用途和理由"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitRequest"
        >
          提交申请
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../utils/axios'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  servers: {
    type: Array,
    default: () => []
  },
  selectedServerId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submitted'])

// 表单引用
const requestFormRef = ref()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 表单数据
const requestForm = reactive({
  server_id: '',
  cpu_cores: 6,
  memory_mb: 16384,
  request_reason: ''
})

// 服务器资源信息
const serverResources = ref({
  server_id: 0,
  server_name: '',
  max_cpu_cores: 0,
  max_memory_mb: 0,
  available: false
})

// 提交状态
const submitLoading = ref(false)

// 计算最大可申请资源
const maxCpuCores = computed(() => {
  if (!serverResources.value.available) return 0
  return serverResources.value.max_cpu_cores
})

const maxMemoryMb = computed(() => {
  if (!serverResources.value.available) return 0
  return serverResources.value.max_memory_mb
})

// 表单验证规则
const requestRules = {
  server_id: [
    { required: true, message: '请选择服务器', trigger: 'change' }
  ],
  cpu_cores: [
    { required: true, message: '请输入CPU核心数', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value || value <= 0) {
          callback(new Error('CPU核心数必须大于0'))
        } else if (maxCpuCores.value > 0 && value > maxCpuCores.value) {
          callback(new Error(`CPU核心数不能超过${maxCpuCores.value}`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  memory_mb: [
    { required: true, message: '请输入内存大小', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value || value <= 0) {
          callback(new Error('内存大小必须大于0'))
        } else if (maxMemoryMb.value > 0 && value > maxMemoryMb.value) {
          callback(new Error(`内存大小不能超过${Math.round(maxMemoryMb.value / 1024)}GB`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  request_reason: [
    { required: true, message: '请填写申请理由', trigger: 'blur' },
    { min: 10, message: '申请理由至少10个字符', trigger: 'blur' }
  ]
}

// 服务器选择变化
const onServerChange = async (serverId) => {
  if (serverId) {
    await fetchServerResources(serverId)
    // 重置资源申请数量为默认值
    requestForm.cpu_cores = 6
    requestForm.memory_mb = 16384
  } else {
    serverResources.value.available = false
  }
}

// 获取服务器资源信息
const fetchServerResources = async (serverId) => {
  try {
    const response = await axios.get(`/api/servers/${serverId}/resources`)
    serverResources.value = response.data
  } catch (error) {
    console.error('获取服务器资源信息失败:', error)
    ElMessage.error('获取服务器资源信息失败')
    serverResources.value.available = false
  }
}

// 提交申请
const submitRequest = async () => {
  if (!requestFormRef.value) return

  try {
    await requestFormRef.value.validate()
  } catch (error) {
    return
  }

  submitLoading.value = true

  try {
    const response = await axios.post('/api/container-requests', requestForm)
    
    // 重置表单
    resetForm()
    
    // 关闭对话框
    dialogVisible.value = false
    
    // 通知父组件
    emit('submitted')
  } catch (error) {
    console.error('提交申请失败:', error)
    ElMessage.error(error.response?.data?.msg || '提交申请失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (requestFormRef.value) {
    requestFormRef.value.resetFields()
  }
  Object.assign(requestForm, {
    server_id: '',
    cpu_cores: 6,
    memory_mb: 16384,
    request_reason: ''
  })
  serverResources.value.available = false
}

// 关闭对话框
const handleClose = () => {
  resetForm()
  dialogVisible.value = false
}

// 监听对话框显示状态
watch(dialogVisible, (newVal) => {
  if (newVal) {
    // 对话框打开时重置表单
    resetForm()
    // 如果有预选的服务器ID，设置并触发服务器变更
    if (props.selectedServerId) {
      requestForm.server_id = props.selectedServerId
      onServerChange(props.selectedServerId)
    }
  }
})
</script>

<style scoped>
.resource-info {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.resource-item:last-child {
  margin-bottom: 0;
}

.resource-label {
  font-weight: 500;
  color: #606266;
  min-width: 60px;
}

.resource-value {
  color: #303133;
  font-size: 13px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}
</style>
