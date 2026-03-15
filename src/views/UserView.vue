<template>
  <div class="user-container">
    <div class="main-content">
      <!-- 欢迎卡片 -->
      <el-row :gutter="20" v-if="!selectedServer" class="equal-height-cards">
        <el-col :xs="24" :sm="24" :md="8" :lg="6" :xl="6">
          <div class="welcome-card-wrapper">
            <div class="welcome-card-header">
              <span>欢迎使用</span>
            </div>
            <div class="welcome-card-body">
              <div class="welcome-content">
                <el-avatar :size="110" class="user-avatar" :src="welcomeAvatarUrl">
                  {{ avatarInitial }}
                </el-avatar>
                <h3>{{ username || '用户' }}</h3>
                <el-tag v-if="userGroup.display_label" :type="getGroupTagType(userGroup.group)" class="user-group-tag">
                  {{ userGroup.display_label }}
                </el-tag>
                <p>您已成功登录{{ siteSettings.name }}</p>
                <div class="resource-stats">
                  <div class="stat-item">
                    <el-icon><Monitor /></el-icon>
                    <div class="stat-info">
                      <span class="stat-number">{{ resourceStats.serverCount }}</span>
                      <span class="stat-label">
                        台服务器<span v-if="resourceStats.unregisteredServerCount > 0">（{{ resourceStats.unregisteredServerCount }}台非注册）</span>
                      </span>
                    </div>
                  </div>
                  <div class="stat-item">
                    <el-icon><Box /></el-icon>
                    <div class="stat-info">
                      <span class="stat-number">{{ resourceStats.containerCount }}</span>
                      <span class="stat-label">
                        个容器<span v-if="resourceStats.unregisteredContainerCount > 0">（{{ resourceStats.unregisteredContainerCount }}个非注册）</span>
                      </span>
                    </div>
                  </div>
                  <div class="stat-item">
                    <el-icon><Operation /></el-icon>
                    <div class="stat-info">
                      <span class="stat-number">{{ containerStats.total_process_count }}</span>
                      <span class="stat-label">个任务正在运行</span>
                    </div>
                  </div>

                  <!-- 资源统计卡片，纵向排列 -->
                  <div class="resource-detail-stats">
                    <div class="stat-item-detailed">
                      <div class="stat-icon cpu">
                        <el-icon><Monitor /></el-icon>
                      </div>
                      <div class="stat-data">
                        <div class="stat-value">{{ containerStats.avg_cpu_usage }}%</div>
                        <div class="stat-label">平均CPU占用</div>
                      </div>
                    </div>

                    <div class="stat-item-detailed">
                      <div class="stat-icon gpu">
                        <el-icon><VideoPlay /></el-icon>
                      </div>
                      <div class="stat-data">
                        <div class="stat-value">{{ containerStats.total_gpu_usage }}%</div>
                        <div class="stat-label">总GPU占用</div>
                      </div>
                    </div>

                    <div class="stat-item-detailed">
                      <div class="stat-icon memory">
                        <el-icon><Coin /></el-icon>
                      </div>
                      <div class="stat-data">
                        <div class="stat-value">{{ containerStats.total_memory_gb }}GB</div>
                        <div class="stat-label">总显存使用</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="24" :md="16" :lg="18" :xl="18">
          <div class="quick-access-panel">
            <!-- 资源趋势图表卡片 -->
            <div class="trends-card" v-loading="trendsLoading">
              <div class="trends-card-header">
                <span>资源趋势</span>
                <div class="chart-controls">
                  <el-select v-model="selectedHours" @change="fetchTrendsData" size="small" style="width: 120px">
                    <el-option label="1小时" :value="1" />
                    <el-option label="6小时" :value="6" />
                    <el-option label="24小时" :value="24" />
                    <el-option label="3天" :value="72" />
                    <el-option label="7天" :value="168" />
                    <el-option label="15天" :value="360" />
                    <el-option label="30天" :value="720" />
                    <el-option label="60天" :value="1440" />
                  </el-select>
                  <el-button @click="fetchTrendsData" :icon="Refresh" circle size="small" :loading="trendsLoading"></el-button>
                </div>
              </div>
              <div class="trends-card-body">
                <div v-if="!trendsLoading && !hasTrendsData" class="trends-empty">
                  <el-empty description="暂无运行中的容器，暂无趋势数据" :image-size="80" />
                </div>
                <div v-else class="charts-content">
                  <el-row :gutter="20">
                    <el-col :span="8">
                      <div class="chart-item">
                        <h4>CPU占用率趋势</h4>
                        <v-chart :option="cpuChartOption" style="height: 200px;"></v-chart>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="chart-item">
                        <h4>GPU占用率趋势</h4>
                        <v-chart :option="gpuChartOption" style="height: 200px;"></v-chart>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="chart-item">
                        <h4>显存使用趋势</h4>
                        <v-chart :option="memoryChartOption" style="height: 200px;"></v-chart>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </div>

            <div class="process-report-card" v-loading="processReportsLoading">
              <div class="process-report-card-header">
                <span>我的任务运行报表</span>
                <div v-if="processReports?.meta?.generated_at" class="process-report-meta">
                  更新于 {{ formatDateTime(processReports.meta.generated_at) }}
                </div>
              </div>
              <div class="process-report-card-body">
                <div v-if="processReportsLoading && !processReports" class="process-report-loading">
                  <el-skeleton :rows="3" animated />
                </div>
                <div v-else>
                  <el-tabs v-model="processReportActive" class="process-report-tabs">
                    <el-tab-pane label="日报" name="daily" />
                    <el-tab-pane label="周报" name="weekly" />
                    <el-tab-pane label="月报" name="monthly" />
                    <el-tab-pane label="累计" name="all" />
                  </el-tabs>
                <div v-if="currentProcessReport">
                  <div class="report-grid">
                    <div class="report-item">
                      <div class="report-label">任务数量</div>
                      <div class="report-value">{{ currentProcessReport.process_count || 0 }}</div>
                    </div>
                    <div class="report-item">
                      <div class="report-label">运行时长总计</div>
                      <div class="report-value">{{ currentProcessReport.total_runtime_human || '0秒' }}</div>
                    </div>
                    <div class="report-item">
                      <div class="report-label">平均运行时长</div>
                      <div class="report-value">{{ currentProcessReport.average_runtime_human || '0秒' }}</div>
                    </div>
                    <div class="report-item">
                      <div class="report-label">显存总量</div>
                      <div class="report-value">{{ formatGb(currentProcessReport.total_gpu_memory_gb, 2) }}</div>
                    </div>
                    <div class="report-item">
                      <div class="report-label">平均显存峰值</div>
                      <div class="report-value">{{ currentProcessReport.average_gpu_memory_human || '0 MB' }}</div>
                    </div>
                  </div>

                  <div v-if="currentProcessReport.processes && currentProcessReport.processes.length" class="report-table-wrapper">
                    <el-table
                      :data="currentProcessReport.processes"
                      size="small"
                      class="process-detail-table"
                      stripe
                      :row-key="row => `${row.server_id}-${row.container_name}-${row.pid}-${row.process_instance}`"
                    >
                      <el-table-column prop="command" label="程序" min-width="200" show-overflow-tooltip />
                      <el-table-column prop="container_name" label="容器" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="server_name" label="服务器" min-width="160" show-overflow-tooltip />
                      <el-table-column label="运行时长" min-width="140">
                        <template #default="scope">
                          {{ scope.row.max_running_human }}
                        </template>
                      </el-table-column>
                      <el-table-column label="显存峰值" min-width="140">
                        <template #default="scope">
                          {{ formatMemoryMb(scope.row.max_gpu_memory_mb) }}
                        </template>
                      </el-table-column>
                      <el-table-column prop="last_seen" label="最后活跃" min-width="160">
                        <template #default="scope">
                          {{ formatDateTime(scope.row.last_seen) }}
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div class="containers-card">
              <div class="containers-card-header">
                <span>我的容器</span>
              </div>
              <div class="containers-card-body">
                <UserContainers ref="userContainersRef" />
              </div>
            </div>

            <div class="requests-card">
              <div class="requests-card-header">
                <span>我的申请记录</span>
              </div>
              <div class="requests-card-body">
                <ContainerRequestsList ref="containerRequestsListRef" />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      
      <!-- 隐藏服务器卡片 - 只有当存在隐藏的注册服务器时才显示 -->
      <el-row v-if="hasHiddenServers" :gutter="20" class="my-servers-section">
        <el-col :span="24">
          <div class="servers-card collapsible-card">
            <div class="card-header server-overview-header" @click="toggleMyServers" style="cursor: pointer;">
              <div class="title-with-icon">
                <el-icon><Monitor /></el-icon>
                <span>隐藏的服务器</span>
              </div>
              <el-icon :class="['expand-icon', showMyServers ? 'is-expanded' : '']">
                <ArrowDown />
              </el-icon>
            </div>
            <transition name="card-collapse">
              <div v-if="showMyServers" class="servers-card-body">
                <ServersOverview
                  embedded
                  :showHiddenOnly="true"
                  :filterServerIds="userContainerServerIds"
                  :username="username"
                  includeHidden
                  ref="myServersOverviewRef"
                />
              </div>
            </transition>
          </div>
        </el-col>
      </el-row>

      <!-- 服务器概览组件 -->
      <el-row v-if="showServerOverviewCard" :gutter="20" class="server-overview-section">
        <el-col :span="24">
          <div class="servers-card collapsible-card">
            <div class="card-header server-overview-header" @click="toggleServerOverview" style="cursor: pointer;">
              <div class="title-with-icon">
                <el-icon><Monitor /></el-icon>
                <span>服务器概览</span>
              </div>
              <el-icon :class="['expand-icon', showServerOverview ? 'is-expanded' : '']">
                <ArrowDown />
              </el-icon>
            </div>
            <transition name="card-collapse">
              <div v-if="showServerOverview" class="servers-card-body">
                <ServersOverview embedded />
              </div>
            </transition>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../utils/axios'
