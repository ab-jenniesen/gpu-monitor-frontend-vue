<template>
  <div class="main-layout">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="header-left">
            <img :src="siteSettings.logo" class="header-logo" alt="Logo" />
            <h1 class="header-title">{{ siteSettings.name }}</h1>
          </div>
          
          <!-- 移动端菜单按钮 -->
          <div class="mobile-menu-btn" @click="toggleMobileMenu">
            <el-icon><Menu /></el-icon>
          </div>
          
          <!-- 桌面端导航菜单 -->
          <div class="nav-menu desktop-nav">
            <router-link :to="{ name: 'user' }" class="nav-item" :class="{ active: $route.name === 'user' }">
              <el-icon><HomeFilled /></el-icon>
              <span>首页</span>
            </router-link>
            <router-link :to="{ name: 'servers-overview' }" class="nav-item" :class="{ active: $route.name === 'servers-overview' }">
              <el-icon><Monitor /></el-icon>
              <span>服务器概览</span>
            </router-link>
            <router-link v-if="userRole === 'admin'" :to="{ name: 'admin' }" class="nav-item" :class="{ active: $route.name === 'admin' }">
              <el-icon><Setting /></el-icon>
              <span>管理面板</span>
              <el-badge v-if="pendingCount > 0" :value="pendingCount" class="admin-pending-badge" />
            </router-link>
          </div>
          
          <div class="header-actions">
            <div class="announcement-entry">
              <el-badge
                :value="notificationCount"
                :max="99"
                :hidden="notificationCount === 0"
                class="announcement-badge"
              >
                <el-button
                  class="announcement-button"
                  :class="{ 'announcement-button--alert': notificationCount > 0 }"
                  circle
                  size="default"
                  @click="openAnnouncementCenter"
                  aria-label="查看公告"
                >
                  <el-icon><BellFilled /></el-icon>
                </el-button>
              </el-badge>
            </div>

            <div class="user-info">
              <div class="custom-user-dropdown">
                <div class="user-dropdown-trigger" @click="toggleUserMenu">
                  <el-avatar :size="36" class="user-avatar" :src="navAvatarUrl">
                    {{ avatarInitial }}
                  </el-avatar>
                  <span class="username-text">{{ username || '用户' }}</span>
                  <el-icon class="dropdown-arrow" :class="{ 'dropdown-arrow-open': showUserMenu }">
                    <ArrowDown />
                  </el-icon>
                </div>

                <transition name="dropdown-fade">
                  <div v-if="showUserMenu" class="custom-dropdown-content" @click.stop>
                      <div class="dropdown-menu-items">
                        <div class="dropdown-menu-item" @click="openAvatarDialog">
                          <div class="menu-item-icon">
                            <el-icon><UserFilled /></el-icon>
                          </div>
                          <div class="menu-item-content">
                            <span class="menu-item-title">设置头像</span>
                            <span class="menu-item-desc">支持输入网络头像链接</span>
                          </div>
                        </div>
                        <div class="dropdown-menu-item" @click="openChangePasswordDialog">
                          <div class="menu-item-icon">
                            <el-icon><Key /></el-icon>
                          </div>
                          <div class="menu-item-content">
                            <span class="menu-item-title">修改密码</span>
                            <span class="menu-item-desc">更改您的登录密码</span>
                          </div>
                        </div>

                        <div class="dropdown-menu-item logout-item" @click="handleLogout">
                          <div class="menu-item-icon">
                            <el-icon><SwitchButton /></el-icon>
                          </div>
                          <div class="menu-item-content">
                            <span class="menu-item-title">退出登录</span>
                            <span class="menu-item-desc">安全退出当前账户</span>
                          </div>
                        </div>
                      </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 移动端下拉菜单 -->
        <div class="mobile-nav" :class="{ 'mobile-nav-open': showMobileMenu }">
          <router-link :to="{ name: 'user' }" class="mobile-nav-item" :class="{ active: $route.name === 'user' }" @click="closeMobileMenu">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </router-link>
          <router-link :to="{ name: 'servers-overview' }" class="mobile-nav-item" :class="{ active: $route.name === 'servers-overview' }" @click="closeMobileMenu">
            <el-icon><Monitor /></el-icon>
            <span>服务器概览</span>
          </router-link>
          <router-link v-if="userRole === 'admin'" :to="{ name: 'admin' }" class="mobile-nav-item" :class="{ active: $route.name === 'admin' }" @click="closeMobileMenu">
            <el-icon><Setting /></el-icon>
            <span>管理面板</span>
            <el-badge v-if="pendingCount > 0" :value="pendingCount" class="mobile-admin-badge" />
          </router-link>
        </div>
      </el-header>
      
      <el-main>
        <!-- 页面内容区域，使用过渡动画 -->
        <router-view v-slot="{ Component, route }">
          <transition name="page-transition" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
    
    
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

    <!-- 设置头像对话框 -->
    <el-dialog
      v-model="avatarDialogVisible"
      title="设置头像"
      width="420px"
      center
      destroy-on-close
    >
      <div class="avatar-dialog-body">
        <div class="avatar-preview">
          <el-avatar :size="80" class="user-avatar" :src="previewAvatarUrl">
            {{ avatarInitial }}
          </el-avatar>
          <div class="avatar-preview-text">
            <p>支持填写公网图片地址；留空将使用系统默认头像。</p>
            <p class="hint">建议使用以 http(s):// 开头的链接。</p>
          </div>
        </div>
        <el-input
          v-model="avatarForm.url"
          placeholder="输入头像图片 URL，可留空恢复默认"
          clearable
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="avatarDialogVisible = false" :disabled="avatarFormLoading">取消</el-button>
          <el-button @click="resetAvatarUrl" :disabled="avatarFormLoading || !avatarForm.url">恢复默认</el-button>
          <el-button type="primary" @click="submitAvatarUrl" :loading="avatarFormLoading">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <MandatoryAnnouncementDialog
      v-model="showMandatoryDialog"
      :announcement="mandatoryAnnouncement"
      @close="handleMandatoryClose"
      @dismiss="handleMandatoryDismiss"
      @update:model-value="handleMandatoryDialogClose"
    />

    <AnnouncementCenter
      v-model="showAnnouncementCenter"
      v-model:active-tab="announcementCenterTab"
      :mandatory-announcement="mandatoryAnnouncement"
      :announcements="sortedAnnouncements"
      :has-new-mandatory="hasNewMandatory"
      :has-new-general="hasNewGeneral"
      @view-general="handleGeneralViewed"
      @mark-read-one="handleMarkReadOne"
      @mark-unread-one="handleMarkUnreadOne"
      @update:model-value="handleAnnouncementCenterClose"
    />

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from '../utils/axios'
import { HomeFilled, Monitor, Setting, UserFilled, ArrowDown, Key, SwitchButton, Menu, BellFilled } from '@element-plus/icons-vue'
import MandatoryAnnouncementDialog from '../components/MandatoryAnnouncementDialog.vue'
import AnnouncementCenter from '../components/AnnouncementCenter.vue'
import { useAnnouncements } from '../composables/useAnnouncements'
import { useAuthStore } from '../stores/auth'
import { resolveAvatarUrl } from '../utils/avatar'

