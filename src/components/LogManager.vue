<template>
  <div class="log-manager">
    <!-- 日志列表 -->
    <div class="log-list">
      <!-- 搜索过滤区域 -->
      <el-card class="filter-card" shadow="hover">
        <div class="filter-container">
          <el-form :model="filterForm" label-width="80px" class="filter-form">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="用户名">
                  <el-input v-model="filterForm.username" placeholder="搜索用户名" clearable @clear="handleFilter" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="操作类型">
                  <el-select v-model="filterForm.action_type" placeholder="选择操作类型" clearable @clear="handleFilter">
                    <el-option v-for="item in actionTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="资源类型">
                  <el-select v-model="filterForm.resource_type" placeholder="选择资源类型" clearable @clear="handleFilter">
                    <el-option v-for="item in resourceTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="状态">
                  <el-select v-model="filterForm.status" placeholder="选择状态" clearable @clear="handleFilter">
                    <el-option label="成功" value="success" />
                    <el-option label="失败" value="failed" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="时间范围">
                  <el-date-picker
                    v-model="filterForm.date_range"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12" class="filter-buttons">
                <el-button type="primary" @click="handleFilter">
                  <el-icon><Search /></el-icon>
                  <span>搜索</span>
                </el-button>
                <el-button @click="resetFilter">
                  <el-icon><RefreshLeft /></el-icon>
                  <span>重置</span>
                </el-button>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-card>
      
      <!-- 日志表格 -->
      <el-card class="table-card" shadow="hover">
        <el-table
          v-loading="loading"
          :data="logs"
          style="width: 100%"
          border
          stripe
          highlight-current-row
        >
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="action_type" label="操作类型" width="100">
            <template #default="scope">
              <el-tag :type="getActionTypeTag(scope.row.action_type)">
                {{ getActionTypeLabel(scope.row.action_type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resource_type" label="资源类型" width="100">
            <template #default="scope">
              <el-tag type="info">{{ getResourceTypeLabel(scope.row.resource_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resource_id" label="资源ID" width="80" />
          <el-table-column label="操作描述" min-width="360" show-overflow-tooltip>
            <template #default="scope">
              {{ getLogDescription(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="scope">
              <el-tag :type="getStatusTag(scope.row.status)">
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ip_address" label="IP地址" width="160" />
          <el-table-column label="操作时间" width="160" sortable>
            <template #default="scope">
              {{ formatDateTime(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="详情" width="100" fixed="right">
            <template #default="scope">
              <el-button
                size="small"
                type="primary"
                @click="viewLogDetails(scope.row)"
              >
                <span>详情</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
    
    <!-- 日志统计 -->
    <el-card class="stats-card" shadow="hover" v-if="showStats">
      <template #header>
        <div class="card-header">
          <div class="card-header-title">
            <el-icon><DataAnalysis /></el-icon>
            <span>日志统计信息</span>
          </div>
          <div class="card-header-actions">
            <el-select
              v-model="statsForm.days"
              placeholder="选择时间范围"
              class="card-header-select"
              @change="fetchLogStats"
            >
              <el-option label="最近7天" :value="7" />
              <el-option label="最近30天" :value="30" />
              <el-option label="最近90天" :value="90" />
            </el-select>
          </div>
        </div>
      </template>
      <div class="stats-container" v-loading="statsLoading">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="stats-chart">
              <h3>操作类型分布</h3>
              <div id="action-type-chart" style="height: 300px;"></div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stats-chart">
              <h3>资源类型分布</h3>
              <div id="resource-type-chart" style="height: 300px;"></div>
            </div>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="stats-chart">
              <h3>用户操作排行</h3>
              <div id="user-chart" style="height: 300px;"></div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stats-chart">
              <h3>日期趋势</h3>
              <div id="date-chart" style="height: 300px;"></div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="50%"
      :close-on-click-modal="false"
      :append-to-body="true"
      :lock-scroll="false"
      center
    >
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户名">{{ currentLog.username }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentLog.user_id }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getActionTypeTag(currentLog.action_type)">
              {{ getActionTypeLabel(currentLog.action_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源类型">
            <el-tag type="info">{{ getResourceTypeLabel(currentLog.resource_type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源ID">{{ currentLog.resource_id || '无' }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentLog.ip_address || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'">
              {{ currentLog.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ formatDateTime(currentLog.created_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="details-section" v-if="currentLog.details">
          <h3>详细信息</h3>
          <pre class="details-json">{{ formatDetails(currentLog.details) }}</pre>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button
            v-if="isSuperAdmin && currentLog"
            type="danger"
            :loading="deleteLogLoading"
            @click="deleteCurrentLog"
          >删除日志</el-button>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import axios from '../utils/axios'
import {
  Refresh, Search, RefreshLeft,
  Document, Setting, User, Delete, Edit, Key, DataAnalysis
} from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { 
  TitleComponent, TooltipComponent, LegendComponent,
  GridComponent, DatasetComponent, TransformComponent 
} from 'echarts/components'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册 ECharts 组件
echarts.use([
  TitleComponent, TooltipComponent, LegendComponent,
  GridComponent, DatasetComponent, TransformComponent,
  BarChart, PieChart, LineChart,
  LabelLayout, UniversalTransition,
  CanvasRenderer
])

// 路由
const route = useRoute()

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
})

// 日志列表
const logs = ref([])
const loading = ref(false)
const showStats = ref(true)
const statsLoading = ref(false)
const cleanupLoading = ref(false)

// 刷新任务计时器，避免重复触发请求
let refreshTimer = null

// 仅admin用户显示清理按钮
const isSuperAdmin = computed(() => {
  return localStorage.getItem('username') === 'admin' && localStorage.getItem('userRole') === 'admin'
})

// 图表实例管理
const chartInstances = reactive({
  actionTypeChart: null,
  resourceTypeChart: null,
  userChart: null,
  dateChart: null
})

// 分页
const pagination = reactive({
  page: 1,
  per_page: 20,
  total: 0,
  pages: 0
})

// 过滤表单
const filterForm = reactive({
  username: '',
  action_type: '',
  resource_type: '',
  status: '',
  date_range: []
})

// 统计表单
const statsForm = reactive({
  days: 7
})

// 日志详情
const detailDialogVisible = ref(false)
const currentLog = ref(null)
const deleteLogLoading = ref(false)

// 操作类型选项
const actionTypes = [
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'view', label: '查看' },
  { value: 'backup', label: '备份' },
  { value: 'restore', label: '恢复' },
  { value: 'export', label: '导出' },
  { value: 'change_password', label: '修改密码' },
  { value: 'password_change', label: '激活' },
  { value: 'start', label: '启动' },
  { value: 'stop', label: '停止' }
]

// 资源类型选项
const resourceTypes = [
  { value: 'user', label: '用户' },
  { value: 'user_avatar', label: '修改头像' },
  { value: 'server', label: '服务器' },
  { value: 'network_route', label: '路由' },
  { value: 'logs', label: '日志' },
  { value: 'announcement', label: '公告' },
  { value: 'container', label: '容器' },
  { value: 'container_request', label: '容器申请' },
  { value: 'docker_image', label: 'Docker 镜像' },
  { value: 'storage_path', label: '存储路径' },
  { value: 'port_range', label: '端口范围' },
  { value: 'settings', label: '系统设置' },
  { value: 'webdav_config', label: '备份配置' },
  { value: 'system_backup', label: '系统备份' }
]

// 获取操作类型标签
const getActionTypeLabel = (type) => {
  const found = actionTypes.find(item => item.value === type)
  return found ? found.label : type
}

// 获取资源类型标签
const getResourceTypeLabel = (type) => {
  const found = resourceTypes.find(item => item.value === type)
  return found ? found.label : type
}

// 获取操作类型标签样式
const getActionTypeTag = (type) => {
  const map = {
    'login': 'success',
    'logout': 'info',
    'create': 'primary',
    'update': 'warning',
    'delete': 'danger',
    'view': 'info',
    'backup': 'primary',
    'restore': 'success',
    'export': 'info',
    'change_password': 'warning',
    'password_change': 'success',
    'start': 'success',
    'stop': 'danger'
  }
  return map[type] || 'info'
}

// 获取状态标签样式
const getStatusTag = (status) => {
  const map = {
    'success': 'success',
    'failed': 'danger',
    'pending': 'warning',
    'error': 'danger'
  }
  return map[status] || 'info'
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const map = {
    'success': '成功',
    'failed': '失败',
    'pending': '进行中',
    'error': '错误'
  }
  return map[status] || status
}

// 获取日志描述
const getLogDescription = (log) => {
  try {
    // 如果details中有description字段，直接返回
    if (log.details) {
      let details = log.details
      if (typeof details === 'string') {
        details = JSON.parse(details)
      }
      if (details.description) {
        return details.description
      }
    }
    
    // 如果没有description，根据操作类型生成默认描述
    const actionLabel = getActionTypeLabel(log.action_type)
    const resourceLabel = getResourceTypeLabel(log.resource_type)
    return `${actionLabel}${resourceLabel}`
  } catch (e) {
    console.error('解析日志描述失败:', e)
    return `${getActionTypeLabel(log.action_type)}${getResourceTypeLabel(log.resource_type)}`
  }
}

// 格式化详情
const formatDetails = (details) => {
  if (typeof details === 'string') {
    try {
      return JSON.stringify(JSON.parse(details), null, 2)
    } catch (e) {
      return details
    }
  }
  return JSON.stringify(details, null, 2)
}

// 格式化时间，将UTC时间转换为本地时间并正确显示
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return ''

  try {
    const sourceDate = new Date(dateTimeString)
    const utcTime = sourceDate.getTime() + sourceDate.getTimezoneOffset() * 60000
    const date = new Date(utcTime + 8 * 3600000)
    const pad = (num) => String(num).padStart(2, '0')
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hour = pad(date.getHours())
    const minute = pad(date.getMinutes())
    const second = pad(date.getSeconds())
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`
  } catch (e) {
    console.error('时间格式化错误:', e)
    return dateTimeString
  }
}

// 获取日志列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {
      page: pagination.page || 1,
      per_page: pagination.per_page || 20
    }
    
    // 添加过滤条件
    if (filterForm.username) params.username = filterForm.username
    if (filterForm.action_type) params.action_type = filterForm.action_type
    if (filterForm.resource_type) params.resource_type = filterForm.resource_type
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.date_range && filterForm.date_range.length === 2) {
      params.start_date = filterForm.date_range[0]
      params.end_date = filterForm.date_range[1]
    }
    
    const response = await axios.get('/api/logs', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })
    
    logs.value = response.data.logs
    
    // 处理分页数据，支持两种数据结构
    if (response.data.pagination) {
      // 新的数据结构：{logs: [...], pagination: {total, page, per_page}}
      pagination.total = response.data.pagination.total
      pagination.page = response.data.pagination.page
      pagination.per_page = response.data.pagination.per_page
    } else {
      // 旧的数据结构：{logs: [...], total, page, per_page}
      pagination.total = response.data.total
      pagination.page = response.data.page
      pagination.per_page = response.data.per_page
    }
    
  } catch (error) {
    console.error('获取日志失败:', error)
    ElMessage.error('获取日志失败: ' + (error.response?.data?.msg || error.message))
  } finally {
    loading.value = false
  }
}

const deleteCurrentLog = async () => {
  if (!isSuperAdmin.value || !currentLog.value || deleteLogLoading.value) return

  try {
    await ElMessageBox.confirm('确定要删除该条日志吗？此操作不可恢复。', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (error) {
    return
  }

  deleteLogLoading.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`/api/logs/${currentLog.value.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    ElMessage.success('日志已删除')
    detailDialogVisible.value = false
    currentLog.value = null
    await fetchLogs()
  } catch (error) {
    console.error('删除日志失败:', error)
    ElMessage.error(error.response?.data?.msg || '删除日志失败')
  } finally {
    deleteLogLoading.value = false
  }
}

// 获取日志统计
const fetchLogStats = async () => {
  statsLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/logs/stats', {
      params: { days: statsForm.days },
      headers: { Authorization: `Bearer ${token}` }
    })
    
    renderCharts(response.data.stats)
  } catch (error) {
    console.error('获取日志统计失败:', error)
    ElMessage.error('获取日志统计失败: ' + (error.response?.data?.msg || error.message))
  } finally {
    statsLoading.value = false
  }
}

// 渲染图表
const renderCharts = (stats) => {
  // 先销毁已存在的图表实例
  destroyCharts()
  
  // 使用nextTick确保DOM完全渲染后再初始化图表
  nextTick(() => {
    // 如果统计面板不显示，不初始化图表
    if (!showStats.value) {
      return
    }
    
    // 增加初始延迟，确保DOM完全渲染
    setTimeout(() => {
      // 检查DOM元素是否存在且有尺寸，支持多次重试
      const checkAndInitChart = (elementId, initFunction, retryCount = 0) => {
        const element = document.getElementById(elementId)
        const maxRetries = 5
        
        if (element && element.clientWidth > 0 && element.clientHeight > 0) {
          initFunction(element)
        } else if (retryCount < maxRetries) {
          // 递增延迟重试
          setTimeout(() => {
            checkAndInitChart(elementId, initFunction, retryCount + 1)
          }, 200 * (retryCount + 1))
        } else {
          console.error(`图表容器 ${elementId} 初始化失败，已达到最大重试次数`)
        }
      }
      
      // 操作类型图表
      checkAndInitChart('action-type-chart', (element) => {
        const actionTypeChart = echarts.init(element)
        const actionTypeData = Object.entries(stats.by_action).map(([key, value]) => ({
          name: getActionTypeLabel(key),
          value
        }))
        
        actionTypeChart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            data: actionTypeData.map(item => item.name)
          },
          series: [
            {
              name: '操作类型',
              type: 'pie',
              radius: '60%',
              center: ['50%', '50%'],
              data: actionTypeData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        })
        
        // 存储图表实例以便后续使用
        chartInstances.actionTypeChart = actionTypeChart
      })
      
      // 资源类型图表
      checkAndInitChart('resource-type-chart', (element) => {
        const resourceTypeChart = echarts.init(element)
        const resourceTypeData = Object.entries(stats.by_resource).map(([key, value]) => ({
          name: getResourceTypeLabel(key),
          value
        }))
        
        resourceTypeChart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            data: resourceTypeData.map(item => item.name)
          },
          series: [
            {
              name: '资源类型',
              type: 'pie',
              radius: '60%',
              center: ['50%', '50%'],
              data: resourceTypeData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        })
        
        chartInstances.resourceTypeChart = resourceTypeChart
      })
      
      // 用户操作排行图表
      checkAndInitChart('user-chart', (element) => {
        const userChart = echarts.init(element)
        const userData = Object.entries(stats.by_user).map(([key, value]) => ({
          name: key,
          value
        })).sort((a, b) => b.value - a.value).slice(0, 10)
        
        userChart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          xAxis: {
            type: 'category',
            data: userData.map(item => item.name),
            axisLabel: {
              rotate: 45,
              interval: 0
            }
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              name: '操作次数',
              type: 'bar',
              data: userData.map(item => item.value),
              itemStyle: {
                color: '#409EFF'
              }
            }
          ]
        })
        
        chartInstances.userChart = userChart
      })
      
      // 日期趋势图表
      checkAndInitChart('date-chart', (element) => {
        const dateChart = echarts.init(element)
        const dateData = Object.entries(stats.by_date).map(([key, value]) => ({
          name: key,
          value
        })).sort((a, b) => new Date(a.name) - new Date(b.name))
        
        dateChart.setOption({
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: 'category',
            data: dateData.map(item => item.name),
            axisLabel: {
              rotate: 45,
              interval: 0
            }
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              name: '操作次数',
              type: 'line',
              data: dateData.map(item => item.value),
              smooth: true,
              itemStyle: {
                color: '#67C23A'
              },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(103, 194, 58, 0.5)' },
                    { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
                  ]
                }
              }
            }
          ]
        })
        
        chartInstances.dateChart = dateChart
      })
    }, 200) // 增加延迟时间
  })
}

// 窗口大小变化处理
const handleResize = () => {
  Object.values(chartInstances).forEach(chart => {
    if (chart && typeof chart.resize === 'function') {
      chart.resize()
    }
  })
}

// 销毁图表实例
const destroyCharts = () => {
  Object.values(chartInstances).forEach(chart => {
    if (chart && typeof chart.dispose === 'function') {
      chart.dispose()
    }
  })
  // 清空实例引用
  Object.keys(chartInstances).forEach(key => {
    chartInstances[key] = null
  })
}

// 刷新日志
const refreshLogs = () => {
  fetchLogs()
  if (showStats.value) {
    fetchLogStats()
  }
}

// 处理过滤
const handleFilter = () => {
  pagination.page = 1
  fetchLogs()
}

// 重置过滤
const resetFilter = () => {
  filterForm.username = ''
  filterForm.action_type = ''
  filterForm.resource_type = ''
  filterForm.status = ''
  filterForm.date_range = []
  pagination.page = 1
  fetchLogs()
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pagination.per_page = size
  fetchLogs()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  pagination.page = page
  fetchLogs()
}

// 查看日志详情
const viewLogDetails = (log) => {
  currentLog.value = log
  detailDialogVisible.value = true
}

// 确认并执行清理
const confirmCleanup = async (mode, days = null) => {
  let scopeText = '全部日志'
  if (mode === 'older_than_days') {
    scopeText = days === 30 ? '一个月以前的日志' : days === 7 ? '一个星期以前的日志' : `${days}天以前的日志`
  }

  try {
    const { action } = await ElMessageBox.confirm(
      `将删除【${scopeText}】。是否同时回收数据库空间（VACUUM）？`,
      '清理日志确认',
      {
        confirmButtonText: '清理并回收',
        cancelButtonText: '仅清理',
        distinguishCancelAndClose: true,
        type: 'warning'
      }
    )
    const compact = action === 'confirm'
    await cleanupLogs(mode, days, compact)
  } catch (e) {
    // 用户取消或关闭
  }
}

// 调用后端清理接口
const cleanupLogs = async (mode, days = null, compact = false) => {
  cleanupLoading.value = true
  try {
    const payload = { mode }
    if (mode === 'older_than_days' && days) payload.days = days
    if (compact) payload.compact = true

    const resp = await axios.post('/api/logs/cleanup', payload)
    const deleted = resp.data?.deleted_count ?? 0
    const compacted = resp.data?.compacted ? '，已回收空间' : ''
    ElMessage.success(`清理完成，删除 ${deleted} 条${compacted}`)
    // 刷新列表与统计
    await fetchLogs()
    if (showStats.value) await fetchLogStats()
  } catch (error) {
    ElMessage.error('清理失败: ' + (error.response?.data?.msg || error.message))
  } finally {
    cleanupLoading.value = false
  }
}

// 统一调度日志刷新，避免重复请求导致的空白状态
const scheduleLogsRefresh = (delay = 200) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }

  logs.value = []
  refreshTimer = setTimeout(async () => {
    refreshTimer = null
    await fetchLogs()
    if (showStats.value) {
      await fetchLogStats()
    }
  }, delay)
}

// 监听showStats变化，当统计面板显示时重新渲染图表
watch(showStats, (newValue) => {
  if (newValue && isInLogsTab()) {
    setTimeout(() => {
      fetchLogStats()
    }, 100)
  }
})

// 监听URL参数变化，检测标签页切换（兼容直接通过url切换标签）
watch(() => route.query.tab, (newTab, oldTab) => {
  if (newTab === 'logs' && oldTab !== 'logs') {
    scheduleLogsRefresh()
  }
})

// 父组件传入的激活状态变化时刷新内容
watch(() => props.isActive, (isActive) => {
  if (isActive) {
    scheduleLogsRefresh(0)
  }
})

// 检查是否在日志标签页中
const isInLogsTab = () => {
  if (props.isActive) return true
  const currentTab = typeof route.query.tab === 'string' ? route.query.tab : null
  return currentTab === 'logs'
}

// 组件挂载时获取日志列表和统计
onMounted(() => {
  // 只有当前确实在日志标签页时才初始化
  if (isInLogsTab()) {
    scheduleLogsRefresh(0)
  }
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  destroyCharts()

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})

// 暴露方法给父组件
defineExpose({
  refreshLogs: fetchLogs,
  confirmCleanup
})
</script>

<style scoped>
.log-manager {
  padding: 20px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h2 {
  margin: 0;
  background: linear-gradient(90deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 24px;
}

.tab-actions {
  display: flex;
  gap: 10px;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  padding: 10px;
}

.filter-form {
  width: 100%;
}

.filter-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 10px;
}

.table-card {
  margin-bottom: 0;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.stats-card {
  margin-top: 12px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.card-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.card-header-title :deep(.el-icon) {
  font-size: 18px;
  color: #409eff;
}

.card-header-actions {
  display: flex;
  align-items: center;
}

.card-header-select {
  min-width: 180px;
}

.stats-container {
  padding: 16px 20px 8px;
}

.stats-chart {
  margin-bottom: 20px;
}

.stats-chart h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #606266;
}

.log-detail {
  padding: 10px;
}

.details-section {
  margin-top: 20px;
}

.details-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #606266;
}

.details-json {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  overflow: auto;
  max-height: 300px;
  font-family: monospace;
  white-space: pre-wrap;
}
</style>
