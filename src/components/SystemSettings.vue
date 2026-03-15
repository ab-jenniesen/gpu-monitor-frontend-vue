<template>
  <div class="system-settings">
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>站点设置</span>
        </div>
      </template>
      
      <div class="settings-form">
        <el-form :model="siteForm" label-width="120px">
          <el-form-item label="站点名称">
            <el-input 
              v-model="siteForm.siteName" 
              placeholder="请输入站点名称"
              maxlength="50"
              show-word-limit
            />
            <div class="form-item-help">
              设置站点名称，将显示在页面标题和登录页面
            </div>
          </el-form-item>
          
          <el-form-item label="站点Logo">
            <el-input 
              v-model="siteForm.siteLogo" 
              placeholder="请输入Logo图片URL"
            />
            <div class="form-item-help">
              设置站点Logo的URL地址，建议使用正方形图片
            </div>
          </el-form-item>
          
          <el-form-item label="站点副标题">
            <el-input 
              v-model="siteForm.siteSubtitle" 
              placeholder="请输入站点副标题"
              maxlength="100"
              show-word-limit
            />
            <div class="form-item-help">
              设置站点副标题，将显示在登录页面
            </div>
          </el-form-item>

          <el-form-item label="登录页提示" class="login-tip-item">
            <div class="editor-container">
              <div class="editor-tabs">
                <el-radio-group v-model="editorMode" size="small">
                  <el-radio-button value="edit">编辑</el-radio-button>
                  <el-radio-button value="preview">预览</el-radio-button>
                </el-radio-group>
              </div>
              <div v-if="editorMode === 'edit'" class="editor-wrapper">
                <quill-editor
                  v-model:content="siteForm.loginTipMd"
                  contentType="text"
                  theme="snow"
                  style="min-height: 220px;"
                  :options="{
                    scrollingContainer: '.editor-wrapper',
                    modules: {
                      clipboard: { matchers: [] }
                    }
                  }"
                  :toolbar="[
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link'],
                    ['clean']
                  ]"
                />
                <div class="markdown-tips">
                  <p>支持 Markdown 语法，如 <code>**粗体**</code>、<code>*斜体*</code>、<code>[链接](URL)</code>、<code>`代码`</code> 等。</p>
                </div>
              </div>
              <div v-else class="preview-wrapper">
                <div class="markdown-preview" v-html="renderMarkdown(siteForm.loginTipMd)"></div>
              </div>
            </div>
            <div class="form-item-help login-tip-help">显示在登录页密码框下方（支持 Markdown）。</div>
          </el-form-item>
          
          <el-form-item label="服务器URL">
            <el-input 
              v-model="siteForm.serverUrl" 
              placeholder="请输入服务器URL"
            />
            <div class="form-item-help">
              设置服务器URL，用于生成代理安装命令。例如：http://your-server-domain.com
            </div>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveSiteSettings" :loading="siteLoading">
              保存站点设置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据保留策略</span>
        </div>
      </template>
      
      <div class="settings-form">
        <el-form :model="settingsForm" label-width="120px">
          <el-form-item label="数据保留时间">
            <el-input-number 
              v-model="settingsForm.dataRetentionHours" 
              :min="1" 
              :max="720"
              controls-position="right"
            />
            <span class="unit-label">小时</span>
            <div class="form-item-help">
              设置监控数据的保留时间，超过此时间的数据将被自动删除。建议值：24小时（1天）
            </div>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveSettings" :loading="loading">
              保存设置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据管理</span>
        </div>
      </template>
      
      <div class="settings-info">
        <p>
          <el-icon><InfoFilled /></el-icon>
          系统会根据上面设置的保留时间，自动清理过期的监控数据，以防止数据库过度增长。
        </p>
        <p>
          <el-icon><Warning /></el-icon>
          数据清理是不可逆的操作，请确保设置了合适的保留时间。
        </p>
      </div>
    </el-card>

    <!-- 数据备份与恢复 - 仅超级管理员可见 -->
    <el-card v-if="isSuperAdmin" class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据备份与恢复</span>
        </div>
      </template>

      <!-- WebDAV配置 -->
      <div class="settings-form">
        <div class="settings-section-header">
          <h4><el-icon><Setting /></el-icon> WebDAV配置</h4>
          <div class="config-actions">
            <el-button @click="fetchBackupConfigs" :loading="configListLoading">刷新</el-button>
            <el-button type="primary" @click="openCreateConfigDialog">新增配置</el-button>
          </div>
        </div>

        <el-table
          v-loading="configListLoading"
          :data="backupConfigs"
          size="small"
          border
          style="width: 100%;"
          class="backup-config-table"
          empty-text=""
        >
          <el-table-column prop="webdav_url" label="服务器URL" min-width="240" />
          <el-table-column prop="webdav_username" label="用户名" min-width="160" />
          <el-table-column prop="webdav_root_path" label="根目录" min-width="200" />
          <el-table-column label="默认" width="80" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_default" type="success" size="small">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center">
            <template #default="scope">
              <el-button type="primary" size="small" @click="openEditConfigDialog(scope.row)">编辑</el-button>
              <el-button
                type="success"
                size="small"
                :disabled="scope.row.is_default"
                :loading="setDefaultLoadingId === scope.row.id"
                @click="setDefaultConfig(scope.row)"
              >设为默认</el-button>
              <el-button
                type="danger"
                size="small"
                :loading="deleteConfigLoadingId === scope.row.id"
                @click="confirmDeleteConfig(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-if="!configListLoading && backupConfigs.length === 0"
          description="暂无配置，请先新增WebDAV配置"
          class="config-empty"
        />
      </div>


      <!-- 备份操作 -->
      <div class="settings-form" style="margin-top: 20px;">
        <h4><el-icon><Download /></el-icon> 备份操作</h4>
        <div class="config-selector">
          <span>选择配置：</span>
          <el-select
            v-model="selectedConfigId"
            placeholder="请选择WebDAV配置"
            :disabled="!backupConfigs.length"
            filterable
            style="width: 320px;"
          >
            <el-option
              v-for="config in backupConfigs"
              :key="config.id"
              :label="formatConfigLabel(config)"
              :value="config.id"
            />
          </el-select>
          <el-tag v-if="selectedConfig && selectedConfig.is_default" type="success" size="small">默认配置</el-tag>
          <el-button
            style="margin-left: 8px;"
            @click="testSelectedConfigConnection"
            :disabled="!selectedConfigId"
            :loading="testSelectedConfigLoading"
          >
            测试选中配置
          </el-button>
        </div>
        <div class="backup-actions">
          <el-button
            type="primary"
            @click="backupToWebDAV"
            :loading="backupToWebdavLoading"
            :disabled="!selectedConfigId"
          >
            <el-icon><Upload /></el-icon>
            备份到WebDAV
          </el-button>

          <el-button @click="exportToLocal" :loading="exportToLocalLoading">
            <el-icon><Download /></el-icon>
            导出到本地
          </el-button>
        </div>

        <div class="backup-info" style="margin-top: 15px;">
          <el-icon><InfoFilled /></el-icon>
          <span>备份包含所有用户数据、服务器配置和系统设置</span>
        </div>
      </div>

      <!-- 定时备份设置 -->
      <div class="settings-form" style="margin-top: 20px;">
        <h4><el-icon><Timer /></el-icon> 定时备份</h4>
        <div class="schedule-container">
          <el-switch
            v-model="scheduleSettings.enabled"
            active-text="已启用"
            inactive-text="未启用"
          />
          <span>备份间隔：</span>
          <el-input-number
            v-model="scheduleSettings.interval_hours"
            :min="0"
            :max="168"
            :disabled="!scheduleSettings.enabled"
          />
          <span>小时</span>
          <el-input-number
            v-model="scheduleSettings.interval_minutes"
            :min="0"
            :max="59"
            :disabled="!scheduleSettings.enabled"
          />
          <span>分钟</span>
          <span>保留份数：</span>
          <el-input-number
            v-model="scheduleSettings.retain_count"
            :min="1"
            :max="500"
            :disabled="!scheduleSettings.enabled"
          />
          <span>份</span>
          <el-button type="primary" @click="saveScheduleSettings" :loading="saveScheduleLoading">保存设置</el-button>
          <el-button @click="fetchScheduleSettings" :loading="scheduleLoading">刷新</el-button>
        </div>
        <div class="schedule-status">
          <p v-if="scheduleSettings.enabled">上次执行：{{ scheduleSettings.last_run || '尚未执行' }}</p>
          <p v-if="scheduleSettings.enabled">下次执行：{{ scheduleSettings.next_run || '等待计算' }}</p>
          <p v-else>定时备份已关闭。</p>
        </div>
      </div>

      <!-- 恢复操作 -->
      <div class="settings-form" style="margin-top: 20px;">
        <h4><el-icon><Upload /></el-icon> 恢复操作</h4>

        <!-- WebDAV恢复 -->
        <div class="restore-section">
          <el-button
            type="success"
            @click="loadWebDAVBackups"
            :loading="loadWebdavBackupsLoading"
            :disabled="!selectedConfigId"
          >
            <el-icon><FolderOpened /></el-icon>
            从WebDAV恢复
          </el-button>

          <el-button @click="triggerLocalRestore">
            <el-icon><Upload /></el-icon>
            从本地文件恢复
          </el-button>

          <input
            ref="uploadBackupFile"
            type="file"
            accept=".gpumon"
            style="display: none"
            @change="handleLocalRestore"
          />
        </div>

        <!-- WebDAV备份文件列表 -->
        <div v-if="manualWebdavBackups.length || scheduledWebdavBackups.length" class="backup-list">
          <h5>
            可用备份文件
            <span v-if="selectedConfig">（当前配置：{{ formatConfigLabel(selectedConfig) }}）</span>
          </h5>

          <div v-if="manualWebdavBackups.length" class="backup-category">
            <h6>📁 手动备份</h6>
            <el-table :data="manualWebdavBackups" size="small" style="margin-bottom: 15px;">
              <el-table-column prop="name" label="文件名" min-width="260" />
              <el-table-column prop="modified" label="修改时间" width="200" />
              <el-table-column label="操作" width="140">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    :loading="restoreBackupLoading"
                    @click="restoreFromWebDAV('manual', scope.row.name)"
                  >
                    恢复
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="scheduledWebdavBackups.length" class="backup-category">
            <h6>📅 定时备份</h6>
            <el-table :data="scheduledWebdavBackups" size="small" style="margin-bottom: 15px;">
              <el-table-column prop="name" label="文件名" min-width="260" />
              <el-table-column prop="modified" label="修改时间" width="200" />
              <el-table-column label="操作" width="140">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    :loading="restoreBackupLoading"
                    @click="restoreFromWebDAV('scheduled', scope.row.name)"
                  >
                    恢复
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

        </div>

        <div class="backup-info" style="margin-top: 15px;">
          <el-icon class="warning"><Warning /></el-icon>
          <span>恢复备份将覆盖当前所有数据，请谨慎操作！系统会自动备份当前数据。</span>
        </div>
      </div>

      <!-- 本地备份列表 -->
      <div class="settings-form" style="margin-top: 20px;">
        <h4><el-icon><FolderOpened /></el-icon> 本地备份文件</h4>
        <div class="local-backup-actions">
          <el-button @click="loadLocalBackups" :loading="loadLocalBackupsLoading">刷新列表</el-button>
        </div>
        <el-table
          v-if="localBackups.length"
          :data="localBackups"
          size="small"
          border
          class="local-backup-table"
        >
          <el-table-column prop="name" label="文件名" min-width="260" />
          <el-table-column prop="modified" label="修改时间" width="200" />
          <el-table-column label="大小" width="140">
            <template #default="scope">
              {{ formatFileSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                :loading="restoringLocalName === scope.row.name"
                @click="restoreLocalBackup(scope.row)"
              >恢复</el-button>
              <el-button
                type="danger"
                size="small"
                :loading="deletingLocalName === scope.row.name"
                @click="deleteLocalBackup(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-skeleton v-else-if="loadLocalBackupsLoading" :rows="3" animated />
        <el-empty v-else-if="!loadLocalBackupsLoading" description="暂无本地备份" />
      </div>
    </el-card>
    <el-dialog
      v-model="configDialogVisible"
      :title="configDialogMode === 'edit' ? '编辑WebDAV配置' : '新增WebDAV配置'"
      width="480px"
      destroy-on-close
      append-to-body
    >
      <el-form label-width="110px">
        <el-form-item label="服务器URL">
          <el-input v-model="configForm.webdav_url" placeholder="https://example.com/webdav" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="configForm.webdav_username" placeholder="WebDAV用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="configForm.webdav_password"
            type="password"
            placeholder="WebDAV密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="根目录">
          <el-input v-model="configForm.webdav_root_path" placeholder="/gpu-monitor-backups" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="configForm.set_as_default">保存后设为默认配置</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="configDialogVisible = false">取消</el-button>
          <el-button @click="testConfigConnection" :loading="testConfigLoading">测试连接</el-button>
          <el-button type="primary" @click="saveConfig" :loading="configFormLoading">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled, Warning, Download, Upload, Setting, FolderOpened, Timer } from '@element-plus/icons-vue'
import axios from '../utils/axios'
import { useAuthStore } from '../stores/auth'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import MarkdownIt from 'markdown-it'

const loading = ref(false)
const siteLoading = ref(false)
const settingsForm = ref({
  dataRetentionHours: 24 // 默认24小时
})
const siteForm = ref({
  siteName: 'GPU共享服务平台',
  siteLogo: 'https://lank.myzr.org:88/i/2024/05/29/66571d8de15ea.png',
  siteSubtitle: '高效、安全的资源管理平台',
  serverUrl: window.location.origin,
  loginTipMd: ''
})
const authStore = useAuthStore()

// 仅超级管理员显示备份功能
const isSuperAdmin = computed(() => {
  return localStorage.getItem('username') === 'admin' && localStorage.getItem('userRole') === 'admin'
})

// 备份相关状态
const backupToWebdavLoading = ref(false)
const exportToLocalLoading = ref(false)
const loadWebdavBackupsLoading = ref(false)
const restoreBackupLoading = ref(false)
const importBackupLoading = ref(false)
const configListLoading = ref(false)
const backupConfigs = ref([])
const defaultConfigId = ref(null)
const selectedConfigId = ref(null)
const testSelectedConfigLoading = ref(false)
const setDefaultLoadingId = ref(null)
const deleteConfigLoadingId = ref(null)
const configDialogVisible = ref(false)
const configDialogMode = ref('create')
const configFormLoading = ref(false)
const testConfigLoading = ref(false)
const configForm = reactive({
  id: null,
  webdav_url: '',
  webdav_username: '',
  webdav_password: '',
  webdav_root_path: '/gpu-monitor-backups',
  set_as_default: false
})

const scheduleSettings = ref({
  enabled: false,
  interval_hours: 24,
  interval_minutes: 0,
  retain_count: 10,
  last_run: '',
  next_run: ''
})
const scheduleLoading = ref(false)
const saveScheduleLoading = ref(false)
let scheduleRefreshTimer = null

const localBackups = ref([])
const loadLocalBackupsLoading = ref(false)
const restoringLocalName = ref('')
const deletingLocalName = ref('')

const webdavBackups = ref({
  manual: [],
  scheduled: [],
  config_id: null
})
const manualWebdavBackups = computed(() => webdavBackups.value?.manual ?? [])
const scheduledWebdavBackups = computed(() => webdavBackups.value?.scheduled ?? [])

const selectedConfig = computed(() => {
  return backupConfigs.value.find(item => item.id === selectedConfigId.value) || null
})

const formatConfigLabel = (config) => {
  const base = config.webdav_url || '(未配置URL)'
  const root = config.webdav_root_path ? ` (${config.webdav_root_path})` : ''
  const suffix = config.is_default ? ' [默认]' : ''
  return `${base}${root}${suffix}`
}

const resetConfigForm = () => {
  configForm.id = null
  configForm.webdav_url = ''
  configForm.webdav_username = ''
  configForm.webdav_password = ''
  configForm.webdav_root_path = '/gpu-monitor-backups'
  configForm.set_as_default = false
}

const uploadBackupFile = ref(null)
const editorMode = ref('edit')

// Markdown 渲染器
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

// 获取当前设置
const fetchSettings = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/settings/data_retention', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    settingsForm.value.dataRetentionHours = response.data.data_retention_hours
  } catch (error) {
    console.error('获取设置失败:', error)
    ElMessage.error('获取设置失败')
  } finally {
    loading.value = false
  }
}