const router = useRouter()
const authStore = useAuthStore()

// 用户信息
const username = computed(() => authStore.user?.username || localStorage.getItem('username') || '')
const userRole = computed(() => authStore.user?.role || localStorage.getItem('userRole') || '')
const rawAvatarUrl = computed(() => {
  const direct = authStore.user?.avatar_url
  if (typeof direct === 'string') return direct
  return localStorage.getItem('avatarUrl') || ''
})
const navAvatarUrl = computed(() => resolveAvatarUrl(rawAvatarUrl.value, username.value || 'user', 80))
const avatarInitial = computed(() => (username.value ? username.value.charAt(0) : '用').toUpperCase())

// 移动端菜单
const showMobileMenu = ref(false)

// 自定义用户菜单
const showUserMenu = ref(false)
const closeUserMenu = () => {
  showUserMenu.value = false
}

// 待审批申请数量
const pendingRequests = ref([])

// 计算待审批数量
const pendingCount = computed(() => {
  return pendingRequests.value.filter(req => req.status === 'pending').length
})

// 站点设置
const siteSettings = reactive({
  name: 'GPU共享服务平台',
  logo: 'https://lank.myzr.org:88/i/2024/05/29/66571d8de15ea.png',
  subtitle: '高效、安全的资源管理平台'
})

