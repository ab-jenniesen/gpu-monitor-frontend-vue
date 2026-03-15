<template>
  <div class="pending-requests">
    <el-card class="request-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Clock /></el-icon>
            待审批申请
          </span>
          <el-button type="primary" size="small" @click="fetchRequests" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <div v-loading="loading">
        <el-table
          :data="requests"
          style="width: 100%"
          border
          stripe
          empty-text="暂无待审批申请"
        >
          <el-table-column prop="id" label="申请ID" width="80" />
          <el-table-column prop="username" label="申请用户" min-width="100" />
          <el-table-column prop="server_name" label="服务器" min-width="120" />
          <el-table-column label="资源配置" min-width="120">
            <template #default="{ row }">
              <div class="resource-config">
                <div>CPU: {{ row.cpu_cores }} 核</div>
                <div>内存: {{ Math.round(row.memory_mb / 1024) }} GB</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="request_reason" label="申请理由" min-width="150" show-overflow-tooltip />
          <el-table-column prop="created_at" label="申请时间" min-width="130">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag type="warning" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button
                type="success"
                size="small"
                @click="openApprovalForm(row)"
                :loading="row._approving"
              >
                批准创建
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="rejectRequest(row)"
                :loading="row._rejecting"
              >
                拒绝
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 批准申请对话框 - 使用完整的容器创建表单 -->
    <el-dialog
      v-model="approveDialogVisible"
      title="批准容器申请 - 创建容器"
      width="50%"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="containerForm" :rules="containerFormRules" ref="containerFormRef" label-width="150px">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          正在为用户 <strong>{{ currentRequest?.username }}</strong> 在服务器 <strong>{{ currentRequest?.server_name }}</strong> 上创建容器
        </el-alert>
        
        <el-form-item label="申请用户" prop="user_id">
          <el-input :value="currentRequest?.username" disabled />
        </el-form-item>
        
        <el-form-item label="目标服务器" prop="server_id">
          <el-input :value="currentRequest?.server_name" disabled />
        </el-form-item>
        
        <el-form-item label="申请理由">
          <el-input :value="currentRequest?.request_reason" type="textarea" :rows="2" disabled />
        </el-form-item>
        
        <el-form-item label="容器名称" prop="container_name">
          <el-input 
            v-model="containerForm.container_name" 
            placeholder="容器名称"
          />
        </el-form-item>
        
        <el-form-item label="选择存储路径" prop="storage_path_id">
          <el-select 
            v-model="containerForm.storage_path_id" 
            placeholder="请选择存储路径" 
            style="width: 100%"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="`${path.path}${path.description ? ' (' + path.description + ')' : ''}`" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ path.path }}</span>
                <div>
                  <el-tag v-if="path.is_system" size="small" type="warning">系统</el-tag>
                  <el-tag v-if="path.is_shared" size="small" type="success">共享</el-tag>
                  <span v-if="path.description" style="color: #8492a6; font-size: 13px; margin-left: 5px">{{ path.description }}</span>
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择共享路径" prop="shared_storage_path_id">
          <el-select 
            v-model="containerForm.shared_storage_path_id" 
            placeholder="请选择共享路径" 
            style="width: 100%"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="`${path.path}${path.description ? ' (' + path.description + ')' : ''}`" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ path.path }}</span>
                <div>
                  <el-tag v-if="path.is_system" size="small" type="warning">系统</el-tag>
                  <el-tag v-if="path.is_shared" size="small" type="success">共享</el-tag>
                  <span v-if="path.description" style="color: #8492a6; font-size: 13px; margin-left: 5px">{{ path.description }}</span>
                </div>
              </div>
            </el-option>
          </el-select>
          <div class="form-tip">共享路径将被挂载到容器的/root/share目录</div>
        </el-form-item>
        
        <el-form-item label="选择Docker镜像" prop="image_id">
          <el-select 
            v-model="containerForm.image_id" 
            placeholder="请选择Docker镜像" 
            style="width: 100%"
          >
            <el-option 
              v-for="image in dockerImages" 
              :key="image.id" 
              :label="`${image.repository}:${image.tag}`" 
              :value="image.id"
            >
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div class="image-name">
                  <span class="repository">{{ image.repository || '无仓库名' }}</span>
                  <el-tag size="small" v-if="image.tag">{{ image.tag }}</el-tag>
                </div>
                <div class="image-description" v-if="image.description">{{ image.description }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择端口范围" prop="port_range_id">
          <el-select 
            v-model="containerForm.port_range_id" 
            placeholder="请选择端口范围" 
            style="width: 100%"
            @change="handlePortRangeChange"
          >
            <el-option 
              v-for="range in portRanges" 
              :key="range.id" 
              :label="`${range.start_port}-${range.end_port} (${range.description || '无描述'})`" 
              :value="range.id"
              :disabled="range.start_port >= range.end_port"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="SSH端口" prop="port">
          <el-input-number 
            v-model="containerForm.port" 
            :min="selectedPortRange?.start_port || 1000" 
            :max="selectedPortRange?.end_port || 65535"
            :disabled="!containerForm.port_range_id"
            style="width: 100%"
          />
          <div class="form-tip">SSH端口必须在选定的端口范围内，用于远程连接容器</div>
        </el-form-item>
        
        <el-form-item label="CPU核心数" prop="cpu_cores">
          <el-input-number 
            v-model="containerForm.cpu_cores" 
            :min="1" 
            :max="serverResources?.cpu_cores || 1" 
            style="width: 100%"
          />
          <div class="form-tip">申请的CPU核心数: {{ currentRequest?.cpu_cores }} (服务器总CPU: {{ serverResources?.cpu_cores || '未知' }})</div>
        </el-form-item>
        
        <el-form-item label="内存大小(MB)" prop="memory_mb">
          <el-input-number 
            v-model="containerForm.memory_mb" 
            :min="512" 
            :max="serverResources?.total_memory_mb || 1024" 
            :step="512"
            style="width: 100%"
          />
          <div class="form-tip">申请的内存大小: {{ Math.round(currentRequest?.memory_mb / 1024) }}GB ({{ currentRequest?.memory_mb }}MB)</div>
        </el-form-item>
        
        <el-form-item label="GPU设备" prop="gpu_indices">
          <el-select 
            v-model="containerForm.gpu_indices" 
            placeholder="请选择GPU设备" 
            style="width: 100%"
            :disabled="serverResources?.gpu_count === 0"
          >
            <el-option label="全部GPU" value="all" />
            <el-option 
              v-for="(gpu, index) in serverResources?.gpu_devices || []" 
              :key="index" 
              :label="`GPU ${gpu.index}: ${gpu.name}`" 
              :value="String(gpu.index)"
            />
            <el-option 
              v-if="serverResources?.gpu_devices && serverResources.gpu_devices.length >= 2"
              label="GPU 0,1 (前两个GPU)"
              value="0,1"
            />
          </el-select>
          <div class="form-tip">服务器GPU数量: {{ serverResources?.gpu_count || '0' }}</div>
        </el-form-item>

        <el-form-item label="额外端口映射" prop="port_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in containerForm.port_mappings" :key="index" class="port-mapping-item">
              <el-input-number
                v-model="mapping.host_port"
                :min="selectedPortRange?.start_port || 1000"
                :max="selectedPortRange?.end_port || 65535"
                :disabled="!containerForm.port_range_id"
                placeholder="主机端口"
                style="width: 45%"
              />
              <span class="port-mapping-arrow">→</span>
              <el-input-number
                v-model="mapping.container_port"
                :min="1"
                :max="65535"
                placeholder="容器端口"
                style="width: 45%"
              />
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removePortMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addPortMapping"
              :disabled="!containerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口映射
            </el-button>
          </div>
          <div class="form-tip">额外端口映射用于将主机端口映射到容器内部端口，例如Web服务、数据库等</div>
        </el-form-item>

        <el-form-item label="额外端口段映射" prop="port_range_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in containerForm.port_range_mappings" :key="index" class="port-mapping-item">
              <div style="display: flex; align-items: center; width: 100%">
                <div style="flex: 1">
                  <el-input-number
                    v-model="mapping.start_port"
                    :min="selectedPortRange?.start_port || 1000"
                    :max="mapping.end_port || selectedPortRange?.end_port || 65535"
                    :disabled="!containerForm.port_range_id"
                    placeholder="起始端口"
                    style="width: 100%"
                  />
                </div>
                <span class="port-mapping-dash">-</span>
                <div style="flex: 1">
                  <el-input-number
                    v-model="mapping.end_port"
                    :min="mapping.start_port || selectedPortRange?.start_port || 1000"
                    :max="selectedPortRange?.end_port || 65535"
                    :disabled="!containerForm.port_range_id"
                    placeholder="结束端口"
                    style="width: 100%"
                  />
                </div>
              </div>
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removePortRangeMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addPortRangeMapping"
              :disabled="!containerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口段映射
            </el-button>
          </div>
          <div class="form-tip">端口段映射用于批量映射连续的端口范围，适用于需要多个连续端口的应用</div>
        </el-form-item>

        <el-form-item label="容器密码" prop="root_password">
          <div style="display: flex; align-items: center; width: 100%">
            <el-input 
              v-model="containerForm.root_password" 
              placeholder="容器root用户密码"
              show-password
              style="flex: 1"
            />
            <el-button 
              type="primary" 
              @click="generateRandomPassword" 
              style="margin-left: 10px"
            >
              生成随机密码
            </el-button>
          </div>
          <div class="form-tip">容器root用户的密码，用于SSH登录</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="approveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitContainerForm" :loading="submitting">
            批准并创建容器
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 拒绝申请对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝容器申请"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="currentRequest">
        <el-descriptions title="申请信息" :column="2" border>
          <el-descriptions-item label="申请用户">{{ currentRequest.username }}</el-descriptions-item>
          <el-descriptions-item label="目标服务器">{{ currentRequest.server_name }}</el-descriptions-item>
          <el-descriptions-item label="CPU核心">{{ currentRequest.cpu_cores }} 核</el-descriptions-item>
          <el-descriptions-item label="内存大小">{{ Math.round(currentRequest.memory_mb / 1024) }} GB</el-descriptions-item>
          <el-descriptions-item label="申请理由" :span="2">{{ currentRequest.request_reason }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-form :model="rejectForm" :rules="rejectRules" ref="rejectFormRef" label-width="100px">
          <el-form-item label="拒绝理由" prop="admin_comment">
            <el-input
              v-model="rejectForm.admin_comment"
              type="textarea"
              :rows="4"
              placeholder="请说明拒绝的理由"
              show-word-limit
              maxlength="500"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmReject" :loading="rejecting">
            确认拒绝
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Refresh } from '@element-plus/icons-vue'
import axios from '../utils/axios'
import { createContainerNameValidationRule } from '../utils/usernameConflict'

// 响应式数据
const loading = ref(false)
const requests = ref([])
const storagePaths = ref([])
const dockerImages = ref([])
const portRanges = ref([])
const serverResources = ref({})
const allUsers = ref([])

// 对话框状态
const approveDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentRequest = ref(null)

// 操作状态
const submitting = ref(false)
const rejecting = ref(false)

// 容器创建表单数据
const containerForm = reactive({
  user_id: '',
  container_name: '',
  server_id: '',
  storage_path_id: '',
  shared_storage_path_id: '',
  image_id: '',
  port_range_id: '',
  port: 22,
  port_mappings: [],
  port_range_mappings: [],
  cpu_cores: 1,
  memory_mb: 1024,
  gpu_indices: 'all',
  root_password: ''
})

const rejectForm = reactive({
  admin_comment: ''
})

// 表单引用
const containerFormRef = ref()
const rejectFormRef = ref()

// 计算属性
const pendingCount = computed(() => {
  return requests.value.filter(req => req.status === 'pending').length
})

// 计算属性
const selectedPortRange = computed(() => {
  return portRanges.value.find(range => range.id === containerForm.port_range_id)
})

// 容器表单验证规则（动态计算，包含用户名冲突检测）
const containerFormRules = computed(() => {
  const currentUsername = currentRequest.value?.username || ''

  return {
    container_name: [
      { required: true, message: '请输入容器名称', trigger: 'blur' },
      createContainerNameValidationRule(currentUsername, allUsers.value)
    ],
    storage_path_id: [
      { required: true, message: '请选择存储路径', trigger: 'change' }
    ],
    image_id: [
      { required: true, message: '请选择Docker镜像', trigger: 'change' }
    ],
    port_range_id: [
      { required: true, message: '请选择端口范围', trigger: 'change' }
    ],
    port: [
      { required: true, message: '请输入SSH端口', trigger: 'blur' },
      { type: 'number', min: 1, max: 65535, message: '端口号无效', trigger: 'blur' }
    ],
    cpu_cores: [
      { required: true, message: '请设置CPU核心数', trigger: 'blur' },
      { type: 'number', min: 1, message: 'CPU核心数至少为1', trigger: 'blur' }
    ],
    memory_mb: [
      { required: true, message: '请设置内存大小', trigger: 'blur' },
      { type: 'number', min: 512, message: '内存大小至少512MB', trigger: 'blur' }
    ],
    root_password: [
      { required: true, message: '请设置容器密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
    ]
  }
})

const rejectRules = {
  admin_comment: [
    { required: true, message: '请填写拒绝理由', trigger: 'blur' },
    { min: 5, message: '拒绝理由至少5个字符', trigger: 'blur' }
  ]
}

// 获取申请列表
const fetchRequests = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/container-requests')
    // 只显示待处理的申请
    requests.value = (response.data.requests || []).filter(request => request.status === 'pending')
  } catch (error) {
    console.error('获取申请列表失败:', error)
    ElMessage.error('获取申请列表失败')
  } finally {
    loading.value = false
  }
}

