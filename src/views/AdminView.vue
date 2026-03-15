<template>
  <div class="admin-view-wrapper">
    <div class="admin-container">
      <div class="main-content">
        <el-tabs v-model="activeTab" class="admin-tabs custom-tabs">
            <el-tab-pane name="users">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><UserFilled /></el-icon>
                  <span class="tab-text-full">用户管理</span>
                  <span class="tab-text-short">用户</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>用户管理</h2>
                <div class="tab-actions">
                  <el-button type="primary" @click="openAddUserDialog">
                    <el-icon><Plus /></el-icon>
                    <span>添加用户</span>
                  </el-button>
                  <el-button type="success" @click="openBatchAddUserDialog">
                    <el-icon><Document /></el-icon>
                    <span>批量添加用户</span>
                  </el-button>
                  <el-button 
                    type="danger" 
                    @click="confirmBatchDeleteUsers" 
                    :disabled="validSelectedUsers.length === 0"
                  >
                    <el-icon><Delete /></el-icon>
                    <span>批量删除</span>
                    <span v-if="validSelectedUsers.length > 0">（{{ validSelectedUsers.length }}）</span>
                  </el-button>
                </div>
              </div>
              
              <!-- 用户筛选 -->
              <el-card class="filter-card" shadow="hover">
                <el-form :model="userFilter" label-width="80px" class="filter-form">
                  <el-row :gutter="20">
                    <el-col :xs="24" :sm="12" :md="8" :lg="6">
                      <el-form-item label="用户名">
                        <el-input v-model="userFilter.keyword" placeholder="搜索用户名" clearable @clear="handleUserFilter" />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12" :md="8" :lg="6">
                      <el-form-item label="角色">
                        <el-select v-model="userFilter.role" placeholder="全部" clearable @clear="handleUserFilter" style="width: 100%">
                          <el-option label="全部" value="" />
                          <el-option label="管理员" value="admin" />
                          <el-option label="普通用户" value="user" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <!-- 分组/年级 一体下拉：含“本科生(全部) / 25级本科生 / 26级硕士生 / 博士生 / 教师 / 未分组”等 -->
                    <el-col :xs="24" :sm="12" :md="8" :lg="6">
                      <el-form-item label="分组">
                        <el-select v-model="userFilter.groupSelector" placeholder="全部" clearable style="width: 100%">
                          <el-option v-for="opt in groupFilterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12" :md="8" :lg="6">
                      <el-form-item label="激活状态">
                        <el-select v-model="userFilter.activationStatus" placeholder="全部" clearable @clear="handleUserFilter" style="width: 100%">
                          <el-option label="全部" value="" />
                          <el-option label="已激活" value="activated" />
                          <el-option label="未激活" value="not_activated" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="8" :lg="12" class="filter-buttons">
                      <el-button type="primary" @click="handleUserFilter">
                        <el-icon><Search /></el-icon>
                        <span>搜索</span>
                      </el-button>
                      <el-button @click="resetUserFilter">
                        <el-icon><RefreshRight /></el-icon>
                        <span>重置</span>
                      </el-button>
                    </el-col>
                  </el-row>
                </el-form>
              </el-card>

              <el-card class="table-card" shadow="hover">
                <el-table
                  v-loading="loading"
                  :data="pagedUsers"
                  style="width: 100%"
                  border
                  stripe
                  highlight-current-row
                  ref="usersTableRef"
                  @selection-change="onUserSelectionChange"
                >
                  <el-table-column type="selection" width="50" :selectable="isUserRowSelectable" />
                  <el-table-column prop="id" label="ID" min-width="40" />
                  <el-table-column prop="username" label="用户名" min-width="100" />
                  <el-table-column prop="group" label="分组" min-width="120">
                    <template #default="scope">
                      <el-tag v-bind="getGroupTagType(scope.row.group) ? { type: getGroupTagType(scope.row.group) } : {}">{{ scope.row.display_label || groupName(scope.row.group) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="role" label="角色" min-width="100">
                    <template #default="scope">
                      <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'success'">
                        {{ scope.row.role === 'admin' ? '管理员' : '普通用户' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="is_activated" label="激活状态" min-width="100">
                    <template #default="scope">
                      <el-tag :type="scope.row.is_activated ? 'success' : 'warning'">
                        {{ scope.row.is_activated ? '已激活' : '未激活' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="created_at" label="创建时间" min-width="100" />
                  <el-table-column label="操作" width="320" fixed="right">
                    <template #default="scope">
                      <el-button
                        size="small"
                        type="primary"
                        @click="openEditUserDialog(scope.row)"
                        :disabled="scope.row.id === currentUser.id || scope.row.username === 'admin' || (scope.row.role === 'admin' && username !== 'admin')"
                      >
                        <el-icon><Edit /></el-icon>
                        <span>编辑</span>
                      </el-button>
                      <el-button
                        size="small"
                        type="info"
                        @click="showUserTrends(scope.row.username)"
                      >
                        <el-icon><TrendCharts /></el-icon>
                        <span>趋势</span>
                      </el-button>
                      <el-button
                        size="small"
                        type="primary"
                        @click="showUserProcessReports(scope.row.username)"
                      >
                        <el-icon><Document /></el-icon>
                        <span>报表</span>
                      </el-button>
                      <el-button
                        size="small"
                        type="danger"
                        @click="confirmDeleteUser(scope.row)"
                        :disabled="scope.row.id === currentUser.id || scope.row.username === 'admin' || (scope.row.role === 'admin' && username !== 'admin')"
                      >
                        <el-icon><Delete /></el-icon>
                        <span>删除</span>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <!-- 分页 -->
                <div class="pagination-container">
                  <el-pagination
                    v-model:current-page="userPagination.page"
                    v-model:page-size="userPagination.pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="filteredUsers.length"
                    @size-change="handleUserSizeChange"
                    @current-change="handleUserCurrentChange"
                  />
                </div>
              </el-card>
            </el-tab-pane>
            
            <el-tab-pane name="announcements">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><Document /></el-icon>
                  <span class="tab-text-full">公告管理</span>
                  <span class="tab-text-short">公告</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>公告管理</h2>
                <div class="tab-actions">
                  <el-button type="primary" @click="openAddAnnouncementDialog">
                    <el-icon><Plus /></el-icon>
                    <span>添加公告</span>
                  </el-button>
                </div>
              </div>
              
              <announcement-manager ref="announcementManagerRef" />
            </el-tab-pane>
            
            <el-tab-pane name="settings" v-if="isSuperAdmin">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><SwitchButton /></el-icon>
                  <span class="tab-text-full">系统设置</span>
                  <span class="tab-text-short">设置</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>系统设置</h2>
                <div class="tab-actions">
                  <!-- 系统设置通常不需要操作按钮 -->
                </div>
              </div>

              <system-settings />
            </el-tab-pane>
            
            <el-tab-pane name="servers">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><Monitor /></el-icon>
                  <span class="tab-text-full">服务器管理</span>
                  <span class="tab-text-short">服务器</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>服务器管理</h2>
                <el-space class="tab-actions" :size="12" wrap>
                  <el-button type="primary" @click="openAddServerDialog">
                    <el-icon><Plus /></el-icon>
                    <span>添加服务器</span>
                  </el-button>
                  <el-button type="success" @click="openConfigureServerDialog">
                    <el-icon><Setting /></el-icon>
                    <span>配置服务器</span>
                  </el-button>
                  <el-dropdown
                    @command="handleBatchOperation"
                    :disabled="selectedServers.length === 0 || batchProcessing"
                    :class="{ 'batch-dropdown-disabled': selectedServers.length === 0 || batchProcessing }"
                  >
                    <el-button
                      type="warning"
                      :disabled="selectedServers.length === 0 || batchProcessing"
                      :loading="batchProcessing"
                    >
                      <el-icon v-if="!batchProcessing"><Operation /></el-icon>
                      <span v-if="batchProcessing">处理中...</span>
                      <span v-else>批量操作</span>
                      <span v-if="selectedServers.length > 0 && !batchProcessing">（{{ selectedServers.length }}）</span>
                      <el-icon v-if="!batchProcessing" class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="batchInstallAgent">
                          <el-icon><Download /></el-icon>
                          <span>批量安装代理</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="batchRestartAgent">
                          <el-icon><RefreshRight /></el-icon>
                          <span>批量重启代理</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="batchTest">
                          <el-icon><Link /></el-icon>
                          <span>批量测试连接</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-space>
              </div>
              
              <!-- 服务器列表 -->
              <div v-if="!selectedServer">
                <el-card class="table-card" shadow="hover">
                  <el-table
                    v-loading="serversStore.loading"
                    :data="serversStore.servers"
                    style="width: 100%"
                    border
                    @row-click="handleServerRowClick"
                    @selection-change="handleServerSelectionChange"
                    ref="serverTableRef"
                  >
                    <el-table-column type="selection" width="50" />
                    <el-table-column prop="id" label="ID" min-width="25" />
                    <el-table-column prop="display_order" label="显示顺序" min-width="60">
                      <template #default="scope">
                        <el-input-number 
                          v-model="scope.row.display_order" 
                          :min="1" 
                          :max="999" 
                          size="small"
                          controls-position="right"
                          style="width: 70px;"
                          @change="(value) => updateServerOrder(scope.row.id, value)"
                          @click.stop
                        />
                      </template>
                    </el-table-column>
                    <el-table-column label="显示/隐藏" min-width="55">
                      <template #default="scope">
                        <el-switch
                          v-model="scope.row.is_visible"
                          @change="(value) => updateServerVisibility(scope.row.id, value)"
                          @click.stop
                        />
                      </template>
                    </el-table-column>
                    <el-table-column prop="name" label="名称" min-width="60" />
                    <el-table-column prop="ip_address" label="IP地址" min-width="80" />
                    <el-table-column prop="port" label="SSH" min-width="40" />
                    <el-table-column label="上报" min-width="40">
                      <template #default="scope">
                        <el-tag v-if="scope.row.collection_interval" type="success">
                          {{ scope.row.collection_interval }} 秒
                        </el-tag>
                        <span v-else>默认</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="路由" min-width="90">
                      <template #default="scope">
                        <el-tag v-if="scope.row.route" type="info">
                          {{ formatRouteLabel(scope.row.route) }}
                        </el-tag>
                        <span v-else>未配置</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="状态" min-width="40">
                      <template #default="scope">
                        <el-tag :type="getStatusType(scope.row.status)">
                          {{ getStatusText(scope.row.status) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="gpu_count" label="GPU" min-width="35" />
                    <el-table-column label="最后在线" min-width="80">
                      <template #default="scope">
                        {{ formatLastOnline(scope.row.last_online) }}
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" min-width="240" fixed="right">
                      <template #default="scope">
                        <div class="server-actions">
                          <el-button
                            size="small"
                            type="primary"
                            @click.stop="viewServerDetail(scope.row)"
                          >
                            <el-icon><View /></el-icon>
                            <span>详情</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="success"
                            @click.stop="showServerToken(scope.row.id)"
                          >
                            <el-icon><Key /></el-icon>
                            <span>Token</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="primary"
                            @click.stop="installAgentForServer(scope.row)"
                            :disabled="scope.row.status === 'offline' || installingAgents[scope.row.id]"
                            :loading="!!installingAgents[scope.row.id]"
                          >
                            <el-icon><Download /></el-icon>
                            <span>安装代理</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="warning"
                            @click.stop="openEditServerDialog(scope.row)"
                          >
                            <el-icon><Edit /></el-icon>
                            <span>编辑</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="info"
                            @click.stop="testServerConnection(scope.row.id)"
                          >
                            <el-icon><Link /></el-icon>
                            <span>测试</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="primary"
                            @click.stop="openTerminal(scope.row)"
                          >
                            <el-icon><Monitor /></el-icon>
                            <span>远程登录</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="success"
                            @click.stop="goToServerResources(scope.row.id)"
                          >
                            <el-icon><Setting /></el-icon>
                            <span>资源管理</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="warning"
                            @click.stop="restartServerAgent(scope.row.id)"
                            :disabled="scope.row.status === 'offline'"
                          >
                            <el-icon><RefreshRight /></el-icon>
                            <span>重启代理</span>
                          </el-button>
                          <el-button
                            size="small"
                            type="danger"
                            @click.stop="restartServer(scope.row.id)"
                            :disabled="scope.row.status === 'offline'"
                          >
                            <el-icon><RefreshRight /></el-icon>
                            <span>重启服务器</span>
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="危险操作" width="100" fixed="right" align="center">
                      <template #default="scope">
                        <el-button
                          size="small"
                          type="danger"
                          @click.stop="confirmDeleteServer(scope.row)"
                        >
                          <el-icon><Delete /></el-icon>
                          <span>删除</span>
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </div>
                
              <!-- 服务器详情 -->
              <div v-else class="server-detail-container">
                <div class="tab-header">
                  <h2>{{ selectedServer.name }} 详情</h2>
                  <div class="tab-actions">
                    <el-button type="default" @click="backToServerList">
                      <el-icon><Back /></el-icon>
                      <span>返回服务器列表</span>
                    </el-button>
                  </div>
                </div>
                
                <el-card class="detail-card" shadow="hover">
                  <server-detail :server-id="selectedServer.id" />
                </el-card>
              </div>
            </el-tab-pane>

            <el-tab-pane name="routes">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><Connection /></el-icon>
                  <span class="tab-text-full">路由管理</span>
                  <span class="tab-text-short">路由</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>路由管理</h2>
                <div class="tab-actions">
                  <el-tag type="info" effect="dark">维护网段与域名映射，安装代理时自动下发</el-tag>
                </div>
              </div>
              <routes-manager />
            </el-tab-pane>
            
            <el-tab-pane name="containers">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><Box /></el-icon>
                  <span class="tab-text-full">容器管理</span>
                  <span class="tab-text-short">容器</span>
                  <el-badge v-if="pendingCount > 0" :value="pendingCount" class="container-tab-badge" />
                </div>
              </template>
              <div class="tab-header">
                <h2>容器管理</h2>
                <div class="tab-actions">
                  <el-button type="primary" @click="openCreateContainerDialog">
                    <el-icon><Plus /></el-icon>
                    <span>创建容器</span>
                  </el-button>
                  <el-button type="primary" @click="fetchContainers" :loading="containerLoading">
                    <el-icon><Refresh /></el-icon>
                    <span>刷新</span>
                  </el-button>
                </div>
              </div>
              
              <!-- 待审批申请列表 -->
              <pending-requests ref="pendingRequestsRef" @request-processed="handleRequestProcessed" />
              
              <!-- 容器管理器 -->
              <container-manager ref="containerManagerRef" />
            </el-tab-pane>
            
            <el-tab-pane name="logs">
              <template #label>
                <div class="custom-tab-label">
                  <el-icon><Document /></el-icon>
                  <span class="tab-text-full">操作日志</span>
                  <span class="tab-text-short">日志</span>
                </div>
              </template>
              <div class="tab-header">
                <h2>操作日志</h2>
                <div class="tab-actions">
                  <el-button type="primary" @click="refreshLogs">
                    <el-icon><Refresh /></el-icon>
                    <span>刷新日志</span>
                  </el-button>
                  <el-dropdown trigger="click" v-if="isSuperAdmin">
                    <el-button type="danger" :loading="cleanupLoading">
                      <el-icon><Delete /></el-icon>
                      <span>清理日志</span>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="() => confirmCleanup('all')">
                          删除全部
                        </el-dropdown-item>
                        <el-dropdown-item @click="() => confirmCleanup('older_than_days', 30)">
                          删除一个月以前
                        </el-dropdown-item>
                        <el-dropdown-item @click="() => confirmCleanup('older_than_days', 7)">
                          删除一个星期以前
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
              
              <log-manager ref="logManagerRef" :is-active="activeTab === 'logs'" />
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <!-- 终端对话框 -->
        <terminal-dialog 
          v-if="terminalServer"
          v-model="terminalDialogVisible" 
          :server-id="terminalServer.id"
          :server-name="terminalServer.name"
          :server-address="`${terminalServer.ip_address}:${terminalServer.port}`"
          :server-user="terminalServer.username"
          :auth-token="authStore.token"
        />
        
        <!-- 添加用户对话框 -->
        <el-dialog
          v-model="addUserDialogVisible"
          title="添加用户"
          width="30%"
          :close-on-click-modal="false"
        >
      <el-form :model="userForm" :rules="userFormRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" v-if="username === 'admin'" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组" prop="group">
          <el-select v-model="userForm.group" placeholder="请选择分组" style="width: 100%">
            <el-option label="未分组" value="unassigned" />
            <el-option label="本科生" value="undergrad" />
            <el-option label="硕士生" value="master" />
            <el-option label="博士生" value="phd" />
            <el-option label="教师" value="teacher" />
          </el-select>
        </el-form-item>
        <el-form-item label="年份" prop="entry_year" v-if="['undergrad','master'].includes(userForm.group)">
          <el-input-number v-model="userForm.entry_year" :min="2000" :max="2100" :step="1" placeholder="如 2025" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addUserDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm" :loading="submitting">确定</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 编辑用户对话框 -->
        <el-dialog
          v-model="editUserDialogVisible"
          title="编辑用户"
          width="30%"
          :close-on-click-modal="false"
        >
      <el-form :model="userForm" :rules="editUserFormRules" ref="editUserFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入新密码（留空则不修改）" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" v-if="username === 'admin'" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组" prop="group">
          <el-select v-model="userForm.group" placeholder="请选择分组" style="width: 100%">
            <el-option label="未分组" value="unassigned" />
            <el-option label="本科生" value="undergrad" />
            <el-option label="硕士生" value="master" />
            <el-option label="博士生" value="phd" />
            <el-option label="教师" value="teacher" />
          </el-select>
        </el-form-item>
        <el-form-item label="年份" prop="entry_year" v-if="['undergrad','master'].includes(userForm.group)">
          <el-input-number v-model="userForm.entry_year" :min="2000" :max="2100" :step="1" placeholder="如 2025" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editUserDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEditUserForm" :loading="submitting">确定</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 批量添加用户对话框 -->
        <el-dialog
          v-model="batchAddUserDialogVisible"
          title="批量添加用户"
          width="40%"
          :close-on-click-modal="false"
        >
      <el-form :model="batchUserForm" :rules="batchUserFormRules" ref="batchUserFormRef" label-width="80px">
        <el-form-item label="用户名列表" prop="usernames">
          <el-input v-model="batchUserForm.usernames" type="textarea" :rows="10" placeholder="请输入用户名列表，每行一个用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="batchUserForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="batchUserForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" v-if="username === 'admin'" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组" prop="group">
          <el-select v-model="batchUserForm.group" placeholder="请选择分组" style="width: 100%">
            <el-option label="未分组" value="unassigned" />
            <el-option label="本科生" value="undergrad" />
            <el-option label="硕士生" value="master" />
            <el-option label="博士生" value="phd" />
            <el-option label="教师" value="teacher" />
          </el-select>
        </el-form-item>
        <el-form-item label="年份" prop="entry_year" v-if="['undergrad','master'].includes(batchUserForm.group)">
          <el-input-number v-model="batchUserForm.entry_year" :min="2000" :max="2100" :step="1" placeholder="如 2025" />
          <div class="form-tip">本科生/硕士生必填；教师/博士生无需填写</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchAddUserDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitBatchUserForm" :loading="submitting">确定</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 添加服务器对话框 -->
        <el-dialog
          v-model="addServerDialogVisible"
          title="添加服务器"
          width="40%"
          :close-on-click-modal="false"
        >
      <el-form :model="serverForm" :rules="serverFormRules" ref="serverFormRef" label-width="100px">
        <el-form-item label="服务器名称" prop="name">
          <el-input v-model="serverForm.name" placeholder="请输入服务器名称" />
        </el-form-item>
        <el-form-item label="IP地址" prop="ip_address">
          <el-input v-model="serverForm.ip_address" placeholder="请输入IP地址" />
        </el-form-item>
        <el-form-item label="SSH端口" prop="port">
          <el-input-number v-model="serverForm.port" :min="1" :max="65535" :step="1" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="serverForm.username" placeholder="请输入SSH用户名" />
        </el-form-item>
        <el-form-item label="认证方式" prop="auth_type">
          <el-radio-group v-model="serverForm.auth_type">
            <el-radio value="password" label="密码">密码</el-radio>
            <el-radio value="ssh_key" label="SSH密钥">SSH密钥</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="serverForm.auth_type === 'password'">
          <el-input v-model="serverForm.password" type="password" placeholder="请输入SSH密码" show-password />
        </el-form-item>
        <el-form-item label="SSH密钥" prop="ssh_key" v-if="serverForm.auth_type === 'ssh_key'">
          <el-input v-model="serverForm.ssh_key" type="textarea" :rows="4" placeholder="请输入SSH私钥内容" />
        </el-form-item>
      <el-form-item label="显示顺序" prop="display_order">
        <el-input-number v-model="serverForm.display_order" :min="1" :max="999" :step="1" />
        <div class="form-tip">数字越小，在服务器概览中显示越靠前</div>
      </el-form-item>
      <el-form-item label="采集间隔" prop="collection_interval">
        <el-input-number
          v-model="serverForm.collection_interval"
          :min="1"
          :max="3600"
          :step="1"
          :value-on-clear="null"
          controls-position="right"
        />
        <div class="form-tip">单位：秒，留空表示使用代理默认策略。默认值 2 秒。</div>
      </el-form-item>
      <el-form-item label="路由器">
        <el-select v-model="serverForm.route_id" placeholder="请选择路由器" clearable filterable>
          <el-option
            v-for="route in routes"
            :key="route.id"
              :label="formatRouteLabel(route)"
              :value="route.id"
            />
          </el-select>
          <div class="form-tip">可选：指定路由后，安装代理时会自动写入对应的路由域名。</div>
        </el-form-item>
        <el-form-item label="在概览中显示" prop="is_visible">
          <el-switch v-model="serverForm.is_visible" />
          <div class="form-tip">开启后，该服务器将显示在服务器概览页面中</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addServerDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitServerForm" :loading="submitting">确定</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 编辑服务器对话框 -->
        <el-dialog
          v-model="editServerDialogVisible"
          title="编辑服务器"
          width="40%"
          :close-on-click-modal="false"
        >
      <el-form :model="serverForm" :rules="editServerFormRules" ref="editServerFormRef" label-width="100px">
        <el-form-item label="服务器名称" prop="name">
          <el-input v-model="serverForm.name" placeholder="请输入服务器名称" />
        </el-form-item>
        <el-form-item label="IP地址" prop="ip_address">
          <el-input v-model="serverForm.ip_address" placeholder="请输入IP地址" />
        </el-form-item>
        <el-form-item label="SSH端口" prop="port">
          <el-input-number v-model="serverForm.port" :min="1" :max="65535" :step="1" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="serverForm.username" placeholder="请输入SSH用户名" />
        </el-form-item>
        <el-form-item label="认证方式" prop="auth_type">
          <el-radio-group v-model="serverForm.auth_type">
            <el-radio value="password" label="密码">密码</el-radio>
            <el-radio value="ssh_key" label="SSH密钥">SSH密钥</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="serverForm.auth_type === 'password'">
          <el-input v-model="serverForm.password" type="password" placeholder="请输入新密码（留空则不修改）" show-password />
        </el-form-item>
        <el-form-item label="SSH密钥" prop="ssh_key" v-if="serverForm.auth_type === 'ssh_key'">
          <el-input v-model="serverForm.ssh_key" type="textarea" :rows="4" placeholder="请输入SSH私钥内容（留空则不修改）" />
        </el-form-item>
      <el-form-item label="显示顺序" prop="display_order">
        <el-input-number v-model="serverForm.display_order" :min="1" :max="999" :step="1" />
        <div class="form-tip">数字越小，在服务器概览中显示越靠前</div>
      </el-form-item>
      <el-form-item label="采集间隔" prop="collection_interval">
        <el-input-number
          v-model="serverForm.collection_interval"
          :min="1"
          :max="3600"
          :step="1"
          :value-on-clear="null"
          controls-position="right"
        />
        <div class="form-tip">单位：秒，留空表示保持当前设置。</div>
      </el-form-item>
      <el-form-item label="路由器">
        <el-select v-model="serverForm.route_id" placeholder="请选择路由器" clearable filterable>
          <el-option
            v-for="route in routes"
            :key="route.id"
              :label="formatRouteLabel(route)"
              :value="route.id"
            />
          </el-select>
          <div class="form-tip">留空表示该服务器不关联路由</div>
        </el-form-item>
        <el-form-item label="在概览中显示" prop="is_visible">
          <el-switch v-model="serverForm.is_visible" />
          <div class="form-tip">开启后，该服务器将显示在服务器概览页面中</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editServerDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEditServerForm" :loading="submitting">确定</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 修改密码对话框 -->
        <el-dialog
          v-model="changePasswordDialogVisible"
          title="修改密码"
          width="400px"
          center
          destroy-on-close
        >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="changePasswordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitChangePassword" :loading="passwordFormLoading">确认</el-button>
        </span>
      </template>
        </el-dialog>
        
        <!-- 服务器认证令牌对话框 -->
        <el-dialog
          v-model="tokenDialogVisible"
          title="服务器认证令牌与代理配置"
          width="60%"
          :close-on-click-modal="false"
          class="token-dialog"
        >
      <div class="token-container">
        <el-alert 
          title="重要提示" 
          type="info" 
          :closable="false"
          style="margin-bottom: 20px;"
        >
          此认证令牌用于代理程序注册和数据采集，请妥善保管。泄露后请及时重新生成。
        </el-alert>
        
        <div class="token-section">
          <h3 class="section-title">
            <el-icon><Key /></el-icon>
            认证令牌
          </h3>
          <div class="token-display">
            <el-input
              v-model="currentServerToken"
              readonly
              :type="showToken ? 'text' : 'password'"
              placeholder="认证令牌"
              size="large"
            >
              <template #append>
                <el-button @click="showToken = !showToken" type="primary" plain>
                  <el-icon><View v-if="!showToken" /><Hide v-else /></el-icon>
                </el-button>
              </template>
            </el-input>
            
            <div class="token-actions">
              <el-button type="primary" @click="copyTokenToClipboard" size="large">
                <el-icon><Document /></el-icon>
                <span>复制令牌</span>
              </el-button>
              
              <el-button type="warning" @click="confirmRegenerateToken" size="large">
                <el-icon><Refresh /></el-icon>
                <span>重新生成</span>
              </el-button>
            </div>
          </div>
        </div>
        
        <div class="install-section">
          <h3 class="section-title">
            <el-icon><Download /></el-icon>
            代理程序安装
          </h3>
          
          <el-tabs v-model="activeInstallTab" class="install-tabs">
            <el-tab-pane label="一键安装（推荐）" name="auto">
              <div class="install-method">
                <p class="method-desc">
                  <el-icon><InfoFilled /></el-icon>
                  复制以下命令在目标服务器上执行，将自动安装并配置代理程序
                </p>
                <div v-if="currentServerInstallCommand" class="install-command-container">
                  <el-input
                    v-model="currentServerInstallCommand"
                    readonly
                    type="textarea"
                    :rows="3"
                    class="install-command-input"
                    placeholder="安装命令"
                  />
                  <el-button type="primary" @click="copyInstallCommandToClipboard" size="large">
                    <el-icon><Document /></el-icon>
                    <span>复制命令</span>
                  </el-button>
                </div>
                
                <el-divider content-position="left">
                  <span class="divider-text">
                    <el-icon><Setting /></el-icon>
                    高级配置参数
                  </span>
                </el-divider>
                
                <div class="advanced-config">
                  <el-alert 
                    title="可选配置参数" 
                    type="success" 
                    :closable="false"
                    style="margin-bottom: 15px;"
                  >
                    安装脚本支持以下可选参数来自定义配置：
                  </el-alert>
                  
                  <div class="config-options">
                    <div class="config-item">
                      <h4>
                        <el-icon><Timer /></el-icon>
                        采集间隔配置
                      </h4>
                      <p>使用 <code>--collection-interval=N</code> 参数设置数据采集间隔（秒）</p>
                      <el-tag type="info" size="small">示例：--collection-interval=30 (每30秒采集一次)</el-tag>
                      <div class="config-note">
                        <el-icon><InfoFilled /></el-icon>
                        <span>默认：有凭据时为2秒，模板配置为60秒</span>
                      </div>
                    </div>
                    
                    <div class="config-item">
                      <h4>
                        <el-icon><Connection /></el-icon>
                        路由域名
                      </h4>
                      <p>使用 <code>--router-domain=域名</code> 参数指定路由器的公网域名</p>
                      <el-tag type="info" size="small">示例：--router-domain=router.example.com</el-tag>
                      <div class="config-note">
                        <el-icon><InfoFilled /></el-icon>
                        <span>如需兼容老格式，可继续使用 <code>网段前缀=域名</code> 的形式</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="example-commands">
                    <h4>
                      <el-icon><Document /></el-icon>
                      配置示例
                    </h4>
                    <pre class="code-example">
# 基础安装
curl -sSL {{ siteSettings.serverUrl || window.location.origin }}/api/agent/install_script | sudo bash -s -- --server-url={{ siteSettings.serverUrl || window.location.origin }} --auth-token={{ currentServerToken }} --server-id={{ currentServerId || '[SERVER_ID]' }}

# 自定义采集间隔为30秒
curl -sSL {{ siteSettings.serverUrl || window.location.origin }}/api/agent/install_script | sudo bash -s -- --server-url={{ siteSettings.serverUrl || window.location.origin }} --auth-token={{ currentServerToken }} --server-id={{ currentServerId || '[SERVER_ID]' }} --collection-interval=30

# 自定义路由域名映射
curl -sSL {{ siteSettings.serverUrl || window.location.origin }}/api/agent/install_script | sudo bash -s -- --server-url={{ siteSettings.serverUrl || window.location.origin }} --auth-token={{ currentServerToken }} --server-id={{ currentServerId || '[SERVER_ID]' }} --router-domain=router.example.com
                    </pre>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="手动配置" name="manual">
              <div class="install-method">
                <p class="method-desc">
                  <el-icon><InfoFilled /></el-icon>
                  适用于需要自定义安装路径或特殊配置的场景
                </p>
                <div class="manual-steps">
                  <el-steps direction="vertical" :active="3">
                    <el-step title="下载代理程序" description="从服务器下载GPU监控代理程序" />
                    <el-step title="配置认证信息" description="创建配置文件并设置认证令牌" />
                    <el-step title="启动代理服务" description="运行代理程序开始数据采集" />
                  </el-steps>
                </div>
                
                <div class="manual-config">
                  <h4>配置文件示例 (config.json)</h4>
                  <pre class="code-example">
{
  "server_url": "{{ siteSettings.serverUrl || window.location.origin }}",
  "auth_token": "{{ currentServerToken }}",
  "collection_interval": 60,
  "log_level": "INFO",
  "collect_gpu": true,
  "collect_cpu": true,
  "collect_docker": true,
  "collect_network": true,
  "router_domain": "router.example.com"
}
                  </pre>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="tokenDialogVisible = false">关闭</el-button>
        </div>
      </template>
        </el-dialog>
        
    <!-- 用户趋势图对话框 -->
    <UserTrendsChart
      v-model:visible="userTrendsDialogVisible"
      :username="selectedUsername"
      :avatar-url="selectedUserAvatar"
    />

    <!-- 用户任务运行报表对话框 -->
    <UserProcessReports
      v-model:visible="userProcessReportsDialogVisible"
      :username="selectedUsername"
      :avatar-url="selectedUserAvatar"
    />

    <ConfigureServerDialog
      v-model="configureServerDialogVisible"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useUsersStore } from '../stores/users'
import { useServersStore } from '../stores/servers'
import axios from '../utils/axios'
import ServerDetail from '../components/ServerDetail.vue'
import AnnouncementManager from '../components/AnnouncementManager.vue'
import SystemSettings from '../components/SystemSettings.vue'
import TerminalDialog from '../components/TerminalDialog.vue'
import ContainerManager from '../components/ContainerManager.vue'
import LogManager from '../components/LogManager.vue'
import PendingRequests from '../components/PendingRequests.vue'
import UserTrendsChart from '../components/UserTrendsChart.vue'
import UserProcessReports from '../components/UserProcessReports.vue'
import RoutesManager from '../components/RoutesManager.vue'
import ConfigureServerDialog from '../components/ConfigureServerDialog.vue'
import {
  Box, Check, Clock, Delete, Document, Edit, Loading, Plus, Refresh, Search, UserFilled, View, Warning,
  RefreshRight, SwitchButton, Monitor, Key, Download, Link, Setting, Back, Hide, InfoFilled, Timer, Connection, TrendCharts,
  ArrowDown, Operation
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const serversStore = useServersStore()

const username = ref(localStorage.getItem('username') || '')
const users = computed(() => usersStore.users)
const loading = computed(() => usersStore.loading)
const servers = computed(() => serversStore.servers)
const routes = computed(() => serversStore.routes)

// 使用计算属性获取当前用户，避免在渲染期间访问未定义的属性
const currentUser = computed(() => {
  const user = authStore.currentUser
  return user ? { ...user } : { id: null, role: null }
})

// 站点设置
const siteSettings = reactive({
  name: '',
  logo: '',
  subtitle: '',
  serverUrl: ''
})

// 待审批申请数据
const pendingRequests = ref([])

// 计算待审批数量
const pendingCount = computed(() => {
  return pendingRequests.value.filter(req => req.status === 'pending').length
})

// 获取待审批申请
const fetchPendingRequests = async () => {
  try {
    const response = await axios.get('/api/container-requests')
    pendingRequests.value = response.data.requests || []
  } catch (error) {
    console.error('获取待审批申请失败:', error)
    pendingRequests.value = []
  }
}

// 处理申请处理完成事件
const handleRequestProcessed = () => {
  // 刷新待审批申请列表
  fetchPendingRequests()
  
  // 通知父组件（MainLayout）刷新消息提醒
  // 通过全局事件或者直接调用MainLayout的方法
  window.dispatchEvent(new CustomEvent('refreshPendingCount'))
}

// 获取站点设置
const fetchSiteSettings = async () => {
  try {
    const response = await axios.get('/api/settings/site')
    siteSettings.name = response.data.site_name
    siteSettings.logo = response.data.site_logo
    siteSettings.subtitle = response.data.site_subtitle
    siteSettings.serverUrl = response.data.server_url || window.location.origin
  } catch (error) {
    console.error('获取站点设置失败:', error)
  }
}
const serversLoading = computed(() => serversStore.loading)

const ADMIN_TAB_STORAGE_KEY = 'gpu-monitor-admin-active-tab'
const VALID_ADMIN_TABS = ['users', 'announcements', 'settings', 'servers', 'routes', 'containers', 'logs']

// 标签页控制 - 使用URL参数保存当前标签页状态
const activeTab = ref(getInitialActiveTab())

// 初始加载时如果路由未带tab参数，补齐保持与状态同步
if (route.name === 'admin' && route.query.tab !== activeTab.value) {
  const params = { ...route.query, tab: activeTab.value }
  router.replace({ name: 'admin', query: params })
}

// 获取初始标签页，从URL参数或默认值
function getInitialActiveTab() {
  const tabParam = typeof route.query.tab === 'string' ? route.query.tab : null
  if (tabParam && VALID_ADMIN_TABS.includes(tabParam)) return tabParam

  const storedTab = localStorage.getItem(ADMIN_TAB_STORAGE_KEY)
  return VALID_ADMIN_TABS.includes(storedTab) ? storedTab : 'users'
}

// 监听标签页变化，更新URL参数和本地存储
watch(activeTab, (newTab) => {
  // 使用路由替换，确保$route.query 响应式更新，子组件可监听到
  const current = new URL(window.location)
  const params = Object.fromEntries(current.searchParams.entries())
  params.tab = newTab
  router.replace({ name: 'admin', query: params })
  localStorage.setItem(ADMIN_TAB_STORAGE_KEY, newTab)

  if (newTab === 'routes' && (!routes.value || routes.value.length === 0) && !serversStore.routesLoading) {
    serversStore.fetchRoutes()
  }
})

// 监听路由参数变化，保持activeTab与外部状态同步
watch(() => route.query.tab, (tab) => {
  if (typeof tab === 'string' && VALID_ADMIN_TABS.includes(tab) && tab !== activeTab.value) {
    activeTab.value = tab
  }
})

// 用户表单相关
const addUserDialogVisible = ref(false)
const editUserDialogVisible = ref(false)
const batchAddUserDialogVisible = ref(false)
const userFormRef = ref(null)
const editUserFormRef = ref(null)
const batchUserFormRef = ref(null)
const submitting = ref(false)
const userForm = reactive({
  username: '',
  password: '',
  role: 'user',
  group: 'unassigned',
  entry_year: null
})
const batchUserForm = reactive({
  usernames: '',
  password: '',
  role: 'user',
  group: 'unassigned',
  entry_year: null
})

// 用户筛选与分页
const userFilter = reactive({
  keyword: '',
  role: '', // ''=全部, 'admin', 'user'
  groupSelector: '', // ''=全部, 'unassigned'/'phd'/'teacher'/'undergrad:*'/'master:*'/'undergrad:2025'
  activationStatus: '' // ''=全部, 'activated'=已激活, 'not_activated'=未激活
})

const userPagination = reactive({
  page: 1,
  pageSize: 20
})

const filteredUsers = computed(() => {
  const kw = (userFilter.keyword || '').trim().toLowerCase()
  const role = (userFilter.role || '').trim()
  const sel = (userFilter.groupSelector || '').trim()
  const activation = (userFilter.activationStatus || '').trim()
  return (users.value || []).filter(u => {
    const matchKw = kw ? ((u.username || '').toLowerCase().includes(kw) || (u.display_label || '').toLowerCase().includes(kw)) : true
    const matchRole = role ? (u.role === role) : true
    let matchGroup = true
    if (sel) {
      if (sel === 'unassigned' || sel === 'phd' || sel === 'teacher') {
        matchGroup = (u.group === sel)
      } else if (sel === 'undergrad:*') {
        matchGroup = (u.group === 'undergrad')
      } else if (sel === 'master:*') {
        matchGroup = (u.group === 'master')
      } else if (sel.startsWith('undergrad:')) {
        const y = Number(sel.split(':')[1])
        matchGroup = (u.group === 'undergrad' && u.entry_year === y)
      } else if (sel.startsWith('master:')) {
        const y = Number(sel.split(':')[1])
        matchGroup = (u.group === 'master' && u.entry_year === y)
      }
    }
    let matchActivation = true
    if (activation) {
      if (activation === 'activated') {
        matchActivation = u.is_activated === true
      } else if (activation === 'not_activated') {
        matchActivation = u.is_activated === false
      }
    }
    return matchKw && matchRole && matchGroup && matchActivation
  })
})

const pagedUsers = computed(() => {
  const start = (userPagination.page - 1) * userPagination.pageSize
  const end = start + userPagination.pageSize
  return filteredUsers.value.slice(start, end)
})

const handleUserFilter = () => {
  userPagination.page = 1
}

const resetUserFilter = () => {
  userFilter.keyword = ''
  userFilter.role = ''
  userFilter.groupSelector = ''
  userFilter.activationStatus = ''
  userPagination.page = 1
}

const handleUserSizeChange = (size) => {
  userPagination.pageSize = size
  userPagination.page = 1
}

const handleUserCurrentChange = (page) => {
  userPagination.page = page
}

// 批量删除
const usersTableRef = ref(null)
const selectedUsers = ref([])
const onUserSelectionChange = (val) => {
  selectedUsers.value = val || []
}

// 行是否允许选择（禁用自身、超级管理员账户和非超级管理员删除管理员的情况）
const isUserRowSelectable = (row, index) => {
  if (!row) return false
  if (row.username === 'admin') return false
  if (row.id === currentUser.value.id) return false
  if (row.role === 'admin' && !isSuperAdmin.value) return false
  return true
}

// 有效选择（可删除的用户）
const validSelectedUsers = computed(() => {
  return (selectedUsers.value || []).filter(u => isUserRowSelectable(u))
})

const confirmBatchDeleteUsers = async () => {
  const list = validSelectedUsers.value
  if (!list.length) {
    ElMessage.warning('请选择可删除的用户')
    return
  }

  // 预检查容器资源
  let resp
  try {
    resp = await axios.get('/api/containers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
  } catch (e) {
    ElMessage.error('获取容器列表失败，无法执行批量删除前检查')
    return
  }
  const allContainers = resp.data?.containers || []
  const withContainers = list
    .map(u => ({ user: u, containers: allContainers.filter(c => c.user_id === u.id && c.status !== 'deleted') }))
    .filter(x => x.containers.length > 0)

  if (withContainers.length > 0) {
    const detail = withContainers
      .map(x => `用户 ${x.user.username} 拥有容器:\n` + x.containers.map(c => ` - ${c.container_name} @ ${c.server_name}`).join('\n'))
      .join('\n\n')
    ElMessageBox.alert(
      `${detail}\n\n请先在容器管理中删除或转移以上容器，再执行批量删除用户。`,
      '存在容器资源，无法删除',
      { type: 'warning' }
    )
    return
  }

  const names = list.map(u => u.username).join(', ')
  ElMessageBox.confirm(
    `确定要批量删除以下用户吗？\n${names}`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      for (const u of list) {
        await usersStore.deleteUser(u.id)
      }
      ElMessage.success(`已删除 ${list.length} 个用户`)
      if (usersTableRef.value) usersTableRef.value.clearSelection()
      selectedUsers.value = []
      await usersStore.fetchUsers()
      if ((userPagination.page - 1) * userPagination.pageSize >= filteredUsers.value.length) {
        userPagination.page = 1
      }
    } catch (e) {
      ElMessage.error('批量删除过程中出现错误')
    }
  }).catch(() => {})
}

// 服务器表单相关
const addServerDialogVisible = ref(false)
const configureServerDialogVisible = ref(false)
const editServerDialogVisible = ref(false)
const serverFormRef = ref(null)
const editServerFormRef = ref(null)
const testingConnection = ref(null)
const serverForm = reactive({
  id: null,
  name: '',
  ip_address: '',
  port: 22,
  username: '',
  auth_type: 'password',
  password: '',
  ssh_key: '',
  display_order: 50,  // 默认排序值，中间值便于前后调整
  is_visible: false,  // 默认不在概览中显示
  route_id: null,
  collection_interval: 2
})

// 服务器认证令牌相关
const tokenDialogVisible = ref(false)
const currentServerId = ref(null)
const currentServerToken = ref('')
const currentServerInstallCommand = ref('')
const showToken = ref(false)
const activeInstallTab = ref('auto')

// 终端对话框相关
const terminalDialogVisible = ref(false)
const terminalServer = ref(null)

// 服务器详情相关
const selectedServer = ref(null)

// 代理安装相关
const installingAgents = reactive({})

// 批量操作相关
const selectedServers = ref([])
const serverTableRef = ref(null)
const batchProcessing = ref(false)
const batchCancelled = ref(false)

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应为2-20个字符', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        // 检查用户名是否已存在
        const existingUser = users.value.find(user => user.username === value)
        if (existingUser) {
          callback(new Error('用户名已存在，请使用其他用户名'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入密码'))
          return
        }
        if (value.length < 6) {
          callback(new Error('密码长度至少为6位'))
          return
        }
        if (!/[a-zA-Z]/.test(value)) {
          callback(new Error('密码必须包含至少一个字母'))
          return
        }
        if (!/\d/.test(value)) {
          callback(new Error('密码必须包含至少一个数字'))
          return
        }
        callback()
      }, 
      trigger: 'blur' 
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  group: [
    { required: true, message: '请选择分组', trigger: 'change' }
  ],
  entry_year: [
    {
      validator: (rule, value, callback) => {
        if (['undergrad','master'].includes(userForm.group)) {
          if (value === null || value === undefined || value === '') {
            callback(new Error('请填写年份'))
            return
          }
          const v = Number(value)
          if (!Number.isInteger(v) || v < 2000 || v > 2100) {
            callback(new Error('年份需为2000-2100的整数'))
            return
          }
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

const editUserFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应为2-20个字符', trigger: 'blur' }
  ],
  password: [
    { 
      validator: (rule, value, callback) => {
        // 如果密码为空，则不验证（编辑时可以不修改密码）
        if (!value || !value.trim()) {
          callback()
          return
        }
        if (value.length < 6) {
          callback(new Error('密码长度至少为6位'))
          return
        }
        if (!/[a-zA-Z]/.test(value)) {
          callback(new Error('密码必须包含至少一个字母'))
          return
        }
        if (!/\d/.test(value)) {
          callback(new Error('密码必须包含至少一个数字'))
          return
        }
        callback()
      }, 
      trigger: 'blur' 
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  group: [
    { required: true, message: '请选择分组', trigger: 'change' }
  ],
  entry_year: [
    {
      validator: (rule, value, callback) => {
        if (['undergrad','master'].includes(userForm.group)) {
          if (value === null || value === undefined || value === '') {
            callback(new Error('请填写年份'))
            return
          }
          const v = Number(value)
          if (!Number.isInteger(v) || v < 2000 || v > 2100) {
            callback(new Error('年份需为2000-2100的整数'))
            return
          }
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

const batchUserFormRules = {
  usernames: [
    { required: true, message: '请输入用户名列表', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入密码'))
          return
        }
        if (value.length < 6) {
          callback(new Error('密码长度至少为6位'))
          return
        }
        if (!/[a-zA-Z]/.test(value)) {
          callback(new Error('密码必须包含至少一个字母'))
          return
        }
        if (!/\d/.test(value)) {
          callback(new Error('密码必须包含至少一个数字'))
          return
        }
        callback()
      }, 
      trigger: 'blur' 
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  group: [
    { required: true, message: '请选择分组', trigger: 'change' }
  ],
  entry_year: [
    {
      validator: (rule, value, callback) => {
        if (['undergrad','master'].includes(batchUserForm.group)) {
          if (value === null || value === undefined || value === '') {
            callback(new Error('请填写年份'))
            return
          }
          const v = Number(value)
          if (!Number.isInteger(v) || v < 2000 || v > 2100) {
            callback(new Error('年份需为2000-2100的整数'))
            return
          }
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

const serverFormRules = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' }
  ],
  ip_address: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP地址格式不正确', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口号范围为1-65535', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur', validator: (rule, value, callback) => {
      if (serverForm.auth_type === 'password' && !value) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    }}
  ],
  ssh_key: [
    { required: true, message: '请输入SSH密钥', trigger: 'blur', validator: (rule, value, callback) => {
      if (serverForm.auth_type === 'ssh_key' && !value) {
        callback(new Error('请输入SSH密钥'))
      } else {
        callback()
      }
    }}
  ],
  collection_interval: [
    {
      validator: (rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback()
          return
        }
        if (!Number.isInteger(value) || value < 1 || value > 3600) {
          callback(new Error('采集间隔需为1-3600之间的整数'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const editServerFormRules = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' }
  ],
  ip_address: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP地址格式不正确', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口号范围为1-65535', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  collection_interval: [
    {
      validator: (rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback()
          return
        }
        if (!Number.isInteger(value) || value < 1 || value > 3600) {
          callback(new Error('采集间隔需为1-3600之间的整数'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 修改密码相关
const changePasswordDialogVisible = ref(false)
const userTrendsDialogVisible = ref(false)
const userProcessReportsDialogVisible = ref(false)
const selectedUsername = ref('')
const selectedUserAvatar = ref('')
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
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
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


const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// 设置定时刷新
const setupAutoRefresh = () => {
  stopAutoRefresh()
  
  refreshInterval.value = setInterval(async () => {
    try {
      await serversStore.fetchServers()
    } catch (error) {
      console.error('自动刷新服务器列表失败:', error)
    }
  }, 30000)
}

watch(terminalDialogVisible, (visible) => {
  if (visible) {
    stopAutoRefresh()
  } else {
    serversStore.fetchServers().catch(error => {
      console.error('终端关闭后刷新服务器列表失败:', error)
    })
    setupAutoRefresh()
  }
})

watch([users, selectedUsername], ([list, name]) => {
  if (!name) {
    selectedUserAvatar.value = ''
    return
  }
  const target = list.find(user => user.username === name)
  selectedUserAvatar.value = target?.avatar_url || ''
}, { immediate: true })

onMounted(async () => {
  try {
    await fetchSiteSettings()
    await fetchUsers()
    await fetchServers()
    await fetchPendingRequests()
    
    // 每30秒刷新一次待审批数量
    pendingRequestsInterval = setInterval(fetchPendingRequests, 30000)
    
    // 设置定时刷新
    setupAutoRefresh()
  } catch (error) {
    console.error('AdminView 初始化失败:', error)
    ElMessage.error('管理面板初始化失败，请刷新页面重试')
  }
})

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  stopAutoRefresh()
  if (pendingRequestsInterval) {
    clearInterval(pendingRequestsInterval)
    pendingRequestsInterval = null
  }
})

// 获取在线服务器数量
const getOnlineServersCount = () => {
  return servers.value.filter(server => server.status === 'online').length
}

// 获取总GPU数量
const getTotalGpuCount = () => {
  return servers.value.reduce((total, server) => total + (server.gpu_count || 0), 0)
}

// 获取服务器状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'online': return 'success'
    case 'offline': return 'danger'
    case 'pending': return 'warning'
    default: return 'info'
  }
}

// 获取服务器状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'online': return '在线'
    case 'offline': return '离线'
    case 'pending': return '待连接'
    default: return '未知'
  }
}

const formatRouteLabel = (route) => {
  if (!route) return '未配置'
  const segments = []
  if (route.name) segments.push(route.name)
  if (route.domain) segments.push(route.domain)
  if (route.router_mgmt_ip) segments.push(`管理IP:${route.router_mgmt_ip}`)
  if (!segments.length && route.id) segments.push(`ID:${route.id}`)
  return segments.join(' / ')
}

// 分组显示名
const groupName = (code) => {
  switch (code) {
    case 'undergrad': return '本科生'
    case 'master': return '硕士生'
    case 'phd': return '博士生'
    case 'teacher': return '教师'
    case 'unassigned': return '未分组'
    default: return code || '未分组'
  }
}

// 分组标签颜色类型
const getGroupTagType = (code) => {
  switch (code) {
    case 'undergrad': return 'success'    // 绿色 - 本科生
    case 'master': return 'primary'       // 蓝色 - 硕士生
    case 'phd': return 'warning'          // 橙色 - 博士生
    case 'teacher': return 'danger'       // 红色 - 教师
    case 'unassigned': return null        // 默认色 - 未分组
    default: return null
  }
}

// 根据分组与年份生成显示文案（与后端规则一致）
const groupDisplay = (code, year) => {
  if ((code === 'undergrad' || code === 'master') && year) {
    const yy = Number(year) % 100
    return `${String(yy).padStart(2, '0')}级${groupName(code)}`
  }
  return groupName(code)
}

// 分组筛选选项（动态：含“本科生(全部)”和各年级项）
const groupFilterOptions = computed(() => {
  const opts = [
    { value: '', label: '全部' },
    { value: 'unassigned', label: '未分组' },
    { value: 'undergrad:*', label: '本科生（全部）' },
    { value: 'master:*', label: '硕士生（全部）' },
    { value: 'phd', label: '博士生' },
    { value: 'teacher', label: '教师' }
  ]
  // 收集现有年级（仅本科/硕士）
  const yearsUndergrad = new Set()
  const yearsMaster = new Set()
  for (const u of (users.value || [])) {
    if ((u.group === 'undergrad' || u.group === 'master') && u.entry_year) {
      const y = Number(u.entry_year)
      if (Number.isInteger(y)) {
        if (u.group === 'undergrad') yearsUndergrad.add(y)
        if (u.group === 'master') yearsMaster.add(y)
      }
    }
  }
  const sortDesc = (a, b) => b - a
  Array.from(yearsUndergrad).sort(sortDesc).forEach(y => {
    opts.push({ value: `undergrad:${y}`, label: groupDisplay('undergrad', y) })
  })
  Array.from(yearsMaster).sort(sortDesc).forEach(y => {
    opts.push({ value: `master:${y}`, label: groupDisplay('master', y) })
  })
  return opts
})

// 格式化最后在线时间
const formatLastOnline = (lastOnline) => {
  if (!lastOnline) return '未知'
  return new Date(lastOnline).toLocaleString('zh-CN')
}

// 用户相关方法
const fetchUsers = async () => {
  try {
    await usersStore.fetchUsers()
  } catch (error) {
    ElMessage.error('获取用户列表失败')
  }
}


const openAddUserDialog = () => {
  resetUserForm()
  addUserDialogVisible.value = true
}

const openEditUserDialog = (user) => {
  resetUserForm()
  userForm.id = user.id
  userForm.username = user.username
  userForm.role = user.role
  userForm.group = user.group || 'unassigned'
  userForm.entry_year = user.entry_year || null
  editUserDialogVisible.value = true
}

const openBatchAddUserDialog = () => {
  resetBatchUserForm()
  batchAddUserDialogVisible.value = true
}

const resetUserForm = () => {
  userForm.id = null
  userForm.username = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.group = 'unassigned'
  userForm.entry_year = null
  
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
  if (editUserFormRef.value) {
    editUserFormRef.value.resetFields()
  }
}

const resetBatchUserForm = () => {
  batchUserForm.usernames = ''
  batchUserForm.password = ''
  batchUserForm.role = 'user'
  batchUserForm.group = 'unassigned'
  batchUserForm.entry_year = null
  
  if (batchUserFormRef.value) {
    batchUserFormRef.value.resetFields()
  }
}

const submitUserForm = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const result = await usersStore.addUser({
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
          group: userForm.group,
          entry_year: ['undergrad','master'].includes(userForm.group) ? userForm.entry_year : null
        })

        if (result.success) {
          ElMessage.success('用户添加成功')
          addUserDialogVisible.value = false
          resetUserForm()
        } else {
          // 处理冲突检测等错误
          ElMessage.error(result.error || '添加用户失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '添加用户失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const submitEditUserForm = async () => {
  if (!editUserFormRef.value) return
  
  await editUserFormRef.value.validate(async (valid) => {
    if (valid) {
      // 检查是否是当前用户，且尝试将自己从管理员降级为普通用户
      if (userForm.id === currentUser.id && 
          currentUser.role === 'admin' && 
          userForm.role !== 'admin') {
        ElMessage.error('不能将自己的管理员身份更改为普通用户')
        return
      }
      
      submitting.value = true
      
      const updateData = {
        username: userForm.username,
        role: userForm.role,
        group: userForm.group,
        entry_year: ['undergrad','master'].includes(userForm.group) ? userForm.entry_year : null
      }
      
      // 只有当密码字段有值且不为空时才更新密码
      if (userForm.password && userForm.password.trim()) {
        updateData.password = userForm.password.trim()
      }
      
      try {
        await usersStore.updateUser(userForm.id, updateData)
        ElMessage.success('用户信息更新成功')
        editUserDialogVisible.value = false
        resetUserForm()
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '更新用户失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const submitBatchUserForm = async () => {
  if (!batchUserFormRef.value) return
  
  await batchUserFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      
      const usernames = batchUserForm.usernames.trim().split('\n')
      const usersData = usernames.map(username => ({
        username,
        password: batchUserForm.password,
        role: batchUserForm.role,
        group: batchUserForm.group,
        entry_year: ['undergrad','master'].includes(batchUserForm.group) ? batchUserForm.entry_year : null
      }))
      
      try {
        const result = await usersStore.addUsers(usersData)

        if (result.success) {
          ElMessage.success('批量添加用户成功')
          batchAddUserDialogVisible.value = false
          resetBatchUserForm()
        } else {
          // 处理冲突检测等错误
          ElMessage.error(result.error || '批量添加用户失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '批量添加用户失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const findUserAvatar = (name) => {
  const target = users.value.find(user => user.username === name)
  return target?.avatar_url || ''
}

// 显示用户趋势图
const showUserTrends = (username) => {
  selectedUsername.value = username
  selectedUserAvatar.value = findUserAvatar(username)
  userTrendsDialogVisible.value = true
}

// 显示用户任务运行报表
const showUserProcessReports = (username) => {
  selectedUsername.value = username
  selectedUserAvatar.value = findUserAvatar(username)
  userProcessReportsDialogVisible.value = true
}

const confirmDeleteUser = async (user) => {
  // 检查是否尝试删除自己
  if (user.id === currentUser.id) {
    ElMessage.error('不能删除自己的账户')
    return
  }
  // 预检查容器资源
  try {
    const resp = await axios.get('/api/containers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    const containers = (resp.data?.containers || []).filter(c => c.user_id === user.id && c.status !== 'deleted')
    if (containers.length > 0) {
      const detail = containers.map(c => ` - ${c.container_name} @ ${c.server_name}`).join('\n')
      ElMessageBox.alert(
        `用户 ${user.username} 仍拥有以下容器：\n${detail}\n\n请先在容器管理中删除或转移以上容器，再删除该用户。`,
        '存在容器资源，无法删除',
        { type: 'warning' }
      )
      return
    }
  } catch (e) {
    ElMessage.error('获取容器列表失败，无法执行删除前检查')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await usersStore.deleteUser(user.id)
      ElMessage.success('用户删除成功')
    } catch (error) {
      ElMessage.error(error.response?.data?.msg || '删除用户失败')
    }
  }).catch(() => {})
}

// 定时器
const refreshInterval = ref(null)
let pendingRequestsInterval = null

// 子组件操作相关
const announcementManagerRef = ref(null)
const containerManagerRef = ref(null)
const logManagerRef = ref(null)
const pendingRequestsRef = ref(null)
const containerLoading = ref(false)
const cleanupLoading = ref(false)

// 公告管理操作
const openAddAnnouncementDialog = () => {
  if (announcementManagerRef.value) {
    announcementManagerRef.value.openAddAnnouncementDialog()
  }
}

// 容器管理操作
const openCreateContainerDialog = () => {
  if (containerManagerRef.value) {
    containerManagerRef.value.openCreateContainerDialog()
  }
}

const fetchContainers = () => {
  if (containerManagerRef.value) {
    containerManagerRef.value.fetchContainers()
  }
}

// 日志管理操作
const refreshLogs = () => {
  if (logManagerRef.value) {
    logManagerRef.value.refreshLogs()
  }
}

const confirmCleanup = (mode, days) => {
  if (logManagerRef.value) {
    logManagerRef.value.confirmCleanup(mode, days)
  }
}

// 管理员权限检查
const isSuperAdmin = computed(() => {
  return localStorage.getItem('username') === 'admin' && localStorage.getItem('userRole') === 'admin'
})

// 服务器相关方法
const fetchServers = async () => {
  try {
    await Promise.all([
      serversStore.fetchServers(),
      serversStore.fetchRoutes()
    ])
  } catch (error) {
    ElMessage.error('获取服务器列表失败')
  }
}

const openAddServerDialog = () => {
  resetServerForm()
  addServerDialogVisible.value = true
}

const openConfigureServerDialog = () => {
  configureServerDialogVisible.value = true
}

const openEditServerDialog = (server) => {
  resetServerForm()
  serverForm.id = server.id
  serverForm.name = server.name
  serverForm.ip_address = server.ip_address
  serverForm.port = server.port
  serverForm.username = server.username
  serverForm.display_order = server.display_order || 50
  serverForm.is_visible = server.is_visible || false
  serverForm.route_id = server.route?.id || null
  serverForm.collection_interval = server.collection_interval ?? null
  // 不回显密码和SSH密钥，需要用户重新输入
  serverForm.auth_type = 'password' // 默认选择密码认证
  editServerDialogVisible.value = true
}

const resetServerForm = () => {
  serverForm.id = null
  serverForm.name = ''
  serverForm.ip_address = ''
  serverForm.port = 22
  serverForm.username = ''
  serverForm.auth_type = 'password'
  serverForm.password = ''
  serverForm.ssh_key = ''
  serverForm.display_order = 50
  serverForm.is_visible = false
  serverForm.route_id = null
  serverForm.collection_interval = 2
  
  if (serverFormRef.value) {
    serverFormRef.value.resetFields()
  }
  if (editServerFormRef.value) {
    editServerFormRef.value.resetFields()
  }
}

const submitServerForm = async () => {
  if (!serverFormRef.value) return
  
  await serverFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      
      const serverData = {
        name: serverForm.name,
        ip_address: serverForm.ip_address,
        port: serverForm.port,
        username: serverForm.username,
        display_order: serverForm.display_order,
        is_visible: serverForm.is_visible ? 1 : 0,
        route_id: serverForm.route_id ?? null
      }

      if (serverForm.collection_interval === null || serverForm.collection_interval === undefined || serverForm.collection_interval === '') {
        serverData.collection_interval = null
      } else {
        serverData.collection_interval = Number(serverForm.collection_interval)
      }

      // 根据认证方式添加密码或SSH密钥
      if (serverForm.auth_type === 'password') {
        serverData.password = serverForm.password
      } else {
        serverData.ssh_key = serverForm.ssh_key
      }
      
      try {
        // 添加服务器并获取返回数据
        const response = await serversStore.addServer(serverData)
        ElMessage.success('服务器添加成功')
        addServerDialogVisible.value = false
        resetServerForm()
        
        // 显示认证令牌和安装命令
        if (response && response.server_id && response.auth_token) {
          currentServerId.value = response.server_id
          currentServerToken.value = response.auth_token
          // 保存安装命令
          if (response.install_command) {
            currentServerInstallCommand.value = response.install_command
          }
          // 显示令牌对话框
          tokenDialogVisible.value = true
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '添加服务器失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const submitEditServerForm = async () => {
  if (!editServerFormRef.value) return
  
  await editServerFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      
      const serverData = {
        name: serverForm.name,
        ip_address: serverForm.ip_address,
        port: serverForm.port,
        username: serverForm.username,
        display_order: serverForm.display_order,
        is_visible: serverForm.is_visible ? 1 : 0,
        route_id: serverForm.route_id ?? null
      }

      if (serverForm.collection_interval !== undefined) {
        if (serverForm.collection_interval === null || serverForm.collection_interval === '') {
          serverData.collection_interval = null
        } else {
          serverData.collection_interval = Number(serverForm.collection_interval)
        }
      }

      // 根据认证方式添加密码或SSH密钥，只有当有值时才更新
      if (serverForm.auth_type === 'password' && serverForm.password) {
        serverData.password = serverForm.password
      } else if (serverForm.auth_type === 'ssh_key' && serverForm.ssh_key) {
        serverData.ssh_key = serverForm.ssh_key
      }
      
      try {
        await serversStore.updateServer(serverForm.id, serverData)
        ElMessage.success('服务器信息更新成功')
        editServerDialogVisible.value = false
        resetServerForm()
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '更新服务器失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const confirmDeleteServer = (server) => {
  ElMessageBox.confirm(
    `确定要删除服务器 "${server.name}" 吗？此操作不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await serversStore.deleteServer(server.id)
      ElMessage.success('服务器删除成功')
    } catch (error) {
      ElMessage.error(error.response?.data?.msg || '删除服务器失败')
    }
  }).catch(() => {})
}

const testServerConnection = async (serverId) => {
  testingConnection.value = serverId
  try {
    const result = await serversStore.testServerConnection(serverId)
    ElMessage.success(result.msg || '连接测试成功')
    // 刷新服务器列表以更新状态
    await fetchServers()
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '连接测试失败')
  } finally {
    testingConnection.value = null
  }
}

const showServerToken = async (serverId) => {
  try {
    currentServerId.value = serverId
    const token = await serversStore.getServerToken(serverId)
    currentServerToken.value = token
    tokenDialogVisible.value = true
    
    // 使用系统设置中的服务器URL
    const baseUrl = siteSettings.serverUrl || window.location.origin
    // 生成正确的安装命令
    let installCommand = `curl -sSL ${baseUrl}/api/agent/install_script | sudo bash -s -- --server-url=${baseUrl} --auth-token=${token} --server-id=${serverId}`

    const server = servers.value.find(s => s.id === serverId) || serversStore.currentServer
    if (server && server.route && server.route.domain) {
      installCommand += ` --router-domain=${server.route.domain}`
    }
    if (server && server.collection_interval) {
      installCommand += ` --collection-interval=${server.collection_interval}`
    }

    currentServerInstallCommand.value = installCommand
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '获取认证令牌失败')
  }
}

// 复制认证令牌到剪贴板
const copyTokenToClipboard = () => {
  navigator.clipboard.writeText(currentServerToken.value)
    .then(() => {
      ElMessage.success('认证令牌已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}

// 复制安装命令到剪贴板
const copyInstallCommandToClipboard = () => {
  navigator.clipboard.writeText(currentServerInstallCommand.value)
    .then(() => {
      ElMessage.success('安装命令已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}

const confirmRegenerateToken = () => {
  ElMessageBox.confirm(
    '重新生成令牌将使当前令牌失效，所有使用旧令牌的代理程序将无法连接。确定要继续吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const result = await serversStore.regenerateServerToken(currentServerId.value)
      currentServerToken.value = result.auth_token
      
      // 更新安装命令，使用系统设置中的服务器URL
      const baseUrl = siteSettings.serverUrl || window.location.origin
      const server = servers.value.find(s => s.id === currentServerId.value) || serversStore.currentServer
      let installCommand = `curl -sSL ${baseUrl}/api/agent/install_script | sudo bash -s -- --server-url=${baseUrl} --auth-token=${result.auth_token} --server-id=${currentServerId.value}`
      if (server && server.route && server.route.domain) {
        installCommand += ` --router-domain=${server.route.domain}`
      }
      if (server && server.collection_interval) {
        installCommand += ` --collection-interval=${server.collection_interval}`
      }
      currentServerInstallCommand.value = installCommand
      
      ElMessage.success('认证令牌已重新生成')
    } catch (error) {
      ElMessage.error(error.response?.data?.msg || '重新生成令牌失败')
    }
  }).catch(() => {})
}

// 刷新服务器列表
const refreshServers = async () => {
  try {
    await Promise.all([
      serversStore.fetchServers(),
      serversStore.fetchRoutes()
    ])
    ElMessage.success('服务器列表已刷新')
  } catch (error) {
    ElMessage.error('刷新服务器列表失败')
  }
}

const restartAgentAfterInstall = async (serverId) => {
  try {
    const response = await axios.post(`/api/servers/${serverId}/restart_agent`, {})
    if (response.data.success) {
      ElMessage.success(response.data.msg || 'GPU监控代理已重启')
      await Promise.all([
        serversStore.fetchServers(),
        serversStore.fetchRoutes()
      ])
    } else {
      ElMessage.error(response.data.msg || '代理重启失败')
    }
  } catch (error) {
    console.error('重启代理失败:', error)
    ElMessage.error(error.response?.data?.msg || '代理重启失败')
  }
}

const installAgentForServer = async (server) => {
  if (!server || !server.id) return

  const serverId = server.id
  installingAgents[serverId] = true
  try {
    const response = await axios.post(`/api/servers/${serverId}/install_agent`, {})

    if (response.data.success) {
      ElMessage.success(response.data.message || '代理安装成功，正在重启')
      await restartAgentAfterInstall(serverId)
    } else {
      ElMessage.error(response.data.message || '代理安装失败')
    }
  } catch (error) {
    console.error('远程安装代理失败:', error)
    ElMessage.error(error.response?.data?.message || '远程安装代理失败')
  } finally {
    installingAgents[serverId] = false
  }
}

// 查看服务器详情
const viewServerDetail = (server) => {
  selectedServer.value = server
}

// 返回服务器列表
const backToServerList = () => {
  selectedServer.value = null
}

// 处理服务器行点击
const handleServerRowClick = (row) => {
  viewServerDetail(row)
}

// 更新服务器显示顺序
const updateServerOrder = async (serverId, displayOrder) => {
  try {
    await axios.put(`/api/servers/${serverId}`, { display_order: displayOrder })
    ElMessage.success('服务器显示顺序更新成功')
    // 不需要重新加载整个列表，因为我们已经在UI中更新了值
  } catch (error) {
    console.error('更新服务器显示顺序失败:', error)
    ElMessage.error('更新服务器显示顺序失败: ' + (error.response?.data?.msg || error.message))
  }
}

// 更新服务器在概览中的可见性
const updateServerVisibility = async (serverId, isVisible) => {
  try {
    await axios.put(`/api/servers/${serverId}`, { is_visible: isVisible ? 1 : 0 })
    ElMessage.success(`服务器已${isVisible ? '显示' : '隐藏'}在概览中`)
    // 不需要重新加载整个列表，因为我们已经在UI中更新了值
  } catch (error) {
    console.error('更新服务器可见性失败:', error)
    ElMessage.error('更新服务器可见性失败: ' + (error.response?.data?.msg || error.message))
  }
}

const openTerminal = (server) => {
  terminalServer.value = server;
  // 获取服务器的认证令牌并打开终端对话框
  axios.get(`/api/servers/${server.id}/token`, {
    headers: {
      Authorization: `Bearer ${authStore.token}`
    }
  })
  .then(response => {
    terminalDialogVisible.value = true;
  })
  .catch(error => {
    ElMessage.error('获取服务器令牌失败，无法使用远程终端');
    console.error('获取服务器令牌失败:', error);
  });
}

const goToServerResources = (serverId) => {
  router.push(`/server/${serverId}/resources`)
}

const restartServer = async (serverId) => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      '确定要重启此服务器吗？服务器将立即关闭并重新启动，所有运行中的任务将被中断。',
      '重启确认',
      {
        confirmButtonText: '确认重启',
        cancelButtonText: '取消',
        type: 'danger',
      }
    )
    
    // 调用API
    const response = await axios.post(`/api/servers/${serverId}/restart`);
    
    if (response.data.success) {
      ElMessage({
        message: response.data.msg || '服务器重启命令已发送',
        type: 'success'
      })
      // 重启后刷新服务器状态
      refreshServers()
    } else {
      ElMessage({
        message: response.data.msg || '服务器重启失败',
        type: 'error'
      })
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage({
        message: '操作失败: ' + (error.message || '未知错误'),
        type: 'error'
      })
    }
  }
}

const restartServerAgent = async (serverId) => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      '确定要重启此服务器的GPU监控代理吗？',
      '重启确认',
      {
        confirmButtonText: '确认重启',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const isLoading = ref(true);
    
    // 调用API
    const response = await axios.post(`/api/servers/${serverId}/restart_agent`);
    
    if (response.data.success) {
      ElMessage({
        message: response.data.msg || 'GPU监控代理重启成功',
        type: 'success'
      })
      // 重启后刷新服务器状态
      refreshServers()
    } else {
      ElMessage({
        message: response.data.msg || 'GPU监控代理重启失败',
        type: 'error'
      })
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage({
        message: '操作失败: ' + (error.message || '未知错误'),
        type: 'error'
      })
    }
  } finally {
    // 不需要修改loading状态
  }
}

// 批量操作相关方法
const handleServerSelectionChange = (selection) => {
  selectedServers.value = selection
}

const handleBatchOperation = async (command) => {
  if (selectedServers.value.length === 0) {
    ElMessage.warning('请先选择要操作的服务器')
    return
  }

  let operationName = ''
  let confirmMessage = ''

  switch (command) {
    case 'batchInstallAgent':
      operationName = '批量安装代理'
      confirmMessage = `确定要为选中的 ${selectedServers.value.length} 台服务器安装代理吗？`
      break
    case 'batchRestartAgent':
      operationName = '批量重启代理'
      confirmMessage = `确定要重启选中的 ${selectedServers.value.length} 台服务器的代理吗？`
      break
    case 'batchTest':
      operationName = '批量测试连接'
      confirmMessage = `确定要测试选中的 ${selectedServers.value.length} 台服务器的连接吗？`
      break
    default:
      return
  }

  try {
    await ElMessageBox.confirm(
      confirmMessage,
      operationName,
      {
        confirmButtonText: '确认执行',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    batchProcessing.value = true
    batchCancelled.value = false
    const results = []
    const total = selectedServers.value.length
    let successCount = 0
    let failureCount = 0

    // 显示进度消息
    ElMessage.info(`开始执行${operationName}，共${total}台服务器...`)

    // 使用并发控制，每次最多处理3台服务器
    const concurrencyLimit = 3
    const executeWithTimeout = async (server, timeoutMs = 30000) => {
      return Promise.race([
        (async () => {
          let result
          switch (command) {
            case 'batchInstallAgent':
              result = await performInstallAgent(server)
              break
            case 'batchRestartAgent':
              result = await performRestartAgent(server.id)
              break
            case 'batchTest':
              result = await performTestConnection(server.id)
              break
          }
          return result
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('操作超时')), timeoutMs)
        )
      ])
    }

    // 分批并发执行
    for (let i = 0; i < selectedServers.value.length; i += concurrencyLimit) {
      // 检查是否被取消
      if (batchCancelled.value) {
        ElMessage.warning('批量操作已被取消')
        break
      }

      const batch = selectedServers.value.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(async (server) => {
        try {
          const result = await executeWithTimeout(server)

          if (result && result.success) {
            successCount++
            return {
              server: server.name || server.ip_address,
              status: 'success',
              message: result.message || '操作成功'
            }
          } else {
            failureCount++
            return {
              server: server.name || server.ip_address,
              status: 'error',
              message: result?.message || '操作失败'
            }
          }
        } catch (error) {
          failureCount++
          return {
            server: server.name || server.ip_address,
            status: 'error',
            message: error.response?.data?.msg || error.message || '操作失败'
          }
        }
      })

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 显示进度
      const completed = Math.min(i + concurrencyLimit, total)
      if (completed < total) {
        ElMessage.info(`已完成 ${completed}/${total} 台服务器...`)
      }
    }

    // 显示批量操作结果
    showBatchOperationResult(operationName, total, successCount, failureCount, results)

    // 清空选择
    if (serverTableRef.value) {
      serverTableRef.value.clearSelection()
    }
    selectedServers.value = []

    // 刷新服务器列表
    await fetchServers()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量操作失败: ' + (error.message || '未知错误'))
    }
  } finally {
    batchProcessing.value = false
    batchCancelled.value = false
  }
}

// 执行单个服务器的代理安装
const performInstallAgent = async (server) => {
  if (!server || !server.id) throw new Error('服务器信息无效')

  const response = await axios.post(`/api/servers/${server.id}/install_agent`, {})
  return {
    success: response.data.success,
    message: response.data.message || (response.data.success ? '代理安装成功' : '代理安装失败')
  }
}

// 执行单个服务器的代理重启
const performRestartAgent = async (serverId) => {
  const response = await axios.post(`/api/servers/${serverId}/restart_agent`)
  return {
    success: response.data.success,
    message: response.data.msg || (response.data.success ? '代理重启成功' : '代理重启失败')
  }
}

// 执行单个服务器的连接测试
const performTestConnection = async (serverId) => {
  const result = await serversStore.testServerConnection(serverId)
  return {
    success: true,
    message: result.msg || '连接测试成功'
  }
}

// 显示批量操作结果
const showBatchOperationResult = (operationName, total, successCount, failureCount, results) => {
  const resultMessage = `${operationName}完成：\n成功: ${successCount}/${total}\n失败: ${failureCount}/${total}`

  if (failureCount === 0) {
    ElMessage.success(resultMessage)
  } else if (successCount === 0) {
    ElMessage.error(resultMessage)
  } else {
    ElMessage.warning(resultMessage)
  }

  // 如果有失败的操作，显示详细信息
  if (failureCount > 0) {
    const failedServers = results.filter(r => r.status === 'error')
    console.log('失败的服务器操作:', failedServers)
  }
}
</script>

<style scoped>
/* 过滤表单样式（复用日志管理风格） */
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

/* 批量操作相关样式 */
.batch-dropdown-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.admin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecf3 100%);
  width: 100%;
  overflow-x: hidden;
  animation: containerFadeIn 0.8s ease-out;
}

@keyframes containerFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* el-main的边距调整 */
.el-main {
  padding: 0 !important;
  margin-top: 70px; /* 为固定头部留出空间 */
}

/* 自定义标签页样式 */
.custom-tabs {
  margin: 0;
  margin-top: 20px; /* 给头部留出一点间距 */
}

.custom-tabs :deep(.el-tabs__nav-wrap) {
  padding: 10px 0; /* 添加上下内边距 */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(64, 158, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
}

.custom-tabs :deep(.el-tabs__nav) {
  border-radius: 0;
  overflow: hidden;
  border: none;
  background: transparent;
  padding: 0 30px;
  box-shadow: none;
  width: 100%;
  display: flex;
}

.custom-tabs :deep(.el-tabs__content) {
  overflow: visible;
  width: 100%;
  padding: 30px;
}

.custom-tabs :deep(.el-tabs__item) {
  height: 50px;
  line-height: 50px;
  padding: 0 10px; /* 减少内边距 */
  transition: all 0.3s;
  font-weight: 500;
  color: #606266;
  border-radius: 6px;
  margin: 0 2px; /* 减少标签间间距 */
  text-align: center; /* 文字居中 */
  flex: 1; /* 弹性布局，平均分配空间 */
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(100, 100, 255, 0.05) 100%);
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.15);
}

/* 自定义标签内容样式 */
.custom-tab-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  font-size: 16px;
  font-weight: 500;
}

.custom-tab-label .el-icon {
  font-size: 18px;
}

.custom-tab-label .tab-text-full {
  display: block;
  font-size: 16px;
  line-height: 1;
}

.custom-tab-label .tab-text-short {
  display: none;
}

.main-content {
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  padding: 0; /* 移除所有内边距，让tabs自己处理 */
  animation: fadeInUp 0.8s ease-out 0.3s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard-row {
  margin-bottom: 30px;
}

.dashboard-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.dashboard-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.dashboard-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
}

.dashboard-icon {
  color: #409eff;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(54, 209, 220, 0.15) 50%, rgba(102, 126, 234, 0.15) 100%);
  padding: 15px;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.dashboard-card:hover .dashboard-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 8px 30px rgba(64, 158, 255, 0.3);
}

.dashboard-info {
  flex: 1;
}

.dashboard-value {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: -0.5px;
}

.dashboard-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}



.user-table-card {
  margin-bottom: 30px;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.user-table-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}



.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding: 20px 25px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(54, 209, 220, 0.03) 50%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.1);
  backdrop-filter: blur(10px);
}

.tab-header h2 {
  margin: 0;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.tab-header h2::before {
  content: '✦';
  font-size: 18px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.tab-actions {
  display: flex;
  gap: 10px;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.server-detail-container {
  width: 100%;
}

.server-table-card {
  margin-bottom: 30px;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.server-table-card:hover,
.server-detail-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}

.server-detail-card {
  margin-bottom: 30px;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.server-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.server-actions .el-button {
  margin-left: 0;
  margin-right: 0;
}

/* 移动端优化样式 */
@media (max-width: 768px) {
  /* 标签页优化 */
  .admin-tabs :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 5px;
  }
  
  .admin-tabs :deep(.el-tabs__nav-wrap) {
    margin: 0;
    padding: 0;
  }
  
  .admin-tabs :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0;
    margin: 0;
  }
  
  .admin-tabs :deep(.el-tabs__nav) {
    display: flex;
    white-space: nowrap;
    min-width: 100%;
    margin: 0;
    padding: 0;
  }
  
  .admin-tabs :deep(.el-tabs__item) {
    padding: 0 4px !important;
    min-width: 55px;
    flex-shrink: 0;
    font-size: 12px;
    height: 45px;
    line-height: 45px;
    margin: 0 1px;
  }
  
  .admin-tabs :deep(.el-tabs__item:first-child) {
    margin-left: 0;
  }
  
  .admin-tabs :deep(.el-tabs__item:last-child) {
    margin-right: 0;
  }
  
  .custom-tab-label {
    gap: 2px;
    flex-direction: column;
    padding: 2px 0;
    min-width: 45px;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
  
  .custom-tab-label .el-icon {
    font-size: 14px;
  }
  
  .custom-tab-label .tab-text-full {
    display: none;
  }
  
  .custom-tab-label .tab-text-short {
    display: block;
    font-size: 10px;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  
  /* 标签页徽章优化 */
  .container-tab-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    transform: scale(0.8);
  }
  
  /* 主内容区域优化 */
  .main-content {
    padding: 0 10px;
  }
  
  /* 标题栏优化 */
  .tab-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
    padding: 15px;
  }
  
  .tab-header h2 {
    font-size: 20px;
    text-align: center;
  }
  
  .tab-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .tab-actions .el-button {
    width: 100%;
    justify-content: center;
  }
  
  /* 过滤表单优化 */
  .filter-card {
    margin-bottom: 15px;
  }
  
  .filter-form .el-row {
    gap: 10px !important;
  }
  
  .filter-form .el-col {
    margin-bottom: 10px;
  }
  
  .filter-form .el-form-item {
    margin-bottom: 10px;
  }
  
  .filter-buttons {
    display: flex;
    gap: 10px;
    justify-content: stretch;
  }
  
  .filter-buttons .el-button {
    flex: 1;
  }
  
  /* 表格优化 */
  .table-card,
  .server-table-card,
  .user-table-card {
    margin-bottom: 15px;
    border-radius: 12px;
  }
  
  .el-table {
    font-size: 14px;
  }
  
  .el-table th,
  .el-table td {
    padding: 8px 4px !important;
  }
  
  /* 服务器操作按钮优化 */
  .server-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .server-actions .el-button {
    width: 100%;
    margin: 0;
  }
  
  /* 仪表盘卡片优化 */
  .dashboard-card {
    margin-bottom: 15px;
    border-radius: 12px;
  }
  
  .dashboard-item {
    flex-direction: column;
    text-align: center;
    gap: 10px;
    padding: 15px;
  }
  
  .dashboard-icon {
    order: -1;
    margin: 0 auto;
  }
  
  .dashboard-value {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  /* 超小屏幕优化 */
  .main-content {
    padding: 0 2px;
  }
  
  .admin-tabs :deep(.el-tabs__header) {
    padding: 0 2px;
  }
  
  .admin-tabs :deep(.el-tabs__item) {
    padding: 0 3px !important;
    min-width: 45px;
    height: 40px;
    line-height: 40px;
    margin: 0;
  }
  
  .custom-tab-label {
    gap: 1px;
    padding: 1px 0;
    min-width: 35px;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
  
  .custom-tab-label .tab-text-short {
    font-size: 9px;
    line-height: 1;
  }
  
  .custom-tab-label .el-icon {
    font-size: 12px;
  }
  
  .tab-header {
    padding: 10px;
  }
  
  .tab-header h2 {
    font-size: 18px;
  }
  
  .dashboard-value {
    font-size: 20px;
  }
  
  .el-table th,
  .el-table td {
    padding: 6px 2px !important;
    font-size: 13px;
  }
}

/* 横向滚动标签页指示器 */
@media (max-width: 768px) {
  .admin-tabs::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 15px;
    height: 45px;
    background: linear-gradient(to left, rgba(255, 255, 255, 0.9), transparent);
    pointer-events: none;
    z-index: 10;
  }
  
  .admin-tabs::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 15px;
    height: 45px;
    background: linear-gradient(to right, rgba(255, 255, 255, 0.9), transparent);
    pointer-events: none;
    z-index: 10;
  }
}

@media (max-width: 480px) {
  .admin-tabs::after,
  .admin-tabs::before {
    height: 40px;
    width: 12px;
  }
}

/* 铃铛抖动动画 */
/* @keyframes bell-shake {
  0% { transform: rotate(0); }
  10% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  30% { transform: rotate(6deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(3deg); }
  60% { transform: rotate(-3deg); }
  70% { transform: rotate(1deg); }
  80% { transform: rotate(-1deg); }
  90% { transform: rotate(0); }
  100% { transform: rotate(0); }
}

.bell-shake {
  animation: bell-shake 1s ease-in-out;
  animation-iteration-count: infinite;
} */

/* 调整header布局 */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

/* .notification-panel {
  position: absolute;
  top: 60px;
  right: 20px;
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  width: 300px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  z-index: 1000;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 10px;
}

.notification-item {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.unread {
  background-color: #f0f5ff;
}

.notification-icon {
  font-size: 20px;
  margin-right: 10px;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 5px;
}

.notification-message {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.empty-notifications {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #909399;
}

.empty-notifications .el-icon {
  font-size: 24px;
  margin-bottom: 10px;
} */

/* Token对话框样式 */
.token-dialog :deep(.el-dialog) {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.token-container {
  padding: 10px;
}

.token-section, .install-section {
  margin-bottom: 30px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #409EFF;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f5ff;
}

.token-display {
  margin-bottom: 20px;
}

.token-actions {
  display: flex;
  gap: 12px;
  margin-top: 15px;
  justify-content: flex-start;
}

.install-tabs {
  margin-top: 15px;
}

.install-tabs :deep(.el-tabs__item) {
  font-weight: 500;
}

.install-method {
  padding: 20px;
}

.method-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #606266;
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.install-command-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 25px;
}

.install-command-input {
  border-radius: 8px;
}

.install-command-input :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  background-color: #f8f9fa;
  border: 2px solid #e4e7ed;
}

.divider-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #409EFF;
}

.advanced-config {
  margin-top: 20px;
}

.config-options {
  display: grid;
  gap: 20px;
}

.config-item {
  padding: 20px;
  background-color: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.config-item h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.config-item p {
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.config-item code {
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.config-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
}

.example-commands {
  margin-top: 25px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.example-commands h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
}

.code-example {
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  border: none;
}

.manual-steps {
  margin: 20px 0;
}

.manual-config {
  margin-top: 25px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.manual-config h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
}

.dialog-footer {
  text-align: center;
  padding: 15px 0;
}

/* 用户头像样式 */
:deep(.el-avatar) {
  background: linear-gradient(135deg, #409EFF 0%, #36D1DC 50%, #667eea 100%);
  color: white;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
  border: 3px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

:deep(.el-avatar):hover {
  transform: scale(1.1);
  box-shadow: 0 12px 35px rgba(64, 158, 255, 0.5);
}

/* 标签页标题美化 */
:deep(.el-tabs__item) {
  font-weight: 600;
  transition: all 0.3s ease;
  color: #606266;
}

:deep(.el-tabs__item:hover) {
  color: #409EFF;
}

:deep(.el-tabs__item.is-active) {
  color: #409EFF !important;
  font-weight: 700;
}

:deep(.el-tabs__active-bar) {
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  height: 3px;
}

/* 按钮样式增强 */
:deep(.el-button--primary) {
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

:deep(.el-button--primary):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.form-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

/* 统一管理页面样式 */
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
  font-weight: 600;
}

.tab-actions {
  display: flex;
  gap: 10px;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.table-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.detail-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.settings-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.stats-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.container-tab-badge {
  margin-left: 8px;
}

.container-tab-badge :deep(.el-badge__content) {
  background-color: #F56C6C;
  color: white;
  border: none;
}
</style>
