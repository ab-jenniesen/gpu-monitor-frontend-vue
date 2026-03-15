<template>
  <div class="network-monitor">
    <el-card class="network-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>网络信息</h3>
          <el-tag type="info" effect="dark">{{ getNetworkType() }}</el-tag>
        </div>
      </template>
      
      <!-- 特殊网络信息 (edu-ip, lan-ip, edu-domain) -->
      <div v-if="networkData" class="special-network-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="校园网IP" v-if="networkData['edu-ip']">
            {{ networkData['edu-ip'] }}
          </el-descriptions-item>
          <el-descriptions-item label="局域网IP" v-if="networkData['lan-ip']">
            {{ networkData['lan-ip'] }}
          </el-descriptions-item>
          <el-descriptions-item label="校园网域名" v-if="networkData['edu-domain']">
            {{ networkData['edu-domain'] }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <!-- 网络接口信息 -->
      <div v-if="networkData && networkData.interfaces" class="mt-4">
        <h4>网络接口</h4>
        <el-table :data="getInterfacesData()" style="width: 100%" size="small" stripe>
          <el-table-column prop="name" label="接口名称" width="120" />
          <el-table-column prop="ip" label="IP地址" min-width="150" />
          <el-table-column prop="mac" label="MAC地址" min-width="150" />
          <el-table-column prop="netmask" label="子网掩码" min-width="150" />
        </el-table>
      </div>
      
      <!-- 网络连接信息 -->
      <div v-if="networkData && networkData.connections" class="mt-4">
        <h4>网络连接</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="默认网关">
            {{ networkData.default_gateway || 'N/A' }}
          </el-descriptions-item>
          <el-descriptions-item label="DNS服务器">
            {{ formatDNS(networkData.dns_servers) }}
          </el-descriptions-item>
          <el-descriptions-item label="主机名">
            {{ networkData.hostname || 'N/A' }}
          </el-descriptions-item>
          <el-descriptions-item label="外网IP">
            {{ networkData.public_ip || 'N/A' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <!-- Docker端口映射 (表格形式) -->
      <div v-if="networkData && networkData['docker-port'] && networkData['docker-port'].length > 0" class="mt-4">
        <h4>Docker端口映射</h4>
        <el-table :data="getDockerPortData()" style="width: 100%" size="small" stripe border>
          <el-table-column prop="container" label="容器名称" min-width="100" />
          <el-table-column prop="ssh" label="SSH端口" width="120" align="center">
            <template #default="{row}">
              <el-tag v-if="row.ssh !== '-'" type="success" size="small">{{ row.ssh }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="tcp" label="TCP端口" min-width="200" />
          <el-table-column prop="udp" label="UDP端口" min-width="200" />
        </el-table>
      </div>
      
      <!-- 无网络数据时显示 -->
      <el-empty v-if="!networkData || Object.keys(networkData).length === 0" description="暂无网络数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'

const props = defineProps({
  networkData: {
    type: Object,
    required: true,
    default: () => ({})
  }
})

// 获取网络类型
const getNetworkType = () => {
  if (!props.networkData || !props.networkData.interfaces) {
    return '未知'
  }
  
  // 检查是否有无线网络接口
  const hasWifi = Object.keys(props.networkData.interfaces).some(name => 
    name.toLowerCase().includes('wlan') || name.toLowerCase().includes('wifi')
  )
  
  return hasWifi ? '无线网络' : '有线网络'
}

// 获取接口数据
const getInterfacesData = () => {
  if (!props.networkData || !props.networkData.interfaces) {
    return []
  }
  
  return Object.entries(props.networkData.interfaces)
    .filter(([name, info]) => info.ip && !name.includes('lo')) // 过滤掉本地回环接口
    .map(([name, info]) => ({
      name,
      ip: info.ip || 'N/A',
      mac: info.mac || 'N/A',
      netmask: info.netmask || 'N/A'
    }))
}

// 格式DNS服务器
const formatDNS = (dnsServers) => {
  if (!dnsServers || !Array.isArray(dnsServers) || dnsServers.length === 0) {
    return 'N/A'
  }
  return dnsServers.join(', ')
}

// 获取容器名称
const getContainerName = (container) => {
  const name = Object.keys(container)[0]
  return name || '未知容器'
}

// 获取容器端口
const getContainerPorts = (container) => {
  const name = Object.keys(container)[0]
  return container[name] || {}
}

// 获取Docker端口数据（表格格式）
const getDockerPortData = () => {
  if (!props.networkData || !props.networkData['docker-port'] || !props.networkData['docker-port'].length) {
    return []
  }
  
  return props.networkData['docker-port'].map(container => {
    const containerName = getContainerName(container)
    const ports = getContainerPorts(container)
    
    return {
      container: containerName,
      ssh: ports.ssh || '-',
      tcp: ports.tcp || '-',
      udp: ports.udp || '-',
      http: ports.http || '-',
      https: ports.https || '-'
    }
  })
}

// 获取协议标签
const getProtocolLabel = (protocol) => {
  const protocolMap = {
    'ssh': 'SSH',
    'tcp': 'TCP',
    'udp': 'UDP',
    'http': 'HTTP',
    'https': 'HTTPS'
  }
  return protocolMap[protocol.toLowerCase()] || protocol.toUpperCase()
}
</script>

<style scoped>
.network-monitor {
  margin-bottom: 25px;
}

.network-card {
  width: 100%;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(64, 158, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.network-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.network-card :deep(.el-card__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.05) 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  padding: 20px 25px;
}

.network-card :deep(.el-card__body) {
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
  content: "🌐";
  font-size: 20px;
}

.card-header .el-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
}

.mt-4 {
  margin-top: 25px;
}

h4 {
  margin: 20px 0 15px 0;
  font-size: 18px;
  font-weight: 700;
  color: #409EFF;
  display: flex;
  align-items: center;
  gap: 8px;
}

h4:first-child {
  margin-top: 0;
}

h4::before {
  content: "📡";
  font-size: 16px;
}

/* 特殊网络信息样式 */
.special-network-info {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(64, 158, 255, 0.08);
  margin-bottom: 25px;
}

.special-network-info :deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.special-network-info :deep(.el-descriptions__header) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(54, 209, 220, 0.05));
  color: #409EFF;
  font-weight: 600;
}

.special-network-info :deep(.el-descriptions__label) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(54, 209, 220, 0.03));
  color: #409EFF;
  font-weight: 600;
  border-color: rgba(64, 158, 255, 0.1);
}