import { ArrowDown, Box, Document, Monitor, TrendCharts, Refresh, VideoPlay, Coin, Operation } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useUsersStore } from '../stores/users'
import { useServersStore } from '../stores/servers'
import ServersOverview from './ServersOverview.vue'
import UserContainers from '../components/UserContainers.vue'
import ContainerRequestsList from '../components/ContainerRequestsList.vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { resolveAvatarUrl } from '../utils/avatar'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer])

const router = useRouter()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const serversStore = useServersStore()
// 用户信息
const username = computed(() => authStore.user?.username || localStorage.getItem('username') || '')
const rawAvatarUrl = computed(() => {
  const direct = authStore.user?.avatar_url
  if (typeof direct === 'string') return direct
  return localStorage.getItem('avatarUrl') || ''
})
const welcomeAvatarUrl = computed(() => resolveAvatarUrl(rawAvatarUrl.value, username.value || 'user', 96))
const avatarInitial = computed(() => (username.value ? username.value.charAt(0) : '用').toUpperCase())
// 获取用户角色
const userRole = ref(localStorage.getItem('userRole') || '')
const selectedServer = ref(null)
const showServerOverviewCard = ref(false) // 默认不显示服务器概览卡片

// 我的服务器相关变量和方法
const showMyServers = ref(true) // 默认展开
const userContainersRef = ref(null)
const myServersOverviewRef = ref(null)