const {
  sortedAnnouncements,
  mandatoryAnnouncement,
  hasNewMandatory,
  hasNewGeneral,
  totalUnreadCount,
  markGeneralAsRead,
  markOneAsRead,
  markOneAsUnread,
  acknowledgeMandatory,
  fetchAnnouncements
} = useAnnouncements({ pollInterval: 30000 })

const showMandatoryDialog = ref(false)
const showAnnouncementCenter = ref(false)
const announcementCenterTab = ref('mandatory')
const dismissedMandatorySignature = ref('')

const mandatorySignature = computed(() => {
  if (!mandatoryAnnouncement.value) return ''
  return `${mandatoryAnnouncement.value.id}-${mandatoryAnnouncement.value.updated_at}`
})

watch(mandatorySignature, (signature) => {
  if (signature && dismissedMandatorySignature.value && dismissedMandatorySignature.value !== signature) {
    dismissedMandatorySignature.value = ''
  }
  if (!signature) {
    dismissedMandatorySignature.value = ''
  }
})

watch(
  () => [mandatoryAnnouncement.value, hasNewMandatory.value],
  ([announcement, hasNew]) => {
    if (!announcement || !hasNew) return
    if (dismissedMandatorySignature.value === mandatorySignature.value) return
    showMandatoryDialog.value = true
  },
  { immediate: true }
)

const openAnnouncementCenter = async () => {
  // 打开前先刷新数据
  await fetchAnnouncements()
  
  // 按优先级选择显示的标签页：
  // 1. 如果重点公告有更新 -> 显示重点公告
  // 2. 否则如果时间线有新消息 -> 显示时间线
  // 3. 否则默认显示重点公告
  if (hasNewMandatory.value) {
    announcementCenterTab.value = 'mandatory'
  } else if (hasNewGeneral.value) {
    announcementCenterTab.value = 'timeline'
  } else {
    announcementCenterTab.value = 'mandatory'
  }
  showAnnouncementCenter.value = true
}

const handleMandatoryClose = () => {
  dismissedMandatorySignature.value = mandatorySignature.value
}

const handleMandatoryDismiss = () => {
  if (mandatoryAnnouncement.value) {
    acknowledgeMandatory(mandatoryAnnouncement.value)
  }
  dismissedMandatorySignature.value = mandatorySignature.value
}

const handleMandatoryDialogClose = async (value) => {
  showMandatoryDialog.value = value
  if (!value) {
    // 关闭时刷新数据
    await fetchAnnouncements()
  }
}

const handleGeneralViewed = () => {
  markGeneralAsRead()
}

const handleMarkReadOne = (item) => {
  try { markOneAsRead(item) } catch (e) { /* no-op */ }
}

const handleMarkUnreadOne = (item) => {
  try { markOneAsUnread(item) } catch (e) { /* no-op */ }
}

const handleAnnouncementCenterClose = async (value) => {
  showAnnouncementCenter.value = value
  if (!value) {
    // 关闭时刷新数据
    await fetchAnnouncements()
  }
}

const notificationCount = computed(() => {
  const count = totalUnreadCount.value
  if (!count) return 0
  return count > 99 ? 99 : count
})

// 获取待审批申请
const fetchPendingRequests = async () => {
  if (userRole.value !== 'admin') return
  
  try {
    const response = await axios.get('/api/container-requests')
    pendingRequests.value = response.data.requests || []
  } catch (error) {
    console.error('获取待审批申请失败:', error)
    pendingRequests.value = []
  }
}

