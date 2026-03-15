<template>
  <div class="servers-overview-wrapper">
    <div class="servers-overview" :class="{ 'embedded-mode': embedded }">
      <div class="main-content" :class="{ 'embedded-main': embedded }">
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <div v-else-if="error" class="error-container">
        <el-empty :description="error">
          <template #image>
            <el-icon class="empty-icon"><WarningFilled /></el-icon>
          </template>
          <el-button type="primary" @click="fetchServers">重试</el-button>
        </el-empty>
      </div>
    
    <div v-else>
      <!-- 自动刷新数据，无需手动刷新按钮 -->
      
      <div v-if="!embedded" class="global-metrics-container">
        <el-card class="global-metrics-card" shadow="hover">
          <div class="global-metrics-header">
            <div class="global-metrics-title">
              <el-icon><Histogram /></el-icon>
              <span>全局资源概览</span>
            </div>
            <div class="global-metrics-meta">
              <el-tag 
                v-if="globalMetrics?.meta?.servers_with_data !== undefined"
                size="small" 
                type="success" 
                effect="plain"
              >实时 {{ globalMetrics?.meta?.servers_with_data ?? 0 }} 台</el-tag>
              <span 
                v-if="globalMetrics?.meta?.last_updated"
                class="global-metrics-updated"
              >更新于 {{formatTimestamp(processReports.meta.generated_at) }}</span>
            </div>
          </div>
          <div v-if="globalMetricsLoading && !globalMetrics" class="global-metrics-loading">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else class="global-gauge-grid">
            <div class="gauge-item">
              <div class="gauge-title">CPU占用率</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.cpu?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.cpu?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ formatCoreUsage(globalMetrics?.cpu?.used_cores, globalMetrics?.cpu?.total_cores) }}
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-title">内存占用率</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.memory?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.memory?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ formatGb(globalMetrics?.memory?.used_gb) }} / {{ formatGb(globalMetrics?.memory?.total_gb) }}
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-title">存储占用率</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.storage?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.storage?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ formatTb(globalMetrics?.storage?.used_gb) }} / {{ formatTb(globalMetrics?.storage?.total_gb) }}
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-title">CPU负载</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.cpu_load?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.cpu_load?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ globalMetrics?.cpu_load?.status || '暂无数据' }}
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-title">GPU占用率</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.gpu?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.gpu?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ Number(globalMetrics?.gpu?.gpu_count || 0) }} 块显卡
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-title">显存占用率</div>
              <el-progress
                type="dashboard"
                :percentage="clampPercentage(globalMetrics?.vram?.percentage)"
                :color="getColorForPercentage(clampPercentage(globalMetrics?.vram?.percentage))"
                :stroke-width="12"
                :width="130"
                :format="percent => `${percent.toFixed(1)}%`"
              />
              <div class="gauge-subtitle">
                {{ formatGb(globalMetrics?.vram?.used_gb) }} / {{ formatGb(globalMetrics?.vram?.total_gb) }}
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <div v-if="!embedded" class="process-report-container">
        <el-card class="process-report-card" shadow="hover">
          <div v-if="processReportsLoading && !processReports" class="process-report-body process-report-body--loading">
            <div class="process-report-main">
              <div class="process-report-header">
                <div class="process-report-title">
                  <el-icon><TrendCharts /></el-icon>
                  <span>任务运行报表</span>
                </div>
                <div class="process-report-meta">数据加载中...</div>
              </div>
              <div class="process-report-loading">
                <el-skeleton :rows="3" animated />
              </div>
            </div>
            <div class="process-report-ranking ranking-empty">
              <div class="ranking-title">
                <el-icon><Histogram /></el-icon>
                <span>显存占用排行</span>
              </div>
              <div class="ranking-placeholder">加载中...</div>
            </div>
          </div>
          <div v-else class="process-report-body">
            <div class="process-report-main">
              <div class="process-report-header">
                <div class="process-report-title">
                  <el-icon><TrendCharts /></el-icon>
                  <span>任务运行报表</span>
                </div>
                <div v-if="processReports?.meta?.generated_at" class="process-report-meta">
                  更新于 {{ formatTimestamp(processReports.meta.generated_at) }}
                </div>
              </div>
              <el-tabs v-model="processReportActive" class="process-report-tabs">
                <el-tab-pane label="日报" name="daily" />
                <el-tab-pane label="周报" name="weekly" />
                <el-tab-pane label="月报" name="monthly" />
                <el-tab-pane label="累计" name="all" />
              </el-tabs>
              <div class="process-report-summary">
                <div v-if="currentProcessReport" class="report-grid">
                  <div class="report-item">
                    <div class="report-label">任务数量</div>
                    <div class="report-value">{{ currentProcessReport.process_count || 0 }}</div>
                  </div>
                  <div class="report-item">
                    <div class="report-label">平均CPU占用率</div>
                    <div class="report-value">{{ formatPercentValue(currentProcessReport.avg_cpu_usage) }}</div>
                  </div>
                  <div class="report-item">
                    <div class="report-label">平均GPU占用率</div>
                    <div class="report-value">{{ formatPercentValue(currentProcessReport.avg_gpu_utilization) }}</div>
                  </div>
                  <div class="report-item">
                    <div class="report-label">显存总量</div>
                    <div class="report-value">{{ formatGb(currentProcessReport.total_gpu_memory_gb, 2) }}</div>
                    <div class="report-hint">基于历史进程峰值 (GB)</div>
                  </div>
                  <div class="report-item">
                    <div class="report-label">运行时长总计</div>
                    <div class="report-value">{{ currentProcessReport.total_runtime_human || '0秒' }}</div>
                  </div>
                </div>
                <div v-else class="report-empty">
                  <el-empty description="暂无进程历史数据" :image-size="80" />
                </div>
              </div>
            </div>
            <div class="process-report-ranking" :class="{'ranking-empty': !currentProcessRanking.length}">
              <div class="ranking-title">
                <el-icon><Histogram /></el-icon>
                <span>显存占用排行</span>
              </div>
              <div v-if="currentProcessRanking.length" class="ranking-list">
                <div
                  v-for="item in currentProcessRanking"
                  :key="item.user_id"
                  class="ranking-item"
                >
                  <div class="ranking-index" :class="{'top-three': item.rank <= 3}">{{ item.rank }}</div>
                  <el-avatar
                    :size="36"
                    :src="getRankingAvatar(item)"
                    class="ranking-avatar"
                  >
                    <el-icon><UserFilled /></el-icon>
                  </el-avatar>
                  <div class="ranking-info">
                    <div class="ranking-header">
                      <div class="ranking-name" :title="item.username || '未知用户'">
                        {{ item.username || '未知用户' }}
                      </div>
                      <span
                        class="ranking-group"
                        :class="getGroupClass(item.user_group)"
                        :title="formatGroupLabel(item.user_group, item.entry_year)"
                      >
                        {{ formatGroupLabel(item.user_group, item.entry_year) }}
                      </span>
                    </div>
                    <div class="ranking-stats">
                      <span class="ranking-metric">{{ formatMemory(item.total_gpu_memory_mb || 0) }}</span>
                      <span class="ranking-divider">·</span>
                      <span class="ranking-metric">{{ item.process_count || 0 }} 个任务</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="ranking-placeholder">暂无排行数据</div>
            </div>
          </div>
        </el-card>
      </div>

      <template v-if="filteredServers && filteredServers.length > 0">
        <div class="servers-grid">
        <el-card v-for="server in filteredServers" :key="server.id" class="server-card" shadow="hover" :class="{'offline-server': server.status === 'offline'}">
          <!-- 离线服务器覆盖层 -->
          <div v-if="server.status === 'offline'" class="offline-overlay">
            <div class="offline-message">
              <div class="offline-icon">🔴</div>
              <div class="offline-server-name">{{ serverSystemData[server.id]?.cpu?.system?.hostname || server.name || '未知主机' }}</div>
              <div class="offline-text">服务器离线</div>
              <div class="offline-time">{{ formatLastOnline(server.last_online) }}</div>
            </div>
          </div>
          <!-- 第一行：服务器基本信息 -->
          <div class="server-header">
            <div class="server-title">
              <h2>{{ serverSystemData[server.id]?.cpu?.system?.hostname || '未知主机' }}</h2>
            </div>
            <div class="server-system-info" v-if="serverSystemData[server.id]">
              <span class="uptime">运行时间: {{ serverSystemData[server.id].cpu?.system?.uptime || '未知' }}</span>
              <span class="platform">{{ serverSystemData[server.id].cpu?.system?.version || '未知系统版本' }}</span>
            </div>
            <div class="server-actions">
              <el-button 
                type="info" 
                plain 
                @click="openContainerRequest(server)" 
                :disabled="server.status === 'offline'"
              >
                <el-icon><Plus /></el-icon>
                <span>申请容器</span>
              </el-button>
              <el-button type="primary" @click="goToServerDetail(server.id)" :disabled="server.status === 'offline'" style="margin-left: 8px;">
                <el-icon><View /></el-icon>
                <span>查看详情</span>
              </el-button>
            </div>
          </div>
          
          <!-- 第二行：监控数据 -->
          <div v-if="serverSystemData[server.id]" class="server-monitoring">
            <el-row :gutter="20">
              <!-- CPU监控部分 -->
              <el-col :xs="24" :sm="24" :md="6" :lg="6" :xl="6">
                <div class="monitor-section">
                  <h3 class="section-title">
                    <el-icon><Cpu /></el-icon>
                    <span>CPU监控</span>
                  </h3>
                  <div class="cpu-info" v-if="serverSystemData[server.id]?.cpu?.cpu_info">
                    <div class="cpu-specs">
                      <div class="cpu-header">
                        <div class="cpu-model">{{ serverSystemData[server.id]?.cpu?.cpu_info?.brand || '未知处理器' }}</div>
                        <div class="cpu-arch">{{ serverSystemData[server.id]?.cpu?.cpu_info?.arch || '未知架构' }}</div>
                      </div>

                      <div class="cpu-metrics">
                        <div class="metric-item">
                          <div class="metric-icon">💻</div>
                          <div class="metric-content">
                            <div class="metric-label">核心数量</div>
                            <div class="metric-value">
                              <span class="main-value">{{ serverSystemData[server.id]?.cpu?.cpu_info?.count || 0 }}</span>
                              <span class="sub-value">({{ serverSystemData[server.id]?.cpu?.cpu_info?.physical_count || 0 }}物理)</span>
                            </div>
                          </div>
                        </div>

                        <div class="metric-item">
                          <div class="metric-icon">⚡</div>
                          <div class="metric-content">
                            <div class="metric-label">频率</div>
                            <div class="metric-value">
                              <span class="main-value">{{ serverSystemData[server.id]?.cpu?.cpu_info?.freq_current ? serverSystemData[server.id]?.cpu?.cpu_info?.freq_current.toFixed(0) : 0 }}</span>
                              <span class="sub-value">/ {{ serverSystemData[server.id]?.cpu?.cpu_info?.freq_max || 0 }} MHz</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">CPU使用率:</span>
                    <el-progress 
                      :percentage="Math.min(100, Math.max(0, getCpuUsage(server.id) || 0))" 
                      :color="getColorForPercentage(getCpuUsage(server.id) || 0)"
                      :stroke-width="10"
                      :format="() => `${(getCpuUsage(server.id) || 0).toFixed(1)}%`"
                    />
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">系统负载:</span>
                    <el-progress 
                      :percentage="Math.min(100, Math.max(0, getCpuLoad1Min(server.id) || 0))" 
                      :color="getColorForPercentage(getCpuLoad1Min(server.id) || 0)"
                      :stroke-width="10"
                      :format="() => `${(getCpuLoad1Min(server.id) || 0).toFixed(1)}%`"
                    />
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">内存使用:</span>
                    <el-progress 
                      :percentage="Math.min(100, Math.max(0, getMemoryPercent(server.id) || 0))" 
                      :color="getColorForPercentage(getMemoryPercent(server.id) || 0)"
                      :stroke-width="10"
                      :format="format => `${(getMemoryUsed(server.id) || 0).toFixed(2)} GB / ${(getMemoryTotal(server.id) || 0).toFixed(2)} GB`"
                    />
                  </div>
                  <!-- 磁盘信息 -->
                  <div class="section-subtitle">
                    <el-icon><Promotion /></el-icon>
                    <span>磁盘信息</span>
                  </div>
                  <div v-if="serverSystemData[server.id]?.cpu?.disks && Object.keys(serverSystemData[server.id]?.cpu?.disks).length > 0" class="disk-info">
                    <div v-for="(disk, key) in serverSystemData[server.id]?.cpu?.disks" :key="key" class="disk-item">
                      <div class="disk-label">{{ key }}</div>
                      <el-progress
                        :percentage="Math.min(100, Math.max(0, (disk.usage?.total ? (disk.usage.used / disk.usage.total * 100) : (disk.usage?.percent || 0))))"
                        :color="getColorForPercentage(disk.usage?.total ? (disk.usage.used / disk.usage.total * 100) : (disk.usage?.percent || 0))"
                        :stroke-width="10"
                        :format="() => `${disk.usage?.used || 0} ${disk.usage?.unit || 'GB'} / ${disk.usage?.total || 0} ${disk.usage?.unit || 'GB'} (${((disk.usage?.total ? (disk.usage.used / disk.usage.total * 100) : (disk.usage?.percent || 0))).toFixed(2)}%)`"
                      />
                    </div>
                  </div>
                  <div v-else class="no-data-small">
                    无磁盘信息
                  </div>
                </div>
              </el-col>
              
              <!-- GPU监控部分 -->
              <el-col :xs="24" :sm="24" :md="6" :lg="6" :xl="6">
                <div class="monitor-section">
                  <h3 class="section-title">
                    <el-icon><Monitor /></el-icon>
                    <span>GPU监控</span>
                  </h3>
                  <div v-if="getGpuCount(server.id) > 0">
                    <div v-for="(gpu, index) in getGpuData(server.id)" :key="index" class="gpu-item">
                      <div class="gpu-header">
                        <div class="gpu-name">
                          <span class="gpu-model">{{ gpu.name || `GPU ${index}` }}</span>
                          <span v-if="gpu.device_id" class="gpu-id">ID: {{ gpu.device_id }}</span>
                        </div>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">使用率:</span>
                        <el-progress 
                          :percentage="Math.min(100, Math.max(0, gpu.utilization || 0))" 
                          :color="getColorForPercentage(gpu.utilization || 0)"
                          :stroke-width="8"
                          :format="() => `${gpu.utilization || 0}%`"
                        />
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">显存:</span>
                        <el-progress 
                          :percentage="Math.min(100, Math.max(0, gpu.memory_used && gpu.memory_total ? Math.round(gpu.memory_used / gpu.memory_total * 100) : 0))" 
                          :color="getColorForPercentage(gpu.memory_used && gpu.memory_total ? Math.round(gpu.memory_used / gpu.memory_total * 100) : 0)"
                          :stroke-width="8"
                          :format="format => `${gpu.memory_used || 0} MB / ${gpu.memory_total || 0} MB`"
                        />
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">温度:</span>
                        <el-progress 
                          :percentage="Math.min(100, Math.max(0, Math.round((gpu.temperature || 0) / 120 * 100)))" 
                          :color="getTemperatureColor(gpu.temperature || 0)"
                          :stroke-width="8"
                          :format="format => `${gpu.temperature || 0}°C`"
                        />
                      </div>
                      
                      <!-- GPU进程信息 -->
                      <div class="gpu-processes" v-if="gpu.processes && gpu.processes.length > 0">
                        <div class="process-header">进程信息:</div>
                        <el-table
                          :data="gpu.processes"
                          size="small"
                          style="width: 100%"
                          :header-cell-style="{fontSize: '13px', backgroundColor: '#fafbfc', color: '#409eff', fontWeight: '600'}"
                          :cell-style="{fontSize: '13px'}"
                          stripe
                          class="custom-table"
                        >
                          <el-table-column prop="pid" label="PID" min-width="75" />
                          <el-table-column prop="username" label="用户" min-width="60" />
                          <el-table-column prop="running_time" label="运行时间" min-width="77" />
                          <el-table-column label="显存" min-width="90">
                            <template #default="scope">
                              <span class="table-badge">{{ scope.row.gpu_memory || scope.row.memory_usage || '0' }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column label="GPU占用" min-width="80">
                            <template #default="scope">
                              <span class="table-badge gpu-usage">{{ formatProcessGpuUtilization(scope.row.gpu_sm_utilization) }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column prop="command" label="命令" min-width="300" show-overflow-tooltip />
                        </el-table>
                      </div>
                      <div v-else class="no-data-small">无GPU进程</div>
                    </div>
                  </div>
                  <div v-else class="no-data">
                    无GPU设备
                  </div>
                </div>
              </el-col>
              
              <!-- 容器与网络部分 -->
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <div class="monitor-section">
                  <h3 class="section-title">
                    <el-icon><Connection /></el-icon>
                    <span>容器与网络</span>
                  </h3>
                  <div v-if="serverSystemData[server.id]?.network || getContainerNetworkRows(server.id).length > 0">
                    <div class="network-info" v-if="serverSystemData[server.id]?.network">
                      <div class="network-cards">
                        <div class="network-card">
                          <div class="network-icon">🏠</div>
                          <div class="network-content">
                            <div class="network-label">局域网</div>
                            <div class="network-value">{{ serverSystemData[server.id]?.network?.['lan-ip'] || '未知' }}</div>
                          </div>
                        </div>

                        <div class="network-card">
                          <div class="network-icon">🌐</div>
                          <div class="network-content">
                            <div class="network-label">校园网IP</div>
                            <div class="network-value">{{ serverSystemData[server.id]?.network?.['edu-ip'] || '未知' }}</div>
                          </div>
                        </div>

                        <div class="network-card">
                          <div class="network-icon">🔗</div>
                          <div class="network-content">
                            <div class="network-label">域名</div>
                            <div class="network-value">{{ serverSystemData[server.id]?.network?.['edu-domain'] || '未知' }}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="container-network-table" v-if="getContainerNetworkRows(server.id).length > 0">
                      <!-- <div class="section-subtitle">
                        <el-icon><Service /></el-icon>
                        <span>容器网络速览</span>
                      </div> -->
                      <div
                        class="container-summary-cards"
                        v-for="totals in [getContainerIoTotals(server.id)]"
                        :key="`io-summary-${server.id}`"
                      >
                        <div class="summary-card network-summary">
                          <div class="summary-header">
                            <div class="summary-icon">🌐</div>
                            <div class="summary-title">容器网络</div>
                          </div>
                          <div class="summary-metrics">
                            <div class="metric-row">
                              <div class="metric-label">总流量</div>
                              <div class="metric-value">
                                <span class="upload-value">↑ {{ totals.netTxBytesHuman }}</span>
                                <span class="download-value">↓ {{ totals.netRxBytesHuman }}</span>
                              </div>
                            </div>
                            <div class="metric-row">
                              <div class="metric-label">当前速率</div>
                              <div class="metric-value">
                                <span class="upload-rate">↑ {{ totals.netTxRateHuman }}</span>
                                <span class="download-rate">↓ {{ totals.netRxRateHuman }}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="summary-card disk-summary">
                          <div class="summary-header">
                            <div class="summary-icon">💾</div>
                            <div class="summary-title">容器磁盘</div>
                          </div>
                          <div class="summary-metrics">
                            <div class="metric-row">
                              <div class="metric-label">总读写</div>
                              <div class="metric-value">
                                <span class="read-value">↑ {{ totals.blkReadBytesHuman }}</span>
                                <span class="write-value">↓ {{ totals.blkWriteBytesHuman }}</span>
                              </div>
                            </div>
                            <div class="metric-row">
                              <div class="metric-label">当前速率</div>
                              <div class="metric-value">
                                <span class="read-rate">↑ {{ totals.blkReadRateHuman }}</span>
                                <span class="write-rate">↓ {{ totals.blkWriteRateHuman }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <el-table
                        :data="getContainerNetworkRows(server.id)"
                        size="small"
                        style="width: 100%"
                        :header-cell-style="{ fontSize: '13px', backgroundColor: '#fafbfc', color: '#409eff', fontWeight: '600' }"
                        :cell-style="{ fontSize: '13px' }"
                        stripe
                        class="custom-table"
                      >
                        <el-table-column label="容器" min-width="80">
                          <template #default="{ row }">
                            <div class="container-name-cell">
                              <el-icon><UserFilled /></el-icon>
                              <span>{{ row.displayName }}</span>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="CPU" min-width="90">
                          <template #default="{ row }">
                            <div class="metric-progress metric-progress--cpu">
                              <el-progress
                                :percentage="row.cpuPercent"
                                :color="getColorForPercentage(row.cpuPercent)"
                                :stroke-width="8"
                              >
                                <span>{{ row.cpuPercent.toFixed(1) }}%</span>
                              </el-progress>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="内存" min-width="90">
                          <template #default="{ row }">
                            <div class="metric-progress">
                              <el-progress
                                :percentage="row.memoryPercent"
                                :color="getColorForPercentage(row.memoryPercent)"
                                :stroke-width="8"
                              >
                                <span>{{ row.memoryUsageGiB }}</span>
                              </el-progress>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="显存" min-width="90">
                          <template #default="{ row }">
                            <el-progress
                              :percentage="row.gpuMemoryPercent"
                              :color="getColorForPercentage(row.gpuMemoryPercent)"
                              :stroke-width="8"
                              :format="() => formatMemory(row.gpuMemoryUsage)"
                            />
                          </template>
                        </el-table-column>
                        <el-table-column label="SSH" width="70" align="center">
                          <template #default="{ row }">
                            <el-tag v-if="row.ssh && row.ssh !== '-'" type="success" size="small">{{ row.ssh }}</el-tag>
                            <span v-else>-</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="网络 (上传/下载)" min-width="170">
                          <template #default="{ row }">
                            <div class="traffic-double">
                              <div class="traffic-row traffic-row--current">
                                <div class="traffic-cell">
                                  <el-icon class="traffic-icon traffic-icon--upload"><Top /></el-icon>
                                  <span class="traffic-value traffic-value--upload">{{ row.txRate && row.txRate !== '-' ? row.txRate : '-' }}</span>
                                </div>
                                <div class="traffic-cell traffic-cell--down">
                                  <span class="traffic-value traffic-value--download">{{ row.rxRate && row.rxRate !== '-' ? row.rxRate : '-' }}</span>
                                  <el-icon class="traffic-icon traffic-icon--download"><Bottom /></el-icon>
                                </div>
                              </div>
                              <div class="traffic-row traffic-row--muted">
                                <div class="traffic-cell">
                                  <span class="traffic-value traffic-value--muted">{{ row.netTxBytesHuman && row.netTxBytesHuman !== '-' ? row.netTxBytesHuman : '-' }}</span>
                                </div>
                                <div class="traffic-cell traffic-cell--down">
                                  <span class="traffic-value traffic-value--muted">{{ row.netRxBytesHuman && row.netRxBytesHuman !== '-' ? row.netRxBytesHuman : '-' }}</span>
                                </div>
                              </div>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="磁盘 (读取/写入)" min-width="170">
                          <template #default="{ row }">
                            <div class="traffic-double">
                              <div class="traffic-row traffic-row--current">
                                <div class="traffic-cell">
                                  <el-icon class="traffic-icon traffic-icon--read"><Top /></el-icon>
                                  <span class="traffic-value traffic-value--read">{{ row.diskReadRate && row.diskReadRate !== '-' ? row.diskReadRate : '-' }}</span>
                                </div>
                                <div class="traffic-cell traffic-cell--down">
                                  <span class="traffic-value traffic-value--write">{{ row.diskWriteRate && row.diskWriteRate !== '-' ? row.diskWriteRate : '-' }}</span>
                                  <el-icon class="traffic-icon traffic-icon--write"><Bottom /></el-icon>
                                </div>
                              </div>
                              <div class="traffic-row traffic-row--muted">
                                <div class="traffic-cell">
                                  <span class="traffic-value traffic-value--muted">{{ row.blkReadBytesHuman && row.blkReadBytesHuman !== '-' ? row.blkReadBytesHuman : '-' }}</span>
                                </div>
                                <div class="traffic-cell traffic-cell--down">
                                  <span class="traffic-value traffic-value--muted">{{ row.blkWriteBytesHuman && row.blkWriteBytesHuman !== '-' ? row.blkWriteBytesHuman : '-' }}</span>
                                </div>
                              </div>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="TCP" min-width="90">
                          <template #default="{ row }">
                            <span>{{ row.tcp || '-' }}</span>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                    <div v-else class="no-data-small">暂无容器网络数据</div>
                  </div>
                  <div v-else class="no-data">
                    无容器或网络数据
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
          <div v-else class="server-loading">
            <el-skeleton :rows="4" animated />
          </div>
        </el-card>
        </div>
      </template>

      <template v-else>
        <div class="empty-container" style="padding: 15px 0;">
          <el-empty :description="props.username ? '您当前没有使用任何服务器' : '暂无服务器数据'" :image-size="60">
            <template #image>
              <el-icon class="empty-icon" style="font-size: 40px; margin-bottom: 10px;"><Monitor /></el-icon>
            </template>
          </el-empty>
        </div>
      </template>
    </div>
      </div>
    </div>

    <!-- 容器申请对话框 -->
    <ContainerRequestForm 
      v-model:visible="containerRequestVisible" 
      :servers="servers"
      :selected-server-id="selectedServerId"
      @submitted="onContainerRequestSubmitted"
    />
    
    <!-- 弹幕聊天组件 -->
    <DanmakuChat :disabled="embedded" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, defineProps, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useServersStore } from '../stores/servers'
import { ElMessage } from 'element-plus'
import axios from '../utils/axios'
import { WarningFilled, Monitor, Refresh, Cpu, Connection, View, Promotion, Service, UserFilled, Plus, Histogram, TrendCharts, Top, Bottom } from '@element-plus/icons-vue'
import { resolveAvatarUrl } from '../utils/avatar'
import ContainerRequestForm from '../components/ContainerRequestForm.vue'
import DanmakuChat from '../components/DanmakuChat.vue'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  },
  filterServerIds: {
    type: Array,
    default: () => []
  },
  username: {
    type: String,
    default: ''
  },
  includeHidden: {
    type: Boolean,
    default: false
  },
  showHiddenOnly: {
    type: Boolean,
    default: false
  },
})

