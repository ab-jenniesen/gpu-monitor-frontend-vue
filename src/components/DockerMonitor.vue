<template>
  <div class="docker-monitor">
    <el-card class="docker-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>Docker容器</h3>
          <el-tag type="info" effect="dark">{{ dockerData.length }}个容器</el-tag>
        </div>
      </template>
      
      <div v-if="dockerData.length === 0" class="empty-container">
        <el-empty description="暂无运行中的容器" />
      </div>
      
      <div v-else class="containers-list">
        <div v-for="(container, index) in dockerData" :key="index" class="container-item">
          <div class="container-header">
            <div class="container-name">
              <el-icon><Box /></el-icon>
              <span>{{ container.Name }}</span>
            </div>
            <el-tag :type="container.Status === 'running' ? 'success' : 'warning'" size="small">
              {{ container.Status }}
            </el-tag>
          </div>
          
          <div class="usage-bars">
            <!-- CPU使用率 -->
            <div class="usage-row">
              <div class="usage-label">CPU:</div>
              <div class="usage-bar">
                <el-progress 
                  :percentage="parseFloat(container.CPUPerc)" 
                  :color="getColorForPercentage(parseFloat(container.CPUPerc))"
                  :stroke-width="10"
                  :format="format => `${parseFloat(format).toFixed(1)}%`"
                />
              </div>
            </div>
            
            <!-- 内存使用率 -->
            <div class="usage-row">
              <div class="usage-label">内存:</div>
              <div class="usage-bar">
                <el-progress 
                  :percentage="parseFloat(container.MemPerc)" 
                  :color="getColorForPercentage(parseFloat(container.MemPerc))"
                  :stroke-width="10"
                  :format="format => `${container.MemUsage} (${format}%)`"
                />
              </div>
            </div>
            
            <!-- GPU内存使用率 (如果有) -->
            <div class="usage-row" v-if="container.GPUMemPerc !== 'N/A'">
              <div class="usage-label">GPU显存:</div>
              <div class="usage-bar">
                <el-progress 
                  :percentage="parseFloat(container.GPUMemPerc)" 
                  :color="getColorForPercentage(parseFloat(container.GPUMemPerc))"
                  :stroke-width="10"
                  :format="format => `${container.GPUMemUsage} (${format}%)`"
                />
              </div>
            </div>
          </div>
          
          <div class="container-details">
            <div class="detail-item">
              <span class="detail-label">ID:</span>
              <span class="detail-value">{{ container.ID ? container.ID.substring(0, 12) : 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">镜像:</span>
              <span class="detail-value">{{ container.Image }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">创建时间:</span>
              <span class="detail-value">{{ container.Created }}</span>
            </div>
            <div class="detail-item" v-if="container.Ports">
              <span class="detail-label">端口:</span>
              <span class="detail-value">{{ container.Ports }}</span>
            </div>
          </div>
          
          <div class="section-divider" v-if="index < dockerData.length - 1"></div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Box } from '@element-plus/icons-vue'

const props = defineProps({
  dockerData: {
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
</script>

<style scoped>
.docker-monitor {
  margin-bottom: 25px;
}

.docker-card {
  width: 100%;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(64, 158, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.docker-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.docker-card :deep(.el-card__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  padding: 20px 25px;
}

.docker-card :deep(.el-card__body) {
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
  content: "🐳";
  font-size: 20px;
}

.card-header .el-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(54, 209, 220, 0.05) 100%);
  border-color: rgba(64, 158, 255, 0.3);
  color: #409EFF;
}

.empty-container {
  padding: 40px 0;
  text-align: center;
}

.empty-container :deep(.el-empty) {
  padding: 20px;
}

.empty-container :deep(.el-empty__image) {
  opacity: 0.6;
}

.empty-container :deep(.el-empty__description) {
  color: #909399;
  font-size: 16px;
  margin-top: 20px;
}

.containers-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.container-item {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.container-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.12);
  border-color: rgba(64, 158, 255, 0.15);
}

.container-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #409EFF, #36D1DC);
  opacity: 0.8;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(235, 238, 245, 0.8);
}

.container-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
  color: #303133;
}

.container-name .el-icon {
  font-size: 20px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.container-header .el-tag {
  font-weight: 600;
  border-radius: 6px;
  padding: 4px 10px;
}

.usage-bars {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 15px;
}

.usage-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
}

.usage-row:last-child {
  margin-bottom: 0;
}

.usage-label {
  width: 100px;
  font-weight: 600;
  font-size: 15px;
  color: #409EFF;
  flex-shrink: 0;
}

.usage-bar {
  flex: 1;
}

.usage-bar :deep(.el-progress-bar__outer) {
  border-radius: 8px;
  background-color: rgba(64, 158, 255, 0.08);
}

.usage-bar :deep(.el-progress-bar__inner) {
  border-radius: 8px;
  background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-primary-light-3));
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.usage-bar :deep(.el-progress__text) {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.container-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 15px;
}

.detail-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid rgba(235, 238, 245, 0.5);
  align-items: flex-start;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  width: 90px;
  flex-shrink: 0;
  color: #409EFF;
  font-size: 14px;
}

.detail-value {
  flex: 1;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
}

.port-mappings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(54, 209, 220, 0.02) 100%);
  border-radius: 6px;
  padding: 10px;
}

.port-mapping-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.protocol {
  font-weight: 600;
  color: #409EFF;
  min-width: 50px;
  font-size: 13px;
}

.ports {
  color: #303133;
  font-weight: 500;
  background: rgba(64, 158, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.section-divider {
  height: 2px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.3), rgba(54, 209, 220, 0.2), rgba(64, 158, 255, 0.1));
  margin: 20px 0;
  border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .docker-card :deep(.el-card__body) {
    padding: 20px;
  }
  
  .container-item {
    padding: 15px;
  }
  
  .usage-bars,
  .container-details {
    padding: 12px;
  }
  
  .container-details {
    grid-template-columns: 1fr;
  }
  
  .usage-label {
    width: 80px;
    font-size: 14px;
  }
  
  .detail-label {
    width: 80px;
  }
}

@media (max-width: 480px) {
  .usage-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .usage-label {
    width: 100%;
  }
  
  .usage-bar {
    width: 100%;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .detail-label {
    width: 100%;
  }
  
  .container-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