// 获取站点设置
const fetchSiteSettings = async () => {
  siteLoading.value = true
  try {
    const response = await axios.get('/api/settings/site')
    siteForm.value.siteName = response.data.site_name
    siteForm.value.siteLogo = response.data.site_logo
    siteForm.value.siteSubtitle = response.data.site_subtitle
    siteForm.value.serverUrl = response.data.server_url
    siteForm.value.loginTipMd = response.data.login_tip_md || ''
  } catch (error) {
    console.error('获取站点设置失败:', error)
    ElMessage.error('获取站点设置失败')
  } finally {
    siteLoading.value = false
  }
}

// 保存设置
const saveSettings = async () => {
  loading.value = true
  try {
    await axios.post('/api/settings/data_retention', {
      data_retention_hours: settingsForm.value.dataRetentionHours
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    ElMessage.success('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error(error.response?.data?.msg || '保存设置失败')
  } finally {
    loading.value = false
  }
}

// 保存站点设置
const saveSiteSettings = async () => {
  siteLoading.value = true
  try {
    await axios.post('/api/settings/site', {
      site_name: siteForm.value.siteName,
      site_logo: siteForm.value.siteLogo,
      site_subtitle: siteForm.value.siteSubtitle,
      server_url: siteForm.value.serverUrl,
      login_tip_md: siteForm.value.loginTipMd
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    ElMessage.success('站点设置已保存')
  } catch (error) {
    console.error('保存站点设置失败:', error)
    ElMessage.error(error.response?.data?.msg || '保存站点设置失败')
  } finally {
    siteLoading.value = false
  }
}

// =====================================
// 备份相关方法
// =====================================

const fetchBackupConfigs = async () => {
  if (!isSuperAdmin.value) return

  configListLoading.value = true
  try {
    const response = await axios.get('/api/backup/settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    const configs = response.data.configs || []
    backupConfigs.value = configs
    defaultConfigId.value = response.data.default_config_id || null
    webdavBackups.value = { manual: [], scheduled: [], config_id: null }

    if (!configs.length) {
      selectedConfigId.value = null
    } else if (!selectedConfigId.value || !configs.some(item => item.id === selectedConfigId.value)) {
      selectedConfigId.value = defaultConfigId.value || configs[0].id
    }
  } catch (error) {
    console.error('获取备份配置失败:', error)
    ElMessage.error(error.response?.data?.msg || '获取备份配置失败')
  } finally {
    configListLoading.value = false
  }
}

const fetchScheduleSettings = async () => {
  if (!isSuperAdmin.value) return

  scheduleLoading.value = true
  try {
    const response = await axios.get('/api/backup/schedule', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    scheduleSettings.value.enabled = !!response.data.enabled
    scheduleSettings.value.interval_hours = Number(response.data.interval_hours !== undefined ? response.data.interval_hours : 24)
    scheduleSettings.value.interval_minutes = Number(response.data.interval_minutes !== undefined ? response.data.interval_minutes : 0)
    scheduleSettings.value.retain_count = Number(response.data.retain_count !== undefined ? response.data.retain_count : 10)
    scheduleSettings.value.last_run = response.data.last_run || ''
    scheduleSettings.value.next_run = response.data.next_run || ''
  } catch (error) {
    console.error('获取定时备份设置失败:', error)
    ElMessage.error(error.response?.data?.msg || '获取定时备份设置失败')
  } finally {
    scheduleLoading.value = false
  }
}

const openCreateConfigDialog = () => {
  resetConfigForm()
  configForm.set_as_default = backupConfigs.value.length === 0
  configDialogMode.value = 'create'
  configDialogVisible.value = true
}

const saveScheduleSettings = async () => {
  if (!isSuperAdmin.value) return

  const intervalHours = Math.max(0, Math.min(168, Number(scheduleSettings.value.interval_hours) || 0))
  const intervalMinutes = Math.max(0, Math.min(59, Number(scheduleSettings.value.interval_minutes) || 0))
  const retainCount = Math.max(1, Math.min(500, Number(scheduleSettings.value.retain_count) || 10))
  
  // 确保至少有1分钟间隔
  if (intervalHours === 0 && intervalMinutes === 0) {
    scheduleSettings.value.interval_hours = 0
    scheduleSettings.value.interval_minutes = 1
  } else {
    scheduleSettings.value.interval_hours = intervalHours
    scheduleSettings.value.interval_minutes = intervalMinutes
  }
  scheduleSettings.value.retain_count = retainCount

  saveScheduleLoading.value = true
  try {
    const response = await axios.post('/api/backup/schedule', {
      enabled: scheduleSettings.value.enabled,
      interval_hours: scheduleSettings.value.interval_hours,
      interval_minutes: scheduleSettings.value.interval_minutes,
      retain_count: retainCount
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    
    // 直接使用服务器返回的数据，避免重新请求
    if (response.data) {
      scheduleSettings.value.enabled = !!response.data.enabled
      scheduleSettings.value.interval_hours = Number(response.data.interval_hours !== undefined ? response.data.interval_hours : 24)
      scheduleSettings.value.interval_minutes = Number(response.data.interval_minutes !== undefined ? response.data.interval_minutes : 0)
      scheduleSettings.value.retain_count = Number(response.data.retain_count !== undefined ? response.data.retain_count : 10)
      scheduleSettings.value.last_run = response.data.last_run || ''
      scheduleSettings.value.next_run = response.data.next_run || ''
    }
    
    // 保存设置后，重新启动定时刷新
    startScheduleRefreshTimer()
    
    ElMessage.success('定时备份设置已保存')
  } catch (error) {
    console.error('保存定时备份设置失败:', error)
    ElMessage.error(error.response?.data?.msg || '保存定时备份设置失败')
  } finally {
    saveScheduleLoading.value = false
  }
}

// 启动定时刷新定时器
const startScheduleRefreshTimer = () => {
  if (!isSuperAdmin.value || !scheduleSettings.value.enabled) return
  
  // 清除已有的定时器
  if (scheduleRefreshTimer) {
    clearInterval(scheduleRefreshTimer)
  }
  
  // 每30秒刷新一次备份状态
  scheduleRefreshTimer = setInterval(async () => {
    if (scheduleSettings.value.enabled && !scheduleLoading.value && !saveScheduleLoading.value) {
      try {
        await fetchScheduleSettings()
      } catch (error) {
      }
    }
  }, 30000)
}

// 停止定时刷新定时器
const stopScheduleRefreshTimer = () => {
  if (scheduleRefreshTimer) {
    clearInterval(scheduleRefreshTimer)
    scheduleRefreshTimer = null
  }
}

const openEditConfigDialog = (config) => {
  configForm.id = config.id
  configForm.webdav_url = config.webdav_url
  configForm.webdav_username = config.webdav_username
  configForm.webdav_password = config.webdav_password
  configForm.webdav_root_path = config.webdav_root_path
  configForm.set_as_default = !!config.is_default
  configDialogMode.value = 'edit'
  configDialogVisible.value = true
}

const testConfigConnection = async () => {
  if (!configForm.webdav_url) {
    ElMessage.warning('请先填写WebDAV服务器URL')
    return
  }

  testConfigLoading.value = true
  try {
    await axios.post('/api/backup/test-webdav', {
      webdav_url: configForm.webdav_url,
      webdav_username: configForm.webdav_username,
      webdav_password: configForm.webdav_password,
      webdav_root_path: configForm.webdav_root_path
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('连接测试成功')
  } catch (error) {
    console.error('WebDAV连接测试失败:', error)
    ElMessage.error(error.response?.data?.msg || 'WebDAV连接测试失败')
  } finally {
    testConfigLoading.value = false
  }
}

const saveConfig = async () => {
  if (!configForm.webdav_url) {
    ElMessage.warning('WebDAV服务器URL不能为空')
    return
  }

  configFormLoading.value = true
  try {
    if (configDialogMode.value === 'edit' && configForm.id) {
      await axios.put(`/api/backup/settings/${configForm.id}`, {
        webdav_url: configForm.webdav_url,
        webdav_username: configForm.webdav_username,
        webdav_password: configForm.webdav_password,
        webdav_root_path: configForm.webdav_root_path,
        set_as_default: configForm.set_as_default
      }, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      ElMessage.success('备份配置已更新')
    } else {
      await axios.post('/api/backup/settings', {
        webdav_url: configForm.webdav_url,
        webdav_username: configForm.webdav_username,
        webdav_password: configForm.webdav_password,
        webdav_root_path: configForm.webdav_root_path,
        set_as_default: configForm.set_as_default
      }, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      ElMessage.success('备份配置已创建')
    }

    configDialogVisible.value = false
    await fetchBackupConfigs()
  } catch (error) {
    console.error('保存备份配置失败:', error)
    ElMessage.error(error.response?.data?.msg || '保存备份配置失败')
  } finally {
    configFormLoading.value = false
  }
}

const setDefaultConfig = async (config) => {
  setDefaultLoadingId.value = config.id
  try {
    await axios.post(`/api/backup/settings/${config.id}/default`, {}, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('默认配置已更新')
    await fetchBackupConfigs()
  } catch (error) {
    console.error('设置默认配置失败:', error)
    ElMessage.error(error.response?.data?.msg || '设置默认配置失败')
  } finally {
    setDefaultLoadingId.value = null
  }
}

const confirmDeleteConfig = async (config) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置「${config.webdav_url}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteConfig(config.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除备份配置失败:', error)
    }
  }
}

const deleteConfig = async (configId) => {
  deleteConfigLoadingId.value = configId
  try {
    await axios.delete(`/api/backup/settings/${configId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('备份配置已删除')
    await fetchBackupConfigs()
  } catch (error) {
    console.error('删除备份配置失败:', error)
    ElMessage.error(error.response?.data?.msg || '删除备份配置失败')
  } finally {
    deleteConfigLoadingId.value = null
  }
}

const loadLocalBackups = async () => {
  if (!isSuperAdmin.value) return

  loadLocalBackupsLoading.value = true
  try {
    const response = await axios.get('/api/backup/local/list', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    localBackups.value = response.data.files || []
  } catch (error) {
    console.error('获取本地备份列表失败:', error)
    ElMessage.error(error.response?.data?.msg || '获取本地备份列表失败')
  } finally {
    loadLocalBackupsLoading.value = false
  }
}

const restoreLocalBackup = async (row) => {
  if (!row) return

  try {
    await ElMessageBox.confirm(`确定要从本地备份 "${row.name}" 恢复吗？当前数据将被覆盖。`, '确认恢复', {
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (error) {
    return
  }

  restoringLocalName.value = row.name
  try {
    await axios.post('/api/backup/local/restore', {
      name: row.name
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('本地备份恢复成功')
    await loadLocalBackups()
    ElMessageBox.alert('数据恢复成功，请重新登录以确保数据同步。', '恢复完成', {
      confirmButtonText: '确定',
      callback: () => {
        authStore.logout()
        window.location.reload()
      }
    })
  } catch (error) {
    console.error('恢复本地备份失败:', error)
    ElMessage.error(error.response?.data?.msg || '恢复本地备份失败')
  } finally {
    restoringLocalName.value = ''
  }
}

const deleteLocalBackup = async (row) => {
  if (!row) return

  try {
    await ElMessageBox.confirm(`确定要删除本地备份 "${row.name}" 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (error) {
    return
  }

  deletingLocalName.value = row.name
  try {
    await axios.delete(`/api/backup/local/${encodeURIComponent(row.name)}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('本地备份已删除')
    await loadLocalBackups()
  } catch (error) {
    console.error('删除本地备份失败:', error)
    ElMessage.error(error.response?.data?.msg || '删除本地备份失败')
  } finally {
    deletingLocalName.value = ''
  }
}

const ensureSelectedConfig = () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择一个WebDAV配置')
    return false
  }
  if (!selectedConfig.value || !selectedConfig.value.webdav_url) {
    ElMessage.warning('当前配置未填写服务器URL，请先完善配置')
    return false
  }
  return true
}

const testSelectedConfigConnection = async () => {
  if (!ensureSelectedConfig()) return

  testSelectedConfigLoading.value = true
  try {
    await axios.post('/api/backup/test-webdav', {
      config_id: selectedConfigId.value
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('选中配置连接测试成功')
  } catch (error) {
    console.error('WebDAV连接测试失败:', error)
    ElMessage.error(error.response?.data?.msg || 'WebDAV连接测试失败')
  } finally {
    testSelectedConfigLoading.value = false
  }
}

// 备份到WebDAV
const backupToWebDAV = async () => {
  if (!ensureSelectedConfig()) return

  try {
    await ElMessageBox.confirm('确定要创建备份并上传到WebDAV吗？', '确认备份', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    backupToWebdavLoading.value = true
    const response = await axios.post('/api/backup/webdav', {
      config_id: selectedConfigId.value
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success(response.data.msg || '备份成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('WebDAV备份失败:', error)
      ElMessage.error(error.response?.data?.msg || 'WebDAV备份失败')
    }
  } finally {
    backupToWebdavLoading.value = false
  }
}

// 导出到本地
const exportToLocal = async () => {
  try {
    await ElMessageBox.confirm('确定要导出备份文件到本地吗？', '确认导出', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    exportToLocalLoading.value = true
    const response = await axios.get('/api/backup/export', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.gpumon`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('备份文件导出成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出备份失败:', error)
      ElMessage.error(error.response?.data?.msg || '导出备份失败')
    }
  } finally {
    exportToLocalLoading.value = false
  }
}

// 加载WebDAV备份列表
const loadWebDAVBackups = async () => {
  if (!ensureSelectedConfig()) return

  loadWebdavBackupsLoading.value = true
  try {
    const response = await axios.get('/api/backup/webdav/list', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      params: { config_id: selectedConfigId.value }
    })
    webdavBackups.value = {
      manual: response.data.manual || [],
      scheduled: response.data.scheduled || [],
      config_id: response.data.config_id ?? selectedConfigId.value
    }
    ElMessage.success('备份列表加载成功')
  } catch (error) {
    console.error('获取WebDAV备份列表失败:', error)
    ElMessage.error(error.response?.data?.msg || '获取备份列表失败')
  } finally {
    loadWebdavBackupsLoading.value = false
  }
}

// 从WebDAV恢复
const restoreFromWebDAV = async (type, name) => {
  if (!ensureSelectedConfig()) return

  try {
    await ElMessageBox.confirm(
      `确定要从WebDAV恢复备份文件 "${name}" 吗？此操作将覆盖当前所有数据！`,
      '确认恢复',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    restoreBackupLoading.value = true
    const response = await axios.post('/api/backup/webdav/restore', {
      type: type,
      name: name,
      config_id: selectedConfigId.value
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    ElMessage.success(response.data.msg || '恢复成功')
    await loadLocalBackups()

    // 提示用户重新登录
    ElMessageBox.alert('数据恢复成功，请重新登录以确保数据同步。', '恢复完成', {
      confirmButtonText: '确定',
      callback: () => {
        authStore.logout()
        window.location.reload()
      }
    })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('从WebDAV恢复失败:', error)
      ElMessage.error(error.response?.data?.msg || '恢复失败')
    }
  } finally {
    restoreBackupLoading.value = false
  }
}

// 触发本地文件恢复
const triggerLocalRestore = () => {
  uploadBackupFile.value.click()
}

// 处理本地文件恢复
const handleLocalRestore = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    await ElMessageBox.confirm(
      `确定要从本地文件 "${file.name}" 恢复备份吗？此操作将覆盖当前所有数据！`,
      '确认恢复',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    importBackupLoading.value = true
    const formData = new FormData()
    formData.append('backup_file', file)

    const response = await axios.post('/api/backup/restore', formData, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success(response.data.msg || '恢复成功')
    await loadLocalBackups()

    // 提示用户重新登录
    ElMessageBox.alert('数据恢复成功，请重新登录以确保数据同步。', '恢复完成', {
      confirmButtonText: '确定',
      callback: () => {
        authStore.logout()
        window.location.reload()
      }
    })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('从本地文件恢复失败:', error)
      ElMessage.error(error.response?.data?.msg || '恢复失败')
    }
  } finally {
    importBackupLoading.value = false
    // 清空文件选择
    event.target.value = ''
  }
}

watch(selectedConfigId, () => {
  webdavBackups.value = {
    manual: [],
    config_id: null
  }
})

onMounted(() => {
  fetchSettings()
  fetchSiteSettings()

  // 如果是超级管理员，加载备份设置
  if (isSuperAdmin.value) {
    fetchBackupConfigs()
    fetchScheduleSettings().then(() => {
      // 获取设置后启动定时刷新
      startScheduleRefreshTimer()
    })
    loadLocalBackups()
  }
})

onUnmounted(() => {
  // 组件卸载时清除定时器
  stopScheduleRefreshTimer()
})
</script>

<style scoped>
.system-settings {
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

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-form {
  width: 100%;
}

.settings-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.backup-config-table {
  margin-bottom: 12px;
}

.config-empty {
  margin-top: 10px;
}

.config-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.schedule-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.schedule-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.local-backup-actions {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}

.local-backup-table {
  margin-bottom: 10px;
}

/* 覆盖编辑器相关样式，保证良好排版 */
.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-bottom: 10px;
}

.editor-tabs {
  padding: 8px 15px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.editor-wrapper, .preview-wrapper {
  min-height: 260px;
}

.markdown-preview {
  padding: 15px;
  min-height: 260px;
}

.markdown-tips {
  padding: 8px 15px;
  background-color: #f5f7fa;
  border-top: 1px solid #dcdfe6;
  font-size: 12px;
  color: #909399;
}

.login-tip-item .form-item-help {
  margin-left: 0;
  margin-top: 8px;
  display: block;
  width: 100%;
}

.login-tip-item :deep(.el-form-item__content) {
  flex-direction: column;
  align-items: stretch;
}

.markdown-tips code {
  background-color: #e6e6e6;
  padding: 2px 4px;
  border-radius: 3px;
  margin: 0 2px;
}

.unit-label {
  margin-left: 10px;
  color: #606266;
}

.form-item-help {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.settings-info {
  color: #606266;
}

.settings-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.settings-info .el-icon {
  color: #409EFF;
}

.settings-info .el-icon.warning {
  color: #E6A23C;
}

/* 备份功能样式 */
.backup-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.backup-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f4f4f5;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
}

.backup-info .warning {
  color: #E6A23C;
}

.backup-list {
  margin-top: 20px;
  padding: 15px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.backup-list h5 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #303133;
}

.backup-category {
  margin-bottom: 15px;
}

.backup-category h6 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #606266;
  font-weight: normal;
}

.restore-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.settings-form h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