const router = useRouter()
const serversStore = useServersStore()
const servers = ref([])
const serverSystemData = ref({})
const loading = ref(false)
const containerRequestVisible = ref(false)
const selectedServerId = ref(null)
const globalMetrics = ref(null)
const globalMetricsLoading = ref(false)
const processReports = ref(null)
const processReportsLoading = ref(false)
const processReportActive = ref('daily')

// 用户信息
const username = ref(localStorage.getItem('username') || '')
const userRole = ref(localStorage.getItem('userRole') || '')

// 根据filterServerIds和容器名称过滤服务器
const filteredServers = computed(() => {
  // 如果只显示隐藏的服务器，过滤出 is_visible = false 且有用户容器的服务器
  if (props.showHiddenOnly) {
    return servers.value.filter(server => {
      // 必须是隐藏的服务器
      if (server.is_visible) return false;

      // 必须有用户的容器
      if (props.filterServerIds && props.filterServerIds.length > 0) {
        return props.filterServerIds.includes(server.id);
      }

      // 或者检查服务器上是否有用户名称的容器
      if (props.username && props.username.trim() !== '') {
        const dockerContainers = getDockerContainers(server.id);
        if (dockerContainers && dockerContainers.length > 0) {
          const username = props.username.toLowerCase();
          return dockerContainers.some(container => {
            const containerName = (container.Names || container.name || container.Name || '').toLowerCase();
            if (Array.isArray(containerName)) {
              return containerName.some(name => name.toLowerCase().includes(username));
            }
            return containerName.includes(username);
          });
        }
      }

      return false;
    });
  }

  // 如果没有提供过滤条件，返回所有服务器
  if ((!props.filterServerIds || props.filterServerIds.length === 0) && !props.username) {
    return servers.value;
  }
  
  return servers.value.filter(server => {
    // 条件1: 服务器ID在filterServerIds中
    const matchesId = props.filterServerIds && props.filterServerIds.includes(server.id);
    
    // 条件2: 服务器上的容器名称包含用户名
    let matchesContainerName = false;
    if (props.username && props.username.trim() !== '') {
      const dockerContainers = getDockerContainers(server.id);
      if (dockerContainers && dockerContainers.length > 0) {
        // 检查容器名称是否包含用户名（忽略大小写）
        const username = props.username.toLowerCase();
        matchesContainerName = dockerContainers.some(container => {
          // 尝试从不同的属性中获取容器名称
          const containerName = (container.Names || container.name || container.Name || '').toLowerCase();
          // 如果Names是数组，则检查每个元素
          if (Array.isArray(containerName)) {
            return containerName.some(name => name.toLowerCase().includes(username));
          }
          return containerName.includes(username);
        });
      }
    }
    
    // 满足任一条件即返回true
    return matchesId || matchesContainerName;
  });
})

