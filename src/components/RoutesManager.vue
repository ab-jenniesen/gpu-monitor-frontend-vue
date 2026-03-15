<template>
  <div class="routes-manager">
    <el-card shadow="hover" class="routes-card">
      <template #header>
        <div class="card-header">
          <div>
            <h3>路由配置</h3>
            <span class="subtitle">维护路由域名及管理信息，安装代理时自动下发</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              <span>新增路由</span>
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="routesLoading" class="loading-container">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="routes.length === 0" class="empty-container">
        <el-empty description="暂无路由配置">
          <el-button type="primary" @click="showAddDialog">新增路由</el-button>
        </el-empty>
      </div>

      <div v-else>
        <el-table :data="routes" style="width: 100%" border>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="domain" label="路由域名" min-width="200" />
          <el-table-column prop="router_mgmt_ip" label="管理IP" min-width="160">
            <template #default="scope">
              <template v-if="scope.row.router_mgmt_ip">
                <el-link
                  :href="formatExternalUrl(scope.row.router_mgmt_ip)"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ scope.row.router_mgmt_ip }}
                </el-link>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="ddns_url" label="DDNS地址" min-width="200">
            <template #default="scope">
              <template v-if="scope.row.ddns_url">
                <el-link
                  :href="formatExternalUrl(scope.row.ddns_url)"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ scope.row.ddns_url }}
                </el-link>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="gateway_ip" label="网关IP" min-width="140">
            <template #default="scope">{{ scope.row.gateway_ip || '-' }}</template>
          </el-table-column>
          <el-table-column prop="cidr" label="CIDR" min-width="140">
            <template #default="scope">{{ scope.row.cidr || '-' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="220">
            <template #default="scope">{{ scope.row.description || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.is_active ? 'success' : 'info'">
                {{ scope.row.is_active ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button type="primary" size="small" circle @click="showEditDialog(scope.row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" circle @click="confirmDelete(scope.row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑路由' : '新增路由'" width="520px" append-to-body>
      <el-form :model="routeForm" :rules="routeRules" ref="routeFormRef" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="routeForm.name" placeholder="例如：办公室路由" />
        </el-form-item>
        <el-form-item label="CIDR">
          <el-input v-model="routeForm.cidr" placeholder="例如：192.168.1.0/24" />
        </el-form-item>
        <el-form-item label="路由域名" prop="domain">
          <el-input v-model="routeForm.domain" placeholder="例如：office.example.com" />
        </el-form-item>
        <el-form-item label="管理IP">
          <el-input v-model="routeForm.router_mgmt_ip" placeholder="例如：192.168.1.1" />
        </el-form-item>
        <el-form-item label="DDNS地址">
          <el-input v-model="routeForm.ddns_url" placeholder="例如：https://router.example.com" />
        </el-form-item>
        <el-form-item label="网关IP">
          <el-input v-model="routeForm.gateway_ip" placeholder="例如：192.168.1.1" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="routeForm.description" type="textarea" :rows="3" placeholder="备注信息" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="routeForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitRoute">
            {{ isEditing ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { useServersStore } from '../stores/servers'

const serversStore = useServersStore()

const dialogVisible = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const currentRouteId = ref(null)
const routeFormRef = ref(null)

const routeForm = reactive({
  name: '',
  cidr: '',
  domain: '',
  gateway_ip: '',
  description: '',
  router_mgmt_ip: '',
  ddns_url: '',
  is_active: true
})

const routeRules = {
  name: [{ required: true, message: '请输入路由名称', trigger: 'blur' }],
  domain: [{ required: true, message: '请输入路由域名', trigger: 'blur' }]
}

const routes = computed(() => serversStore.routes || [])
const routesLoading = computed(() => serversStore.routesLoading)

const formatExternalUrl = (value) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `http://${trimmed}`
}

const resetForm = () => {
  routeForm.name = ''
  routeForm.cidr = ''
  routeForm.domain = ''
  routeForm.gateway_ip = ''
  routeForm.description = ''
  routeForm.router_mgmt_ip = ''
  routeForm.ddns_url = ''
  routeForm.is_active = true
  currentRouteId.value = null
  if (routeFormRef.value) routeFormRef.value.clearValidate()
}

const showAddDialog = () => {
  resetForm()
  isEditing.value = false
  dialogVisible.value = true
}

const showEditDialog = (route) => {
  resetForm()
  isEditing.value = true
  currentRouteId.value = route.id
  routeForm.name = route.name
  routeForm.cidr = route.cidr || ''
  routeForm.domain = route.domain
  routeForm.gateway_ip = route.gateway_ip || ''
  routeForm.description = route.description || ''
  routeForm.router_mgmt_ip = route.router_mgmt_ip || ''
  routeForm.ddns_url = route.ddns_url || ''
  routeForm.is_active = route.is_active
  dialogVisible.value = true
}

const submitRoute = () => {
  if (!routeFormRef.value) return
  routeFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const payload = {
        name: routeForm.name,
        cidr: routeForm.cidr,
        domain: routeForm.domain,
        gateway_ip: routeForm.gateway_ip,
        description: routeForm.description,
        router_mgmt_ip: routeForm.router_mgmt_ip,
        ddns_url: routeForm.ddns_url,
        is_active: routeForm.is_active
      }
      if (isEditing.value && currentRouteId.value !== null) {
        await serversStore.updateRoute(currentRouteId.value, payload)
        ElMessage.success('路由更新成功')
      } else {
        await serversStore.createRoute(payload)
        ElMessage.success('路由创建成功')
      }
      dialogVisible.value = false
    } catch (error) {
      // 错误已在 store 中处理并抛出
    } finally {
      submitting.value = false
    }
  })
}

const confirmDelete = (route) => {
  ElMessageBox.confirm(
    `确定要删除路由 "${route.name}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await serversStore.deleteRoute(route.id)
      ElMessage.success('路由已删除')
    } catch (error) {
      // 错误提示已在 store 中处理
    }
  }).catch(() => {})
}

onMounted(() => {
  serversStore.fetchRoutes()
})
</script>

<style scoped>
.routes-manager {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subtitle {
  color: #909399;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