watch(userRole, (role) => {
  if (role === 'admin') {
    fetchPendingRequests()
  } else {
    pendingRequests.value = []
  }
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

// 修改密码相关
const changePasswordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordFormLoading = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const avatarDialogVisible = ref(false)
const avatarFormLoading = ref(false)
const avatarForm = reactive({ url: '' })
const previewAvatarUrl = computed(() => resolveAvatarUrl(avatarForm.url, username.value || 'user', 120))

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
  closeUserMenu()
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

// 移动端菜单控制
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
}

// 用户菜单控制
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const openAvatarDialog = () => {
  avatarForm.url = rawAvatarUrl.value
  avatarDialogVisible.value = true
  closeUserMenu()
}

const resetAvatarUrl = () => {
  avatarForm.url = ''
}

const submitAvatarUrl = async () => {
  if (avatarFormLoading.value) return
  const trimmed = avatarForm.url ? avatarForm.url.trim() : ''
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    ElMessage.error('头像地址需以 http:// 或 https:// 开头')
    return
  }
  if (trimmed.length > 2048) {
    ElMessage.error('头像地址长度不能超过 2048 字符')
    return
  }

  avatarFormLoading.value = true
  try {
    const response = await axios.put('/api/users/avatar', { avatar_url: trimmed })
    authStore.setAvatarUrl(response.data?.avatar_url || '')
    ElMessage.success('头像已更新')
    avatarDialogVisible.value = false
  } catch (error) {
    const message = error.response?.data?.msg || '头像更新失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    avatarFormLoading.value = false
  }
}

// 退出登录
const handleLogout = () => {
  authStore.logout()
  closeUserMenu()
  router.push('/login')
}

onMounted(() => {
  fetchSiteSettings()
  fetchPendingRequests()

  // 设置定时器，每30秒更新信息
  const timer = setInterval(() => {
    if (userRole.value === 'admin') {
      fetchPendingRequests()
    }
  }, 30000)
  
  // 添加页面焦点事件监听，页面重新获得焦点时刷新公告
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      fetchAnnouncements()
    }
  }
  
  const handleFocus = () => {
    fetchAnnouncements()
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('refreshPendingCount', fetchPendingRequests)

  // 添加全局点击事件监听器，用于关闭用户下拉菜单
  const handleClickOutside = (event) => {
    const userDropdown = document.querySelector('.custom-user-dropdown')
    if (showUserMenu.value && userDropdown && !userDropdown.contains(event.target)) {
      closeUserMenu()
    }
  }
  document.addEventListener('click', handleClickOutside)

  // 页面卸载时清除定时器和事件监听
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('refreshPendingCount', fetchPendingRequests)
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  animation: containerFadeIn 0.8s ease-out;
}

@keyframes containerFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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
  font-size: 32px;
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
  gap: 12px;
  padding: 10px 20px;
  color: #333;
  text-decoration: none;
  border-radius: 100px;
  font-weight: 500;
  font-size: 20px;
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
  font-size: 30px;
  transition: transform 0.3s ease;
}

.nav-item:hover .el-icon {
  transform: scale(1.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  flex-shrink: 0;
  animation: slideInRight 0.6s ease-out 0.4s both;
}

.announcement-entry {
  display: flex;
  align-items: center;
  margin-right: 5px;
}

.announcement-button {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(140, 150, 170, 0.35);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.96), rgba(240, 242, 248, 0.9));
  color: #8a9aa9;
  transition: all 0.25s ease;
  box-shadow: 0 12px 26px rgba(138, 154, 169, 0.15);
}

.announcement-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 38px rgba(138, 154, 169, 0.2);
}

.announcement-button .el-icon {
  font-size: 21px;
}

.announcement-button::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: border-color 0.25s ease;
}

.announcement-button--alert {
  color: #d32029;
  border-color: rgba(211, 32, 41, 0.5);
}

.announcement-button--alert::after {
  border-color: rgba(211, 32, 41, 0.65);
  animation: pulse-ring 1.6s linear infinite;
}

@keyframes pulse-ring {
  0% { opacity: 0.8; transform: scale(1); }
  70% { opacity: 0; transform: scale(1.25); }
  100% { opacity: 0; transform: scale(1.25); }
}

.announcement-badge :deep(.el-badge__content) {
  background: linear-gradient(180deg, #ff4d4f 0%, #d32029 100%);
  box-shadow: 0 4px 10px rgba(211, 32, 41, 0.28);
  border: none;
  padding: 0 6px;
  font-weight: 600;
}

.announcement-badge :deep(.el-badge__content.is-fixed) {
  top: 4px;
  right: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  height: 100%;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 自定义用户下拉菜单样式 */
.custom-user-dropdown {
  position: relative;
  z-index: 1002;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  height: 48px;
  padding: 0 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #333;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.user-dropdown-trigger:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
  color: #409EFF;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
}

.dropdown-arrow {
  transition: transform 0.3s ease;
}

.dropdown-arrow-open {
  transform: rotate(180deg);
}

/* 下拉菜单内容 */
.custom-dropdown-content {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 200px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 255, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  z-index: 1001;
}


/* 下拉菜单动画 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}


/* 菜单项容器 */
.dropdown-menu-items {
  padding: 8px 0;
}

/* 菜单项 */
.dropdown-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.dropdown-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.05));
  transition: width 0.3s ease;
}

