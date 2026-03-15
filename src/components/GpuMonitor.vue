<template>
  <div class="gpu-monitor">
    <el-card v-for="(gpu, index) in gpuData" :key="index" class="gpu-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3><span class="model-name">{{ gpu.name }}</span></h3>
          <el-tag type="success" effect="dark">{{ gpu.device_id }}</el-tag>
        </div>
      </template>
      
      <!-- GPU 使用率 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Cpu /></el-icon>
          <span>GPU使用率:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="gpu.utilization" 
            :color="getColorForPercentage(gpu.utilization)"
            :stroke-width="15"
            :show-text="true"
            :format="format => `${format}%`"
          />
        </div>
      </div>
      
      <!-- 内存使用率 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Monitor /></el-icon>
          <span>显存使用:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="Math.round(gpu.memory_used / gpu.memory_total * 100)" 
            :color="getColorForPercentage(Math.round(gpu.memory_used / gpu.memory_total * 100))"
            :stroke-width="15"
            :format="format => `${formatMemory(gpu.memory_used)} / ${formatMemory(gpu.memory_total)} (${format}%)`"
          />
        </div>
      </div>
      
      <!-- 温度 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Warning /></el-icon>
          <span>温度:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="Math.min(100, Math.round(gpu.temperature / 100 * 100))" 
            :color="getTemperatureColor(gpu.temperature)"
            :stroke-width="15"
            :format="format => `${gpu.temperature}°C`"
          />
        </div>
      </div>
      
      <!-- 进程信息 -->
      <div class="processes-section" v-if="gpu.processes && gpu.processes.length > 0">
        <div class="section-divider"></div>
        <h4>运行进程</h4>
        <el-table :data="gpu.processes" style="width: 100%" size="small" stripe>
          <el-table-column prop="pid" label="PID" width="90" />
          <el-table-column prop="username" label="用户" width="80" />
          <el-table-column prop="running_time" label="运行时间" width="100" />
          <el-table-column label="显存使用" width="120">
            <template #default="scope">
              {{ formatMemory(scope.row.gpu_memory || scope.row.memory_usage) }}
            </template>
          </el-table-column>
          <el-table-column prop="command" label="命令" show-overflow-tooltip />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'
import { Cpu, Monitor, Warning } from '@element-plus/icons-vue'

// 格式化内存显示，自动选择MB或GB单位，并在数字和单位之间添加空格
const formatMemory = (memoryValue) => {
  if (memoryValue === undefined || memoryValue === null) {
    return '0 MB'
  }
  
  // 如果是字符串但包含数字和单位，尝试提取数字部分
  if (typeof memoryValue === 'string') {
    const match = memoryValue.match(/(\d+(\.\d+)?)\s*(MiB|MB|GB|KB)?/i)
    if (match) {
      memoryValue = parseFloat(match[1])
      // 如果字符串中已经有单位，按照原单位返回，但确保有空格
      if (match[3]) {
        return `${memoryValue.toFixed(1)} ${match[3].replace('MiB', 'MB')}`
      }
    } else {
      // 如果无法解析，尝试直接转换为数字
      memoryValue = parseFloat(memoryValue) || 0
    }
  }
  
  // 数字类型处理
  memoryValue = Number(memoryValue)
  
  // 自动选择合适的单位
  if (memoryValue >= 1024) {
    return `${(memoryValue / 1024).toFixed(1)} GB`
  } else {
    return `${memoryValue.toFixed(1)} MB`
  }
}

const props = defineProps({
  gpuData: {
    type: Array,
    required: true,
    default: () => []
  }
})

// 根据百分比获取颜色
const getColorForPercentage = (percentage) => {
  if (percentage < 50) {
    return '#67C23A' // 绿色
  } else if (percentage < 80) {
    return '#E6A23C' // 黄色
  } else {
    return '#F56C6C' // 红色
  }
}

// 根据温度获取颜色
const getTemperatureColor = (temperature) => {
  if (temperature < 60) {
    return '#67C23A' // 绿色
  } else if (temperature < 80) {
    return '#E6A23C' // 黄色
  } else {
    return '#F56C6C' // 红色
  }
}
</script>

<style scoped>
.gpu-monitor {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 25px;
  padding: 5px;
}

.gpu-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(64, 158, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.gpu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.gpu-card :deep(.el-card__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  padding: 20px 25px;
}

.gpu-card :deep(.el-card__body) {
  padding: 25px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.card-header .el-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
}

.stat-row {
  display: flex;
  margin-bottom: 20px;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid rgba(235, 238, 245, 0.8);
}

.stat-row:last-of-type {
  border-bottom: none;
  margin-bottom: 15px;
}

.stat-label {
  width: 130px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  color: #409EFF;
}

.stat-label .el-icon {
  font-size: 18px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-value {
  flex: 1;
}

.stat-value :deep(.el-progress-bar__outer) {
  border-radius: 10px;
  background-color: rgba(64, 158, 255, 0.08);
}

.stat-value :deep(.el-progress-bar__inner) {
  border-radius: 10px;
  background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-primary-light-3));
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.2);
}

.stat-value :deep(.el-progress__text) {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.model-name {
  font-weight: 700;
  color: #409EFF;
  font-size: 16px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(54, 209, 220, 0.05) 100%);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.section-divider {
  height: 2px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.3), rgba(54, 209, 220, 0.2), rgba(64, 158, 255, 0.1));
  margin: 20px 0;
  border-radius: 2px;
}

.processes-section {
  margin-top: 25px;
  padding-top: 20px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
}

.processes-section h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 700;
  color: #409EFF;
  display: flex;
  align-items: center;
  gap: 8px;
}

.processes-section h4::before {
  content: "🔧";
  font-size: 16px;
}

.processes-section :deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.processes-section :deep(.el-table th) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(54, 209, 220, 0.05));
  color: #409EFF;
  font-weight: 600;
}

.processes-section :deep(.el-table tbody tr:hover) {
  background: rgba(64, 158, 255, 0.05);
}

.processes-section :deep(.el-table--striped tbody tr.el-table__row--striped) {
  background: rgba(248, 249, 250, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gpu-monitor {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .stat-label {
    width: 110px;
    font-size: 14px;
  }
  
  .card-header h3 {
    font-size: 18px;
  }
  
  .model-name {
    font-size: 15px;
    padding: 6px 10px;
  }
  
  .gpu-card :deep(.el-card__body) {
    padding: 20px;
  }
  
  .processes-section {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .stat-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .stat-label {
    width: 100%;
  }
  
  .stat-value {
    width: 100%;
  }
}
</style>
