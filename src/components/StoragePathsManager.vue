<template>
  <div class="storage-paths-manager">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <h3>存储路径管理</h3>
            <span class="subtitle">管理服务器的存储路径，用于Docker容器挂载</span>
          </div>
          <div class="header-actions">
            <el-button type="info" size="small" @click="openPartitionsDialog" :loading="partitionsLoading">
              <el-icon><FolderOpened /></el-icon>
              <span>查看磁盘分区</span>
            </el-button>
            <el-button type="primary" size="small" @click="detectStoragePaths" :loading="detecting">
              <el-icon><Search /></el-icon>
              <span>检测存储路径</span>
            </el-button>
            <el-button type="success" size="small" @click="showAddPathDialog">
              <el-icon><Plus /></el-icon>
              <span>添加路径</span>
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="storagePaths.length === 0" class="empty-container">
        <el-empty description="暂无存储路径">
          <el-button type="primary" @click="detectStoragePaths">检测存储路径</el-button>
        </el-empty>
      </div>
      
      <div v-else class="paths-list">
        <el-table :data="storagePaths" style="width: 100%" border>
          <el-table-column prop="path" label="路径" min-width="180" />
          <el-table-column prop="description" label="描述" min-width="200" />
          <el-table-column label="类型" width="200">
            <template #default="scope">
              <el-tag :type="scope.row.is_system ? 'warning' : 'success'">
                {{ scope.row.is_system ? '系统路径' : '自定义路径' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                @click="showEditPathDialog(scope.row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle 
                @click="confirmDeletePath(scope.row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    
    <!-- 添加/编辑路径对话框 -->
    <el-dialog
      v-model="pathDialogVisible"
      :title="isEditing ? '编辑存储路径' : '添加存储路径'"
      width="500px"
    >
      <el-form :model="pathForm" label-width="100px" :rules="pathRules" ref="pathFormRef">
        <el-form-item label="路径" prop="path">
          <el-input v-model="pathForm.path" placeholder="请输入存储路径，例如: /data" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="pathForm.description" placeholder="请输入路径描述" />
        </el-form-item>
        <el-form-item label="系统路径">
          <el-switch v-model="pathForm.is_system" />
          <div class="form-tip">系统路径通常由系统自动检测，不能被删除</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="pathDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPathForm" :loading="submitting">
            {{ isEditing ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 检测到的路径选择对话框 -->
    <el-dialog
      v-model="detectDialogVisible"
      title="检测到的存储路径"
      width="700px"
    >
      <div v-if="detecting" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="detectedPaths.length === 0" class="empty-container">
        <el-empty description="未检测到存储路径" />
      </div>
      
      <div v-else>
        <p>选择要添加的存储路径：</p>
        <el-table :data="detectedPaths" style="width: 100%" border @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" />
          <el-table-column prop="path" label="路径" min-width="150" />
          <el-table-column prop="device" label="设备" min-width="100" />
          <el-table-column prop="size" label="大小" width="80" />
          <el-table-column prop="use_percent" label="使用率" width="80" />
          <el-table-column prop="description" label="描述" min-width="150" />
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                @click="showEditPathDialog(scope.row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle 
                @click="confirmDeletePath(scope.row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addSelectedPaths" :loading="submitting" :disabled="selectedPaths.length === 0">
            添加选中路径
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 磁盘分区信息 -->
    <el-dialog
      v-model="partitionsDialogVisible"
      title="磁盘分区信息"
      width="75%"
      @closed="resetPartitions"
    >
      <div v-if="partitionsLoading" class="loading-container">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else>
        <el-empty v-if="partitions.length === 0" description="未获取到分区信息" />
        <el-table v-else :data="partitions" style="width: 100%" border size="small">
          <el-table-column prop="device" label="设备" min-width="120" />
          <el-table-column prop="type" label="类型" width="60">
            <template #default="scope">
              <el-tag size="small" type="info">{{ scope.row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="brand" label="品牌" min-width="200">
            <template #default="scope">
              {{ scope.row.brand || scope.row.model || scope.row.vendor || '未知' }}
            </template>
          </el-table-column>
          <el-table-column prop="size" label="容量" width="65" />
          <el-table-column prop="fstype" label="文件系统" width="70">
            <template #default="scope">
              {{ scope.row.fstype || '未知' }}
            </template>
          </el-table-column>
          <el-table-column prop="mountpoint" label="挂载点" min-width="250">
            <template #default="scope">
              <span v-if="scope.row.mountpoint">{{ scope.row.mountpoint }}</span>
              <span v-else class="unmounted-text">未挂载</span>
            </template>
          </el-table-column>
          <el-table-column prop="uuid" label="UUID" min-width="200">
            <template #default="scope">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span v-if="scope.row.uuid" style="font-family: monospace; font-size: 12px;">{{ scope.row.uuid }}</span>
                <span v-else class="unmounted-text">无UUID</span>
                <el-button
                  v-if="scope.row.uuid"
                  type="primary"
                  size="small"
                  circle
                  @click="copyUUID(scope.row.uuid)"
                  title="复制UUID"
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="serial" label="序列号" min-width="140">
            <template #default="scope">
              {{ scope.row.serial || '未知' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag
                :type="scope.row.mounted ? 'success' : 'warning'"
                size="small"
              >
                {{ scope.row.mounted ? '已挂载' : '未挂载' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <!-- 未分区的磁盘显示创建分区按钮 -->
              <el-button
                v-if="scope.row.type === 'disk' && !scope.row.fstype && canCreatePartition(scope.row)"
                type="primary"
                size="small"
                @click="confirmCreatePartition(scope.row)"
                :loading="creatingPartitions[scope.row.device]"
              >
                创建分区
              </el-button>

              <!-- 未挂载分区显示挂载按钮 -->
              <el-button
                v-else-if="!scope.row.mounted && scope.row.uuid && scope.row.fstype && scope.row.fstype !== '未知'"
                type="success"
                size="small"
                @click="showMountDialog(scope.row)"
                :loading="mountingPartitions[scope.row.uuid]"
              >
                自动挂载
              </el-button>

              <!-- 已挂载的非系统分区显示卸载按钮 -->
              <el-button
                v-else-if="scope.row.mounted && scope.row.uuid && canUnmount(scope.row)"
                type="warning"
                size="small"
                @click="confirmUnmount(scope.row)"
                :loading="unmountingPartitions[scope.row.uuid]"
              >
                卸载
              </el-button>

              <!-- 已挂载的系统分区显示状态 -->
              <span v-else-if="scope.row.mounted" class="mounted-text">已挂载</span>

              <!-- 无法操作的分区 -->
              <span v-else class="cannot-mount-text">无法挂载</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="partitionsDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 自动挂载对话框 -->
    <el-dialog
      v-model="mountDialogVisible"
      title="自动挂载分区"
      width="500px"
    >
      <div v-if="selectedPartition">
        <div class="mount-info">
          <h4>分区信息</h4>
          <p><strong>设备:</strong> {{ selectedPartition.device }}</p>
          <p><strong>文件系统:</strong> {{ selectedPartition.fstype }}</p>
          <p><strong>容量:</strong> {{ selectedPartition.size }}</p>
          <p><strong>UUID:</strong> <code>{{ selectedPartition.uuid }}</code></p>
        </div>

        <el-form :model="mountForm" label-width="100px" :rules="mountRules" ref="mountFormRef">
          <el-form-item label="基础路径" prop="basePath">
            <el-input
              v-model="mountForm.basePath"
              placeholder="例如: ~/Workspace/disk 或 /mnt"
              clearable
            />
            <div class="form-tip">挂载基础目录，可自定义修改</div>
          </el-form-item>
          <el-form-item label="目录名称" prop="diskName">
            <el-input
              v-model="mountForm.diskName"
              placeholder="请输入磁盘目录名称，例如: mydrive"
              clearable
            />
            <div class="form-tip">
              完整路径: {{ getFullMountPath() }}
            </div>
          </el-form-item>
        </el-form>

        <div class="warning-text">
          <el-icon><Warning /></el-icon>
          <span>此操作将修改 /etc/fstab 文件，实现开机自动挂载</span>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="mountDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="mountPartition"
            :loading="mountingPartition"
          >
            确认挂载
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, defineEmits, h } from 'vue'
import { useServersStore } from '../stores/servers'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, FolderOpened, DocumentCopy, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  serverId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['update'])

const serversStore = useServersStore()
const loading = ref(false)
const detecting = ref(false)
const partitionsLoading = ref(false)
const submitting = ref(false)
const storagePaths = ref([])
const detectedPaths = ref([])
const partitions = ref([])
const selectedPaths = ref([])
const pathDialogVisible = ref(false)
const detectDialogVisible = ref(false)
const partitionsDialogVisible = ref(false)
const mountDialogVisible = ref(false)
const isEditing = ref(false)
const currentPathId = ref(null)
const selectedPartition = ref(null)
const mountingPartition = ref(false)
const mountingPartitions = ref({})
const unmountingPartitions = ref({})
const creatingPartitions = ref({})

const pathFormRef = ref(null)
const mountFormRef = ref(null)
const pathForm = ref({
  path: '',
  description: '',
  is_system: false
})

const mountForm = ref({
  basePath: '',
  diskName: ''
})

const pathRules = {
  path: [
    { required: true, message: '请输入存储路径', trigger: 'blur' },
    { min: 1, message: '路径不能为空', trigger: 'blur' }
  ],
  description: [
    { max: 100, message: '描述不能超过100个字符', trigger: 'blur' }
  ]
}

const mountRules = {
  basePath: [
    { required: true, message: '请输入基础路径', trigger: 'blur' },
    {
      pattern: /^(\/[a-zA-Z0-9_\-\/]*|~\/[a-zA-Z0-9_\-\/]*)$/,
      message: '请输入有效的路径格式，如 /mnt 或 ~/Workspace/disk',
      trigger: 'blur'
    }
  ],
  diskName: [
    { required: true, message: '请输入目录名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\-]+$/, message: '目录名称只能包含字母、数字、下划线和横线', trigger: 'blur' },
    { min: 1, max: 50, message: '目录名称长度在1-50个字符之间', trigger: 'blur' }
  ]
}

// 获取存储路径列表
const fetchStoragePaths = async () => {
  loading.value = true
  try {
    storagePaths.value = await serversStore.fetchServerStoragePaths(props.serverId)
  } catch (error) {
    ElMessage.error('获取存储路径失败')
  } finally {
    loading.value = false
  }
}

// 检测服务器存储路径
const detectStoragePaths = async () => {
  detecting.value = true
  try {
    detectedPaths.value = await serversStore.detectServerStoragePaths(props.serverId)
    detectDialogVisible.value = true
    
    // 过滤掉已存在的路径
    const existingPaths = storagePaths.value.map(p => p.path)
    detectedPaths.value = detectedPaths.value.filter(p => !existingPaths.includes(p.path))
  } catch (error) {
    ElMessage.error('检测存储路径失败')
  } finally {
    detecting.value = false
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedPaths.value = selection
}

// 获取磁盘分区信息
const openPartitionsDialog = async () => {
  partitionsDialogVisible.value = true
  partitionsLoading.value = true
  try {
    partitions.value = await serversStore.fetchServerDiskPartitions(props.serverId)
  } catch (error) {
    partitionsDialogVisible.value = false
    ElMessage.error('获取分区信息失败')
  } finally {
    partitionsLoading.value = false
  }
}

const resetPartitions = () => {
  partitions.value = []
  partitionsLoading.value = false
}

// 复制UUID到剪贴板
const copyUUID = async (uuid) => {
  try {
    await navigator.clipboard.writeText(uuid)
    ElMessage.success('UUID已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 获取完整挂载路径（用于预览）
const getFullMountPath = () => {
  const basePath = (mountForm.value.basePath || '~/Workspace/disk').replace(/\/+$/, '')
  const diskName = (mountForm.value.diskName || '目录名称').replace(/^\/+/, '')
  return `${basePath}/${diskName}`
}

// 显示挂载对话框
const showMountDialog = (partition) => {
  selectedPartition.value = partition

  // 生成默认挂载路径，优先使用品牌名称
  let defaultName = 'mydrive'

  if (partition.brand && partition.brand !== '未知') {
    // 使用品牌名称，去除空格和特殊字符，空格替换为下划线
    defaultName = partition.brand
      .trim()
      .replace(/\s+/g, '_')  // 空格替换为下划线
      .replace(/[^a-zA-Z0-9_-]/g, '')  // 移除其他特殊字符
      .toLowerCase()  // 转为小写
  } else if (partition.model && partition.model !== '未知') {
    // 备选：使用型号名称
    defaultName = partition.model
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
  } else if (partition.name) {
    // 最后备选：使用分区名
    defaultName = partition.name.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  // 如果处理后为空，使用默认名称
  if (!defaultName) {
    defaultName = 'mydrive'
  }

  // 生成默认值
  mountForm.value.basePath = '~/Workspace/disk'
  mountForm.value.diskName = defaultName
  mountDialogVisible.value = true
}

// 挂载分区
const mountPartition = async () => {
  if (!mountFormRef.value) return

  await mountFormRef.value.validate(async (valid) => {
    if (!valid) return

    mountingPartition.value = true
    mountingPartitions.value[selectedPartition.value.uuid] = true

    try {
      // 组合基础路径和目录名，处理多余的斜杠
      const basePath = mountForm.value.basePath.replace(/\/+$/, '') // 去除末尾的斜杠
      const diskName = mountForm.value.diskName.replace(/^\/+/, '') // 去除开头的斜杠
      const mountPoint = `${basePath}/${diskName}`

      await serversStore.mountPartition(props.serverId, {
        uuid: selectedPartition.value.uuid,
        device: selectedPartition.value.device,
        fstype: selectedPartition.value.fstype,
        mountPoint: mountPoint
      })

      ElMessage.success('分区挂载成功')
      mountDialogVisible.value = false

      // 刷新分区信息
      await openPartitionsDialog()
    } catch (error) {
      ElMessage.error(error.response?.data?.msg || '挂载失败')
    } finally {
      mountingPartition.value = false
      delete mountingPartitions.value[selectedPartition.value.uuid]
    }
  })
}

// 判断分区是否可以卸载（只允许卸载用户家目录下的自定义挂载）
const canUnmount = (partition) => {
  if (!partition.mountpoint) return false

  // 禁止卸载swap分区
  if (partition.mountpoint === '[SWAP]' || partition.mountpoint.includes('[SWAP]')) {
    return false
  }

  // 系统关键路径不允许卸载
  const systemPaths = ['/', '/boot', '/etc', '/usr', '/var', '/sys', '/proc', '/dev', '/root', '/tmp', '/opt', '/bin', '/sbin', '/lib', '/lib64']

  // 检查是否是系统路径
  for (const systemPath of systemPaths) {
    if (partition.mountpoint === systemPath || partition.mountpoint.startsWith(systemPath + '/')) {
      // 特殊允许：用户家目录下的Workspace路径
      if (partition.mountpoint.startsWith('/home/') && partition.mountpoint.includes('/Workspace/')) {
        return true
      }
      return false
    }
  }

  return true
}

// 确认卸载分区
const confirmUnmount = (partition) => {
  ElMessageBox.confirm(
    `确定要卸载分区 "${partition.device}" 吗？`,
    '卸载确认',
    {
      confirmButtonText: '确定卸载',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'unmount-confirm-dialog',
      message: h('div', null, [
        h('p', null, `设备: ${partition.device}`),
        h('p', null, `挂载点: ${partition.mountpoint}`),
        h('p', { style: 'color: #e6a23c; margin-top: 10px;' }, '⚠️ 卸载后该分区将无法访问，直到重新挂载')
      ])
    }
  ).then(async () => {
    await unmountPartition(partition)
  }).catch(() => {})
}

// 卸载分区
const unmountPartition = async (partition) => {
  unmountingPartitions.value[partition.uuid] = true

  try {
    await serversStore.unmountPartition(props.serverId, {
      uuid: partition.uuid,
      mountPoint: partition.mountpoint
    })

    ElMessage.success('分区卸载成功')

    // 刷新分区信息
    await openPartitionsDialog()
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '卸载失败')
  } finally {
    delete unmountingPartitions.value[partition.uuid]
  }
}

// 判断磁盘是否可以创建分区（安全检查，防止操作系统盘）
const canCreatePartition = (disk) => {
  if (!disk.device) return false

  // 禁止操作系统盘
  const systemDevices = ['/dev/sda', '/dev/nvme0n1', '/dev/vda', '/dev/xvda']
  if (systemDevices.includes(disk.device)) {
    return false
  }

  return true
}

// 确认创建分区
const confirmCreatePartition = (disk) => {
  ElMessageBox.confirm(
    `确定要为磁盘 "${disk.device}" 创建分区并格式化为 ext4 吗？`,
    '创建分区确认',
    {
      confirmButtonText: '确定创建',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'create-partition-confirm-dialog',
      message: h('div', null, [
        h('p', null, `设备: ${disk.device}`),
        h('p', null, `容量: ${disk.size}`),
        h('p', null, `品牌: ${disk.brand || disk.model || disk.vendor || '未知'}`),
        h('p', { style: 'color: #e6a23c; margin-top: 10px;' }, '⚠️ 此操作将清除磁盘上的所有数据，并创建新的GPT分区表'),
        h('p', { style: 'color: #f56c6c; margin-top: 5px;' }, '🔥 操作不可逆，请确保已备份重要数据')
      ])
    }
  ).then(async () => {
    await createPartition(disk)
  }).catch(() => {})
}

// 创建分区并格式化
const createPartition = async (disk) => {
  creatingPartitions.value[disk.device] = true

  try {
    const result = await serversStore.createPartition(props.serverId, {
      device: disk.device
    })

    ElMessage.success(`分区创建成功！新分区UUID: ${result.uuid}`)

    // 刷新分区信息
    await openPartitionsDialog()
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '创建分区失败')
  } finally {
    delete creatingPartitions.value[disk.device]
  }
}

// 添加选中的路径
const addSelectedPaths = async () => {
  if (selectedPaths.value.length === 0) return
  
  submitting.value = true
  try {
    for (const path of selectedPaths.value) {
      await serversStore.addServerStoragePath(props.serverId, {
        path: path.path,
        description: path.description,
        is_system: path.is_system
      })
    }
    
    ElMessage.success(`成功添加 ${selectedPaths.value.length} 个存储路径`)
    detectDialogVisible.value = false
    await fetchStoragePaths()
    emit('update')
  } catch (error) {
    ElMessage.error('添加存储路径失败')
  } finally {
    submitting.value = false
  }
}

// 显示添加路径对话框
const showAddPathDialog = () => {
  isEditing.value = false
  currentPathId.value = null
  pathForm.value = {
    path: '',
    description: '',
    is_system: false
  }
  pathDialogVisible.value = true
}

// 显示编辑路径对话框
const showEditPathDialog = (path) => {
  isEditing.value = true
  currentPathId.value = path.id
  pathForm.value = {
    path: path.path,
    description: path.description,
    is_system: path.is_system
  }
  pathDialogVisible.value = true
}

// 提交路径表单
const submitPathForm = async () => {
  if (!pathFormRef.value) return
  
  await pathFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEditing.value) {
        // 更新路径
        await serversStore.updateServerStoragePath(props.serverId, currentPathId.value, pathForm.value)
        ElMessage.success('存储路径更新成功')
      } else {
        // 添加路径
        await serversStore.addServerStoragePath(props.serverId, pathForm.value)
        ElMessage.success('存储路径添加成功')
      }
      
      pathDialogVisible.value = false
      await fetchStoragePaths()
      emit('update')
    } catch (error) {
      ElMessage.error(isEditing.value ? '更新存储路径失败' : '添加存储路径失败')
    } finally {
      submitting.value = false
    }
  })
}

// 确认删除路径
const confirmDeletePath = (path) => {
  ElMessageBox.confirm(
    `确定要删除存储路径 "${path.path}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await serversStore.deleteServerStoragePath(props.serverId, path.id)
      ElMessage.success('存储路径删除成功')
      await fetchStoragePaths()
      emit('update')
    } catch (error) {
      ElMessage.error('删除存储路径失败')
    }
  }).catch(() => {})
}

// 组件挂载时获取存储路径列表
onMounted(() => {
  fetchStoragePaths()
})
</script>

<style scoped>
.storage-paths-manager {
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
  flex-wrap: wrap;
}

.unmounted-text {
  color: #909399;
}

.loading-container,
.empty-container {
  padding: 20px 0;
  text-align: center;
}

.paths-list {
  margin-top: 10px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.mount-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.mount-info h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.mount-info p {
  margin: 5px 0;
  color: #606266;
}

.mount-info code {
  background: #e4e7ed;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
}

.mounted-text {
  color: #67c23a;
  font-size: 12px;
}

.cannot-mount-text {
  color: #909399;
  font-size: 12px;
}
</style>
