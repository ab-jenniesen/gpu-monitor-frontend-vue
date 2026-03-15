<template>
  <div class="docker-images-manager">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <h3>Docker镜像管理</h3>
            <span class="subtitle">管理服务器上的Docker镜像，用于容器创建</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" size="small" @click="detectDockerImages" :loading="detecting">
              <el-icon><Search /></el-icon>
              <span>检测Docker镜像</span>
            </el-button>
            <el-button type="success" size="small" @click="showAddImageDialog">
              <el-icon><Plus /></el-icon>
              <span>拉取新镜像</span>
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="error" class="error-container">
        <el-empty :description="error">
          <el-button type="primary" @click="refreshDockerImages">重试</el-button>
        </el-empty>
      </div>
      
      <div v-else-if="dockerImages.length === 0" class="empty-container">
        <el-empty description="暂无Docker镜像">
          <el-button type="primary" @click="detectDockerImages">检测Docker镜像</el-button>
        </el-empty>
      </div>
      
      <div v-else class="images-list">
        <el-table :data="dockerImages" style="width: 100%" border>
          <el-table-column label="镜像" min-width="200">
            <template #default="scope">
              <div class="image-name">
                <span class="repository">{{ scope.row.repository || '无仓库名' }}</span>
                <el-tag size="small" v-if="scope.row.tag">{{ scope.row.tag }}</el-tag>
              </div>
              <div class="image-id">ID: {{ scope.row.image_id ? scope.row.image_id.substring(0, 12) : '未知' }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="180" />
          <el-table-column label="大小" width="120">
            <template #default="scope">
              {{ formatSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                @click="pullImage(scope.row)"
                title="更新镜像"
              >
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle 
                @click="confirmDeleteImage(scope.row)"
                title="删除镜像"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    
    <!-- 拉取新镜像对话框 -->
    <el-dialog
      v-model="addImageDialogVisible"
      title="拉取新Docker镜像"
      width="500px"
    >
      <el-form :model="newImageForm" label-width="100px" :rules="imageFormRules" ref="imageFormRef">
        <el-form-item label="镜像地址" prop="imageUrl">
          <el-input v-model="newImageForm.imageUrl" placeholder="例如: nginx:latest 或 ubuntu:20.04" />
          <div class="form-tip">输入镜像名称和标签，格式为 name:tag</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addImageDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="pullNewImage" :loading="pullLoading">
            拉取
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 检测到的镜像选择对话框 -->
    <el-dialog
      v-model="detectDialogVisible"
      title="检测到的Docker镜像"
      width="800px"
    >
      <div v-if="detecting" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="detectedImages.length === 0" class="empty-container">
        <el-empty description="未检测到Docker镜像" />
      </div>
      
      <div v-else>
        <p>选择要添加的Docker镜像：</p>
        <el-table :data="detectedImages" style="width: 100%" border @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" />
          <el-table-column label="镜像" min-width="200">
            <template #default="scope">
              <div class="image-name">
                <span class="repository">{{ scope.row.repository || '无仓库名' }}</span>
                <el-tag size="small" v-if="scope.row.tag">{{ scope.row.tag }}</el-tag>
              </div>
              <div class="image-id">ID: {{ scope.row.id ? scope.row.id.substring(0, 12) : '未知' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="120">
            <template #default="scope">
              {{ formatSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addSelectedImages" :loading="submitting" :disabled="selectedImages.length === 0">
            添加选中镜像
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 任务进度对话框 -->
    <el-dialog
      v-model="taskProgressVisible"
      :title="`${currentTask.type === 'pull' ? '拉取' : '删除'}镜像进度`"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="currentTask.status !== 'running'"
      :show-close="currentTask.status !== 'running'"
    >
      <div class="task-progress">
        <el-progress 
          :percentage="currentTask.progress" 
          :status="currentTask.status === 'success' ? 'success' : (currentTask.status === 'error' ? 'exception' : '')"
        />
        
        <div class="task-logs" ref="logsContent">
          <div v-for="(log, index) in currentTask.logs" :key="index" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="refreshAfterTask" :disabled="currentTask.status === 'running'">
            {{ currentTask.status === 'running' ? '任务进行中...' : '关闭' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, Download, Plus, Search } from '@element-plus/icons-vue'
import { useServersStore } from '../stores/servers'

const props = defineProps({
  serverId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update'])

// 初始化服务器存储
const serversStore = useServersStore()

// 状态变量
const loading = ref(false)
const error = ref(null)
const dockerImages = ref([])

// 检测镜像相关变量
const detecting = ref(false)
const detectDialogVisible = ref(false)
const detectedImages = ref([])
const selectedImages = ref([])
const submitting = ref(false)

// 添加镜像对话框
const addImageDialogVisible = ref(false)
const pullLoading = ref(false)
const newImageForm = ref({
  imageUrl: ''
})
const imageFormRef = ref(null)
const imageFormRules = {
  imageUrl: [
    { required: true, message: '请输入镜像地址', trigger: 'blur' },
    { pattern: /^[a-z0-9]+([-._/][a-z0-9]+)*(:[\w][\w.-]{0,127})?$/, message: '镜像地址格式不正确', trigger: 'blur' }
  ]
}

// 任务进度
const taskProgressVisible = ref(false)
const currentTask = ref({
  type: '',
  imageId: '',
  progress: 0,
  status: '',
  logs: []
})
const logsContent = ref(null)

// 获取Docker镜像列表
const refreshDockerImages = async () => {
  loading.value = true
  error.value = null
  
  try {
    dockerImages.value = await serversStore.fetchServerDockerImages(props.serverId)
  } catch (err) {
    console.error('获取Docker镜像列表失败:', err)
    error.value = '获取Docker镜像列表失败，请检查服务器连接'
  } finally {
    loading.value = false
  }
}

// 检测服务器上的Docker镜像
const detectDockerImages = async () => {
  detecting.value = true
  try {
    detectedImages.value = await serversStore.detectServerDockerImages(props.serverId)
    
    // 过滤掉已存在的镜像
    const existingImageIds = dockerImages.value.map(img => img.image_id)
    detectedImages.value = detectedImages.value.filter(img => !existingImageIds.includes(img.id))
    
    if (detectedImages.value.length === 0) {
      ElMessage.info('未检测到新的Docker镜像')
    } else {
      detectDialogVisible.value = true
    }
  } catch (err) {
    console.error('检测Docker镜像失败:', err)
    ElMessage.error('检测Docker镜像失败，请检查服务器连接')
  } finally {
    detecting.value = false
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedImages.value = selection
}

// 添加选中的镜像
const addSelectedImages = async () => {
  if (selectedImages.value.length === 0) return
  
  submitting.value = true
  try {
    for (const image of selectedImages.value) {
      await serversStore.addServerDockerImage(props.serverId, {
        image_id: image.id,
        repository: image.repository,
        tag: image.tag,
        size: image.size,
        created: image.created,
        description: `${image.repository}:${image.tag}`
      })
    }
    
    ElMessage.success(`成功添加 ${selectedImages.value.length} 个Docker镜像`)
    detectDialogVisible.value = false
    await refreshDockerImages()
    emit('update')
  } catch (error) {
    ElMessage.error('添加Docker镜像失败')
  } finally {
    submitting.value = false
  }
}

// 格式化大小
const formatSize = (sizeInBytes) => {
  if (sizeInBytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024))
  
  return `${(sizeInBytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '未知'
  
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// 显示添加镜像对话框
const showAddImageDialog = () => {
  newImageForm.value.imageUrl = ''
  addImageDialogVisible.value = true
  nextTick(() => {
    if (imageFormRef.value) {
      imageFormRef.value.resetFields()
    }
  })
}

// 拉取新镜像
const pullNewImage = async () => {
  if (!imageFormRef.value) return
  
  await imageFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    pullLoading.value = true
    
    try {
      const response = await serversStore.pullDockerImage(props.serverId, {
        image: newImageForm.value.imageUrl
      })
      
      if (response.success) {
        addImageDialogVisible.value = false
        startTaskTracking('pull', newImageForm.value.imageUrl, response.task_id)
      } else {
        ElMessage.error(response.message || '启动拉取任务失败')
      }
    } catch (err) {
      console.error('拉取镜像失败:', err)
      ElMessage.error('拉取镜像失败，请检查服务器连接')
    } finally {
      pullLoading.value = false
    }
  })
}

// 拉取现有镜像的更新
const pullImage = async (image) => {
  if (!image.repository) {
    ElMessage.warning('无法拉取没有仓库名称的镜像')
    return
  }
  
  const imageUrl = image.tag ? `${image.repository}:${image.tag}` : image.repository
  
  try {
    const response = await serversStore.pullDockerImage(props.serverId, {
      image: imageUrl
    })
    
    if (response.success) {
      startTaskTracking('pull', imageUrl, response.task_id)
    } else {
      ElMessage.error(response.message || '启动拉取任务失败')
    }
  } catch (err) {
    console.error('拉取镜像失败:', err)
    ElMessage.error('拉取镜像失败，请检查服务器连接')
  }
}

// 确认删除镜像
const confirmDeleteImage = (image) => {
  ElMessageBox.confirm(
    `确定要删除镜像 ${image.repository ? (image.repository + (image.tag ? `:${image.tag}` : '')) : image.image_id.substring(0, 12)} 吗？`,
    '删除确认',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await serversStore.deleteServerDockerImage(props.serverId, image.id)
      
      if (response.success) {
        startTaskTracking('delete', image.id, response.task_id)
      } else {
        ElMessage.error(response.message || '删除镜像失败')
      }
    } catch (err) {
      console.error('删除镜像失败:', err)
      ElMessage.error('删除镜像失败，请检查服务器连接')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

// 开始任务跟踪
const startTaskTracking = (type, imageId, taskId) => {
  currentTask.value = {
    type,
    imageId,
    progress: 0,
    status: 'running',
    logs: [],
    taskId
  }
  
  taskProgressVisible.value = true
  pollTaskStatus(taskId)
}

// 轮询任务状态
const pollTaskStatus = async (taskId) => {
  if (!taskId || currentTask.value.status !== 'running') return
  
  try {
    const response = await serversStore.getDockerTaskStatus(props.serverId, taskId)
    
    if (response.success) {
      currentTask.value.progress = response.task.progress || 0
      currentTask.value.logs = response.task.logs || []
      currentTask.value.status = response.task.status || 'running'
      
      // 滚动日志到底部
      nextTick(() => {
        if (logsContent.value) {
          logsContent.value.scrollTop = logsContent.value.scrollHeight
        }
      })
      
      // 如果任务还在运行，继续轮询
      if (currentTask.value.status === 'running') {
        setTimeout(() => pollTaskStatus(taskId), 1000)
      } else if (currentTask.value.status === 'success') {
        ElMessage.success(`${currentTask.value.type === 'pull' ? '拉取' : '删除'}镜像成功`)
      } else if (currentTask.value.status === 'error') {
        ElMessage.error(`${currentTask.value.type === 'pull' ? '拉取' : '删除'}镜像失败`)
      }
    } else {
      // 轮询失败，但仍然继续尝试
      setTimeout(() => pollTaskStatus(taskId), 2000)
    }
  } catch (err) {
    console.error('获取任务状态失败:', err)
    // 错误时仍然继续尝试
    setTimeout(() => pollTaskStatus(taskId), 3000)
  }
}

// 任务完成后刷新
const refreshAfterTask = () => {
  taskProgressVisible.value = false
  refreshDockerImages()
}

// 监听任务状态变化自动滚动日志
watch(
  () => currentTask.value.logs.length,
  () => {
    nextTick(() => {
      if (logsContent.value) {
        logsContent.value.scrollTop = logsContent.value.scrollHeight
      }
    })
  }
)

// 组件挂载时获取镜像列表
onMounted(() => {
  refreshDockerImages()
})
</script>

<style scoped>
.docker-images-manager {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: block;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-container,
.error-container,
.empty-container {
  padding: 20px 0;
  text-align: center;
}

.images-list {
  margin-top: 10px;
}

.image-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.repository {
  font-weight: 500;
}

.image-id {
  font-size: 12px;
  color: #909399;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.task-progress {
  margin-bottom: 20px;
}

.task-logs {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-line {
  margin-bottom: 5px;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
