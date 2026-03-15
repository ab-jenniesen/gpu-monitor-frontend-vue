<template>
  <div class="port-ranges-manager">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <h3>端口范围管理</h3>
            <span class="subtitle">管理服务器的端口范围，用于Docker容器端口映射</span>
          </div>
          <div class="header-actions">
            <el-button type="success" size="small" @click="showAddRangeDialog">
              <el-icon><Plus /></el-icon>
              <span>添加端口范围</span>
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="portRanges.length === 0" class="empty-container">
        <el-empty description="暂无端口范围">
          <el-button type="primary" @click="fetchPortRanges">刷新</el-button>
        </el-empty>
      </div>
      
      <div v-else class="ranges-list">
        <el-table :data="portRanges" style="width: 100%" border>
          <el-table-column label="端口范围" min-width="150">
            <template #default="scope">
              {{ scope.row.start_port }} - {{ scope.row.end_port }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" />
          <el-table-column label="端口数量" width="100">
            <template #default="scope">
              {{ scope.row.end_port - scope.row.start_port + 1 }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                @click="showEditRangeDialog(scope.row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle 
                @click="confirmDeleteRange(scope.row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    
    <!-- 添加/编辑端口范围对话框 -->
    <el-dialog
      v-model="rangeDialogVisible"
      :title="isEditing ? '编辑端口范围' : '添加端口范围'"
      width="500px"
    >
      <el-form :model="rangeForm" label-width="100px" :rules="rangeRules" ref="rangeFormRef">
        <el-form-item label="起始端口" prop="start_port">
          <el-input-number v-model="rangeForm.start_port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="结束端口" prop="end_port">
          <el-input-number v-model="rangeForm.end_port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="rangeForm.description" placeholder="请输入端口范围描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="rangeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRangeForm" :loading="submitting">
            {{ isEditing ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, defineEmits } from 'vue'
import { useServersStore } from '../stores/servers'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  serverId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['update'])

const serversStore = useServersStore()
const loading = ref(false)
const submitting = ref(false)
const portRanges = ref([])
const rangeDialogVisible = ref(false)
const isEditing = ref(false)
const currentRangeId = ref(null)

const rangeFormRef = ref(null)
const rangeForm = ref({
  start_port: 5000,
  end_port: 6000,
  description: ''
})

const rangeRules = {
  start_port: [
    { required: true, message: '请输入起始端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围必须在1-65535之间', trigger: 'blur' }
  ],
  end_port: [
    { required: true, message: '请输入结束端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围必须在1-65535之间', trigger: 'blur' }
  ],
  description: [
    { max: 100, message: '描述不能超过100个字符', trigger: 'blur' }
  ]
}

// 获取端口范围列表
const fetchPortRanges = async () => {
  loading.value = true
  try {
    portRanges.value = await serversStore.fetchServerPortRanges(props.serverId)
  } catch (error) {
    ElMessage.error('获取端口范围失败')
  } finally {
    loading.value = false
  }
}

// 显示添加端口范围对话框
const showAddRangeDialog = () => {
  isEditing.value = false
  currentRangeId.value = null
  rangeForm.value = {
    start_port: 5000,
    end_port: 6000,
    description: ''
  }
  rangeDialogVisible.value = true
}

// 显示编辑端口范围对话框
const showEditRangeDialog = (range) => {
  isEditing.value = true
  currentRangeId.value = range.id
  rangeForm.value = {
    start_port: range.start_port,
    end_port: range.end_port,
    description: range.description
  }
  rangeDialogVisible.value = true
}

// 提交端口范围表单
const submitRangeForm = async () => {
  if (!rangeFormRef.value) return
  
  await rangeFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    // 检查起始端口是否小于结束端口
    if (rangeForm.value.start_port > rangeForm.value.end_port) {
      ElMessage.error('起始端口不能大于结束端口')
      return
    }
    
    submitting.value = true
    try {
      if (isEditing.value) {
        // 更新端口范围
        await serversStore.updateServerPortRange(props.serverId, currentRangeId.value, rangeForm.value)
        ElMessage.success('端口范围更新成功')
      } else {
        // 添加端口范围
        await serversStore.addServerPortRange(props.serverId, rangeForm.value)
        ElMessage.success('端口范围添加成功')
      }
      
      rangeDialogVisible.value = false
      await fetchPortRanges()
      emit('update')
    } catch (error) {
      ElMessage.error(isEditing.value ? '更新端口范围失败' : '添加端口范围失败')
    } finally {
      submitting.value = false
    }
  })
}

// 确认删除端口范围
const confirmDeleteRange = (range) => {
  ElMessageBox.confirm(
    `确定要删除端口范围 "${range.start_port} - ${range.end_port}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await serversStore.deleteServerPortRange(props.serverId, range.id)
      ElMessage.success('端口范围删除成功')
      await fetchPortRanges()
      emit('update')
    } catch (error) {
      ElMessage.error('删除端口范围失败')
    }
  }).catch(() => {})
}

// 组件挂载时获取端口范围列表
onMounted(() => {
  fetchPortRanges()
})
</script>

<style scoped>
.port-ranges-manager {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: block;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-container,
.empty-container {
  padding: 20px 0;
  text-align: center;
}

.ranges-list {
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
