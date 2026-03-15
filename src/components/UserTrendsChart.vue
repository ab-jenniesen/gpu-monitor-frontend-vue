<template>
  <el-dialog
    v-model="dialogVisible"
    width="80%"
    class="trends-dialog"
    :show-close="false"
    align-center
    destroy-on-close
  >
    <template #header>
      <div class="dialog-header">
        <div class="header-left">
          <el-avatar :size="48" class="user-avatar" :src="resolvedAvatarUrl">
            {{ avatarInitial }}
          </el-avatar>
          <div class="header-text">
            <h3>{{ props.username }}</h3>
            <p>资源使用趋势分析</p>
          </div>
        </div>
        <div class="header-right">
          <div class="header-controls">
            <el-select v-model="selectedHours" @change="fetchTrendsData" size="small" style="width: 120px">
              <el-option label="近1小时" :value="1" />
              <el-option label="近6小时" :value="6" />
              <el-option label="近24小时" :value="24" />
              <el-option label="近3天" :value="72" />
              <el-option label="近7天" :value="168" />
              <el-option label="近15天" :value="360" />
              <el-option label="近30天" :value="720" />
              <el-option label="近60天" :value="1440" />
            </el-select>
            <el-button @click="fetchTrendsData" :icon="Refresh" size="small" :loading="loading" circle></el-button>
          </div>
          <el-button @click="handleClose" :icon="Close" circle size="small" text></el-button>
        </div>
      </div>
    </template>

    <div class="trends-content" v-loading="loading">

      <div class="charts-content" v-if="!loading && trendsData.cpu_series.length > 0">
        <el-row :gutter="24">
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <div class="chart-card cpu-card">
              <div class="chart-header">
                <div class="chart-icon cpu-icon">
                  <el-icon><Cpu /></el-icon>
                </div>
                <div class="chart-title">
                  <h4>CPU占用率</h4>
                  <p>处理器使用趋势</p>
                </div>
              </div>
              <div class="chart-body">
                <v-chart :option="cpuChartOption" class="chart-container"></v-chart>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <div class="chart-card gpu-card">
              <div class="chart-header">
                <div class="chart-icon gpu-icon">
                  <el-icon><VideoPlay /></el-icon>
                </div>
                <div class="chart-title">
                  <h4>GPU占用率</h4>
                  <p>图形处理器使用趋势</p>
                </div>
              </div>
              <div class="chart-body">
                <v-chart :option="gpuChartOption" class="chart-container"></v-chart>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <div class="chart-card memory-card">
              <div class="chart-header">
                <div class="chart-icon memory-icon">
                  <el-icon><Coin /></el-icon>
                </div>
                <div class="chart-title">
                  <h4>显存使用</h4>
                  <p>显存占用趋势</p>
                </div>
              </div>
              <div class="chart-body">
                <v-chart :option="memoryChartOption" class="chart-container"></v-chart>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <div v-else-if="!loading && trendsData.cpu_series.length === 0" class="empty-data">
        <el-empty description="暂无趋势数据" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from '../utils/axios'
import { Refresh, Close, Cpu, VideoPlay, Coin } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { resolveAvatarUrl } from '../utils/avatar'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer])

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible'])

// 计算属性处理 v-model
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)
const selectedHours = ref(24)
const trendsData = reactive({
  cpu_series: [],
  gpu_series: [],
  memory_series: []
})

const resolvedAvatarUrl = computed(() => resolveAvatarUrl(props.avatarUrl, props.username, 80))
const avatarInitial = computed(() => (props.username ? props.username.charAt(0) : '用').toUpperCase())

// 获取趋势数据
const fetchTrendsData = async () => {
  if (!props.username) return

  loading.value = true
  try {
    const response = await axios.get('/api/admin/user-trends', {
      params: {
        username: props.username,
        hours: selectedHours.value
      }
    })
    trendsData.cpu_series = response.data.cpu_series || []
    trendsData.gpu_series = response.data.gpu_series || []
    trendsData.memory_series = response.data.memory_series || []
  } catch (error) {
    console.error('获取用户趋势数据失败:', error)
    trendsData.cpu_series = []
    trendsData.gpu_series = []
    trendsData.memory_series = []
  } finally {
    loading.value = false
  }
}

// 监听props变化
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.username) {
    fetchTrendsData()
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
      return `${timeStr}<br/>${props.username}<br/>${params[0].seriesName}: ${params[0].value[1]}%`
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
      return `${timeStr}<br/>${props.username}<br/>${params[0].seriesName}: ${params[0].value[1]}%`
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
      return `${timeStr}<br/>${props.username}<br/>${params[0].seriesName}: ${params[0].value[1]}GB`
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

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
/* 对话框样式 */
.trends-dialog {
  --el-dialog-border-radius: 16px;
}

.trends-dialog :deep(.el-dialog) {
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.trends-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
  border-bottom: 1px solid #f1f3f4;
}

.trends-dialog :deep(.el-dialog__body) {
  padding: 24px;
  background: transparent;
}

/* 自定义头部 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.user-avatar span {
  font-size: 22px;
}

.header-text h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-controls .el-select {
  --el-color-white: rgba(255, 255, 255, 0.9);
  --el-border-color: rgba(255, 255, 255, 0.3);
  --el-border-color-hover: rgba(255, 255, 255, 0.5);
  --el-text-color-primary: white;
}

.header-controls .el-select :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.header-controls .el-select :deep(.el-input__inner) {
  color: white;
}

.header-controls .el-select :deep(.el-icon) {
  color: rgba(255, 255, 255, 0.8);
}

.header-controls .el-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.header-controls .el-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.header-right > .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.header-right > .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* 内容区域 */
.trends-content {
  min-height: 400px;
}


/* 图表内容 */
.charts-content {
  padding: 0;
}

/* 图表卡片 */
.chart-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #f1f3f4;
  height: 400px;
  display: flex;
  flex-direction: column;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #f1f3f4;
}

.chart-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
}

.cpu-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gpu-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.memory-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.chart-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.chart-title p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.chart-body {
  flex: 1;
  padding: 0 16px 16px 16px;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.chart-container {
  width: 100% !important;
  height: 280px !important;
  min-width: 0;
}

/* 空数据状态 */
.empty-data {
  text-align: center;
  padding: 60px 0;
  background: white;
  border-radius: 16px;
  border: 1px solid #f1f3f4;
}

.empty-data :deep(.el-empty__description) {
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .trends-dialog {
    width: 90% !important;
  }

  .chart-card {
    height: 360px;
  }

  .chart-container {
    height: 320px !important;
  }
}

@media (max-width: 768px) {
  .dialog-header {
    padding: 16px 20px;
  }

  .header-left {
    gap: 12px;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
  }

  .user-avatar span {
    font-size: 18px;
  }

  .header-text h3 {
    font-size: 18px;
  }

  .trends-dialog :deep(.el-dialog__body) {
    padding: 16px;
  }

  .header-controls {
    gap: 8px;
  }

  .header-controls .el-select {
    width: 100px !important;
  }

  .charts-content .el-col {
    margin-bottom: 20px;
  }

  .chart-card {
    height: 320px;
  }

  .chart-header {
    padding: 16px;
  }

  .chart-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .chart-title h4 {
    font-size: 14px;
  }

  .chart-body {
    padding: 0 12px 12px 12px;
  }

  .chart-container {
    height: 260px !important;
  }
}

@media (max-width: 480px) {
  .charts-content .el-row {
    margin: 0 -8px;
  }

  .charts-content .el-col {
    padding: 0 8px;
  }
}
</style>
