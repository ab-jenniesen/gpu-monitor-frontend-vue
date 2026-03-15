<template>
  <div class="server-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    
    <div v-else-if="error" class="error-container">
      <el-empty :description="error">
        <template #image>
          <el-icon class="empty-icon"><WarningFilled /></el-icon>
        </template>
        <el-button type="primary" @click="fetchServerData">重试</el-button>
      </el-empty>
    </div>
    
    <div v-else-if="!serverData" class="empty-container">
      <el-empty description="暂无服务器数据">
        <template #image>
          <el-icon class="empty-icon"><Monitor /></el-icon>
        </template>
      </el-empty>
    </div>
    
    <div v-else class="server-content">
      <!-- 服务器基本信息 -->
      <el-card class="server-info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="server-title">
              <h2>{{ serverData.name }}</h2>
              <el-tag :type="getStatusType(serverData.status)" effect="dark">
                {{ getStatusText(serverData.status) }}
              </el-tag>
            </div>
            <div class="server-actions">
              <el-button type="primary" size="small" @click="refreshData">
                <el-icon><Refresh /></el-icon>
                <span>刷新数据</span>
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="server-info-row">
          <div class="info-col">
            <div class="info-label">IP地址:</div>
            <div class="info-value">*.*.*.*</div>
          </div>
          <div class="info-col">
            <div class="info-label">端口:</div>
            <div class="info-value">{{ serverData.port }}</div>
          </div>
          <div class="info-col">
            <div class="info-label">最后在线:</div>
            <div class="info-value">{{ serverData.last_online || '未知' }}</div>
          </div>
          <div class="info-col">
            <div class="info-label">GPU数量:</div>
            <div class="info-value">{{ systemData && systemData.gpu ? systemData.gpu.length : 0 }}</div>
          </div>
          <div class="info-col">
            <div class="info-label">采集间隔:</div>
            <div class="info-value">{{ serverData.collection_interval ? `${serverData.collection_interval} 秒` : '默认' }}</div>
          </div>
          <div class="info-col">
            <div class="info-label">路由:</div>
            <div class="info-value route-info">
              <div>{{ (serverData.route && serverData.route.domain) ? serverData.route.domain : '未配置' }}</div>
              <div v-if="serverData.route && serverData.route.router_mgmt_ip" class="info-sub">
                管理IP: {{ serverData.route.router_mgmt_ip }}
              </div>
              <div v-if="serverData.route && serverData.route.ddns_url" class="info-sub">
                DDNS: {{ serverData.route.ddns_url }}
              </div>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 系统信息 -->
      <div v-if="systemData" class="monitor-section">
        <!-- CPU监控 -->
        <cpu-monitor :cpu-data="formattedCpuData" />
        
        <!-- GPU监控 -->
        <gpu-monitor :gpu-data="systemData.gpu" />
        
        <!-- 网络监控 -->
        <network-monitor :network-data="systemData.network" />
        
        <!-- Docker容器监控 -->
        <docker-monitor :docker-data="systemData.docker" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { useServersStore } from '../stores/servers'
import { ElMessage } from 'element-plus'
import { WarningFilled, Monitor, Refresh } from '@element-plus/icons-vue'
import CpuMonitor from './CpuMonitor.vue'
import GpuMonitor from './GpuMonitor.vue'
import NetworkMonitor from './NetworkMonitor.vue'
import DockerMonitor from './DockerMonitor.vue'

const props = defineProps({
  serverId: {
    type: [Number, String],
    required: true
  }
})

const serverData = ref(null)
const systemData = ref(null)
const loading = ref(false)
const error = ref(null)
const serversStore = useServersStore()
const refreshInterval = ref(null)

// 格式化CPU数据以匹配CpuMonitor组件期望的格式
const formattedCpuData = computed(() => {
  if (!systemData.value || !systemData.value.cpu) {
    return {
      info: {
        brand: 'Unknown CPU',
        arch: 'Unknown',
        count: 0,
        physical_count: 0,
        freq_current: 0,
        freq_max: 0
      },
      usage: 0,
      percent: [],
      memory: {
        total: 0,
        used: 0,
        percent: 0
      },
      system: {
        hostname: 'Unknown',
        platform: 'Unknown',
        uptime: 'Unknown'
      },
      disks: {}
    }
  }
  
  // 从日志中看到的实际数据结构
  const cpuData = systemData.value.cpu
  
  return {
    info: {
      brand: cpuData.cpu_info?.brand || 'Unknown CPU',
      arch: cpuData.cpu_info?.arch || 'Unknown',
      count: cpuData.cpu_info?.count || 0,
      physical_count: cpuData.cpu_info?.physical_count || 0,
      freq_current: cpuData.cpu_info?.freq_current || 0,
      freq_max: cpuData.cpu_info?.freq_max || 0
    },
    usage: cpuData.cpu_info?.percent || 0,
    percent: cpuData.cpu_info?.per_cpu_percent || [],
    load1_percent: cpuData.cpu_info?.load_percentage?.load1_percent || 0,
    memory: {
      total: cpuData.memory?.total || 0,
      used: cpuData.memory?.used || 0,
      percent: cpuData.memory?.percent || 0
    },
    system: {
      hostname: cpuData.system?.hostname || 'Unknown',
      platform: cpuData.system?.platform || 'Unknown',
      uptime: cpuData.system?.uptime || 'Unknown'
    },
    disks: cpuData.disks || {}
  }
})