// 站点设置
const siteSettings = reactive({
  name: 'GPU共享服务平台',
  logo: 'https://lank.myzr.org:88/i/2024/05/29/66571d8de15ea.png',
  subtitle: '高效、安全的资源管理平台'
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
const error = ref(null)
const refreshInterval = ref(null)

// 获取所有服务器
const fetchServers = async () => {
  loading.value = true
  error.value = null
  
  try {
    await serversStore.fetchServers()
    // 在需要时包含隐藏服务器
    servers.value = props.includeHidden
      ? serversStore.servers
      : serversStore.servers.filter(server => server.is_visible)
    
    // 获取每个服务器的系统数据
      for (const server of servers.value) {
        await fetchServerSystemData(server.id)
      }

      if (!props.embedded) {
        await fetchGlobalMetrics()
        await fetchProcessReports()
      }
  } catch (err) {
    console.error('获取服务器列表失败:', err)
    error.value = '获取服务器列表失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 获取单个服务器的系统数据
const fetchServerSystemData = async (serverId) => {
  try {
    const response = await serversStore.fetchServerSystemData(serverId)
    serverSystemData.value = {
      ...serverSystemData.value,
      [serverId]: response
    }
  } catch (err) {
    console.error(`获取服务器 ${serverId} 的系统数据失败:`, err)
  }
}

const fetchGlobalMetrics = async () => {
  if (props.embedded || globalMetricsLoading.value) {
    return
  }
  try {
    globalMetricsLoading.value = true
    const response = await axios.get('/api/servers/aggregate_metrics')
    globalMetrics.value = response.data
  } catch (error) {
    console.error('获取全局服务器指标失败:', error)
  } finally {
    globalMetricsLoading.value = false
  }
}

const fetchProcessReports = async () => {
  if (props.embedded || processReportsLoading.value) {
    return
  }
  try {
    processReportsLoading.value = true
    const response = await axios.get('/api/process_reports')
    processReports.value = response.data
  } catch (error) {
    console.error('获取进程报表失败:', error)
  } finally {
    processReportsLoading.value = false
  }
}

// 跳转到服务器详情页
const goToServerDetail = (serverId) => {
  router.push(`/server/${serverId}`)
}

// 返回上一层界面
const goBack = () => {
  router.push('/')
}

// 修改密码相关
const changePasswordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordFormLoading = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入新密码'))
          return
        }
        if (value.length < 6) {
          callback(new Error('密码长度至少为6位'))
          return
        }
        if (!/[a-zA-Z]/.test(value)) {
          callback(new Error('密码必须包含字母'))
          return
        }
        if (!/\d/.test(value)) {
          callback(new Error('密码必须包含数字'))
          return
        }
        callback()
      }, 
      trigger: 'blur' 
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

const openChangePasswordDialog = () => {
  changePasswordDialogVisible.value = true
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

const submitChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      passwordFormLoading.value = true
      try {
        const response = await axios.post('/api/auth/change-password', {
          old_password: passwordForm.oldPassword,
          new_password: passwordForm.newPassword
        })
        
        ElMessage.success('密码修改成功')
        changePasswordDialogVisible.value = false
      } catch (error) {
        const errorMsg = error.response?.data?.msg || '密码修改失败，请稍后再试'
        ElMessage.error(errorMsg)
      } finally {
        passwordFormLoading.value = false
      }
    }
  })
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('userRole')
  router.push('/login')
}

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