// 我的申请记录相关变量和方法
const containerRequestsListRef = ref(null)

// 切换我的服务器展示状态
const toggleMyServers = () => {
  showMyServers.value = !showMyServers.value
}

// 获取用户容器所在的服务器ID列表
const userContainerServerIds = computed(() => {
  if (!userContainersRef.value || !userContainersRef.value.containers) {
    return []
  }

  // 从用户容器中提取服务器ID并去重
  const serverIds = userContainersRef.value.containers
    .filter(container => container.user_username === username.value)
    .map(container => container.server_id)

  // 去重
  return [...new Set(serverIds)]
})

// 检查是否有隐藏的服务器且用户在上面有容器
const hasHiddenServers = computed(() => {
  return serversStore.servers.some(server => {
    // 必须是隐藏的服务器
    if (server.is_visible) return false;

    // 必须是用户有容器的服务器
    return userContainerServerIds.value.includes(server.id);
  })
})

// 站点设置
const siteSettings = reactive({
  name: 'GPU共享服务平台',
  logo: 'https://lank.myzr.org:88/i/2024/05/29/66571d8de15ea.png',
  subtitle: '高效、安全的资源管理平台'
})

// 资源统计
const resourceStats = reactive({
  serverCount: 0,
  containerCount: 0,
  unregisteredServerCount: 0,
  unregisteredContainerCount: 0,
  processCount: 0
})

