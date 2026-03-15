<template>
  <div class="container-manager">
    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="hover">
      <el-form :model="containerFilter" label-width="80px" class="filter-form">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="用户名">
              <el-input v-model="containerFilter.keyword" placeholder="搜索用户名" clearable @clear="handleContainerFilter" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="服务器">
              <el-select v-model="containerFilter.serverId" placeholder="全部服务器" clearable @clear="handleContainerFilter" style="width: 100%">
                <el-option v-for="srv in servers" :key="srv.id" :label="srv.name" :value="srv.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="状态">
              <el-select v-model="containerFilter.status" placeholder="全部状态" clearable @clear="handleContainerFilter" style="width: 100%">
                <el-option label="全部" value="" />
                <el-option label="运行中" value="running" />
                <el-option label="已停止" value="stopped" />
                <el-option label="创建中" value="creating" />
                <el-option label="错误" value="error" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="镜像">
              <el-select v-model="containerFilter.imageName" placeholder="全部镜像" clearable filterable @clear="handleContainerFilter" style="width: 100%">
                <el-option label="全部" value="" />
                <el-option v-for="img in distinctImages" :key="img" :label="img" :value="img" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8" :lg="12" class="filter-buttons">
            <el-button type="primary" @click="handleContainerFilter">
              <el-icon><Search /></el-icon>
              <span>搜索</span>
            </el-button>
            <el-button @click="resetContainerFilter">
              <el-icon><RefreshRight /></el-icon>
              <span>重置</span>
            </el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="hover">
      <div class="table-actions">
        <el-button type="danger" @click="confirmBatchDeleteContainers" :disabled="validSelectedContainers.length === 0">
          <el-icon><Delete /></el-icon>
          <span>批量删除</span>
          <span v-if="validSelectedContainers.length > 0">（{{ validSelectedContainers.length }}）</span>
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="pagedContainers"
        style="width: 100%"
        border
        ref="containersTableRef"
        @selection-change="onContainerSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="isContainerRowSelectable" />
        <el-table-column prop="id" label="ID" min-width="50" />
        <el-table-column prop="container_name" label="容器名称" min-width="80" />
        <el-table-column prop="user_username" label="用户" min-width="80" />
        <el-table-column prop="server_name" label="服务器" min-width="100" />
        <el-table-column prop="image_name" label="镜像" min-width="120" />
        <el-table-column prop="port" label="SSH" min-width="60" />
        <el-table-column prop="cpu_cores" label="CPU" min-width="50" />
        <el-table-column prop="memory_mb" label="内存(MB)" min-width="70" />
        <el-table-column label="状态" min-width="70">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="120">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>

        <!-- 控制权限列 (仅管理员可见) -->
        <el-table-column
          v-if="currentUserRole === 'admin'"
          label="控制权限"
          min-width="70"
          align="center"
        >
          <template #default="scope">
            <el-switch
              v-model="scope.row.is_control_enabled"
              :active-text="scope.row.is_control_enabled ? '启用' : '禁用'"
              inline-prompt
              size="small"
              :loading="actionLoading === `control-${scope.row.id}`"
              @change="(newStatus) => toggleContainerControl(scope.row.id, newStatus)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" min-width="340" fixed="right">
          <template #default="scope">
            <div class="container-actions">
              <el-button
                size="small"
                type="primary"
                @click="openEditContainerDialog(scope.row)"
                :loading="actionLoading === `edit-${scope.row.id}`"
                :disabled="!canOperateContainer(scope.row) && scope.row.status !== 'deleted'"
              >
                <el-icon><Edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button
                v-if="scope.row.status !== 'running'"
                size="small"
                type="success"
                @click="startContainer(scope.row.id)"
                :loading="actionLoading === `start-${scope.row.id}`"
                :disabled="!canOperateContainer(scope.row)"
              >
                <el-icon><VideoPlay /></el-icon>
                <span>启动</span>
              </el-button>
              <el-button
                v-if="scope.row.status === 'running'"
                size="small"
                type="warning"
                @click="stopContainer(scope.row.id)"
                :loading="actionLoading === `stop-${scope.row.id}`"
                :disabled="!canOperateContainer(scope.row)"
              >
                <el-icon><VideoPause /></el-icon>
                <span>停止</span>
              </el-button>
              <template v-if="canOperateContainer(scope.row)">
                <el-dropdown
                  v-if="getSshOptions(scope.row, false).length > 0"
                  trigger="click"
                  @command="option => handleRemoteLogin(option, scope.row)"
                >
                  <el-button size="small" type="primary" class="ssh-button">
                    <el-icon><Monitor /></el-icon>
                    <span>远程登录</span>
                    <el-icon class="dropdown-icon"><CaretBottom /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="option in getSshOptions(scope.row, false)"
                        :key="`admin-remote-${option.key}`"
                        :command="option"
                      >
                        {{ option.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button
                  v-else
                  size="small"
                  type="primary"
                  class="ssh-button ssh-button--disabled"
                  @click="notifyMissingNetwork"
                >
                  <el-icon><Monitor /></el-icon>
                  <span>远程登录</span>
                </el-button>
                <el-dropdown
                  v-if="getSshOptions(scope.row).length > 0"
                  trigger="click"
                  @command="option => handleSshCommand(option, scope.row)"
                >
                  <el-button size="small" type="primary" class="ssh-button">
                    <el-icon><Link /></el-icon>
                    <span>SSH指令</span>
                    <el-icon class="dropdown-icon"><CaretBottom /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="option in getSshOptions(scope.row)"
                        :key="`admin-ssh-${option.key}`"
                        :command="option"
                      >
                        {{ option.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button
                  v-else
                  size="small"
                  type="primary"
                  class="ssh-button ssh-button--disabled"
                  @click="notifyMissingNetwork"
                >
                  <el-icon><Link /></el-icon>
                  <span>SSH指令</span>
                </el-button>
              </template>
              <template v-else>
                <el-button
                  size="small"
                  type="primary"
                  class="ssh-button ssh-button--disabled"
                  disabled
                >
                  <el-icon><Monitor /></el-icon>
                  <span>远程登录</span>
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  class="ssh-button ssh-button--disabled"
                  disabled
                >
                  <el-icon><Link /></el-icon>
                  <span>SSH指令</span>
                </el-button>
              </template>
              <el-button
                size="small"
                type="danger"
                @click="confirmDeleteContainer(scope.row)"
                :loading="actionLoading === `delete-${scope.row.id}`"
                :disabled="!canOperateContainer(scope.row)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="containerPagination.page"
          v-model:page-size="containerPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredContainers.length"
          @size-change="handleContainerSizeChange"
          @current-change="handleContainerCurrentChange"
        />
      </div>
    </el-card>

    <terminal-dialog
      v-if="terminalContext && authToken"
      v-model="terminalDialogVisible"
      :server-id="terminalContext.serverId"
      :container-id="terminalContext.containerId"
      :server-name="terminalDisplayName || '容器远程登录'"
      :server-address="terminalDisplayAddress"
      :server-user="terminalContext.user || 'root'"
      :target-host="terminalContext.host"
      :target-port="terminalContext.port"
      :login-username="terminalContext.user || 'root'"
      :auth-token="authToken"
    />
    
    <!-- 创建容器对话框 -->
    <el-dialog
      v-model="createContainerDialogVisible"
      title="创建容器"
      width="50%"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="containerForm" :rules="containerFormRules" ref="containerFormRef" label-width="150px">
        <el-form-item label="选择用户" prop="user_id">
          <el-select 
            v-model="containerForm.user_id" 
            placeholder="请输入用户名搜索或选择用户" 
            style="width: 100%"
            filterable
            clearable
            @change="handleUserChange"
          >
            <el-option 
              v-for="user in users" 
              :key="user.id" 
              :label="user.username" 
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="容器名称" prop="container_name">
          <el-input 
            v-model="containerForm.container_name" 
            placeholder="容器名称"
            :disabled="!containerForm.user_id"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="选择服务器" prop="server_id">
          <el-select 
            v-model="containerForm.server_id" 
            placeholder="请选择服务器" 
            @change="handleServerChange"
            style="width: 100%"
          >
            <el-option 
              v-for="server in servers" 
              :key="server.id" 
              :label="server.name" 
              :value="server.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择存储路径" prop="storage_path_id">
          <el-select 
            v-model="containerForm.storage_path_id" 
            placeholder="请选择存储路径" 
            style="width: 100%"
            :disabled="!containerForm.server_id"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="`${path.path}${path.description ? ' (' + path.description + ')' : ''}`" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ path.path }}</span>
                <div>
                  <el-tag v-if="path.is_system" size="small" type="warning">系统</el-tag>
                  <el-tag v-if="path.is_shared" size="small" type="success">共享</el-tag>
                  <span v-if="path.description" style="color: #8492a6; font-size: 13px; margin-left: 5px">{{ path.description }}</span>
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择共享路径" prop="shared_storage_path_id">
          <el-select 
            v-model="containerForm.shared_storage_path_id" 
            placeholder="请选择共享路径" 
            style="width: 100%"
            :disabled="!containerForm.server_id"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="`${path.path}${path.description ? ' (' + path.description + ')' : ''}`" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ path.path }}</span>
                <div>
                  <el-tag v-if="path.is_system" size="small" type="warning">系统</el-tag>
                  <el-tag v-if="path.is_shared" size="small" type="success">共享</el-tag>
                  <span v-if="path.description" style="color: #8492a6; font-size: 13px; margin-left: 5px">{{ path.description }}</span>
                </div>
              </div>
            </el-option>
          </el-select>
          <div class="form-tip">共享路径将被挂载到容器的/root/share目录</div>
        </el-form-item>
        
        <el-form-item label="选择Docker镜像" prop="image_id">
          <el-select 
            v-model="containerForm.image_id" 
            placeholder="请选择Docker镜像" 
            style="width: 100%"
            :disabled="!containerForm.server_id"
          >
            <el-option 
              v-for="image in dockerImages" 
              :key="image.id" 
              :label="`${image.repository}:${image.tag}`" 
              :value="image.id"
            >
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div class="image-name">
                  <span class="repository">{{ image.repository || '无仓库名' }}</span>
                  <el-tag size="small" v-if="image.tag">{{ image.tag }}</el-tag>
                </div>
                <div class="image-description" v-if="image.description">{{ image.description }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择端口范围" prop="port_range_id">
          <el-select 
            v-model="containerForm.port_range_id" 
            placeholder="请选择端口范围" 
            style="width: 100%"
            :disabled="!containerForm.server_id"
            @change="handlePortRangeChange"
          >
            <el-option 
              v-for="range in portRanges" 
              :key="range.id" 
              :label="`${range.start_port}-${range.end_port} (${range.description || '无描述'})`" 
              :value="range.id"
              :disabled="range.start_port >= range.end_port"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="SSH端口" prop="port">
          <el-input-number 
            v-model="containerForm.port" 
            :min="selectedPortRange?.start_port || 1000" 
            :max="selectedPortRange?.end_port || 65535"
            :disabled="!containerForm.port_range_id"
            style="width: 100%"
          />
          <div class="form-tip">SSH端口必须在选定的端口范围内，用于远程连接容器</div>
        </el-form-item>
        
        <el-form-item label="额外端口映射" prop="port_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in containerForm.port_mappings" :key="index" class="port-mapping-item">
              <el-input-number
                v-model="mapping.host_port"
                :min="selectedPortRange?.start_port || 1000"
                :max="selectedPortRange?.end_port || 65535"
                :disabled="!containerForm.port_range_id"
                placeholder="主机端口"
                style="width: 45%"
              />
              <span class="port-mapping-arrow">→</span>
              <el-input-number
                v-model="mapping.container_port"
                :min="1"
                :max="65535"
                placeholder="容器端口"
                style="width: 45%"
              />
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removePortMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addPortMapping"
              :disabled="!containerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口映射
            </el-button>
          </div>
          <div class="form-tip">额外端口映射用于将主机端口映射到容器内部端口，例如Web服务、数据库等</div>
        </el-form-item>
        
        <el-form-item label="额外端口段映射" prop="port_range_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in containerForm.port_range_mappings" :key="index" class="port-mapping-item">
              <div style="display: flex; align-items: center; width: 100%">
                <div style="flex: 1">
                  <el-input-number
                    v-model="mapping.start_port"
                    :min="selectedPortRange?.start_port || 1000"
                    :max="mapping.end_port || selectedPortRange?.end_port || 65535"
                    :disabled="!containerForm.port_range_id"
                    placeholder="起始端口"
                    style="width: 100%"
                  />
                </div>
                <span class="port-mapping-dash">-</span>
                <div style="flex: 1">
                  <el-input-number
                    v-model="mapping.end_port"
                    :min="mapping.start_port || selectedPortRange?.start_port || 1000"
                    :max="selectedPortRange?.end_port || 65535"
                    :disabled="!containerForm.port_range_id"
                    placeholder="结束端口"
                    style="width: 100%"
                  />
                </div>
              </div>
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removePortRangeMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addPortRangeMapping"
              :disabled="!containerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口段映射
            </el-button>
          </div>
          <div class="form-tip">端口段映射用于将主机端口段映射到容器内相同的端口段，例如1000-1010映射到1000-1010</div>
        </el-form-item>
        
        <el-form-item label="CPU核心数" prop="cpu_cores">
          <el-input-number 
            v-model="containerForm.cpu_cores" 
            :min="1" 
            :max="serverResources?.cpu_cores || 1" 
            :disabled="!containerForm.server_id"
            style="width: 100%"
          />
          <div class="form-tip">服务器总CPU核心数: {{ serverResources?.cpu_cores || '未知' }}</div>
        </el-form-item>
        
        <el-form-item label="内存大小(MB)" prop="memory_mb">
          <el-input-number 
            v-model="containerForm.memory_mb" 
            :min="512" 
            :max="serverResources?.total_memory_mb || 1024" 
            :step="512"
            :disabled="!containerForm.server_id"
            style="width: 100%"
          />
          <div class="form-tip">服务器总内存: {{ formatMemory(serverResources?.total_memory_mb) }}</div>
        </el-form-item>
        
        <el-form-item label="GPU设备" prop="gpu_indices">
          <el-select 
            v-model="containerForm.gpu_indices" 
            placeholder="请选择GPU设备" 
            style="width: 100%"
            :disabled="!containerForm.server_id || (serverResources?.gpu_count === 0)"
          >
            <el-option label="全部GPU" value="all" />
            <el-option 
              v-for="(gpu, index) in serverResources?.gpu_devices || []" 
              :key="index" 
              :label="`GPU ${gpu.index}: ${gpu.name}`" 
              :value="String(gpu.index)"
            />
            <el-option 
              v-if="serverResources?.gpu_devices && serverResources.gpu_devices.length >= 2"
              label="GPU 0,1 (前两个GPU)"
              value="0,1"
            />
          </el-select>
          <div class="form-tip">服务器GPU数量: {{ serverResources?.gpu_count || '0' }}</div>
        </el-form-item>
        
        <el-form-item label="容器密码" prop="root_password">
          <div style="display: flex; align-items: center; width: 100%">
            <el-input 
              v-model="containerForm.root_password" 
              placeholder="容器root用户密码"
              show-password
              style="flex: 1"
            />
            <el-button 
              type="primary" 
              @click="generateRandomPassword" 
              style="margin-left: 10px"
            >
              生成随机密码
            </el-button>
          </div>
          <div class="form-tip">容器root用户的密码，用于SSH登录</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createContainerDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitContainerForm" :loading="submitting">
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 编辑容器对话框 -->
    <el-dialog
      v-model="editContainerDialogVisible"
      title="编辑容器配置"
      width="50%"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="editContainerForm" :rules="editContainerFormRules" ref="editContainerFormRef" label-width="150px">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <b>警告：此操作不可逆！</b>容器将被重新初始化，仅保留 data、projects 和 share 目录中的数据。
        </el-alert>
        
        <el-form-item label="选择用户" prop="user_id">
          <el-input v-model="editContainerForm.user_username" disabled />
        </el-form-item>
        
        <el-form-item label="容器名称" prop="container_name">
          <el-input v-model="editContainerForm.container_name" disabled />
        </el-form-item>
        
        <el-form-item label="选择服务器" prop="server_id">
          <el-select 
            v-model="editContainerForm.server_id" 
            placeholder="请选择服务器" 
            style="width: 100%"
            disabled
          >
            <el-option 
              v-for="server in servers" 
              :key="server.id" 
              :label="server.name" 
              :value="server.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择存储路径" prop="storage_path_id">
          <el-select 
            v-model="editContainerForm.storage_path_id" 
            placeholder="请选择存储路径" 
            style="width: 100%"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="path.path" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <div>{{ path.path }}</div>
                <div style="color: #8492a6; font-size: 13px">
                  {{ path.description || '无描述' }}
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择共享路径" prop="shared_storage_path_id">
          <el-select 
            v-model="editContainerForm.shared_storage_path_id" 
            placeholder="请选择共享路径" 
            style="width: 100%"
          >
            <el-option 
              v-for="path in storagePaths" 
              :key="path.id" 
              :label="path.path" 
              :value="path.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <div>{{ path.path }}</div>
                <div style="color: #8492a6; font-size: 13px">
                  {{ path.description || '无描述' }}
                </div>
              </div>
            </el-option>
          </el-select>
          <div class="form-tip">共享路径将被挂载到容器的/root/share目录</div>
        </el-form-item>
        
        <el-form-item label="选择Docker镜像" prop="image_id">
          <el-select 
            v-model="editContainerForm.image_id" 
            placeholder="请选择Docker镜像" 
            style="width: 100%"
          >
            <el-option 
              v-for="image in dockerImages" 
              :key="image.id" 
              :label="`${image.repository}:${image.tag}`" 
              :value="image.id"
            >
              <div style="display: flex; flex-direction: column">
                <div class="image-name">
                  <span class="repository">{{ image.repository }}</span>:<span>{{ image.tag }}</span>
                </div>
                <div class="image-description" v-if="image.description">{{ image.description }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <!-- <el-form-item label="选择端口范围" prop="port_range_id">
          <el-select 
            v-model="editContainerForm.port_range_id" 
            placeholder="请选择端口范围" 
            style="width: 100%"
            @change="handleEditPortRangeChange"
          >
            <el-option 
              v-for="range in portRanges" 
              :key="range.id" 
              :label="`${range.start_port}-${range.end_port}`" 
              :value="range.id"
            >
              <div>
                <div>{{ range.start_port }}-{{ range.end_port }}</div>
                <div style="color: #8492a6; font-size: 13px">
                  {{ range.description || '无描述' }}
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item> -->
        
        <el-form-item label="SSH端口" prop="port">
          <el-input-number 
            v-model="editContainerForm.port" 
            :min="selectedEditPortRange ? selectedEditPortRange.start_port : 1" 
            :max="selectedEditPortRange ? selectedEditPortRange.end_port : 65535"
            :disabled="!editContainerForm.port_range_id"
            style="width: 100%"
          />
          <div class="form-tip">SSH端口必须在选定的端口范围内，用于远程连接容器</div>
        </el-form-item>
        
        <el-form-item label="额外端口映射" prop="port_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in editContainerForm.port_mappings" :key="index" class="port-mapping-item">
              <el-input-number
                v-model="mapping.host_port"
                :min="selectedEditPortRange ? selectedEditPortRange.start_port : 1"
                :max="selectedEditPortRange ? selectedEditPortRange.end_port : 65535"
                placeholder="主机端口"
                :disabled="!editContainerForm.port_range_id"
                style="width: 120px"
              />
              <span class="port-mapping-arrow">→</span>
              <el-input-number
                v-model="mapping.container_port"
                :min="1"
                :max="65535"
                placeholder="容器端口"
                style="width: 120px"
              />
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removeEditPortMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addEditPortMapping"
              :disabled="!editContainerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口映射
            </el-button>
          </div>
          <div class="form-tip">额外端口映射用于将主机端口映射到容器内部端口，例如Web服务、数据库等</div>
        </el-form-item>
        
        <el-form-item label="额外端口段映射" prop="port_range_mappings">
          <div class="port-mappings-container">
            <div v-for="(mapping, index) in editContainerForm.port_range_mappings" :key="index" class="port-mapping-item">
              <div style="display: flex; align-items: center; width: 100%">
                <div style="flex: 1">
                  <el-input-number
                    v-model="mapping.start_port"
                    :min="selectedEditPortRange ? selectedEditPortRange.start_port : 1"
                    :max="selectedEditPortRange ? selectedEditPortRange.end_port : 65535"
                    placeholder="起始端口"
                    :disabled="!editContainerForm.port_range_id"
                    style="width: 120px"
                  />
                  <span class="port-mapping-dash">-</span>
                  <el-input-number
                    v-model="mapping.end_port"
                    :min="mapping.start_port || 1"
                    :max="selectedEditPortRange ? selectedEditPortRange.end_port : 65535"
                    placeholder="结束端口"
                    :disabled="!editContainerForm.port_range_id"
                    style="width: 120px"
                  />
                </div>
              </div>
              <el-button
                type="danger"
                circle
                size="small"
                icon="Delete"
                @click="removeEditPortRangeMapping(index)"
                style="margin-left: 10px"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addEditPortRangeMapping"
              :disabled="!editContainerForm.port_range_id"
              style="margin-top: 10px"
            >
              添加端口段映射
            </el-button>
          </div>
          <div class="form-tip">端口段映射用于将主机端口段映射到容器内相同的端口段，例如1000-1010映射到1000-1010</div>
        </el-form-item>
        
        <el-form-item label="CPU核心数" prop="cpu_cores">
          <el-input-number 
            v-model="editContainerForm.cpu_cores" 
            :min="1" 
            :max="serverResources?.cpu_cores || 1" 
            style="width: 100%"
          />
          <div class="form-tip">服务器总CPU核心数: {{ serverResources?.cpu_cores || '未知' }}</div>
        </el-form-item>
        
        <el-form-item label="内存大小(MB)" prop="memory_mb">
          <el-input-number 
            v-model="editContainerForm.memory_mb" 
            :min="512" 
            :max="serverResources?.total_memory_mb || 1024" 
            :step="512"
            style="width: 100%"
          />
          <div class="form-tip">服务器总内存: {{ formatMemory(serverResources?.total_memory_mb) }}</div>
        </el-form-item>
        
        <el-form-item label="GPU设备" prop="gpu_indices">
          <el-select 
            v-model="editContainerForm.gpu_indices" 
            placeholder="请选择GPU设备" 
            style="width: 100%"
            :disabled="serverResources?.gpu_count === 0"
          >
            <el-option label="全部GPU" value="all" />
            <el-option 
              v-for="(gpu, index) in serverResources?.gpu_devices || []" 
              :key="index" 
              :label="`GPU ${gpu.index}: ${gpu.name}`" 
              :value="String(gpu.index)"
            />
            <el-option 
              v-if="serverResources?.gpu_devices && serverResources.gpu_devices.length >= 2"
              label="GPU 0,1 (前两个GPU)"
              value="0,1"
            />
          </el-select>
          <div class="form-tip">服务器GPU数量: {{ serverResources?.gpu_count || '0' }}</div>
        </el-form-item>
        
        <el-form-item label="容器密码" prop="root_password">
          <div style="display: flex; align-items: center; width: 100%">
            <el-input 
              v-model="editContainerForm.root_password" 
              placeholder="容器root用户密码"
              style="flex: 1"
            />
            <el-button 
              type="primary" 
              @click="generateEditRandomPassword" 
              style="margin-left: 10px"
            >
              生成随机密码
            </el-button>
          </div>
          <div class="form-tip">容器root用户的密码，用于SSH登录</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editContainerDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmEditContainer" :loading="submitting">
            确认更新
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Refresh, VideoPause, VideoPlay, Edit, Setting, Search, RefreshRight, Monitor, Link, CaretBottom } from '@element-plus/icons-vue'
import axios from '../utils/axios'
import TerminalDialog from './TerminalDialog.vue'
import { useAuthStore } from '../stores/auth'
import { createContainerNameValidationRule } from '../utils/usernameConflict'

const authStore = useAuthStore()
const currentUserRole = computed(() => authStore.user?.role)
const terminalDialogVisible = ref(false)
const terminalContext = ref(null)
const authToken = computed(() => authStore.token || localStorage.getItem('token') || '')
const terminalDisplayName = computed(() => {
  if (!terminalContext.value) {
    return ''
  }
  const containerName = terminalContext.value.containerName || ''
  const serverName = terminalContext.value.serverName || ''
  if (containerName && serverName) {
    return `${containerName} @ ${serverName}`
  }
  return containerName || serverName
})
const terminalDisplayAddress = computed(() => {
  if (!terminalContext.value) {
    return ''
  }
  const host = terminalContext.value.host || ''
  const port = terminalContext.value.port || ''
  if (host && port) {
    return `${host}:${port}`
  }
  return host
})
const canOperateContainer = (container) => currentUserRole.value === 'admin' || !!container?.is_control_enabled

const containers = ref([])
const loading = ref(false)
const actionLoading = ref(null)
const createContainerDialogVisible = ref(false)
const submitting = ref(false)
const containerForm = ref({
  user_id: '',
  server_id: '',
  storage_path_id: '',
  shared_storage_path_id: '',
  image_id: '',
  port_range_id: '',
  port: null,  
  cpu_cores: 1,
  memory_mb: 1024,
  gpu_indices: '',
  port_mappings: [],
  port_range_mappings: [],
  container_name: '',
  root_password: ''
})
// 计算动态验证规则，包含用户名冲突检测
const containerFormRules = computed(() => {
  const selectedUser = users.value.find(u => u.id === containerForm.value.user_id)
  const selectedUsername = selectedUser?.username || ''

  return {
    user_id: [{ required: true, message: '请选择用户', trigger: 'change' }],
    server_id: [{ required: true, message: '请选择服务器', trigger: 'change' }],
    storage_path_id: [{ required: true, message: '请选择存储路径', trigger: 'change' }],
    shared_storage_path_id: [{ required: true, message: '请选择共享路径', trigger: 'change' }],
    image_id: [{ required: true, message: '请选择Docker镜像', trigger: 'change' }],
    port_range_id: [{ required: true, message: '请选择端口范围', trigger: 'change' }],
    port: [{ required: true, message: '请输入SSH端口', trigger: 'blur' }],
    cpu_cores: [{ required: true, message: '请输入CPU核心数', trigger: 'blur' }],
    memory_mb: [{ required: true, message: '请输入内存(MB)', trigger: 'blur' }],
    gpu_indices: [{ required: true, message: '请选择GPU设备', trigger: 'change' }],
    container_name: [
      { required: true, message: '请输入容器名称', trigger: 'blur' },
      createContainerNameValidationRule(selectedUsername, users.value)
    ],
    root_password: [{ required: true, message: '请输入容器密码', trigger: 'blur' }]
  }
})
const containerFormRef = ref(null)
const editContainerDialogVisible = ref(false)
const editContainerForm = ref({
  id: null,
  server_id: '',
  storage_path_id: '',
  shared_storage_path_id: '',
  image_id: '',
  cpu_cores: 1,
  memory_mb: 1024,
  gpu_indices: '',
  port_mappings: [],
  port_range_mappings: [],
  container_name: '',
  user_username: '',
  port: null,
  root_password: ''
})
const editContainerFormRules = ref({
  storage_path_id: [{ required: true, message: '请选择存储路径', trigger: 'change' }],
  shared_storage_path_id: [{ required: true, message: '请选择共享路径', trigger: 'change' }],
  image_id: [{ required: true, message: '请选择Docker镜像', trigger: 'change' }],
  cpu_cores: [{ required: true, message: '请输入CPU核心数', trigger: 'blur' }],
  memory_mb: [{ required: true, message: '请输入内存(MB)', trigger: 'blur' }],
  gpu_indices: [{ required: true, message: '请选择GPU设备', trigger: 'change' }],
  root_password: [{ required: true, message: '请输入容器密码', trigger: 'blur' }]
})
const editContainerFormRef = ref(null)
const servers = ref([])
const users = ref([])
const storagePaths = ref([])
const dockerImages = ref([])
const portRanges = ref([])
const serverResources = ref({
  cpu_cores: '',
  total_memory_mb: '',
  gpu_count: '',
  gpu_devices: []
})
const selectedPortRange = computed(() => {
  return portRanges.value.find(range => range.id === containerForm.value.port_range_id)
})
const selectedEditPortRange = computed(() => {
  return portRanges.value.find(range => range.id === editContainerForm.value.port_range_id)
})

// 过滤与分页
const containerFilter = reactive({
  keyword: '',
  serverId: '', // 指定服务器ID；空为全部
  status: '',   // 容器状态过滤：running/stopped/creating/error
  imageName: '' // 镜像名过滤
})

const containerPagination = reactive({
  page: 1,
  pageSize: 20
})

const filteredContainers = computed(() => {
  const kw = (containerFilter.keyword || '').trim().toLowerCase()
  const serverId = containerFilter.serverId
  const status = (containerFilter.status || '').trim()
  const imageName = (containerFilter.imageName || '').trim()
  return (containers.value || []).filter(c => {
    const matchKw = kw ? (c.user_username || '').toLowerCase().includes(kw) : true
    const matchServer = serverId ? (String(c.server_id) === String(serverId)) : true
    const matchStatus = status ? (c.status === status) : true
    const matchImage = imageName ? (c.image_name === imageName) : true
    return matchKw && matchServer && matchStatus && matchImage
  })
})

const pagedContainers = computed(() => {
  const start = (containerPagination.page - 1) * containerPagination.pageSize
  const end = start + containerPagination.pageSize
  return filteredContainers.value.slice(start, end)
})

const handleContainerFilter = () => {
  containerPagination.page = 1
}

const resetContainerFilter = () => {
  containerFilter.keyword = ''
  containerFilter.serverId = ''
  containerFilter.status = ''
  containerFilter.imageName = ''
  containerPagination.page = 1
}

// 去重镜像名列表（基于当前容器列表）
const distinctImages = computed(() => {
  const names = (containers.value || []).map(c => c.image_name).filter(Boolean)
  return Array.from(new Set(names))
})

const handleContainerSizeChange = (size) => {
  containerPagination.pageSize = size
  containerPagination.page = 1
}

const handleContainerCurrentChange = (page) => {
  containerPagination.page = page
}

// 获取容器列表
const fetchContainers = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/containers')
    // Ensure is_control_enabled is a boolean, backend should already send it
    containers.value = response.data.containers.map(c => ({ ...c, is_control_enabled: !!c.is_control_enabled }))
  } catch (error) {
    console.error('获取容器列表失败:', error)
    ElMessage.error('获取容器列表失败')
  } finally {
    loading.value = false
  }
}