// 获取CPU使用率
const getCpuUsage = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.cpu_info?.percent || 0
}

// 获取1分钟平均负载百分比
const getCpuLoad1Min = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.cpu_info?.load_percentage?.load1_percent || 0
}

// 获取内存使用百分比
const getMemoryPercent = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.memory?.percent || 0
}

// 获取内存使用量(GB)
const getMemoryUsed = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.memory?.used || 0
}

// 获取内存总量(GB)
const getMemoryTotal = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.memory?.total || 0
}

// 获取硬盘使用百分比
const getDiskPercent = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.disk?.percent || 0
}

// 获取硬盘使用量(GB)
const getDiskUsed = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.disk?.used || 0
}

// 获取硬盘总量(GB)
const getDiskTotal = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].cpu) {
    return 0
  }
  return serverSystemData.value[serverId].cpu.disk?.total || 0
}

// 获取Docker端口数据（表格格式）
const getDockerPortData = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].network || !serverSystemData.value[serverId].network['docker-port']) {
    return []
  }
  
  const dockerPortData = serverSystemData.value[serverId].network['docker-port'];
  if (!Array.isArray(dockerPortData) || dockerPortData.length === 0) {
    return [];
  }
  
  const dockerContainers = serverSystemData.value[serverId]?.docker || []
  const dockerMap = dockerContainers.reduce((acc, item) => {
    if (item && item.Name) {
      acc[item.Name] = item
    }
    return acc
  }, {})

  return dockerPortData.map(container => {
    const containerName = Object.keys(container)[0]
    const ports = container[containerName] || {}
    const dockerInfo = dockerMap[containerName] || {}

    return {
      container: containerName,
      ssh: ports.ssh || '-',
      tcp: ports.tcp || '-',
      udp: ports.udp || '-',
      http: ports.http || '-',
      https: ports.https || '-',
      txRate: dockerInfo.NetTxRateHuman || '-',
      rxRate: dockerInfo.NetRxRateHuman || '-',
      diskWriteRate: dockerInfo.BlkWriteRateHuman || '-',
      diskReadRate: dockerInfo.BlkReadRateHuman || '-',
      netTxBytes: dockerInfo.NetTxBytes || dockerInfo.net_tx_bytes || 0,
      netRxBytes: dockerInfo.NetRxBytes || dockerInfo.net_rx_bytes || 0,
      blkWriteBytes: dockerInfo.BlkWriteBytes || dockerInfo.blk_write_bytes || 0,
      blkReadBytes: dockerInfo.BlkReadBytes || dockerInfo.blk_read_bytes || 0
    }
  })
}