// 容器统计数据
const containerStats = reactive({
  avg_cpu_usage: 0,
  total_gpu_usage: 0,
  total_memory_gb: 0,
  active_containers: 0,
  total_process_count: 0
})

const statsLoading = ref(false)
const processReports = ref(null)
const processReportsLoading = ref(false)
const PROCESS_REPORT_TABS = ['daily', 'weekly', 'monthly', 'all']
const PROCESS_REPORT_TAB_STORAGE_KEY = 'user-process-report-tab'

const readStoredProcessReportTab = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'daily'
  }
  try {
    const stored = window.localStorage.getItem(PROCESS_REPORT_TAB_STORAGE_KEY)
    return PROCESS_REPORT_TABS.includes(stored) ? stored : 'daily'
  } catch (error) {
    return 'daily'
  }
}

const processReportActive = ref(readStoredProcessReportTab())

// 图表相关数据
const trendsLoading = ref(false)
const ALLOWED_TRENDS_HOURS = [1, 6, 24, 72, 168, 360, 720, 1440]
const TRENDS_HOURS_STORAGE_KEY = 'user-trend-hours'

const readStoredHours = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  try {
    const stored = window.localStorage.getItem(TRENDS_HOURS_STORAGE_KEY)
    if (!stored) return null
    const parsed = parseInt(stored, 10)
    return Number.isInteger(parsed) && ALLOWED_TRENDS_HOURS.includes(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

const selectedHours = ref(readStoredHours() ?? 24)
const trendsData = reactive({
  cpu_series: [],
  gpu_series: [],
  memory_series: []
})

const hasTrendsData = computed(() => {
  const cpuPoints = Array.isArray(trendsData.cpu_series) ? trendsData.cpu_series.length : 0
  const gpuPoints = Array.isArray(trendsData.gpu_series) ? trendsData.gpu_series.length : 0
  const memoryPoints = Array.isArray(trendsData.memory_series) ? trendsData.memory_series.length : 0
  return cpuPoints > 0 || gpuPoints > 0 || memoryPoints > 0
})

// 用户分组信息
const userGroup = reactive({
  group: '',
  entry_year: null,
  display_label: ''
})

// 获取站点设置
const fetchSiteSettings = async () => {
  try {
    const response = await axios.get('/api/settings/site')
    siteSettings.name = response.data.site_name
    siteSettings.logo = response.data.site_logo
    siteSettings.subtitle = response.data.site_subtitle
  } catch (error) {
    console.error('获取站点设置失败:', error)
  }
}

// 获取资源统计
const fetchResourceStats = async () => {
  try {
    // 使用新的用户统计接口
    const response = await axios.get('/api/user/stats')
    resourceStats.serverCount = response.data.server_count || 0
    resourceStats.containerCount = response.data.container_count || 0
    resourceStats.unregisteredServerCount = response.data.unregistered_server_count || 0
    resourceStats.unregisteredContainerCount = response.data.unregistered_container_count || 0
    resourceStats.processCount = response.data.process_count || 0

    // 获取用户分组信息
    userGroup.group = response.data.group || ''
    userGroup.entry_year = response.data.entry_year || null
    userGroup.display_label = response.data.display_label || ''
  } catch (error) {
    console.error('获取资源统计失败:', error)
    // 设置默认值
    resourceStats.serverCount = 0
    resourceStats.containerCount = 0
    resourceStats.unregisteredServerCount = 0
    resourceStats.unregisteredContainerCount = 0
    resourceStats.processCount = 0
    userGroup.group = ''
    userGroup.entry_year = null
    userGroup.display_label = ''
  }
}

// 获取容器统计数据
const fetchContainerStats = async () => {
  statsLoading.value = true
  try {
    const response = await axios.get('/api/user/container-stats')

    // 输出详细调试信息

    containerStats.avg_cpu_usage = response.data.avg_cpu_usage || 0
    containerStats.total_gpu_usage = response.data.total_gpu_usage || 0
    containerStats.total_memory_gb = response.data.total_memory_gb || 0
    containerStats.active_containers = response.data.active_containers || 0
    containerStats.total_process_count = response.data.total_process_count || 0

  } catch (error) {
    console.error('获取容器统计数据失败:', error)
    // 设置默认值
    containerStats.avg_cpu_usage = 0
    containerStats.total_gpu_usage = 0
    containerStats.total_memory_gb = 0
    containerStats.active_containers = 0
    containerStats.total_process_count = 0
  } finally {
    statsLoading.value = false
  }
}

const fetchProcessReports = async () => {
  if (processReportsLoading.value) {
    return
  }
  processReportsLoading.value = true
  try {
    const response = await axios.get('/api/user/process_reports')
    processReports.value = response.data
    if (processReports.value) {
      const availableTabs = PROCESS_REPORT_TABS.filter(tab => processReports.value?.[tab])
      if (!availableTabs.length) {
        processReportActive.value = 'daily'
      } else if (!availableTabs.includes(processReportActive.value)) {
        processReportActive.value = availableTabs[0]
      }
    }
  } catch (error) {
    console.error('获取进程报表失败:', error)
    processReports.value = null
  } finally {
    processReportsLoading.value = false
  }
}

const formatGb = (value, fractionDigits = 1) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    return `${(0).toFixed(fractionDigits)} GB`
  }
  return `${num.toFixed(fractionDigits)} GB`
}

