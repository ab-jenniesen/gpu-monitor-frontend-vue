<template>
  <el-dialog
    v-model="dialogVisible"
    width="80%"
    class="reports-dialog"
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
            <p>任务运行报表分析</p>
          </div>
        </div>
        <div class="header-right">
          <div class="header-controls">
            <el-button @click="fetchProcessReports" :icon="Refresh" size="small" :loading="loading" circle></el-button>
          </div>
          <el-button @click="handleClose" :icon="Close" circle size="small" text></el-button>
        </div>
      </div>
    </template>

    <div class="reports-content" v-loading="loading">
      <div v-if="!loading && processReports">
        <el-tabs v-model="activeTab" class="reports-tabs">
          <el-tab-pane label="日报" name="daily" />
          <el-tab-pane label="周报" name="weekly" />
          <el-tab-pane label="月报" name="monthly" />
          <el-tab-pane label="累计" name="all" />
        </el-tabs>

        <div v-if="currentReport" class="report-content">
          <div class="report-summary">
            <div class="summary-cards">
              <div class="summary-card">
                <div class="card-icon process-icon">
                  <el-icon><Operation /></el-icon>
                </div>
                <div class="card-content">
                  <div class="card-value">{{ currentReport.process_count || 0 }}</div>
                  <div class="card-label">任务数量</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="card-icon time-icon">
                  <el-icon><Timer /></el-icon>
                </div>
                <div class="card-content">
                  <div class="card-value">{{ currentReport.total_runtime_human || '0秒' }}</div>
                  <div class="card-label">运行时长总计</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="card-icon avg-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="card-content">
                  <div class="card-value">{{ currentReport.average_runtime_human || '0秒' }}</div>
                  <div class="card-label">平均运行时长</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="card-icon memory-icon">
                  <el-icon><VideoPlay /></el-icon>
                </div>
                <div class="card-content">
                  <div class="card-value">{{ formatGb(currentReport.total_gpu_memory_gb, 2) }}</div>
                  <div class="card-label">显存总量</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="card-icon avg-memory-icon">
                  <el-icon><Coin /></el-icon>
                </div>
                <div class="card-content">
                  <div class="card-value">{{ currentReport.average_gpu_memory_human || '0 MB' }}</div>
                  <div class="card-label">平均显存峰值</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentReport.processes && currentReport.processes.length" class="report-table">
            <h4>详细任务列表</h4>
            <el-table
              :data="currentReport.processes"
              style="width: 100%"
              stripe
              :row-key="row => `${row.server_id}-${row.container_name}-${row.pid}-${row.process_instance}`"
            >
              <el-table-column prop="command" label="程序" min-width="200" show-overflow-tooltip />
              <el-table-column prop="container_name" label="容器" min-width="150" show-overflow-tooltip />
              <el-table-column prop="server_name" label="服务器" min-width="120" show-overflow-tooltip />
              <el-table-column label="运行时长" min-width="120">
                <template #default="scope">
                  {{ scope.row.max_running_human }}
                </template>
              </el-table-column>
              <el-table-column label="显存峰值" min-width="120">
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

          <div v-else class="report-empty">
            <el-empty description="暂无任务数据" :image-size="80" />
          </div>
        </div>

        <div v-else class="report-empty">
          <el-empty description="暂无报表数据" :image-size="80" />
        </div>
      </div>

      <div v-else-if="!loading" class="report-empty">
        <el-empty description="获取报表数据失败" :image-size="80" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../utils/axios'
import { Close, Refresh, Operation, Timer, Clock, VideoPlay, Coin } from '@element-plus/icons-vue'
import { resolveAvatarUrl } from '../utils/avatar'

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

const dialogVisible = computed({
  get() {
    return props.visible
  },
  set(value) {
    emit('update:visible', value)
  }
})

const loading = ref(false)
const processReports = ref(null)
const activeTab = ref('daily')

const currentReport = computed(() => {
  if (!processReports.value) return null
  return processReports.value[activeTab.value] || null
})

const resolvedAvatarUrl = computed(() => resolveAvatarUrl(props.avatarUrl, props.username, 80))
const avatarInitial = computed(() => (props.username ? props.username.charAt(0) : '用').toUpperCase())

const fetchProcessReports = async () => {
  if (!props.username) return

  loading.value = true
  try {
    const response = await axios.get(`/api/admin/user/${props.username}/process_reports`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    processReports.value = response.data
  } catch (error) {
    console.error('获取用户任务报表失败:', error)
    ElMessage.error('获取用户任务报表失败')
    processReports.value = null
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
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
  if (!value) return '未知'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch (error) {
    return value
  }
}

// 监听对话框可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.username) {
    fetchProcessReports()
  }
})

// 监听用户名变化
watch(() => props.username, (newVal) => {
  if (newVal && props.visible) {
    fetchProcessReports()
  }
})
</script>

<style scoped>
.reports-dialog {
  --el-dialog-border-radius: 16px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #36D1DC 100%);
  color: #fff;
  font-weight: 600;
}

.user-avatar span {
  font-size: 22px;
}

.header-text h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #909399;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reports-content {
  min-height: 400px;
  padding: 20px 0;
}

.reports-tabs {
  margin-bottom: 20px;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border: 1px solid rgba(64, 158, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.process-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.time-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.avg-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.memory-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.avg-memory-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #1f2d3d;
  line-height: 1;
  margin-bottom: 4px;
}

.card-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.report-table h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.report-table .el-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.report-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

@media (max-width: 768px) {
  .dialog-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-right {
    justify-content: space-between;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 16px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .card-value {
    font-size: 20px;
  }
}
</style>