// 启动容器
const startContainer = async (containerId) => {
  actionLoading.value = `start-${containerId}`
  try {
    const response = await axios.post(`/api/containers/${containerId}/start`)
    ElMessage.success(response.data.msg || '容器启动成功')
    fetchContainers()
  } catch (error) {
    console.error('启动容器失败:', error)
    ElMessage.error(error.response?.data?.msg || '启动容器失败')
  } finally {
    actionLoading.value = null
  }
}

// 停止容器
const stopContainer = async (containerId) => {
  actionLoading.value = `stop-${containerId}`
  try {
    const response = await axios.post(`/api/containers/${containerId}/stop`)
    ElMessage.success(response.data.msg || '容器停止成功')
    fetchContainers()
  } catch (error) {
    console.error('停止容器失败:', error)
    ElMessage.error(error.response?.data?.msg || '停止容器失败')
  } finally {
    actionLoading.value = null
  }
}

// 确认删除容器
const confirmDeleteContainer = (container) => {
  // 删除前检查：必须已停止
  if (container.status !== 'stopped') {
    ElMessageBox.alert(
      `容器 "${container.container_name}" 当前状态为 ${container.status || '未知'}，请先停止后再删除。`,
      '无法删除',
      { type: 'warning' }
    )
    return
  }
  ElMessageBox.confirm(
    `确定要删除容器 "${container.container_name}" 吗？此操作不会删除远程服务器上的容器，只会删除记录。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      deleteContainer(container.id)
    })
    .catch(() => {
      // 用户取消删除
    })
}

// 批量删除容器
const containersTableRef = ref(null)
const selectedContainers = ref([])
const onContainerSelectionChange = (val) => {
  selectedContainers.value = val || []
}
const isContainerRowSelectable = (row) => {
  if (!row) return false
  return canOperateContainer(row)
}
const validSelectedContainers = computed(() => {
  return (selectedContainers.value || []).filter(c => isContainerRowSelectable(c))
})

const confirmBatchDeleteContainers = async () => {
  const list = validSelectedContainers.value
  if (!list.length) {
    ElMessage.warning('请选择可删除的容器')
    return
  }
  // 检查是否都已停止
  const notStopped = list.filter(c => c.status !== 'stopped')
  if (notStopped.length > 0) {
    const detail = notStopped.map(c => ` - ${c.container_name} @ ${c.server_name}（状态: ${c.status}）`).join('\n')
    ElMessageBox.alert(
      `以下容器未停止：\n${detail}\n\n请先停止后再删除。`,
      '无法批量删除',
      { type: 'warning' }
    )
    return
  }

  const names = list.map(c => `${c.container_name} @ ${c.server_name}`).join(', ')
  ElMessageBox.confirm(
    `确定批量删除以下容器吗？\n${names}\n\n仅删除记录，不删除远程服务器上的实际容器。`,
    '批量删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      for (const c of list) {
        await axios.delete(`/api/containers/${c.id}`)
      }
      ElMessage.success(`已删除 ${list.length} 个容器记录`)
      if (containersTableRef.value) containersTableRef.value.clearSelection()
      selectedContainers.value = []
      fetchContainers()
    } catch (e) {
      ElMessage.error('批量删除容器时出现错误')
    }
  }).catch(() => {})
}

// 删除容器
const deleteContainer = async (containerId) => {
  actionLoading.value = `delete-${containerId}`
  try {
    const response = await axios.delete(`/api/containers/${containerId}`)
    ElMessage.success(response.data.msg || '容器记录删除成功')
    fetchContainers()
  } catch (error) {
    console.error('删除容器记录失败:', error)
    ElMessage.error(error.response?.data?.msg || '删除容器记录失败')
  } finally {
    actionLoading.value = null
  }
}

// 切换容器控制权限
const toggleContainerControl = async (containerId, newStatus) => {
  actionLoading.value = `control-${containerId}`
  try {
    const response = await axios.put(`/api/admin/containers/${containerId}/control`, { enabled: newStatus })
    ElMessage.success(response.data.msg || '容器控制状态更新成功')
    // 更新本地数据，避免重新加载整个列表
    const container = containers.value.find(c => c.id === containerId)
    if (container) {
      container.is_control_enabled = newStatus
    }
  } catch (error) {
    console.error('更新容器控制状态失败:', error)
    ElMessage.error(error.response?.data?.msg || '更新容器控制状态失败')
    // 如果API调用失败，则恢复开关状态
    const container = containers.value.find(c => c.id === containerId)
    if (container) {
      container.is_control_enabled = !newStatus
    }
  } finally {
    actionLoading.value = null
  }
}

// 打开创建容器对话框
const openCreateContainerDialog = () => {
  // 重置表单数据
  containerForm.value = {
    user_id: '',
    server_id: '',
    storage_path_id: '',
    shared_storage_path_id: '',
    image_id: '',
    port_range_id: '',
    port: null,  
    cpu_cores: 1,
    memory_mb: 1024,
    gpu_indices: '',
    port_mappings: [],
    port_range_mappings: [],
    container_name: '',
    root_password: generatePassword()
  }
  
  // 重置资源数据
  serverResources.value = {
    cpu_cores: '',
    total_memory_mb: '',
    gpu_count: '',
    gpu_devices: []
  }
  
  // 清空存储路径、Docker镜像和端口范围
  storagePaths.value = []
  dockerImages.value = []
  portRanges.value = []
  
  // 获取用户列表
  fetchUsers()
  
  // 显示对话框
  createContainerDialogVisible.value = true
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'stopped':
      return 'warning'
    case 'deleted':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'running':
      return '运行中'
    case 'stopped':
      return '已停止'
    case 'created':
      return '已创建'
    case 'deleted':
      return '已删除'
    default:
      return '未知'
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleString()
}

const sanitizeTarget = (value) => {
  if (!value && value !== 0) {
    return ''
  }
  const text = String(value).trim()
  if (!text || ['unknown', 'none'].includes(text.toLowerCase())) {
    return ''
  }
  return text
}

const getSshOptions = (container, includeLan = true) => {
  if (!container) {
    return []
  }
  const port = container.port
  if (!port) {
    return []
  }

  const info = container.network_info || {}
  const options = []

  const lan = sanitizeTarget(info.lan_ip)
  if (lan && includeLan) {
    options.push({ key: 'lan', value: lan, label: `局域网IP (${lan})` })
  }

  const eduIp = sanitizeTarget(info.edu_ip)
  if (eduIp) {
    options.push({ key: 'edu_ip', value: eduIp, label: `校园网IP (${eduIp})` })
  }

  const eduDomain = sanitizeTarget(info.edu_domain)
  if (eduDomain) {
    options.push({ key: 'edu_domain', value: eduDomain, label: `校园网域名 (${eduDomain})` })
  }

  return options
}

const copyText = async (text) => {
  try {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
  }

  if (typeof document === 'undefined') {
    throw new Error('document is not available for clipboard operations')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let success = false
  try {
    success = document.execCommand('copy')
  } catch (err) {
    console.error('执行复制命令失败:', err)
  }

  document.body.removeChild(textarea)
  if (!success) {
    throw new Error('execCommand copy failed')
  }
  return true
}

const handleSshCommand = async (option, container) => {
  if (!option || !option.value) {
    ElMessage.warning('未找到可用的目标地址')
    return
  }
  if (!container || !container.port) {
    ElMessage.warning('该容器未配置SSH端口')
    return
  }

  const command = `ssh root@${option.value} -p ${container.port}`
  try {
    await copyText(command)
    ElMessage.success('SSH 指令已复制到剪贴板')
  } catch (err) {
    console.error('复制SSH指令失败:', err)
    ElMessage.error('复制失败，请手动复制')
  }
}

const openRemoteTerminal = async (container, host) => {
  const sanitizedHost = sanitizeTarget(host)
  if (!sanitizedHost) {
    ElMessage.warning('请选择有效的连接地址')
    return
  }
  if (!container || !container.port) {
    ElMessage.warning('该容器未配置SSH端口')
    return
  }

  try {
    await axios.get(`/api/servers/${container.server_id}/token`)
    terminalContext.value = {
      serverId: container.server_id,
      containerId: container.id,
      containerName: container.container_name,
      serverName: container.server_name,
      host: sanitizedHost,
      port: container.port,
      user: 'root'
    }
    terminalDialogVisible.value = true
  } catch (err) {
    console.error('获取服务器令牌失败:', err)
    ElMessage.error(err.response?.data?.msg || '获取服务器令牌失败，无法打开远程终端')
  }
}

const handleRemoteLogin = (option, container) => {
  if (!option || !option.value) {
    ElMessage.warning('未找到可用的目标地址')
    return
  }
  openRemoteTerminal(container, option.value)
}

const notifyMissingNetwork = () => {
  ElMessage.warning('暂时无法获取服务器网络信息，请稍后再试')
}

// 自动刷新定时器
let refreshTimer = null

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) return
  refreshTimer = setInterval(() => {
    fetchContainers()
  }, 30000)
}

watch(terminalDialogVisible, (visible) => {
  if (visible) {
    stopAutoRefresh()
  } else {
    fetchContainers()
    startAutoRefresh()
  }
})

// 提交创建容器表单
const submitContainerForm = async () => {
  if (!containerFormRef.value) return
  
  try {
    await containerFormRef.value.validate()
    
    submitting.value = true
    
    // 准备提交数据
    const formData = {
      ...containerForm.value,
      // 确保数值类型正确
      cpu_cores: Number(containerForm.value.cpu_cores),
      memory_mb: Number(containerForm.value.memory_mb),
      port: Number(containerForm.value.port),
      // 确保端口映射数据格式正确
      port_mappings: containerForm.value.port_mappings.map(mapping => ({
        host_port: Number(mapping.host_port),
        container_port: Number(mapping.container_port)
      })),
      // 添加端口段映射数据
      port_range_mappings: containerForm.value.port_range_mappings.map(mapping => ({
        start_port: Number(mapping.start_port),
        end_port: Number(mapping.end_port)
      }))
    }
    
    // 发送创建容器请求
    const response = await axios.post('/api/containers', formData)
    
    ElMessage.success('容器创建成功')
    createContainerDialogVisible.value = false
    
    // 刷新容器列表
    fetchContainers()
  } catch (error) {
    console.error('创建容器失败:', error)
    ElMessage.error(error.response?.data?.msg || '创建容器失败')
  } finally {
    submitting.value = false
  }
}

// 服务器改变事件
const handleServerChange = async (serverId) => {
  try {
    // 获取服务器资源
    const resourcesResponse = await axios.get(`/api/servers/${serverId}/resources`)
    serverResources.value = resourcesResponse.data || {}
    
    // 获取服务器存储路径
    const storagePathsResponse = await axios.get(`/api/servers/${serverId}/storage_paths`)
    storagePaths.value = storagePathsResponse.data.storage_paths || []
    
    // 获取服务器Docker镜像
    const dockerImagesResponse = await axios.get(`/api/servers/${serverId}/docker_images`)
    dockerImages.value = dockerImagesResponse.data.docker_images || []
    
    // 获取服务器端口范围
    const portRangesResponse = await axios.get(`/api/servers/${serverId}/port_ranges`)
    portRanges.value = portRangesResponse.data.port_ranges || []
    
    // 重置表单中的相关字段
    containerForm.value.storage_path_id = ''
    containerForm.value.shared_storage_path_id = ''
    containerForm.value.image_id = ''
    containerForm.value.port_range_id = ''
    containerForm.value.port = null
    containerForm.value.gpu_indices = ''
    
    // 设置默认的CPU和内存值
    const cpuCores = serverResources.value?.cpu_cores
    if (cpuCores && typeof cpuCores === 'number' && cpuCores > 0) {
      containerForm.value.cpu_cores = Math.max(1, Math.min(cpuCores, 6))  // 默认最多分配4核
    } else {
      containerForm.value.cpu_cores = 1
    }
    
    const totalMemoryMb = serverResources.value?.total_memory_mb
    if (totalMemoryMb && typeof totalMemoryMb === 'number' && totalMemoryMb > 0) {
      containerForm.value.memory_mb = Math.max(1024, Math.min(totalMemoryMb, 16384))  // 默认最多分配8GB
    } else {
      containerForm.value.memory_mb = 1024
    }
  } catch (error) {
    console.error('获取服务器相关数据失败:', error)
    ElMessage.error('获取服务器相关数据失败')
  }
}

// 端口范围改变事件
const handlePortRangeChange = (portRangeId) => {
  containerForm.value.port = null
  
  // 如果选择了端口范围，自动设置一个默认端口
  const selectedRange = portRanges.value.find(range => range.id === portRangeId)
  if (selectedRange && selectedRange.start_port < selectedRange.end_port) {
    containerForm.value.port = selectedRange.start_port
  }
}

// 添加端口映射
const addPortMapping = () => {
  if (!containerForm.value.port_mappings) {
    containerForm.value.port_mappings = []
  }
  
  // 从选定的端口范围中找一个可用的端口
  let hostPort = selectedPortRange.value?.start_port || 1000
  if (containerForm.value.port_mappings.length > 0) {
    // 找出已使用的最大端口号，然后加1
    const usedPorts = containerForm.value.port_mappings.map(m => m.host_port)
    hostPort = Math.max(...usedPorts) + 1
    
    // 确保端口在范围内
    if (selectedPortRange.value && hostPort > selectedPortRange.value.end_port) {
      hostPort = selectedPortRange.value.start_port
    }
  }
  
  containerForm.value.port_mappings.push({
    host_port: hostPort,
    container_port: 8080 // 默认容器端口
  })
}

// 移除端口映射
const removePortMapping = (index) => {
  containerForm.value.port_mappings.splice(index, 1)
}

// 添加端口段映射
const addPortRangeMapping = () => {
  if (!containerForm.value.port_range_mappings) {
    containerForm.value.port_range_mappings = []
  }
  
  // 从选定的端口范围中找一个可用的端口段
  let startPort = selectedPortRange.value?.start_port || 1000
  let endPort = startPort + 10 // 默认10个端口
  
  if (endPort > (selectedPortRange.value?.end_port || 65535)) {
    endPort = selectedPortRange.value?.end_port || 65535
  }
  
  containerForm.value.port_range_mappings.push({
    start_port: startPort,
    end_port: endPort
  })
}

// 移除端口段映射
const removePortRangeMapping = (index) => {
  containerForm.value.port_range_mappings.splice(index, 1)
}

// 格式化内存
const formatMemory = (memoryMb) => {
  if (!memoryMb || typeof memoryMb !== 'number' || memoryMb <= 0) return '未知'
  
  if (memoryMb >= 1024) {
    return `${(memoryMb / 1024).toFixed(1)} GB`
  } else {
    return `${memoryMb} MB`
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/users')
    users.value = response.data.users || []
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  }
}

// 处理用户选择变化
const handleUserChange = () => {
  if (containerForm.value.user_id) {
    // 查找选中的用户名
    const selectedUser = users.value.find(user => user.id === containerForm.value.user_id);
    if (selectedUser) {
      // 生成默认容器名称（用户名大写）
      containerForm.value.container_name = selectedUser.username.toUpperCase();
    }
  } else {
    containerForm.value.container_name = '';
  }
}

// 生成随机密码
const generateRandomPassword = () => {
  containerForm.value.root_password = generatePassword()
}

// 密码生成函数
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  
  // 生成三段，每段5个字符
  for (let segment = 0; segment < 3; segment++) {
    // 生成每段5个字符
    for (let i = 0; i < 5; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // 添加连接符，最后一段不添加
    if (segment < 2) {
      password += '-'
    }
  }
  
  return password
}

// 打开编辑容器对话框
const openEditContainerDialog = async (container) => {
  actionLoading.value = `edit-${container.id}`
  
  try {
    // 获取容器详细信息
    const containerResponse = await axios.get(`/api/containers/${container.id}`)
    const containerDetail = containerResponse.data
    
    // 获取服务器资源
    const resourcesResponse = await axios.get(`/api/servers/${container.server_id}/resources`)
    serverResources.value = resourcesResponse.data || {}
    
    // 获取服务器存储路径
    const storagePathsResponse = await axios.get(`/api/servers/${container.server_id}/storage_paths`)
    storagePaths.value = storagePathsResponse.data.storage_paths || []
    
    // 获取服务器Docker镜像
    const dockerImagesResponse = await axios.get(`/api/servers/${container.server_id}/docker_images`)
    dockerImages.value = dockerImagesResponse.data.docker_images || []
    
    // 获取服务器端口范围
    const portRangesResponse = await axios.get(`/api/servers/${container.server_id}/port_ranges`)
    portRanges.value = portRangesResponse.data.port_ranges || []
    
    // 设置表单数据，使用详细信息中的数据
    editContainerForm.value = {
      id: containerDetail.id,
      server_id: containerDetail.server_id,
      storage_path_id: containerDetail.storage_path_id,
      shared_storage_path_id: storagePaths.value[0]?.id || '', // 默认选择第一个共享路径
      image_id: containerDetail.image_id,
      cpu_cores: containerDetail.cpu_cores,
      memory_mb: containerDetail.memory_mb,
      gpu_indices: 'all', // 默认使用所有GPU
      port_mappings: [],
      port_range_mappings: [],
      container_name: containerDetail.container_name,
      user_id: containerDetail.user_id,
      user_username: containerDetail.user_username,
      port: containerDetail.port,
      root_password: containerDetail.root_password || '' // 使用数据库中存储的密码
    }
    
    // 显示对话框
    editContainerDialogVisible.value = true
  } catch (error) {
    console.error('获取容器编辑数据失败:', error)
    ElMessage.error('获取容器编辑数据失败')
  } finally {
    actionLoading.value = null
  }
}

// 确认编辑容器
const confirmEditContainer = async () => {
  ElMessageBox.confirm(
    `确定要更新容器 "${editContainerForm.value.container_name}" 的配置吗？此操作不可逆，仅保留data、projects和share目录中的数据，容器将被重新初始化。`,
    '更新确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      submitEditContainerForm()
    })
    .catch(() => {
      // 用户取消更新
    })
}

// 提交编辑容器表单
const submitEditContainerForm = async () => {
  if (!editContainerFormRef.value) return
  
  try {
    await editContainerFormRef.value.validate()
    
    submitting.value = true
    
    // 准备提交数据
    const formData = {
      ...editContainerForm.value,
      // 确保数值类型正确
      cpu_cores: Number(editContainerForm.value.cpu_cores),
      memory_mb: Number(editContainerForm.value.memory_mb),
      port: Number(editContainerForm.value.port),
      // 确保端口映射数据格式正确
      port_mappings: editContainerForm.value.port_mappings.map(mapping => ({
        host_port: Number(mapping.host_port),
        container_port: Number(mapping.container_port)
      })),
      // 添加端口段映射数据
      port_range_mappings: editContainerForm.value.port_range_mappings.map(mapping => ({
        start_port: Number(mapping.start_port),
        end_port: Number(mapping.end_port)
      }))
    }
    
    // 发送编辑容器请求
    const response = await axios.put(`/api/containers/${editContainerForm.value.id}/update`, formData)
    
    ElMessage.success('容器配置更新成功')
    editContainerDialogVisible.value = false
    
    // 刷新容器列表
    fetchContainers()
  } catch (error) {
    console.error('更新容器配置失败:', error)
    ElMessage.error(error.response?.data?.msg || '更新容器配置失败')
  } finally {
    submitting.value = false
  }
}

// 生成随机密码（编辑容器）
const generateEditRandomPassword = () => {
  editContainerForm.value.root_password = generatePassword()
}

// 处理编辑容器的端口范围变化
const handleEditPortRangeChange = () => {
  // 如果选择了端口范围，自动设置一个可用的端口
  if (editContainerForm.value.port_range_id && selectedEditPortRange.value) {
    // 默认使用范围的起始端口
    editContainerForm.value.port = selectedEditPortRange.value.start_port
  } else {
    // 如果没有选择端口范围，清空端口
    editContainerForm.value.port = null
  }
}

// 添加编辑容器的端口映射
const addEditPortMapping = () => {
  if (!editContainerForm.value.port_range_id) return
  
  editContainerForm.value.port_mappings.push({
    host_port: selectedEditPortRange.value.start_port,
    container_port: 8080 // 默认映射到容器的8080端口
  })
}

// 移除编辑容器的端口映射
const removeEditPortMapping = (index) => {
  editContainerForm.value.port_mappings.splice(index, 1)
}

// 添加编辑容器的端口段映射
const addEditPortRangeMapping = () => {
  if (!editContainerForm.value.port_range_id) return
  
  const startPort = selectedEditPortRange.value.start_port
  const endPort = Math.min(startPort + 10, selectedEditPortRange.value.end_port)
  
  editContainerForm.value.port_range_mappings.push({
    start_port: startPort,
    end_port: endPort
  })
}

// 移除编辑容器的端口段映射
const removeEditPortRangeMapping = (index) => {
  editContainerForm.value.port_range_mappings.splice(index, 1)
}

onMounted(() => {
  fetchContainers()
  startAutoRefresh()
  // 获取服务器列表
  axios.get('/api/servers').then(response => {
    servers.value = response.data.servers
  }).catch(error => {
    console.error('获取服务器列表失败:', error)
    ElMessage.error('获取服务器列表失败')
  })
  
  // 获取用户列表
  fetchUsers()
})

// 暴露方法给父组件
defineExpose({
  openCreateContainerDialog,
  fetchContainers
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.container-manager {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h2 {
  margin: 0;
  background: linear-gradient(90deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 24px;
}

.tab-actions {
  display: flex;
  gap: 10px;
}

.container-table-card {
  margin-bottom: 20px;
}

.container-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.container-actions .el-button,
.container-actions .el-dropdown {
  margin: 0 !important;
}

.container-actions .ssh-button {
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  border-color: transparent;
  color: #fff;
  display: inline-flex;
  align-items: center;
}

.container-actions .ssh-button--disabled {
  opacity: 0.7;
  color: #fff;
}

.container-actions .ssh-button--disabled:hover {
  transform: none;
  box-shadow: none;
}

.container-actions .ssh-button .dropdown-icon {
  margin-left: 4px;
  margin-right: 0;
}

.container-actions :deep(.el-dropdown) {
  display: inline-flex;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.image-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repository {
  font-weight: bold;
}

.image-description {
  font-size: 12px;
  color: #909399;
}

.port-mappings-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.port-mapping-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.port-mapping-arrow {
  margin: 0 5px;
  font-weight: bold;
  color: #409EFF;
}

.port-mapping-dash {
  margin: 0 5px;
  font-weight: bold;
  color: #409EFF;
}

/* 过滤表单样式（与管理页面一致） */
.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  padding-top: 4px;
}

.filter-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 在较窄的屏幕下优化按钮布局 */
@media (max-width: 768px) {
  .container-actions {
    gap: 4px;
    justify-content: flex-start;
  }

  .container-actions .el-button {
    font-size: 12px;
    padding: 4px 8px;
    min-width: auto;
  }

  .container-actions .el-button span {
    display: none;
  }
}
</style>