const formatMemoryMb = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    return '0 MB'
  }
  if (num >= 1024) {
    return `${(num / 1024).toFixed(2)} GB`
  }
  return `${num.toFixed(2)} MB`
}

const formatDateTime = (value) => {
  if (!value) {
    return '未知'
  }
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch (error) {
    return value
  }
}

const currentProcessReport = computed(() => {
  if (!processReports.value) {
    return null
  }
  return processReports.value[processReportActive.value] || null
})

watch(processReportActive, (value) => {
  if (!PROCESS_REPORT_TABS.includes(value)) {
    return
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(PROCESS_REPORT_TAB_STORAGE_KEY, value)
  } catch (error) {
  }
})

// 刷新统计数据
const refreshStats = async () => {
  await Promise.all([
    fetchResourceStats(),
    fetchContainerStats(),
    fetchProcessReports()
  ])
}

// 获取趋势数据
const fetchTrendsData = async () => {
  trendsLoading.value = true
  try {
    const response = await axios.get('/api/user/container-trends', {
      params: { hours: selectedHours.value }
    })
    trendsData.cpu_series = response.data.cpu_series || []
    trendsData.gpu_series = response.data.gpu_series || []
    trendsData.memory_series = response.data.memory_series || []
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    trendsData.cpu_series = []
    trendsData.gpu_series = []
    trendsData.memory_series = []
  } finally {
    trendsLoading.value = false
  }
}

watch(selectedHours, (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || !ALLOWED_TRENDS_HOURS.includes(numericValue)) {
    return
  }

  if (value !== numericValue) {
    selectedHours.value = numericValue
    return
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(TRENDS_HOURS_STORAGE_KEY, String(numericValue))
  } catch (error) {
  }
})

// CPU图表配置
const cpuChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: function(params) {
      const date = new Date(params[0].value[0])
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${timeStr}<br/>${params[0].seriesName}: ${params[0].value[1]}%`
    }
  },
  xAxis: {
    type: 'time',
    axisLabel: {
      fontSize: 12,
      color: '#666',
      formatter: function(value) {
        const date = new Date(value)
        const hours = selectedHours.value
        if (hours <= 1) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else if (hours <= 24) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else {
          return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        }
      },
      interval: 0,
      rotate: 45
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  yAxis: {
    type: 'value',
    name: 'CPU使用率(%)',
    nameTextStyle: {
      fontSize: 12,
      color: '#666',
      padding: [0, 0, 0, 10]
    },
    axisLabel: {
      fontSize: 12,
      color: '#666'
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  series: [{
    name: 'CPU使用率',
    type: 'line',
    data: trendsData.cpu_series,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      color: '#667eea',
      width: 2
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
          { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
        ]
      }
    }
  }],
  grid: {
    left: '11%',
    right: '10%',
    top: '15%',
    bottom: '25%'
  }
}))

// GPU图表配置
const gpuChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: function(params) {
      const date = new Date(params[0].value[0])
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${timeStr}<br/>${params[0].seriesName}: ${params[0].value[1]}%`
    }
  },
  xAxis: {
    type: 'time',
    axisLabel: {
      fontSize: 12,
      color: '#666',
      formatter: function(value) {
        const date = new Date(value)
        const hours = selectedHours.value
        if (hours <= 1) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else if (hours <= 24) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else {
          return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        }
      },
      interval: 0,
      rotate: 45
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  yAxis: {
    type: 'value',
    name: 'GPU使用率(%)',
    nameTextStyle: {
      fontSize: 12,
      color: '#666',
      padding: [0, 0, 0, 10]
    },
    axisLabel: {
      fontSize: 12,
      color: '#666'
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  series: [{
    name: 'GPU使用率',
    type: 'line',
    data: trendsData.gpu_series,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      color: '#f5576c',
      width: 2
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(245, 87, 108, 0.3)' },
          { offset: 1, color: 'rgba(245, 87, 108, 0.05)' }
        ]
      }
    }
  }],
  grid: {
    left: '11%',
    right: '10%',
    top: '15%',
    bottom: '25%'
  }
}))