const normalizeContainerIdentifier = (value) => {
  if (!value) return ''
  const source = Array.isArray(value) ? value[0] : value
  if (!source || typeof source !== 'string') return ''
  return source.replace(/^\/+/, '').toLowerCase()
}

const getContainerDisplayName = (container) => {
  if (!container) return '未知容器'
  const candidates = [
    container.Name,
    container.name,
    ...(Array.isArray(container.Names) ? container.Names : [])
  ].filter(Boolean)
  const name = candidates.length > 0 ? candidates[0] : '未知容器'
  return typeof name === 'string' ? name.replace(/^\/+/, '') || '未知容器' : '未知容器'
}

const toSafePercent = (value) => {
  const num = Number.parseFloat(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, num))
}

const getContainerNetworkRows = (serverId) => {
  const containers = getDockerContainers(serverId)
  const portData = getDockerPortData(serverId)

  if ((!containers || containers.length === 0) && (!portData || portData.length === 0)) {
    return []
  }

  const portMap = new Map()
  portData.forEach(item => {
    const key = normalizeContainerIdentifier(item.container)
    if (!portMap.has(key)) {
      portMap.set(key, item)
    }
  })

  const rows = []
  const usedKeys = new Set()

  const toNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  const formatRateValue = (value, fallback = '-') => {
    if (!Number.isFinite(value) || value <= 0) {
      return fallback
    }

    const units = ['B/s', 'KiB/s', 'MiB/s', 'GiB/s', 'TiB/s']
    let rate = value
    let unitIndex = 0

    while (rate >= 1024 && unitIndex < units.length - 1) {
      rate /= 1024
      unitIndex += 1
    }

    const digits = rate >= 100 ? 0 : rate >= 10 ? 1 : 2
    return `${rate.toFixed(digits)} ${units[unitIndex]}`
  }

  const formatBytesValue = (value) => {
    if (!Number.isFinite(value) || value < 0) {
      return '-'
    }
    if (value === 0) {
      return '0 Bytes'
    }
    return formatBytes(value)
  }

  containers.forEach(container => {
    const displayName = getContainerDisplayName(container)
    const key = normalizeContainerIdentifier(displayName)
    const port = portMap.get(key)

    const memoryBytes = container.MemUsageBytes ?? container.mem_usage_bytes ?? parseMemoryToBytes(container.MemUsage || container.mem_usage)

    const netTxRateRaw = toNumber(container.NetTxRate ?? container.net_tx_rate)
    const netRxRateRaw = toNumber(container.NetRxRate ?? container.net_rx_rate)
    const netTxBytesRaw = toNumber(container.NetTxBytes ?? container.net_tx_bytes)
    const netRxBytesRaw = toNumber(container.NetRxBytes ?? container.net_rx_bytes)
    const blkWriteRateRaw = toNumber(container.BlkWriteRate ?? container.blk_write_rate)
    const blkReadRateRaw = toNumber(container.BlkReadRate ?? container.blk_read_rate)
    const blkWriteBytesRaw = toNumber(container.BlkWriteBytes ?? container.blk_write_bytes)
    const blkReadBytesRaw = toNumber(container.BlkReadBytes ?? container.blk_read_bytes)

    rows.push({
      key,
      displayName,
      cpuPercent: toSafePercent(container.CPUPerc),
      memoryPercent: toSafePercent(container.MemPerc),
      memoryUsageDisplay: container.MemUsage || container.mem_usage || '-',
      memoryUsageGiB: formatGiB(memoryBytes),
      memoryUsageBytes: memoryBytes,
      gpuMemoryPercent: toSafePercent(container.GPUMemPerc),
      gpuMemoryUsage: container.GPUMemUsage || container.gpu_mem_usage || 0,
      ssh: port?.ssh || '-',
      tcp: port?.tcp || '-',
      udp: port?.udp || '-',
      http: port?.http || '-',
      https: port?.https || '-',
      txRate: formatRateValue(netTxRateRaw, port?.txRate || '-'),
      rxRate: formatRateValue(netRxRateRaw, port?.rxRate || '-'),
      diskWriteRate: formatRateValue(blkWriteRateRaw, port?.diskWriteRate || '-'),
      diskReadRate: formatRateValue(blkReadRateRaw, port?.diskReadRate || '-'),
      netTxRateRaw,
      netRxRateRaw,
      netTxBytesRaw,
      netRxBytesRaw,
      blkWriteRateRaw,
      blkReadRateRaw,
      blkWriteBytesRaw,
      blkReadBytesRaw,
      netTxBytesHuman: formatBytesValue(netTxBytesRaw),
      netRxBytesHuman: formatBytesValue(netRxBytesRaw),
      blkWriteBytesHuman: formatBytesValue(blkWriteBytesRaw),
      blkReadBytesHuman: formatBytesValue(blkReadBytesRaw)
    })

    usedKeys.add(key)
  })

  portData.forEach(item => {
    const key = normalizeContainerIdentifier(item.container)
    if (usedKeys.has(key)) return
    rows.push({
      key,
      displayName: typeof item.container === 'string' ? item.container.replace(/^\/+/, '') : '未知容器',
      cpuPercent: 0,
      memoryPercent: 0,
      memoryUsageDisplay: '-',
      memoryUsageGiB: '-',
      memoryUsageBytes: 0,
      gpuMemoryPercent: 0,
      gpuMemoryUsage: 0,
      ssh: item.ssh || '-',
      tcp: item.tcp || '-',
      udp: item.udp || '-',
      http: item.http || '-',
      https: item.https || '-',
      txRate: item.txRate || '-',
      rxRate: item.rxRate || '-',
      diskWriteRate: item.diskWriteRate || '-',
      diskReadRate: item.diskReadRate || '-',
      netTxRateRaw: 0,
      netRxRateRaw: 0,
      netTxBytesRaw: 0,
      netRxBytesRaw: 0,
      blkWriteRateRaw: 0,
      blkReadRateRaw: 0,
      blkWriteBytesRaw: 0,
      blkReadBytesRaw: 0,
      netTxBytesHuman: '-',
      netRxBytesHuman: '-',
      blkWriteBytesHuman: '-',
      blkReadBytesHuman: '-'
    })
  })

  return rows
}

const getContainerIoTotals = (serverId) => {
  const rows = getContainerNetworkRows(serverId)

  const totals = rows.reduce((acc, row) => {
    acc.netTxRate += row.netTxRateRaw || 0
    acc.netRxRate += row.netRxRateRaw || 0
    acc.netTxBytes += row.netTxBytesRaw || 0
    acc.netRxBytes += row.netRxBytesRaw || 0
    acc.blkWriteRate += row.blkWriteRateRaw || 0
    acc.blkReadRate += row.blkReadRateRaw || 0
    acc.blkWriteBytes += row.blkWriteBytesRaw || 0
    acc.blkReadBytes += row.blkReadBytesRaw || 0
    return acc
  }, {
    netTxRate: 0,
    netRxRate: 0,
    netTxBytes: 0,
    netRxBytes: 0,
    blkWriteRate: 0,
    blkReadRate: 0,
    blkWriteBytes: 0,
    blkReadBytes: 0
  })

  const formatRate = (value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return '0 B/s'
    }

    const units = ['B/s', 'KiB/s', 'MiB/s', 'GiB/s', 'TiB/s']
    let rate = value
    let unitIndex = 0

    while (rate >= 1024 && unitIndex < units.length - 1) {
      rate /= 1024
      unitIndex += 1
    }

    const digits = rate >= 100 ? 0 : rate >= 10 ? 1 : 2
    return `${rate.toFixed(digits)} ${units[unitIndex]}`
  }

  const formatBytesTotal = (value) => {
    if (!Number.isFinite(value) || value < 0) {
      return '-'
    }
    if (value === 0) {
      return '0 Bytes'
    }
    return formatBytes(value)
  }

  return {
    netTxRate: totals.netTxRate,
    netRxRate: totals.netRxRate,
    netTxRateHuman: formatRate(totals.netTxRate),
    netRxRateHuman: formatRate(totals.netRxRate),
    netTxBytesHuman: formatBytesTotal(totals.netTxBytes),
    netRxBytesHuman: formatBytesTotal(totals.netRxBytes),
    blkWriteRate: totals.blkWriteRate,
    blkReadRate: totals.blkReadRate,
    blkWriteRateHuman: formatRate(totals.blkWriteRate),
    blkReadRateHuman: formatRate(totals.blkReadRate),
    blkWriteBytesHuman: formatBytesTotal(totals.blkWriteBytes),
    blkReadBytesHuman: formatBytesTotal(totals.blkReadBytes)
  }
}

