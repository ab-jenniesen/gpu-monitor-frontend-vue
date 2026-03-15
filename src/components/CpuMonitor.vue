<template>
  <div class="cpu-monitor">
    <el-card class="cpu-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>CPU监控</h3>
        </div>
      </template>
      
      <!-- CPU基本信息 -->
      <div class="cpu-info">
        <div class="info-item">
          <span class="info-label">型号:</span>
          <span class="model-name">{{ cpuData.info.brand || '未知' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">架构:</span>
          <span class="info-value">{{ cpuData.info.arch || '未知' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">核心数:</span>
          <span class="info-value">{{ cpuData.info.count || 0 }} 核 (物理{{ cpuData.info.physical_count || 0 }}核)</span>
        </div>
        <div class="info-item">
          <span class="info-label">当前频率:</span>
          <span class="info-value">{{ cpuData.info.freq_current ? cpuData.info.freq_current.toFixed(2) : 0 }} MHz</span>
        </div>
        <div class="info-item">
          <span class="info-label">最大频率:</span>
          <span class="info-value">{{ cpuData.info.freq_max || 0 }} MHz</span>
        </div>
      </div>
      
      <div class="section-divider"></div>
      
      <!-- CPU 总体使用率 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Cpu /></el-icon>
          <span>CPU使用率:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="cpuData.usage" 
            :color="getColorForPercentage(cpuData.usage)"
            :stroke-width="15"
            :show-text="true"
            :format="format => `${parseFloat(format).toFixed(1)}%`"
          />
        </div>
      </div>
      
      <!-- 系统负载 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Monitor /></el-icon>
          <span>系统负载:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="cpuData.load1_percent || 0" 
            :color="getColorForPercentage(cpuData.load1_percent || 0)"
            :stroke-width="15"
            :show-text="true"
            :format="format => `${parseFloat(format || 0).toFixed(1)}%`"
          />
        </div>
      </div>
      
      <!-- 内存使用率 -->
      <div class="stat-row">
        <div class="stat-label">
          <el-icon><Monitor /></el-icon>
          <span>内存使用:</span>
        </div>
        <div class="stat-value">
          <el-progress 
            :percentage="cpuData.memory.percent" 
            :color="getColorForPercentage(cpuData.memory.percent)"
            :stroke-width="15"
            :format="format => `${cpuData.memory.used.toFixed(2)} GB / ${cpuData.memory.total.toFixed(2)} GB (${format}%)`"
          />
        </div>
      </div>
      
      <!-- CPU核心使用率 -->
      <div class="section-divider"></div>
      <h4>CPU核心使用率</h4>
      <div class="cpu-cores">
        <div v-for="(core, index) in cpuData.percent" :key="index" class="core-item">
          <div class="core-label">核心 {{ index }}</div>
          <el-progress 
            :percentage="core" 
            :color="getColorForPercentage(core)"
            :stroke-width="10"
            :show-text="true"
            :format="format => `${format}%`"
          />
        </div>
      </div>
      
      <!-- 系统信息 -->
      <div class="section-divider"></div>
      <h4>系统信息</h4>
      <div class="system-info">
        <div class="info-item">
          <span class="info-label">主机名:</span>
          <span class="info-value">{{ cpuData.system.hostname }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">系统:</span>
          <span class="info-value">{{ cpuData.system.platform }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">运行时间:</span>
          <span class="info-value">{{ cpuData.system.uptime }}</span>
        </div>
      </div>
      
      <!-- 磁盘信息 -->
      <div class="section-divider" v-if="cpuData.disks && Object.keys(cpuData.disks).length > 0"></div>
      <h4 v-if="cpuData.disks && Object.keys(cpuData.disks).length > 0">磁盘使用情况</h4>
      <div class="disk-info" v-if="cpuData.disks && Object.keys(cpuData.disks).length > 0">
        <div v-for="(disk, key) in cpuData.disks" :key="key" class="disk-item">
          <div class="disk-label">{{ key }}</div>
          <el-progress 
            :percentage="disk.usage.percent" 
            :color="getColorForPercentage(disk.usage.percent)"
            :stroke-width="10"
            :format="format => `${disk.usage.used} ${disk.usage.unit} / ${disk.usage.total} ${disk.usage.unit} (${format}%)`"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Cpu, Monitor } from '@element-plus/icons-vue'

const props = defineProps({
  cpuData: {
    type: Object,
    required: true,
    default: () => ({
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
      load1_percent: 0,
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
    })
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
</script>

<style scoped>
.cpu-monitor {
  margin-bottom: 25px;
}

.cpu-card {
  width: 100%;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(64, 158, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.cpu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.cpu-card :deep(.el-card__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  padding: 20px 25px;
}

.cpu-card :deep(.el-card__body) {
  padding: 25px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header h3::before {
  content: "⚡";
  font-size: 20px;
}

.cpu-info {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
  margin-bottom: 20px;
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

.section-divider {
  height: 2px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.3), rgba(54, 209, 220, 0.2), rgba(64, 158, 255, 0.1));
  margin: 25px 0;
  border-radius: 2px;
}

h4 {
  margin: 20px 0 15px 0;
  font-size: 18px;
  font-weight: 700;
  color: #409EFF;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: none;
  padding-left: 0;
}

h4::before {
  content: "📊";
  font-size: 16px;
}

.cpu-cores {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
}

.core-item {
  margin-bottom: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.05);
  transition: all 0.3s ease;
}

.core-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.core-label {
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 600;
  color: #409EFF;
}

.system-info,
.disk-info {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
}

.info-item {
  display: flex;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(235, 238, 245, 0.5);
}

.info-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-label {
  font-weight: 600;
  width: 100px;
  font-size: 14px;
  color: #409EFF;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: #303133;
  font-weight: 500;
}

.model-name {
  font-weight: 700;
  color: #409EFF;
  font-size: 15px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(54, 209, 220, 0.05) 100%);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.disk-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.disk-item {
  margin-bottom: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.05);
  transition: all 0.3s ease;
}

.disk-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.disk-label {
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 600;
  color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cpu-cores {
    grid-template-columns: 1fr;
  }
  
  .stat-label {
    width: 110px;
    font-size: 14px;
  }
  
  .cpu-card :deep(.el-card__body) {
    padding: 20px;
  }
  
  .cpu-info,
  .system-info,
  .disk-info {
    padding: 15px;
  }
  
  .info-label {
    width: 90px;
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
  
  .info-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .info-label {
    width: 100%;
  }
}
</style>