.special-network-info :deep(.el-descriptions__content) {
  color: #303133;
  font-weight: 500;
  border-color: rgba(64, 158, 255, 0.1);
}

/* 网络连接信息样式 */
.network-card :deep(.el-descriptions) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  padding: 15px;
  border: 1px solid rgba(64, 158, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.network-card :deep(.el-descriptions__label) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(54, 209, 220, 0.03));
  color: #409EFF;
  font-weight: 600;
  border-color: rgba(64, 158, 255, 0.1);
}

.network-card :deep(.el-descriptions__content) {
  color: #303133;
  font-weight: 500;
  border-color: rgba(64, 158, 255, 0.1);
  background: rgba(255, 255, 255, 0.6);
}

/* 表格样式 */
.network-card :deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(64, 158, 255, 0.08);
}

.network-card :deep(.el-table th) {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(54, 209, 220, 0.05));
  color: #409EFF;
  font-weight: 600;
  border-color: rgba(64, 158, 255, 0.1);
}

.network-card :deep(.el-table td) {
  border-color: rgba(64, 158, 255, 0.05);
  color: #303133;
  font-weight: 500;
}

.network-card :deep(.el-table tbody tr:hover) {
  background: rgba(64, 158, 255, 0.05);
}

.network-card :deep(.el-table--striped tbody tr.el-table__row--striped) {
  background: rgba(248, 249, 250, 0.8);
}

.network-card :deep(.el-table--striped tbody tr.el-table__row--striped:hover) {
  background: rgba(64, 158, 255, 0.05);
}

/* Docker端口映射样式 */
.docker-port-card {
  margin-bottom: 15px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(64, 158, 255, 0.05);
  transition: all 0.3s ease;
}

.docker-port-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.docker-port-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05), rgba(54, 209, 220, 0.02));
  border-bottom: 1px solid rgba(64, 158, 255, 0.08);
}

.docker-container-name {
  font-weight: 700;
  font-size: 16px;
  color: #409EFF;
}

.port-tag {
  margin-left: 10px;
  font-weight: 600;
  border-radius: 6px;
}

.port-mapping-content {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 15px;
}

.port-item {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(54, 209, 220, 0.05) 100%);
  padding: 8px 15px;
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.2);
  transition: all 0.3s ease;
}

.port-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.port-label {
  font-weight: 600;
  margin-right: 8px;
  color: #409EFF;
}

.port-value {
  color: #303133;
  font-weight: 500;
}

/* Tag样式增强 */
.network-card :deep(.el-tag) {
  border-radius: 6px;
  font-weight: 600;
}

.network-card :deep(.el-tag--success) {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
  border-color: rgba(103, 194, 58, 0.3);
  color: #67C23A;
}

/* Empty状态样式 */
.network-card :deep(.el-empty) {
  padding: 40px;
}

.network-card :deep(.el-empty__image) {
  opacity: 0.6;
}

.network-card :deep(.el-empty__description) {
  color: #909399;
  font-size: 16px;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .network-card :deep(.el-card__body) {
    padding: 20px;
  }
  
  .special-network-info {
    padding: 15px;
  }
  
  .docker-port-header {
    padding: 12px;
  }
  
  .port-mapping-content {
    padding: 12px;
  }
  
  .port-item {
    padding: 6px 12px;
  }
}

@media (max-width: 480px) {
  .network-card :deep(.el-descriptions) {
    padding: 12px;
  }
  
  .special-network-info :deep(.el-descriptions) {
    --el-descriptions-item-bordered-label-background: rgba(64, 158, 255, 0.05);
  }
  
  .port-mapping-content {
    flex-direction: column;
  }
  
  .port-item {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