// 获取GPU数量
const getGpuCount = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].gpu) {
    return 0
  }
  return serverSystemData.value[serverId].gpu.length
}

// 获取GPU数据
const getGpuData = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].gpu) {
    return []
  }
  return serverSystemData.value[serverId].gpu
}

// 获取Docker容器
const getDockerContainers = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].docker) {
    return []
  }
  return serverSystemData.value[serverId].docker
}

// 格式化内存显示，自动选择MB或GB单位，并在数字和单位之间添加空格
const formatMemory = (memoryValue) => {
  if (memoryValue === undefined || memoryValue === null) {
    return '0 MB'
  }

  // 如果是字符串但包含数字和单位，尝试提取数字部分
  if (typeof memoryValue === 'string') {
    const match = memoryValue.match(/(\d+(\.\d+)?)\s*(MB|GB|KB)?/i)
    if (match) {
      memoryValue = parseFloat(match[1])
      // 如果字符串中已经有单位，按照原单位返回，但确保有空格
      if (match[3]) {
        return `${memoryValue.toFixed(1)} ${match[3]}`
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

function formatGiB(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '-'
  const gib = value / (1024 ** 3)
  if (gib < 1 && gib > 0) {
    return '<1 GiB'
  }
  return `${Math.round(gib)} GiB`
}

function parseMemoryToBytes(value) {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string') {
    return undefined
  }

  const match = value.trim().match(/([0-9]+(?:\.[0-9]+)?)(\s*)([A-Za-z]+)?/)
  if (!match) return undefined

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric)) return undefined

  const unit = (match[3] || '').toUpperCase()
  const unitMap = {
    B: 1,
    KB: 1024,
    KIB: 1024,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    TB: 1024 ** 4,
    TIB: 1024 ** 4
  }

  const factor = unitMap[unit] || 1
  return numeric * factor
}

const clampPercentage = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return 0
  }
  const limited = Math.max(0, Math.min(100, num))
  return Math.round(limited * 100) / 100
}

const formatGb = (value, fractionDigits = 1) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    return `${(0).toFixed(fractionDigits)} GB`
  }
  return `${num.toFixed(fractionDigits)} GB`
}

const formatTb = (value, fractionDigits = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    return `${(0).toFixed(fractionDigits)} TB`
  }
  return `${(num / 1024).toFixed(fractionDigits)} TB`
}

const formatCoreUsage = (used, total) => {
  const usedNum = Number(used)
  const totalNum = Number(total)
  const safeUsed = Number.isFinite(usedNum) && usedNum > 0 ? usedNum : 0
  const safeTotal = Number.isFinite(totalNum) && totalNum > 0 ? Math.round(totalNum) : 0
  const usedText = safeUsed >= 100 ? safeUsed.toFixed(0) : safeUsed.toFixed(1)
  return `${usedText} / ${safeTotal} 核心`
}

const formatPercentValue = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return '0%'
  }
  return `${num.toFixed(2)}%`
}

const currentProcessReport = computed(() => {
  if (!processReports.value) {
    return null
  }
  return processReports.value[processReportActive.value] || null
})

const currentProcessRanking = computed(() => {
  const report = currentProcessReport.value
  if (!report || !Array.isArray(report.top_gpu_memory_users)) {
    return []
  }
  return report.top_gpu_memory_users
})

const getRankingAvatar = (item) => {
  if (!item) {
    return resolveAvatarUrl('', 'user', 120)
  }
  return resolveAvatarUrl(item.avatar_url, item.username || 'user', 120)
}

const GROUP_LABELS = {
  undergrad: '本科生',
  master: '硕士生',
  phd: '博士生',
  teacher: '教师',
  unassigned: '未分组'
}

const GROUP_CLASS_MAP = {
  undergrad: 'group-undergrad',
  master: 'group-master',
  phd: 'group-phd',
  teacher: 'group-teacher',
  unassigned: 'group-unassigned'
}

const formatGroupLabel = (code, entryYear) => {
  const groupKey = code || 'unassigned'
  const baseLabel = GROUP_LABELS[groupKey] || GROUP_LABELS.unassigned
  if ((groupKey === 'undergrad' || groupKey === 'master') && entryYear) {
    const yearNum = Number(entryYear)
    if (Number.isFinite(yearNum)) {
      const shortYear = String(yearNum % 100).padStart(2, '0')
      return `${shortYear}级${baseLabel}`
    }
  }
  return baseLabel
}

const getGroupClass = (code) => {
  const groupKey = code || 'unassigned'
  return GROUP_CLASS_MAP[groupKey] || GROUP_CLASS_MAP.unassigned
}

// 格式化GPU占用率显示
const formatProcessGpuUtilization = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    return '-'
  }
  return `${Math.round(num)}%`
}

// 获取网络接口
const getNetworkInterfaces = (serverId) => {
  if (!serverSystemData.value[serverId] || !serverSystemData.value[serverId].network) {
    return []
  }
  
  const networkData = serverSystemData.value[serverId].network
  const interfaces = []
  
  for (const [name, data] of Object.entries(networkData)) {
    interfaces.push({
      name,
      ...data
    })
  }
  
  return interfaces
}

// 格式化字节数
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// 格式化最后在线时间
const formatLastOnline = (lastOnline) => {
  if (!lastOnline) return '未知时间'
  
  const now = new Date()
  const lastOnlineDate = new Date(lastOnline)
  const diffInMs = now - lastOnlineDate
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInMinutes < 1) {
    return '刚刚离线'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInDays < 30) {
    return `${diffInDays}天前`
  } else {
    return lastOnlineDate.toLocaleDateString('zh-CN')
  }
}

// 格式化时间戳
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '未知时间'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 获取当前时间（调试用）
const getCurrentTime = () => {
  return new Date().toLocaleString('zh-CN')
}

// 格式化调试时间（调试用）
const formatDebugTime = (lastOnline) => {
  if (!lastOnline) return '无效时间'
  return new Date(lastOnline).toLocaleString('zh-CN')
}

// 设置自动刷新
const setupAutoRefresh = () => {
  // 根据模式设置刷新时间：嵌入模式2秒刷新一次，独立页面2秒刷新一次
  const refreshTime = props.embedded ? 2000 : 2000
  
  refreshInterval.value = setInterval(async () => {
    try {
      await serversStore.fetchServers()
      // 在需要时包含隐藏服务器
      servers.value = props.includeHidden
        ? serversStore.servers
        : serversStore.servers.filter(server => server.is_visible)
      
      // 获取每个服务器的系统数据
      for (const server of servers.value) {
        await fetchServerSystemData(server.id)
      }

      await fetchGlobalMetrics()
      await fetchProcessReports()
    } catch (err) {
      console.error('自动刷新服务器数据失败:', err)
    }
  }, refreshTime)
}

// 打开容器申请表单
const openContainerRequest = (server) => {
  selectedServerId.value = server.id
  containerRequestVisible.value = true
}

// 申请提交成功回调
const onContainerRequestSubmitted = () => {
  ElMessage.success('容器申请已提交，请等待管理员审批')
}

onMounted(() => {
  fetchServers()
  fetchSiteSettings()
  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.servers-overview {
  min-height: 100vh;
  animation: containerFadeIn 0.8s ease-out;
}

.global-metrics-container {
  margin-bottom: 24px;
}

.global-metrics-card {
  border-radius: 18px;
  border: 1px solid rgba(64, 158, 255, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(238, 245, 255, 0.82) 100%);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 45px rgba(64, 158, 255, 0.12);
  padding: 18px 22px;
}

.global-metrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  row-gap: 10px;
  margin-bottom: 16px;
}

.global-metrics-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2d3d;
}