.dropdown-menu-item:hover::before {
  width: 100%;
}

.dropdown-menu-item:hover {
  background: rgba(64, 158, 255, 0.03);
}

.logout-item:hover {
  background: rgba(245, 108, 108, 0.05);
}

.logout-item:hover::before {
  background: linear-gradient(90deg, rgba(245, 108, 108, 0.1), rgba(245, 108, 108, 0.05));
}

.menu-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
  transition: all 0.3s ease;
}

.logout-item .menu-item-icon {
  background: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

.dropdown-menu-item:hover .menu-item-icon {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.logout-item:hover .menu-item-icon {
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
}

.menu-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.menu-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: color 0.3s ease;
}

.menu-item-desc {
  font-size: 12px;
  color: #999;
  transition: color 0.3s ease;
}

.dropdown-menu-item:hover .menu-item-title {
  color: #409EFF;
}

.logout-item:hover .menu-item-title {
  color: #F56C6C;
}

.dropdown-menu-item:hover .menu-item-desc {
  color: #666;
}

.avatar-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.avatar-preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.avatar-preview-text .hint {
  color: #909399;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF, #36D1DC, #667eea);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.admin-pending-badge {
  margin-left: 8px;
}

.admin-pending-badge :deep(.el-badge__content) {
  background-color: #F56C6C;
  color: white;
  border: none;
}

.el-main {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecf3 100%);
  min-height: calc(100vh - 70px);
}

/* 页面切换过渡动画 */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: all 0.3s ease;
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #333;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.mobile-menu-btn:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
  color: #409EFF;
}

.mobile-menu-btn .el-icon {
  font-size: 24px;
}

/* 移动端下拉菜单 */
.mobile-nav {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(64, 158, 255, 0.08) 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  transform: translateY(-100%);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 99;
}

.mobile-nav-open {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 30px;
  color: #333;
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.mobile-nav-item:last-child {
  border-bottom: none;
}

.mobile-nav-item:hover {
  background: rgba(64, 158, 255, 0.08);
  color: #409EFF;
}

.mobile-nav-item.active {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(64, 158, 255, 0.05) 100%);
  color: #409EFF;
  font-weight: 600;
}

.mobile-nav-item .el-icon {
  font-size: 20px;
}

.mobile-admin-badge {
  margin-left: 8px;
}

.mobile-admin-badge :deep(.el-badge__content) {
  background-color: #F56C6C;
  color: white;
  border: none;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 15px;
  }
  
  .header-title {
    font-size: 18px;
  }
  
  .header-logo {
    height: 36px;
  }
  
  .header-left {
    gap: 12px;
  }

  .announcement-button {
    width: 40px;
    height: 40px;
  }

  .header-actions {
    gap: 12px;
  }
  
  /* 隐藏桌面端导航 */
  .desktop-nav {
    display: none;
  }
  
  /* 显示移动端菜单按钮 */
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* 调整用户信息显示 */
  .user-dropdown-trigger {
    padding: 0 12px;
    height: 40px;
  }

  .custom-dropdown-content {
    width: 180px;
  }
  
  .username-text {
    display: none;
  }
  
  .user-avatar {
    width: 32px !important;
    height: 32px !important;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 10px;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .header-logo {
    height: 32px;
  }
  
  .mobile-nav-item {
    padding: 12px 20px;
    font-size: 15px;
  }
  
  .user-dropdown-trigger {
    padding: 0 8px;
    height: 36px;
  }

  .custom-dropdown-content {
    width: 160px;
  }

  .announcement-button {
    width: 36px;
    height: 36px;
  }

  .header-actions {
    gap: 10px;
  }
}
</style>
