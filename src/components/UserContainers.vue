<template>
  <div class="user-containers" v-loading="loading">
    <div v-if="error" class="error-container">
      <el-empty :description="error">
        <template #image>
          <el-icon class="empty-icon"><WarningFilled /></el-icon>
        </template>
        <el-button type="primary" @click="fetchData">重试</el-button>
      </el-empty>
    </div>
    <div v-else>
      <div v-if="userContainers.length === 0" class="empty-container">
        <el-empty
          description="暂无容器信息，这里显示的是新系统下创建的容器，可执行启动、停止、查看密码的操作。"
          :image-size="60"
        >
          <template #image>
            <el-icon class="empty-icon" style="font-size: 40px; margin-bottom: 10px;"><Box /></el-icon>
          </template>
        </el-empty>
      </div>
      <div v-else class="containers-table-wrapper">
        <el-table
          :data="userContainers"
          style="width: 100%"
          border
        >
        <el-table-column prop="container_name" label="容器名称" min-width="60" />
        <el-table-column prop="server_name" label="服务器" min-width="70" />
        <el-table-column prop="image_name" label="镜像" min-width="100" />
        <el-table-column prop="cpu_cores" label="CPU" min-width="40" align="center" />
        <el-table-column label="内存" min-width="60" align="center">
          <template #default="scope">
            {{ formatMemory(scope.row.memory_mb) }}
          </template>
        </el-table-column>
        <el-table-column prop="port" label="SSH" min-width="50" />
        <el-table-column label="状态" min-width="50">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="250">
          <template #default="scope">
            <div class="container-actions">
              <el-button
                v-if="scope.row.status !== 'running'"
                size="small"
                type="success"
                @click="startContainer(scope.row.id)"
                :loading="actionLoading === `start-${scope.row.id}`"
              >
                <el-icon><VideoPlay /></el-icon>
                <span>启动</span>
              </el-button>
              <el-button
                v-if="scope.row.status === 'running'"
                size="small"
                type="warning"
                @click="stopContainer(scope.row.id)"
                :loading="actionLoading === `stop-${scope.row.id}`"
              >
                <el-icon><VideoPause /></el-icon>
                <span>停止</span>
              </el-button>
              <el-dropdown
                v-if="getSshOptions(scope.row, false).length > 0"
                trigger="click"
                @command="option => handleRemoteLogin(option, scope.row)"
              >
                <el-button size="small" type="primary" class="ssh-button">
                  <el-icon><Monitor /></el-icon>
                  <span>远程登录</span>
                  <el-icon class="dropdown-icon"><CaretBottom /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="option in getSshOptions(scope.row, false)"
                      :key="`remote-${option.key}`"
                      :command="option"
                    >
                      {{ option.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                v-else
                size="small"
                type="primary"
                class="ssh-button ssh-button--disabled"
                @click="notifyMissingNetwork"
              >
                <el-icon><Monitor /></el-icon>
                <span>远程登录</span>
              </el-button>
              <el-dropdown
                v-if="getSshOptions(scope.row).length > 0"
                trigger="click"
                @command="option => handleSshCommand(option, scope.row)"
              >
                <el-button size="small" type="primary" class="ssh-button">
                  <el-icon><Link /></el-icon>
                  <span>SSH指令</span>
                  <el-icon class="dropdown-icon"><CaretBottom /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="option in getSshOptions(scope.row)"
                      :key="option.key"
                      :command="option"
                    >
                      {{ option.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                v-else
                size="small"
                type="primary"
                class="ssh-button ssh-button--disabled"
                @click="notifyMissingNetwork"
              >
                <el-icon><Link /></el-icon>
                <span>SSH指令</span>
              </el-button>
              <el-button
                size="small"
                type="info"
                @click="showPassword(scope.row)"
                :loading="actionLoading === `password-${scope.row.id}`"
              >
                <el-icon><Key /></el-icon>
                <span>查看密码</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    </div>
    
    <!-- 将对话框移到组件最外层 -->
    <el-dialog 
      v-model="passwordDialogVisible" 
      title="容器密码" 
      width="400px"
      center
      append-to-body
      destroy-on-close
      :top="'20vh'"
    >
      <div class="password-container">
        <p><strong>容器名称：</strong>{{ currentContainer?.container_name || '' }}</p>
        <p><strong>容器密码：</strong>{{ containerPassword }}</p>
      </div>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyPassword">复制密码</el-button>
      </template>
    </el-dialog>

    <terminal-dialog
      v-if="terminalContext && authToken"
      v-model="terminalDialogVisible"
      :server-id="terminalContext.serverId"
      :container-id="terminalContext.containerId"
      :server-name="terminalDisplayName || '容器远程登录'"
      :server-address="terminalDisplayAddress"
      :server-user="terminalContext.user || 'root'"
      :target-host="terminalContext.host"
      :target-port="terminalContext.port"
      :login-username="terminalContext.user || 'root'"
      :auth-token="authToken"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../utils/axios'
import { Box, Key, VideoPlay, VideoPause, WarningFilled, Link, CaretBottom, Monitor } from '@element-plus/icons-vue'
import TerminalDialog from './TerminalDialog.vue'
import { useAuthStore } from '../stores/auth'

// 当前用户名
const username = ref(localStorage.getItem('username') || '')

// 状态变量
const loading = ref(false)
const error = ref(null)
const containers = ref([])
const actionLoading = ref(null)

const authStore = useAuthStore()
const terminalDialogVisible = ref(false)
const terminalContext = ref(null)
const authToken = computed(() => authStore.token || localStorage.getItem('token') || '')
const terminalDisplayName = computed(() => {
  if (!terminalContext.value) {
    return ''
  }
  const containerName = terminalContext.value.containerName || ''
  const serverName = terminalContext.value.serverName || ''
  if (containerName && serverName) {
    return `${containerName} @ ${serverName}`
  }
  return containerName || serverName
})
const terminalDisplayAddress = computed(() => {
  if (!terminalContext.value) {
    return ''
  }
  const host = terminalContext.value.host || ''
  const port = terminalContext.value.port || ''
  if (host && port) {
    return `${host}:${port}`
  }
  return host
})

// 密码对话框
const passwordDialogVisible = ref(false)
const currentContainer = ref(null)
const containerPassword = ref('')

// 获取用户容器
const userContainers = computed(() => {
  return containers.value.filter(container => 
    container.user_username === username.value
  )
})

// 获取所有容器
const fetchData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await axios.get('/api/containers')
    containers.value = response.data.containers || []
  } catch (err) {
    console.error('获取容器数据失败:', err)
    error.value = '获取容器数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 启动容器
const startContainer = async (containerId) => {
  actionLoading.value = `start-${containerId}`
  
  try {
    await axios.post(`/api/containers/${containerId}/start`)
    ElMessage.success('容器启动成功')
    fetchData() // 刷新数据
  } catch (err) {
    console.error('启动容器失败:', err)
    ElMessage.error(err.response?.data?.msg || '启动容器失败')
  } finally {
    actionLoading.value = null
  }
}

// 停止容器
const stopContainer = async (containerId) => {
  actionLoading.value = `stop-${containerId}`
  
  try {
    await axios.post(`/api/containers/${containerId}/stop`)
    ElMessage.success('容器停止成功')
    fetchData() // 刷新数据
  } catch (err) {
    console.error('停止容器失败:', err)
    ElMessage.error(err.response?.data?.msg || '停止容器失败')
  } finally {
    actionLoading.value = null
  }
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'stopped':
      return 'danger'
    case 'creating':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'running':
      return '运行中'
    case 'stopped':
      return '已停止'
    case 'creating':
      return '创建中'
    case 'error':
      return '错误'
    default:
      return '未知'
  }
}

// 显示容器密码
const showPassword = (container) => {
  currentContainer.value = container
  // 直接使用容器对象中的root_password字段
  containerPassword.value = container.root_password || '未设置密码'
  passwordDialogVisible.value = true
}

const sanitizeTarget = (value) => {
  if (!value && value !== 0) {
    return ''
  }
  const text = String(value).trim()
  if (!text || ['unknown', 'none'].includes(text.toLowerCase())) {
    return ''
  }
  return text
}

const getSshOptions = (container, includeLan = true) => {
  if (!container) {
    return []
  }
  const port = container.port
  if (!port) {
    return []
  }

  const info = container.network_info || {}
  const options = []

  const lan = sanitizeTarget(info.lan_ip)
  if (lan && includeLan) {
    options.push({ key: 'lan', value: lan, label: `局域网IP (${lan})` })
  }

  const eduIp = sanitizeTarget(info.edu_ip)
  if (eduIp) {
    options.push({ key: 'edu_ip', value: eduIp, label: `校园网IP (${eduIp})` })
  }

  const eduDomain = sanitizeTarget(info.edu_domain)
  if (eduDomain) {
    options.push({ key: 'edu_domain', value: eduDomain, label: `校园网域名 (${eduDomain})` })
  }

  return options
}

const copyText = async (text) => {
  try {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
  }

  if (typeof document === 'undefined') {
    throw new Error('document is not available for clipboard operations')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let success = false
  try {
    success = document.execCommand('copy')
  } catch (err) {
    console.error('执行复制命令失败:', err)
  }

  document.body.removeChild(textarea)
  if (!success) {
    throw new Error('execCommand copy failed')
  }
  return true
}

const handleSshCommand = async (option, container) => {
  if (!option || !option.value) {
    ElMessage.warning('未找到可用的目标地址')
    return
  }
  if (!container || !container.port) {
    ElMessage.warning('该容器未配置SSH端口')
    return
  }

  const command = `ssh root@${option.value} -p ${container.port}`
  try {
    await copyText(command)
    ElMessage.success('SSH 指令已复制到剪贴板')
  } catch (err) {
    console.error('复制SSH指令失败:', err)
    ElMessage.error('复制失败，请手动复制')
  }
}

const openRemoteTerminal = async (container, host) => {
  const sanitizedHost = sanitizeTarget(host)
  if (!sanitizedHost) {
    ElMessage.warning('请选择有效的连接地址')
    return
  }
  if (!container || !container.port) {
    ElMessage.warning('该容器未配置SSH端口')
    return
  }

  try {
    await axios.get(`/api/servers/${container.server_id}/token`)
    terminalContext.value = {
      serverId: container.server_id,
      containerId: container.id,
      containerName: container.container_name,
      serverName: container.server_name,
      host: sanitizedHost,
      port: container.port,
      user: 'root'
    }
    terminalDialogVisible.value = true
  } catch (err) {
    console.error('获取服务器令牌失败:', err)
    ElMessage.error(err.response?.data?.msg || '获取服务器令牌失败，无法打开远程终端')
  }
}

const handleRemoteLogin = (option, container) => {
  if (!option || !option.value) {
    ElMessage.warning('未找到可用的目标地址')
    return
  }
  openRemoteTerminal(container, option.value)
}

const notifyMissingNetwork = () => {
  ElMessage.warning('暂时无法获取服务器网络信息，请稍后再试')
}

// 复制密码到剪贴板
const copyPassword = () => {
  navigator.clipboard.writeText(containerPassword.value)
    .then(() => {
      ElMessage.success('密码已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}

// 格式化内存显示
const formatMemory = (memoryMb) => {
  if (!memoryMb || memoryMb === 0) {
    return '-'
  }
  
  if (memoryMb >= 1024) {
    return `${(memoryMb / 1024).toFixed(1)}GB`
  } else {
    return `${memoryMb}MB`
  }
}

// 自动刷新定时器
let refreshTimer = null

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) return
  refreshTimer = setInterval(() => {
    fetchData()
  }, 30000)
}

watch(terminalDialogVisible, (visible) => {
  if (visible) {
    stopAutoRefresh()
  } else {
    fetchData()
    startAutoRefresh()
  }
})

// 组件挂载时获取数据并启动自动刷新
onMounted(() => {
  fetchData()
  startAutoRefresh()
  
  // 监听窗口大小变化
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768
  }
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  stopAutoRefresh()
})

// 将containers变量暴露给父组件
defineExpose({
  containers,
  fetchData
})
</script>

<style scoped>
.user-containers {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.containers-table-wrapper {
  flex: 1;
  overflow: auto;
}

.error-container {
  padding: 30px 20px;
  text-align: center;
}

.empty-container {
  padding: 15px 0;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); }
}

/* 状态标签美化 */
.user-containers :deep(.el-tag) {
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  padding: 4px 8px;
}

.user-containers :deep(.el-tag--success) {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
  border-color: rgba(103, 194, 58, 0.3);
  color: #67C23A;
}

.user-containers :deep(.el-tag--danger) {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.1) 0%, rgba(245, 108, 108, 0.05) 100%);
  border-color: rgba(245, 108, 108, 0.3);
  color: #F56C6C;
}

.user-containers :deep(.el-tag--warning) {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.1) 0%, rgba(230, 162, 60, 0.05) 100%);
  border-color: rgba(230, 162, 60, 0.3);
  color: #E6A23C;
}