.global-metrics-title .el-icon {
  color: #409EFF;
  font-size: 24px;
}

.global-metrics-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
  flex-wrap: wrap;
}

.global-metrics-meta .el-tag {
  border-radius: 12px;
}

.global-metrics-updated {
  color: #606266;
}

.global-gauge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
}

.gauge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 30px rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.gauge-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 42px rgba(64, 158, 255, 0.18);
}

.gauge-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.gauge-subtitle {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
  text-align: center;
  line-height: 1.4;
}

.global-metrics-loading {
  padding: 6px 0;
}

.process-report-container {
  margin-bottom: 24px;
}

.process-report-card {
  border-radius: 18px;
  border: 1px solid rgba(103, 194, 58, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 249, 235, 0.88) 100%);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(67, 160, 71, 0.1);
  padding: 18px 22px;
}

.process-report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  row-gap: 8px;
  margin-bottom: 12px;
}


.process-report-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2d3d;
}

.process-report-title .el-icon {
  color: #67C23A;
  font-size: 24px;
}

.process-report-meta {
  font-size: 13px;
  color: #909399;
}

.process-report-loading {
  padding: 12px 0;
}

.process-report-body {
  display: flex;
  gap: 18px;
  align-items: stretch;
}

.process-report-body--loading .process-report-meta {
  color: #a0acb5;
}

.process-report-main {
  flex: 1 1 0;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.process-report-tabs {
  --el-tabs-header-margin-bottom: 8px;
}

.process-report-summary {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.process-report-summary > * {
  flex: 1;
}

.process-report-ranking {
  flex: 0 1 300px;
  min-width: 260px;
  align-self: stretch;
  margin-top: -4px;
  border-radius: 14px;
  border: 1px solid rgba(103, 194, 58, 0.16);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 26px rgba(103, 194, 58, 0.12);
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 180px;
  max-height: 240px;
}
.process-report-ranking {
  flex: 0 1 clamp(240px, 10%, 340px);
}

.process-report-ranking.ranking-empty {
  min-height: 128px;
}

.ranking-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #33691e;
  font-size: 14px;
}

.ranking-title .el-icon {
  color: #67C23A;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}

.ranking-list::-webkit-scrollbar {
  width: 6px;
}

.ranking-list::-webkit-scrollbar-thumb {
  background: rgba(103, 194, 58, 0.35);
  border-radius: 3px;
}

.ranking-list::-webkit-scrollbar-track {
  background: transparent;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-radius: 10px;
  transition: background-color 0.2s ease;
}

.ranking-item:hover {
  background-color: rgba(103, 194, 58, 0.08);
}

.ranking-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(103, 194, 58, 0.12);
  color: #33691e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
}

.ranking-index.top-three {
  background: linear-gradient(135deg, #8bc34a, #43a047);
  color: #fff;
}

.ranking-avatar {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.18);
}

.ranking-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ranking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}

.ranking-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  flex: 0 1 auto;
}