// 服务器改变事件处理函数（与ContainerManager.vue保持一致）
const handleServerChange = async (serverId) => {
  try {
    // 获取服务器资源
    const resourcesResponse = await axios.get(`/api/servers/${serverId}/resources`)
    serverResources.value = resourcesResponse.data || {}
    
    // 获取服务器存储路径
    const storagePathsResponse = await axios.get(`/api/servers/${serverId}/storage_paths`)
    storagePaths.value = storagePathsResponse.data.storage_paths || []
    
    // 获取服务器Docker镜像
    const dockerImagesResponse = await axios.get(`/api/servers/${serverId}/docker_images`)
    dockerImages.value = dockerImagesResponse.data.docker_images || []
    
    // 获取服务器端口范围
    const portRangesResponse = await axios.get(`/api/servers/${serverId}/port_ranges`)
    portRanges.value = portRangesResponse.data.port_ranges || []
    
    // 设置默认端口范围
    if (portRanges.value.length > 0) {
      containerForm.port_range_id = portRanges.value[0].id
      containerForm.port = portRanges.value[0].start_port
    }
    
    // 设置默认CPU核心数
    const cpuCores = serverResources.value?.cpu_cores
    if (cpuCores && typeof cpuCores === 'number' && cpuCores > 0) {
      // 保持申请的CPU核心数不变
      containerForm.cpu_cores = Math.min(containerForm.cpu_cores, cpuCores)
    } else {
      containerForm.cpu_cores = Math.min(containerForm.cpu_cores, 1)
    }
    
    // 设置默认内存大小
    const totalMemoryMb = serverResources.value?.total_memory_mb
    if (totalMemoryMb && typeof totalMemoryMb === 'number' && totalMemoryMb > 0) {
      // 保持申请的内存大小不变
      containerForm.memory_mb = Math.min(containerForm.memory_mb, totalMemoryMb)
    } else {
      containerForm.memory_mb = Math.min(containerForm.memory_mb, 1024)
    }
  } catch (error) {
    console.error('获取服务器相关数据失败:', error)
    ElMessage.error('获取服务器相关数据失败')
  }
}

