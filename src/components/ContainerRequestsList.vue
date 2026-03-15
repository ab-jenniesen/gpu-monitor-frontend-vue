<template>
  <div class="container-requests-list" v-loading="loading">
    <div class="requests-table-wrapper">
      <el-table
        :data="requests"
        style="width: 100%"
        border
        empty-text="暂无申请记录"
      >
          <!-- <el-table-column prop="id" label="申请ID" width="80" /> -->
          <el-table-column prop="server_name" label="服务器" min-width="90" />
          <el-table-column label="资源配置" min-width="80">
            <template #default="{ row }">
              <div class="resource-config">
                <div>CPU: {{ row.cpu_cores }} 核</div>
                <div>内存: {{ Math.round(row.memory_mb / 1024) }} GB</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="request_reason" label="申请理由" min-width="150" show-overflow-tooltip />
          <el-table-column label="状态" width="81">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="申请时间" min-width="130">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="处理时间" min-width="130">
            <template #default="{ row }">
              {{ row.status === 'pending' ? '-' : formatDate(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="处理人" min-width="70">
            <template #default="{ row }">
              {{ row.processed_by_username || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="管理员备注" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.admin_comment || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="75" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="canDelete(row.status)"
                type="danger"
                size="small"
                @click="deleteRequest(row)"
                :loading="row._deleting"
              >
                删除
              </el-button>
              <el-button
                v-if="row.status === 'approved'"
                type="success"
                size="small"
                @click="viewContainerInfo(row)"
              >
                查看容器
              </el-button>
            </template>
          </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '../utils/axios'

// 响应式数据
const loading = ref(false)
const requests = ref([])

// 已移除统计相关的计算属性

// 获取申请列表
const fetchRequests = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/container-requests?current_user_only=true')
    // 过滤掉已批准的申请，只显示待审批和已拒绝的
    requests.value = (response.data.requests || []).filter(req => req.status !== 'approved')
  } catch (error) {
    console.error('获取申请记录失败:', error)
    ElMessage.error('获取申请记录失败')
  } finally {
    loading.value = false
  }
}

// 删除申请记录
const deleteRequest = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除此申请记录？', '删除确认', {
      type: 'warning'
    })
    
    await axios.delete(`/api/container-requests/${row.id}`)
    ElMessage.success('删除成功')
    fetchRequests() // 刷新列表
  } catch (error) {
    // 用户取消删除
  }
}

// 查看容器信息
const viewContainerInfo = (request) => {
  ElMessage.info('请在"我的容器"页面查看已创建的容器')
}

// 判断是否可以删除
const canDelete = (status) => {
  return status === 'pending' || status === 'rejected'
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审批',
    'approved': '已批准',
    'rejected': '已拒绝'
  }
  return statusMap[status] || status
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 组件挂载
onMounted(() => {
  fetchRequests()
})

// 暴露方法给父组件
defineExpose({
  fetchRequests
})
</script>

<style scoped>
.container-requests-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.requests-table-wrapper {
  flex: 1;
  overflow: auto;
}

.resource-config {
  font-size: 13px;
  line-height: 1.4;
}


/* 移除自定义表格样式，使用Element Plus默认样式 */

</style>