.ranking-group {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.1;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.ranking-group.group-undergrad {
  background: rgba(103, 194, 58, 0.16);
  color: #2c7a25;
  border-color: rgba(103, 194, 58, 0.32);
}

.ranking-group.group-master {
  background: rgba(64, 158, 255, 0.16);
  color: #1d5fd0;
  border-color: rgba(64, 158, 255, 0.28);
}

.ranking-group.group-phd {
  background: rgba(255, 193, 7, 0.16);
  color: #b26b00;
  border-color: rgba(255, 193, 7, 0.3);
}

.ranking-group.group-teacher {
  background: rgba(245, 108, 108, 0.16);
  color: #b72828;
  border-color: rgba(245, 108, 108, 0.3);
}

.ranking-group.group-unassigned {
  background: rgba(144, 147, 153, 0.16);
  color: #5f6368;
  border-color: rgba(144, 147, 153, 0.26);
}

.ranking-metric {
  font-size: 12px;
  color: #62757f;
}

.ranking-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ranking-divider {
  color: rgba(98, 117, 127, 0.5);
}

.ranking-placeholder {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 16px 0 6px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.report-item {
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid rgba(103, 194, 58, 0.18);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 28px rgba(103, 194, 58, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes containerFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.embedded-mode {
  min-height: auto;
  background: transparent;
  border-radius: inherit;
  overflow: hidden; /* 避免内部背景在圆角外可见 */
}

/* 嵌入模式：承载多张服务器卡片的父容器背景与内边距统一透明/收紧 */
.embedded-mode .el-main,
.embedded-mode .main-content,
.embedded-mode .servers-grid {
  background: #ffffff !important; /* 统一为白色，覆盖灰色底 */
}
.embedded-mode .main-content {
  padding: 0;
  margin: 0;
}

.embedded-content {
  padding: 20px;
  background: transparent;
}

.embedded-mode .servers-grid {
  grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
}

/* 嵌入模式下进一步收紧网格与隐藏溢出，避免出现横向滚动条 */
.embedded-mode .servers-grid {
  gap: 12px;
  overflow: hidden;
}

/* 统一的头部样式 */
.el-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(64, 158, 255, 0.08) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0;
  height: 70px !important;
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  position: relative;
  padding: 0 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  animation: slideInLeft 0.6s ease-out;
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

.header-logo {
  height: 48px;
  width: auto;
  transition: all 0.3s ease;
}

.header-logo:hover {
  transform: scale(1.05);
}

.header-title {
  margin: 0;
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  font-size: 26px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: -0.5px;
}

.nav-menu {
  display: flex;
  gap: 25px;
  height: 100%;
  align-items: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  animation: slideInDown 0.6s ease-out 0.2s both;
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 50px;
  border-radius: 25px;
  text-decoration: none;
  color: #606266;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.1), transparent);
  transition: left 0.5s;
}

.nav-item:hover::before {
  left: 100%;
}

.nav-item:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
}

.nav-item.active {
  color: #409EFF;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(64, 158, 255, 0.05) 100%);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  font-weight: 600;
}

.nav-item .el-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.nav-item:hover .el-icon {
  transform: scale(1.1);
}

.user-info {
  display: flex;
  align-items: center;
  height: 100%;
  animation: slideInRight 0.6s ease-out 0.4s both;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  height: 50px;
  padding: 0 20px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #606266;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.user-dropdown-link:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
  color: #409EFF;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  color: white;
  font-weight: 600;
}

.el-main {
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecf3 100%);
  min-height: calc(100vh - 70px);
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
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

/* 嵌入模式下的空态/加载块缩小内边距与外边距，避免撑开父卡片 */
.embedded-mode .loading-container,
.embedded-mode .error-container,
.embedded-mode .empty-container {
  padding: 20px 12px;
  margin: 10px 0;
  background: transparent;
  border-width: 1px;
}

/* 嵌入模式下移除主区域的背景和最小高度，避免父卡片内巨幅留白 */
.embedded-mode .el-main {
  padding: 0;
  background: transparent;
  min-height: auto;
}

/* 明确覆盖承载多卡片的这一层灰色背景（Element Plus 的 el-main） */
.embedded-main {
  background: transparent !important;
  padding: 0 !important;
  min-height: auto !important;
}

/* 嵌入模式下弱化容器布局，避免flex与高度规则带来的多余留白 */
.embedded-mode :deep(.el-container) {
  display: block;
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

.refresh-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  gap: 30px;
  animation: fadeInUp 0.8s ease-out 0.5s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.server-card {
  margin-bottom: 0;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.server-card * {
  position: relative;
  z-index: 1;
}

.offline-server .server-card * {
  z-index: 1;
}

.server-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

/* 嵌入模式下关闭卡片悬停放大，防止产生横向滚动条 */
.embedded-mode .server-card:hover {
  transform: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.offline-server {
  opacity: 0.7;
  position: relative;
  filter: grayscale(70%);
}

.offline-server::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 1;
}

.offline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(40, 40, 40, 0.8) 100%);
  z-index: 9999;
  backdrop-filter: blur(2px);
  border-radius: 16px;
  pointer-events: auto;
}

.offline-message {
  text-align: center;
  color: white;
  padding: 50px 60px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(220, 38, 127, 0.4) 0%, rgba(244, 67, 54, 0.4) 100%);
  border: 2px solid rgba(244, 67, 54, 0.5);
  box-shadow: 0 12px 40px rgba(244, 67, 54, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
  width: 85%;
  max-width: 450px;
  animation: pulseGlow 2s infinite ease-in-out;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 12px 40px rgba(244, 67, 54, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
  50% { box-shadow: 0 16px 50px rgba(244, 67, 54, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
}

.offline-icon {
  font-size: 72px;
  margin-bottom: 20px;
  animation: pulse-slow 1.5s infinite;
  text-shadow: 0 0 25px rgba(244, 67, 54, 0.9);
  filter: drop-shadow(0 0 10px rgba(244, 67, 54, 0.6));
}

.offline-server-name {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #ffffff;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
  opacity: 0.95;
}

.offline-text {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #ff4444;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 1px;
}

.offline-time {
  font-size: 18px;
  color: #ffffff;
  font-weight: 500;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  opacity: 0.9;
}

.time-debug {
  margin-top: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.debug-item {
  font-size: 12px;
  color: #ffffff;
  margin: 3px 0;
  font-family: 'Courier New', monospace;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

@keyframes pulse-slow {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.server-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.server-title h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.server-system-info {
  display: flex;
  gap: 15px;
  color: #606266;
  font-size: 14px;
}

.server-monitoring {
  margin-top: 15px;
}

.monitor-section {
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.monitor-section:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #409EFF;
  padding: 4px 0;
  border-bottom: 1px solid #f0f2f5;
}

.stat-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.stat-row .stat-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-row .el-progress {
  margin-bottom: 2px;
}

.stat-row .el-progress__text {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #303133 !important;
}

.stat-label {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
  color: #409EFF;
}

.gpu-item,
.container-item,
.network-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.3s ease;
  padding: 10px;
  border-radius: 6px;
}

.gpu-item:hover,
.container-item:hover,
.network-item:hover {
  background-color: rgba(64, 158, 255, 0.05);
}

.gpu-item:last-child,
.container-item:last-child,
.network-item:last-child {
  border-bottom: none;
}

/* GPU样式 */
.gpu-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.gpu-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.gpu-model {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.gpu-id {
  font-size: 11px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.container-name,
.interface-name {
  font-weight: 500;
  margin-bottom: 5px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-id-tag {
  font-size: 11px;
  height: 20px;
  line-height: 18px;
  padding: 0 5px;
  margin-left: 5px;
}

.container-count {
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}

.container-stats,
.network-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
}

/* Docker容器行样式 */
.container-row {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.container-row:last-child {
  border-bottom: none;
}

.container-row .container-name {
  width: 100px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  margin-bottom: 0;
}

.container-name-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}


.network-info {
  margin-bottom: 12px;
}

.network-cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.network-card {
  flex: 1;
  min-width: 120px;
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.network-card:hover {
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.network-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.network-content {
  flex: 1;
  min-width: 0;
}

.network-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
  font-weight: 500;
}

.network-value {
  font-size: 13px;
  color: #303133;
  font-weight: 600;
  word-break: break-all;
  line-height: 1.3;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .network-cards {
    flex-direction: column;
    gap: 6px;
  }

  .network-card {
    min-width: auto;
  }
}

.container-network-table {
  margin-top: 8px;
}

/* 容器总览卡片样式 */
.container-summary-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-card {
  flex: 1;
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.summary-icon {
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.summary-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
}

.metric-value {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.upload-value, .upload-rate {
  color: #409EFF;
}

.download-value, .download-rate {
  color: #E6A23C;
}

.read-value, .read-rate {
  color: #409EFF;
}

.write-value, .write-rate {
  color: #E6A23C;
}

/* 磁盘卡片样式 */
.disk-card {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.disk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.disk-icon {
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.disk-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.disk-percent {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
}

.disk-progress {
  margin-bottom: 6px;
}

.disk-usage {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.disk-usage .used {
  color: #303133;
  font-weight: 600;
}

.disk-usage .total {
  color: #909399;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container-summary-cards {
    flex-direction: column;
    gap: 8px;
  }
}

.value-upload {
  color: #E6A23C;
}

.value-download {
  color: #409EFF;
}

.value-read {
  color: #409EFF;
}

.value-write {
  color: #E6A23C;
}

.container-network-table .section-subtitle {
  margin-bottom: 6px;
}

.container-name-cell .el-icon {
  color: #409EFF;
}



.traffic-double {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.traffic-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  font-size: 11px;
  color: #969696;
  line-height: 1.2;
}

.traffic-row--current {
  color: #303133;
}

.traffic-row--muted {
  color: #8c8c8c;
}

.traffic-row--current .traffic-value {
  color: #303133 !important;
}

.traffic-cell {
  display: flex;
  align-items: center;
  gap: 2px;
}

.traffic-cell--down {
  margin-left: auto;
  justify-content: flex-end;
}

.traffic-tag {
  font-size: 11px;
  color: inherit;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.traffic-value {
  font-size: 11px;
  font-weight: 400;
  color: inherit;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.traffic-value--muted {
  color: #8c8c8c;
}

.traffic-value--upload,
.traffic-value--download,
.traffic-value--read,
.traffic-value--write {
  color: inherit;
}

.traffic-icon {
  font-size: 13px;
}

.traffic-icon--upload,
.traffic-icon--read {
  color: #409EFF;
}

.traffic-icon--download,
.traffic-icon--write {
  color: #E6A23C;
}

.metric-progress {
  width: 100%;
}

.metric-progress .el-progress__text {
  min-width: 56px;
  text-align: center;
  font-weight: 500;
  color: #303133;
}

.metric-progress--cpu .el-progress__text {
  text-align: right;
}

.container-row .container-stats {
  display: flex;
  flex: 1;
  gap: 5px;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.container-row .stat-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 0;
  flex: 1;
}

.container-row .stat-row:nth-child(3) {
  flex: 1.2;
}

.container-row .stat-label {
  width: 60px;
  margin-bottom: 0;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  color: #409EFF;
}

.no-data {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 30px 0;
  background-color: rgba(144, 147, 153, 0.05);
  border-radius: 8px;
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.no-data::before {
  content: '📊';
  font-size: 24px;
  margin-bottom: 10px;
  opacity: 0.7;
}

.no-data-small {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding: 8px 0;
  background-color: rgba(144, 147, 153, 0.05);
  border-radius: 6px;
  margin: 5px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.no-data-small::before {
  content: '•';
  font-size: 16px;
  opacity: 0.7;
}

.section-subtitle {
  font-weight: 600;
  margin: 12px 0 8px 0;
  font-size: 13px;
  color: #409EFF;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border-bottom: 1px solid #f0f2f5;
}

.section-subtitle .el-icon {
  font-size: 14px;
  color: #409EFF;
}

.disk-info {
  margin-bottom: 10px;
}

.disk-item {
  margin-bottom: 8px;
}

.disk-label {
  font-weight: 500;
  margin-bottom: 5px;
  font-size: 13px;
}

.model-text {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

/* CPU信息样式 */
.cpu-specs {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
  margin: 12px 0;
}

.cpu-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.cpu-model {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.3;
}

.cpu-arch {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.cpu-metrics {
  display: flex;
  gap: 20px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.metric-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
  font-weight: 500;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.main-value {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.sub-value {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cpu-metrics {
    flex-direction: column;
    gap: 12px;
  }

  .cpu-specs {
    padding: 12px;
  }
}

.process-table {
  margin-top: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.process-table .el-table__header th {
  background-color: rgba(64, 158, 255, 0.08);
  color: #409EFF;
}

.process-table .el-table__row:hover > td {
  background-color: rgba(64, 158, 255, 0.05) !important;
}

/* 通用表格样式 */
.custom-table {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.custom-table .el-table__row:hover > td {
  background-color: rgba(64, 158, 255, 0.04) !important;
}

.custom-table .el-table__body tr.el-table__row--striped td {
  background-color: #fafbfc;
}

.custom-table .el-table__body tr.el-table__row--striped:hover td {
  background-color: rgba(64, 158, 255, 0.04) !important;
}

/* 表格徽章样式 */
.table-badge {
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.table-badge.gpu-usage {
  background: #fef0e6;
  color: #e6a23c;
}

.info-value {
  font-weight: 500;
  color: #303133;
}

.server-loading {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .server-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .server-system-info {
    flex-direction: column;
    gap: 5px;
  }
  
  .server-actions {
    margin-top: 10px;
    align-self: flex-end;
  }

  .global-gauge-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .global-metrics-card {
    padding: 16px;
  }

  .report-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .process-report-card {
    padding: 16px;
  }

  .process-report-body {
    flex-direction: column;
  }

  .process-report-ranking {
    width: 100%;
    margin-top: 0;
    min-height: auto;
  }

  .ranking-list {
    max-height: none;
  }
}
</style>