// 打开批准表单
const openApprovalForm = async (request) => {
  currentRequest.value = request
  
  // 初始化表单数据
  Object.assign(containerForm, {
    user_id: request.user_id,
    container_name: request.username.toUpperCase(),
    server_id: request.server_id,
    storage_path_id: request.storage_path_id,
    shared_storage_path_id: request.shared_storage_path_id,
    image_id: request.image_id,
    port: request.port || 2222,
    cpu_cores: request.cpu_cores,
    memory_mb: request.memory_mb,
    gpu_indices: request.gpu_indices || [],
    port_mappings: request.port_mappings || [],
    port_range_mappings: request.port_range_mappings || [],
    root_password: generatePassword()
  })
  
  // 获取服务器相关数据
  await handleServerChange(request.server_id)
  
  approveDialogVisible.value = true
}

// 提交容器创建表单
const submitContainerForm = async () => {
  if (!containerFormRef.value) return
  
  try {
    await containerFormRef.value.validate()
  } catch (error) {
    return
  }

  submitting.value = true
  try {
    // 调用容器创建API
    const response = await axios.post('/api/containers', containerForm)
    ElMessage.success('容器创建申请已批准并创建成功')
    
    // 同时更新申请状态为已批准，传递完整的容器参数
    await axios.put(`/api/container-requests/${currentRequest.value.id}/approve`, {
      storage_path_id: containerForm.storage_path_id,
      port: containerForm.port,
      image_id: containerForm.image_id,
      container_name: containerForm.container_name,
      port_mappings: containerForm.port_mappings,
      port_range_mappings: containerForm.port_range_mappings,
      admin_comment: '申请已批准并创建容器'
    })
    
    approveDialogVisible.value = false
    await fetchRequests()
    // 通知父组件刷新消息提醒
    emit('requestProcessed')
  } catch (error) {
    console.error('创建容器失败:', error)
    ElMessage.error(error.response?.data?.msg || '创建容器失败')
  } finally {
    submitting.value = false
  }
}