.container-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

.container-actions .el-button {
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  padding: 6px 10px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.container-actions .ssh-button {
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  border-color: transparent;
  color: #fff;
  display: inline-flex;
  align-items: center;
}

.container-actions .ssh-button--disabled {
  opacity: 0.7;
  color: #fff;
}

.container-actions .ssh-button--disabled:hover {
  transform: none;
  box-shadow: none;
}

.container-actions .ssh-button .dropdown-icon {
  margin-left: 4px;
  margin-right: 0;
}

.container-actions :deep(.el-dropdown) {
  display: inline-flex;
}

.container-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.container-actions .el-button--success {
  background: linear-gradient(135deg, #67C23A, #85CE61);
  border-color: transparent;
}

.container-actions .el-button--warning {
  background: linear-gradient(135deg, #E6A23C, #F0B858);
  border-color: transparent;
}

.container-actions .el-button--info {
  background: linear-gradient(135deg, #909399, #C0C4CC);
  border-color: transparent;
}

.container-actions .el-button .el-icon {
  margin-right: 4px;
}

/* 密码对话框样式 */
.user-containers :deep(.el-dialog) {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(64, 158, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.user-containers :deep(.el-dialog__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.05) 100%);
  padding: 20px 25px 15px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  border-radius: 16px 16px 0 0;
}

.user-containers :deep(.el-dialog__title) {
  color: #303133;
  font-weight: 700;
  font-size: 18px;
}

.user-containers :deep(.el-dialog__body) {
  padding: 25px;
}

.user-containers :deep(.el-dialog__footer) {
  padding: 15px 25px 25px;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 0 0 16px 16px;
}

.password-container {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(54, 209, 220, 0.02) 100%);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid #409EFF;
  border: 1px solid rgba(64, 158, 255, 0.15);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.08);
}

.password-container p {
  margin: 12px 0;
  font-size: 15px;
  color: #303133;
  line-height: 1.6;
}

.password-container strong {
  color: #409EFF;
  font-weight: 600;
}

/* 在较窄的屏幕下优化按钮布局 */
@media (max-width: 768px) {
  .user-containers {
    padding: 15px;
  }
  
  .container-actions {
    gap: 4px;
    flex-direction: column;
    align-items: stretch;
  }
  
  .container-actions .el-button {
    font-size: 11px;
    padding: 4px 8px;
    margin-bottom: 2px;
  }
  
  .container-actions .el-button span {
    margin-left: 2px;
  }
  
  .user-containers :deep(.el-table th),
  .user-containers :deep(.el-table td) {
    padding: 8px;
    font-size: 12px;
  }
  
  .password-container {
    padding: 15px;
  }
  
  .password-container p {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .container-actions .el-button span {
    display: none;
  }
  
  .container-actions .el-button {
    min-width: 36px;
    padding: 6px 8px;
  }
  
  .user-containers :deep(.el-dialog) {
    width: 90%;
    margin: 5vh auto;
  }
}

.error-container :deep(.el-empty__image) {
  opacity: 0.7;
}
</style>