// 获取服务器状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'danger'
    case 'unknown':
    default:
      return 'info'
  }
}

// 获取服务器状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'unknown':
    default:
      return '未知'
  }
}

// 获取服务器详情
const fetchServerData = async () => {
  loading.value = true
  error.value = null
  
  try {
    // 获取服务器基本信息
    const server = await serversStore.fetchServerDetails(props.serverId)
    serverData.value = server
    
    // 获取系统监控数据
    await fetchSystemData()
  } catch (err) {
    console.error('获取服务器数据失败:', err)
    error.value = '获取服务器数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 获取系统监控数据
const fetchSystemData = async () => {
  try {
    const response = await serversStore.fetchServerSystemData(props.serverId)
    systemData.value = response
  } catch (err) {
    console.error('获取系统监控数据失败:', err)
    // 不设置error，因为这只是部分数据
    ElMessage.warning('获取系统监控数据失败，部分数据可能不可用')
  }
}

// 刷新数据
const refreshData = () => {
  fetchServerData()
}

// 设置自动刷新
const setupAutoRefresh = () => {
  // 清除之前的定时器
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  // 每10秒只刷新系统监控数据，不刷新整个页面
  refreshInterval.value = setInterval(async () => {
    try {
      // 只获取系统数据，不刷新服务器基本信息
      const response = await serversStore.fetchServerSystemData(props.serverId)
      // 更新系统数据，不影响其他组件
      systemData.value = response
    } catch (err) {
      console.error('实时获取系统监控数据失败:', err)
    }
  }, 1000) // 每5秒更新一次，提高实时性
}

// 监听serverId变化
watch(() => props.serverId, (newId) => {
  if (newId) {
    fetchServerData()
    setupAutoRefresh()
  }
})

onMounted(() => {
  if (props.serverId) {
    fetchServerData()
    setupAutoRefresh()
  }
})

// 组件销毁时清除定时器
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.server-detail {
  width: 100%;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-container,
.error-container,
.empty-container {
  padding: 80px 20px;
  text-align: center;
  background: linear-gradient(135deg, rgba(144, 147, 153, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-radius: 16px;
  margin: 40px 0;
  border: 2px dashed rgba(64, 158, 255, 0.2);
  backdrop-filter: blur(10px);
}

.empty-icon {
  font-size: 80px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: float 3s infinite ease-in-out;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); }
}

.server-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
  animation: staggerIn 1s ease-out 0.2s both;
}

@keyframes staggerIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.server-info-card {
  margin-bottom: 0;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.server-info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.03) 50%, rgba(255, 255, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  border-radius: 16px 16px 0 0;
}

.server-title {
  display: flex;
  align-items: center;
  gap: 20px;
  animation: slideInLeft 0.6s ease-out 0.4s both;
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

.server-title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.server-info-row {
  display: flex;
  justify-content: space-between;
  margin-top: 0;
  width: 100%;
  padding: 25px;
  gap: 20px;
}

.info-col {
  flex: 1;
  padding: 20px;
  min-width: 0;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 100%);
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  transition: all 0.3s ease;
  animation: slideInUp 0.6s ease-out var(--delay, 0.6s) both;
}

.info-col:nth-child(1) { --delay: 0.6s; }
.info-col:nth-child(2) { --delay: 0.7s; }
.info-col:nth-child(3) { --delay: 0.8s; }
.info-col:nth-child(4) { --delay: 0.9s; }

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.info-col:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}

.info-label {
  font-weight: 600;
  color: #409EFF;
  margin-bottom: 8px;
  white-space: nowrap;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.route-info {
  white-space: normal;
  font-size: 16px;
  line-height: 1.5;
}

.route-info .info-sub {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 400;
  color: #606266;
}

.monitor-section {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.server-actions {
  animation: slideInRight 0.6s ease-out 0.8s both;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 移动端优化样式 */
@media (max-width: 768px) {
  .server-detail {
    padding: 10px;
  }
  
  .server-info-card {
    margin-bottom: 20px;
    border-radius: 12px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
    padding: 15px 20px;
  }
  
  .server-title {
    flex-direction: column;
    gap: 10px;
    align-items: center;
    text-align: center;
  }
  
  .server-title h2 {
    font-size: 20px;
  }
  
  .server-actions {
    display: flex;
    justify-content: center;
  }
  
  .server-info-row {
    flex-direction: column;
    gap: 15px;
    padding: 20px;
  }
  
  .info-col {
    padding: 15px;
    border-radius: 8px;
  }
  
  .info-label {
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .info-value {
    font-size: 16px;
  }
  
  .monitor-section {
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .server-detail {
    padding: 5px;
  }
  
  .card-header {
    padding: 12px 15px;
  }
  
  .server-title h2 {
    font-size: 18px;
  }
  
  .server-info-row {
    padding: 15px;
    gap: 12px;
  }
  
  .info-col {
    padding: 12px;
  }
  
  .info-label {
    font-size: 12px;
    margin-bottom: 4px;
  }
  
  .info-value {
    font-size: 14px;
  }
  
  .monitor-section {
    gap: 15px;
  }
}
</style>
