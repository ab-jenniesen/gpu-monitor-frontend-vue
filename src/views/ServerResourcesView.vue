<template>
  <div class="server-resources-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-text">
        <h1 class="header-title">服务器资源管理</h1>
        <p class="header-subtitle">当前服务器：{{ serverName || '加载中...' }}</p>
      </div>
      <div class="header-actions">
        <back-button text="返回服务器管理" @click="goBack" :loading="loading" />
      </div>
    </div>
    
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
    
    <div v-else class="resources-content">
      <el-tabs v-model="activeTab" class="custom-tabs" @tab-change="handleTabChange">
        <el-tab-pane name="storage" label="存储路径管理">
          <storage-paths-manager :server-id="serverId" @update="fetchServerData" />
        </el-tab-pane>
        <el-tab-pane name="ports" label="端口范围管理">
          <port-ranges-manager :server-id="serverId" @update="fetchServerData" />
        </el-tab-pane>
        <el-tab-pane name="docker" label="Docker镜像管理">
          <docker-images-manager :server-id="serverId" @update="fetchServerData" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServersStore } from '../stores/servers'
import { ElMessage } from 'element-plus'
import { WarningFilled, Refresh } from '@element-plus/icons-vue'
import BackButton from '../components/BackButton.vue'
import StoragePathsManager from '../components/StoragePathsManager.vue'
import PortRangesManager from '../components/PortRangesManager.vue'
import DockerImagesManager from '../components/DockerImagesManager.vue'

const route = useRoute()
const router = useRouter()
const serverId = route.params.id
const loading = ref(false)
const error = ref(null)
const serverName = ref('')
const serversStore = useServersStore()

// 当前活动标签页
const activeTab = ref(route.query.tab || 'storage')

// 监听路由变化，更新活动标签页
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab
    }
  }
)

// 处理标签页变化
const handleTabChange = (tab) => {
  router.replace({
    query: { ...route.query, tab }
  })
}

// 获取服务器数据
const fetchServerData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const server = await serversStore.fetchServerDetails(serverId)
    if (server) {
      serverName.value = server.name
    } else {
      error.value = '服务器不存在'
    }
  } catch (err) {
    console.error('获取服务器数据失败:', err)
    error.value = '获取服务器数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 返回服务器管理标签页
const goBack = () => {
  router.push('/admin?tab=servers')
}

// 组件挂载时获取服务器数据和站点设置
onMounted(() => {
  fetchServerData()
})
</script>

<style scoped>
.server-resources-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid #ebeef5;
}

.header-title {
  margin: 0;
  font-weight: 600;
  font-size: 22px;
}

.header-subtitle {
  margin: 4px 0 0;
  color: #909399;
  font-size: 14px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-container,
.error-container {
  padding: 40px 0;
  text-align: center;
}

.empty-icon {
  font-size: 60px;
  color: #909399;
}

.resources-content {
  margin-top: 20px;
}

/* 自定义标签页样式 */
.custom-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
  width: 100%;
}

.custom-tabs :deep(.el-tabs__nav) {
  border-radius: 8px;
  overflow: hidden;
  border: none;
  background-color: #f0f5ff;
  padding: 5px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  width: 100%;
  display: flex;
}

.custom-tabs :deep(.el-tabs__content) {
  overflow: visible;
  width: 100%;
}

.custom-tabs :deep(.el-tabs__item) {
  height: 50px;
  line-height: 50px;
  padding: 0 10px;
  transition: all 0.3s;
  font-weight: 500;
  color: #606266;
  border-radius: 6px;
  margin: 0 2px;
  text-align: center;
  flex: 1;
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(100, 100, 255, 0.05) 100%);
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.15);
}

.custom-tabs :deep(.el-tabs__item:hover) {
  color: #409EFF;
  background-color: rgba(64, 158, 255, 0.05);
}

.custom-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-actions {
    align-self: flex-end;
  }
}

@media (max-width: 576px) {
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-title {
    font-size: 18px;
  }
}
</style>