// 显存图表配置
const memoryChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: function(params) {
      const date = new Date(params[0].value[0])
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${timeStr}<br/>${params[0].seriesName}: ${params[0].value[1]}GB`
    }
  },
  xAxis: {
    type: 'time',
    axisLabel: {
      fontSize: 12,
      color: '#666',
      formatter: function(value) {
        const date = new Date(value)
        const hours = selectedHours.value
        if (hours <= 1) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else if (hours <= 24) {
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        } else {
          return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        }
      },
      interval: 0,
      rotate: 45
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  yAxis: {
    type: 'value',
    name: '显存使用量(GB)',
    nameTextStyle: {
      fontSize: 12,
      color: '#666',
      padding: [0, 0, 0, 10]
    },
    axisLabel: {
      fontSize: 12,
      color: '#666'
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  series: [{
    name: '显存使用',
    type: 'line',
    data: trendsData.memory_series,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      color: '#00f2fe',
      width: 2
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(0, 242, 254, 0.3)' },
          { offset: 1, color: 'rgba(0, 242, 254, 0.05)' }
        ]
      }
    }
  }],
  grid: {
    left: '11%',
    right: '10%',
    top: '15%',
    bottom: '25%'
  }
}))

// 自动刷新定时器
let statsRefreshTimer = null
let trendsRefreshTimer = null

// 组件挂载时获取基础数据
onMounted(() => {
  fetchSiteSettings()
  fetchResourceStats()
  fetchContainerStats()
  fetchProcessReports()
  fetchTrendsData()
  // 获取服务器列表以便检查隐藏服务器
  serversStore.fetchServers()

  // 启动自动刷新定时器，每30秒刷新一次资源统计数据
  statsRefreshTimer = setInterval(() => {
    refreshStats()
  }, 30000) // 30秒

  // 启动趋势数据自动刷新定时器，每2分钟刷新一次
  trendsRefreshTimer = setInterval(() => {
    fetchTrendsData()
  }, 120000) // 2分钟
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (statsRefreshTimer) {
    clearInterval(statsRefreshTimer)
    statsRefreshTimer = null
  }
  if (trendsRefreshTimer) {
    clearInterval(trendsRefreshTimer)
    trendsRefreshTimer = null
  }
})

// 分组标签颜色类型
const getGroupTagType = (code) => {
  switch (code) {
    case 'undergrad': return 'success'    // 绿色 - 本科生
    case 'master': return 'primary'       // 蓝色 - 硕士生
    case 'phd': return 'warning'          // 橙色 - 博士生
    case 'teacher': return 'danger'       // 红色 - 教师
    case 'unassigned': return 'info'      // 灰色 - 未分组
    default: return ''
  }
}


const showServerOverview = ref(false) // 默认关闭

const toggleServerOverview = () => {
  showServerOverview.value = !showServerOverview.value
}
</script>

<style scoped>
.user-container {
  width: 100%;
  animation: containerFadeIn 0.8s ease-out;
}

@keyframes containerFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.main-content {
  max-width: 1600px;
  margin: 0 auto;
}

.equal-height-cards {
  align-items: stretch;
}

.equal-height-cards .el-col {
  display: flex;
  flex-direction: column;
}

.welcome-card-wrapper {
  margin-bottom: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.welcome-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.03) 50%, rgba(255, 255, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.welcome-card-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}


.servers-card {
  margin-bottom: 30px;
  height: 100%;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: visible;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}


.quick-access-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.collapsible-card {
  overflow: hidden;
}

.servers-card-body {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.92);
}

.card-collapse-enter-active,
.card-collapse-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.card-collapse-enter-from,
.card-collapse-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.my-requests-section, .my-containers-section, .my-servers-section {
  margin-top: 30px;
}

/* （撤回）不修改“我的服务器”父卡片背景，保持默认样式 */

.welcome-card-wrapper:hover, .info-card:hover, .requests-card:hover, .containers-card:hover, .servers-card:hover, .trends-card:hover, .process-report-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.03) 50%, rgba(255, 255, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  font-weight: 600;
  font-size: 16px;
}

.username-header {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 500;
  color: #409EFF;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #36D1DC 50%, #667eea 100%);
  color: white;
  font-weight: bold;
  font-size: 32px;
  border: 3px solid white;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 35px rgba(64, 158, 255, 0.5);
}


.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 25px;
  width: 100%;
}


.welcome-content h3 {
  margin: 20px 0 10px;
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: -0.5px;
}

.welcome-content p {
  margin: 5px 0;
  color: #606266;
}

.user-group-tag {
  margin: 8px 0;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  padding: 4px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.user-group-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.resource-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05), rgba(100, 100, 255, 0.02));
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  width: 100%;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(64, 158, 255, 0.08);
  transform: translateX(4px);
}

.stat-item .el-icon {
  font-size: 20px;
  color: #409EFF;
  opacity: 0.8;
}

.stat-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}


.last-login {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  font-size: 14px;
  color: #909399;
}


.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
  width: 100%;
  justify-content: center;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f5f7fa;
  padding: 8px 12px;
  border-radius: 6px;
  min-width: 120px;
  font-size: 0.9em;
}

.feature-icon {
  font-size: 20px;
  color: #409EFF;
}

.loading-container, .empty-container {
  padding: 30px 0;
  text-align: center;
}

.empty-icon {
  font-size: 60px;
  color: #909399;
}

.servers-list {
  margin-top: 10px;
}

.server-overview-section {
  margin-top: 30px;
  margin-bottom: 30px;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.servers-card {
  width: 100%;
}

.server-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.server-overview-header:hover {
  color: #409EFF;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: #303133;
}

.title-with-icon .el-icon {
  font-size: 18px;
  color: #409EFF;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.title-with-icon span {
  font-size: 16px;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.card-header:hover .title-with-icon .el-icon {
  opacity: 1;
  transform: scale(1.1);
}

.card-header:hover .title-with-icon span {
  color: #409EFF;
}

.expand-icon {
  transition: transform 0.3s;
}

.expand-icon.is-expanded {
  transform: rotate(180deg);
}

/* 服务器相关样式已移除 */

.el-footer {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(64, 158, 255, 0.05) 100%);
  padding: 30px;
  text-align: center;
  color: #909399;
  border-top: 1px solid rgba(64, 158, 255, 0.1);
  backdrop-filter: blur(20px);
  margin-top: 40px;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
}

.footer-content p {
  margin: 0;
  font-size: 15px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 500;
}

.footer-content p::before,
.footer-content p::after {
  content: '✦';
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 12px;
}

/* 移动端优化样式 */
@media (max-width: 768px) {
  .main-content {
    padding: 0 10px;
  }
  
  .equal-height-cards .el-col {
    margin-bottom: 20px;
  }
  
  .quick-access-panel {
    gap: 15px;
  }
  
  .welcome-card-wrapper {
    margin-bottom: 20px;
    border-radius: 12px;
  }
  
  .welcome-card-header {
    padding: 15px 20px;
    font-size: 14px;
  }
  
  .welcome-content {
    padding: 20px !important;
  }
  
  .welcome-content h3 {
    font-size: 18px;
    margin: 15px 0 10px 0;
  }
  
  .welcome-content p {
    font-size: 14px;
    margin-bottom: 15px;
  }
  
  .resource-stats {
    gap: 15px !important;
  }
  
  .stat-item {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-number {
    font-size: 20px !important;
  }

  .stat-label {
    font-size: 12px;
  }
  
  .info-card,
  .servers-card,
  .containers-card,
  .requests-card,
  .process-report-card {
    margin-bottom: 20px;
    border-radius: 12px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
    padding: 15px !important;
  }
  
  .card-header span {
    font-size: 16px;
  }
  
  .my-requests-section,
  .my-containers-section,
  .server-overview-section {
    margin-top: 20px;
    margin-bottom: 20px;
  }
  
  .server-overview-header {
    padding: 15px !important;
  }
  
  .title-with-icon {
    gap: 8px;
  }

  .title-with-icon .el-icon {
    font-size: 16px;
  }

  .title-with-icon span {
    font-size: 15px;
  }
  
  .el-footer {
    padding: 20px;
    margin-top: 20px;
  }
  
  .footer-content p {
    font-size: 13px;
    flex-direction: column;
    gap: 5px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 0 5px;
  }
  
  .quick-access-panel {
    gap: 12px;
  }
  
  .welcome-card-header {
    padding: 12px 15px;
    font-size: 13px;
  }
  
  .welcome-content {
    padding: 15px !important;
  }
  
  .welcome-content h3 {
    font-size: 16px;
    margin: 12px 0 8px 0;
  }
  
  .welcome-content p {
    font-size: 13px;
  }
  
  .user-avatar,
  .el-avatar {
    width: 60px !important;
    height: 60px !important;
    font-size: 24px !important;
  }
  
  .stat-number {
    font-size: 18px !important;
  }
  
  .card-header {
    padding: 12px !important;
  }
  
  .card-header span {
    font-size: 14px;
  }
  
  .server-overview-header {
    padding: 12px !important;
  }
  
  .title-with-icon .el-icon {
    font-size: 15px;
  }

  .title-with-icon span {
    font-size: 14px;
  }
  
  .el-footer {
    padding: 15px;
  }
  
  .footer-content p {
    font-size: 12px;
  }
}

/* 新的详细资源统计样式 */
.resource-detail-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(245, 247, 250, 0.6));
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.15);
}

.stat-item-detailed {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
  border: 1px solid rgba(64, 158, 255, 0.1);
}

.stat-item-detailed:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.1);
  background: rgba(255, 255, 255, 0.9);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
  color: white;
}

.stat-icon.cpu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.gpu {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.memory {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-data {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  line-height: 1;
  margin-bottom: 4px;
}

.resource-detail-stats .stat-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

@media (max-width: 768px) {
  .resource-detail-stats {
    gap: 10px;
    padding: 12px;
  }

  .stat-item-detailed {
    padding: 10px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-right: 10px;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 11px;
  }
}

/* 图表卡片样式 */
.trends-card {
  flex: 0 0 auto;
  min-height: 400px;
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.containers-card {
  flex: 1;
  border-radius: 16px;
  overflow: visible;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.requests-card {
  flex: 1;
  border-radius: 16px;
  overflow: visible;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.trends-card-header, .containers-card-header, .requests-card-header, .process-report-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.03) 50%, rgba(255, 255, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.trends-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.trends-empty {
  padding: 40px 0;
}

.containers-card-body, .requests-card-body, .process-report-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.trends-card-body .charts-content {
  margin: 0;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.charts-content {
  padding: 10px 0;
}

.chart-item {
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px 5px 15px 25px;
  height: 260px;
  overflow: visible;
}

.chart-item h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.process-report-card {
  flex: 1;
  border-radius: 16px;
  overflow: visible;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.process-report-meta {
  font-size: 13px;
  color: #909399;
}

.process-report-loading {
  padding: 12px 0;
}

.process-report-tabs {
  margin-bottom: 12px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.report-item {
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(103, 194, 58, 0.18);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-label {
  font-size: 13px;
  color: #606266;
}

.report-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2d3d;
}

.report-hint {
  font-size: 12px;
  color: #909399;
}

.report-empty {
  padding: 12px 0;
}

.report-table-wrapper {
  margin-top: 18px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(103, 194, 58, 0.12);
}

.process-detail-table :deep(.el-table__header-wrapper) {
  background: rgba(103, 194, 58, 0.12);
}

.process-detail-table :deep(.el-table__row:hover > td) {
  background: rgba(103, 194, 58, 0.08);
}

@media (max-width: 768px) {
  .charts-content .el-col {
    margin-bottom: 20px;
  }

  .chart-item {
    height: 220px;
    padding: 10px;
  }

  .chart-item h4 {
    font-size: 14px;
    margin-bottom: 10px;
  }

  .chart-controls {
    flex-direction: column;
    gap: 5px;
    align-items: flex-end;
  }
}
</style>