// 端口范围变化处理
const handlePortRangeChange = (portRangeId) => {
  const range = portRanges.value.find(r => r.id === portRangeId)
  if (range) {
    containerForm.port = range.start_port
  }
}

// 生成密码函数（与ContainerManager.vue保持一致）
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 生成随机密码
const generateRandomPassword = () => {
  containerForm.root_password = generatePassword()
  ElMessage.success('已生成随机密码')
}

// 端口映射管理函数
const addPortMapping = () => {
  containerForm.port_mappings.push({ host_port: null, container_port: null })
}

const removePortMapping = (index) => {
  containerForm.port_mappings.splice(index, 1)
}

const addPortRangeMapping = () => {
  containerForm.port_range_mappings.push({ start_port: null, end_port: null })
}

const removePortRangeMapping = (index) => {
  containerForm.port_range_mappings.splice(index, 1)
}

// 拒绝申请
const rejectRequest = async (request) => {
  currentRequest.value = request
  rejectForm.admin_comment = ''
  rejectDialogVisible.value = true
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectFormRef.value) return
  
  try {
    await rejectFormRef.value.validate()
  } catch (error) {
    return
  }

  rejecting.value = true
  try {
    await axios.put(`/api/container-requests/${currentRequest.value.id}/reject`, rejectForm)
    ElMessage.success('申请已拒绝')
    rejectDialogVisible.value = false
    await fetchRequests()
    // 通知父组件刷新消息提醒
    emit('requestProcessed')
  } catch (error) {
    console.error('拒绝申请失败:', error)
    ElMessage.error(error.response?.data?.msg || '拒绝申请失败')
  } finally {
    rejecting.value = false
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审批',
    'approved': '已批准',
    'rejected': '已拒绝'
  }
  return statusMap[status] || status
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    allUsers.value = response.data.users || []
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 组件挂载
onMounted(() => {
  fetchRequests()
  fetchUsers()
})

// 定义事件
const emit = defineEmits(['requestProcessed'])

// 暴露方法给父组件
defineExpose({
  fetchRequests
})
</script>

<style scoped>
.pending-requests {
  margin-bottom: 20px;
}

.request-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.pending-badge {
  margin-left: 8px;
}

.resource-config {
  font-size: 13px;
  line-height: 1.4;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table .cell) {
  padding: 8px 12px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.image-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repository {
  font-weight: 500;
}

.image-description {
  font-size: 12px;
  color: #8492a6;
}

/* 端口映射样式 */
.port-mappings-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.port-mapping-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.port-mapping-arrow {
  margin: 0 5px;
  font-weight: bold;
  color: #409EFF;
}

.port-mapping-dash {
  margin: 0 5px;
  font-weight: bold;
  color: #409EFF;
}

</style>
