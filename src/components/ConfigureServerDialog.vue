<template>
  <el-dialog
    v-model="visible"
    title="🖥️ 生成服务器一键配置脚本"
    width="65%"
    :close-on-click-modal="false"
    @closed="handleClosed"
    class="server-config-dialog"
  >
    <div class="configure-dialog">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        class="mb-16 warning-alert"
        title="⚠️ 推荐在 Ubuntu 22.04 桌面版环境下使用，其他版本尚未充分验证，请谨慎操作"
      />
      <el-alert
        type="info"
        show-icon
        class="mb-16 info-alert"
        title="⏰ 脚本有效期 2 小时，失效后可重新生成"
      />

      <el-form ref="formRef" :model="form" label-width="160px" label-position="left" class="config-form">
        <el-card shadow="hover" class="section-card base-section">
          <template #header>
            <div class="section-header">
              <span class="section-icon">⚙️</span>
              <span class="section-title">固定步骤（默认执行）</span>
            </div>
          </template>
          <p class="section-intro">这些步骤为脚本的必备流程，确保系统初始化、Docker 环境和 sudo 免密等能力。</p>
          <el-space wrap class="mb-12">
            <el-tooltip
              v-for="item in baseModules"
              :key="item.label"
              :content="item.description"
              placement="top"
            >
              <el-tag :type="item.type">{{ item.label }}</el-tag>
            </el-tooltip>
          </el-space>
          <el-form-item label="服务器 SSH 公钥" required>
            <el-input
              v-model="form.sshPublicKey"
              type="textarea"
              :rows="4"
              placeholder="粘贴或使用默认 SSH 公钥"
            />
          </el-form-item>
          <div class="form-tip">脚本会将该公钥写入目标用户的 ~/.ssh/authorized_keys，后续可安全登录。</div>
        </el-card>

        <el-card shadow="hover" class="section-card enhance-section">
          <template #header>
            <div class="section-header">
              <span class="section-icon">⭐</span>
              <span class="section-title">增强组件（可选）</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12">
              <el-form-item label="🛠️ 安装 oh-my-zsh" class="switch-item">
                <el-switch v-model="form.installOhMyZsh" size="large" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="🖥️ 安装 RustDesk" class="switch-item">
                <el-switch v-model="form.installRustdesk" size="large" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="🔥 下载 torch2 镜像" class="switch-item">
                <el-switch v-model="form.loadTorchImage" size="large" />
              </el-form-item>
            </el-col>
          </el-row>

          <transition name="fade">
            <el-card v-if="form.loadTorchImage" shadow="never" class="sub-card">
              <template #header>
                <div class="sub-header">
                  <span class="sub-icon">🔥</span>
                  <span>torch2 镜像配置</span>
                </div>
              </template>
              <el-form-item label="下载地址" required>
                <el-input v-model="form.torchImage.url" placeholder="填写镜像下载链接" />
              </el-form-item>
              <el-form-item label="SHA256 校验">
                <el-input v-model="form.torchImage.sha256" placeholder="可选，留空则跳过校验" />
              </el-form-item>
            </el-card>
          </transition>
        </el-card>

        <el-card shadow="hover" class="section-card network-section">
          <template #header>
            <div class="card-header">
              <div class="section-header">
                <span class="section-icon">🌐</span>
                <span class="section-title">WireGuard 与 Update-IP</span>
              </div>
              <el-switch v-model="form.installWireguard" size="large" />
            </div>
          </template>
          <p class="section-intro">开启后可一次性写入 WireGuard 配置并自动部署 Update-IP 脚本。</p>

          <transition name="fade">
            <div v-if="form.installWireguard" class="wireguard-block">
              <el-form-item label="WireGuard 配置" required>
                <el-input
                  v-model="form.wireguardConfig"
                  type="textarea"
                  :rows="12"
                  placeholder="粘贴完整的 WireGuard 配置文本"
                />
              </el-form-item>

              <el-card shadow="never" class="sub-card">
                <template #header>
                  <div class="card-header">
                    <div class="sub-header">
                      <span class="sub-icon">🔄</span>
                      <span>Update-IP 配置</span>
                    </div>
                    <el-switch v-model="form.updateIp.enabled" size="large" />
                  </div>
                </template>

                <transition name="fade">
                  <div v-if="form.updateIp.enabled" class="update-ip-column">
                    <el-form-item label="域名条目" required>
                      <el-input v-model="form.updateIp.entryName" />
                    </el-form-item>
                    <el-form-item label="获取接口" required>
                      <el-input
                        v-model="form.updateIp.ipEndpoint"
                        type="textarea"
                        :rows="2"
                      />
                    </el-form-item>
                    <el-form-item label="接口用户名">
                      <el-input v-model="form.updateIp.authUser" placeholder="可选" />
                    </el-form-item>
                    <el-form-item label="接口密码">
                      <el-input v-model="form.updateIp.authPassword" placeholder="可选" />
                    </el-form-item>
                    <el-form-item label="WireGuard 接口">
                      <el-input v-model="form.updateIp.wgInterface" />
                    </el-form-item>
                    <el-form-item label="执行频率 (cron)">
                      <el-input v-model="form.updateIp.cron" />
                    </el-form-item>

                    <el-divider content-position="left" class="mt-0">Bark 推送</el-divider>
                    <el-form-item label="启用 Bark 推送">
                      <el-switch v-model="form.updateIp.barkEnabled" />
                    </el-form-item>

                    <transition name="fade">
                      <div v-if="form.updateIp.barkEnabled" class="update-ip-column">
                        <el-form-item label="Bark URL" required>
                          <el-input
                            v-model="form.updateIp.barkUrl"
                            type="textarea"
                            :rows="2"
                          />
                        </el-form-item>
                        <el-form-item label="通知分组">
                          <el-input v-model="form.updateIp.barkGroup" />
                        </el-form-item>
                        <el-form-item label="通知图标">
                          <el-input
                            v-model="form.updateIp.barkIcon"
                            type="textarea"
                            :rows="2"
                            placeholder="可选"
                          />
                        </el-form-item>
                      </div>
                    </transition>
                  </div>
                </transition>
              </el-card>
            </div>
          </transition>
        </el-card>
      </el-form>

      <el-alert
        v-if="errorMessage"
        type="error"
        :closable="false"
        class="mb-16"
        show-icon
        :title="errorMessage"
      />

      <el-card v-if="result" shadow="hover" class="result-card">
        <template #header>
          <div class="card-header">
            <div class="section-header">
              <span class="section-icon">✅</span>
              <span class="section-title">生成结果</span>
            </div>
            <el-tag type="success" size="large" effect="dark">⏱️ 有效期至 {{ expiresAt }}</el-tag>
          </div>
        </template>

        <!-- 常规链接命令 -->
        <div v-if="!shortUrl" class="command-section">
          <div class="result-block">
            <div class="result-label">一键指令（curl版本）</div>
            <el-input v-model="result.install_command" readonly>
              <template #append>
                <el-button type="primary" @click="copy(result.install_command)" class="copy-btn">
                  复制
                </el-button>
              </template>
            </el-input>
            <div class="command-tip">💡 适用于已安装curl的服务器 (curl -fsSL)</div>
          </div>

          <div class="result-block">
            <div class="result-label">一键指令（wget版本）</div>
            <el-input v-model="wgetCommand" readonly>
              <template #append>
                <el-button type="primary" @click="copy(wgetCommand)" class="copy-btn">
                  复制
                </el-button>
              </template>
            </el-input>
            <div class="command-tip">💡 适用于未安装curl但有wget的服务器 (wget -qO-) - 大多数Linux发行版默认包含</div>
          </div>
        </div>

        <!-- 短链接命令 -->
        <div v-if="shortUrl" class="command-section short-command-section">
          <div class="result-block">
            <div class="result-label">🚀 短链接一键指令（curl版本）</div>
            <el-input v-model="shortCurlCommand" readonly>
              <template #append>
                <el-button type="primary" @click="copy(shortCurlCommand)" class="copy-btn">
                  复制
                </el-button>
              </template>
            </el-input>
            <div class="command-tip success-tip">✨ 短链接版本，链接更简洁 (curl -fsSL)</div>
          </div>

          <div class="result-block">
            <div class="result-label">🚀 短链接一键指令（wget版本）</div>
            <el-input v-model="shortWgetCommand" readonly>
              <template #append>
                <el-button type="primary" @click="copy(shortWgetCommand)" class="copy-btn">
                  复制
                </el-button>
              </template>
            </el-input>
            <div class="command-tip success-tip">✨ 短链接版本，链接更简洁 (wget -qO-)</div>
          </div>

          <!-- 显示原始链接选项 -->
          <el-divider content-position="center">
            <el-button text @click="shortUrl = ''" class="show-original-btn">
              📋 显示原始链接命令
            </el-button>
          </el-divider>
        </div>

        <div class="result-block">
          <div class="result-label">固定步骤</div>
          <el-space wrap>
            <el-tooltip
              v-for="item in baseModules"
              :key="item.label"
              :content="item.description"
              placement="top"
            >
              <el-tag :type="item.type">{{ item.label }}</el-tag>
            </el-tooltip>
          </el-space>
        </div>

        <div class="result-block">
          <div class="result-label">脚本下载</div>
          <div class="script-url-row">
            <el-link :href="result.script_url" target="_blank" class="script-url-link">{{ result.script_url }}</el-link>
            <div class="url-actions">
              <el-button type="primary" @click="copy(result.script_url)" class="copy-btn">复制链接</el-button>
              <el-button
                type="warning"
                @click="generateShortUrl"
                :loading="shortUrlLoading"
                class="short-url-btn"
              >
                🔗 {{ shortUrl ? '重新获取' : '获取短链接' }}
              </el-button>
            </div>
          </div>

          <!-- 短链接显示 -->
          <div v-if="shortUrl" class="short-url-display">
            <div class="result-label short-url-label">短链接</div>
            <el-input v-model="shortUrl" readonly class="short-url-input">
              <template #append>
                <el-button type="primary" @click="copy(shortUrl)" class="copy-btn">
                  复制
                </el-button>
              </template>
            </el-input>
          </div>

          <!-- 短链接错误提示 -->
          <el-alert
            v-if="shortUrlError"
            type="error"
            :title="shortUrlError"
            show-icon
            :closable="false"
            class="short-url-error"
          />
        </div>

        <div class="result-block" v-if="resourceList.length">
          <div class="result-label">依赖资源</div>
          <el-space wrap>
            <el-tag v-for="item in resourceList" :key="item.name" type="info">
              <el-link :href="item.url" target="_blank">{{ item.name }}</el-link>
            </el-tag>
          </el-space>
        </div>

        <div class="result-block">
          <div class="result-label">SSH 公钥</div>
          <el-input v-model="form.sshPublicKey" type="textarea" :rows="3" readonly>
            <template #append>
              <el-button type="primary" @click="copy(form.sshPublicKey)" class="copy-btn">
                复制
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="result-block">
          <div class="result-label">启用模块</div>
          <el-space wrap>
            <el-tag v-for="item in enabledModules" :key="item.label" type="success">
              {{ item.label }}
            </el-tag>
          </el-space>
        </div>

        <div class="result-block" v-if="result.torch_image">
          <div class="result-label">Torch 镜像</div>
          <div class="torch-info">
            <div>下载地址：<el-link :href="result.torch_image.url" target="_blank">{{ result.torch_image.url }}</el-link></div>
            <div v-if="result.torch_image.sha256">SHA256：{{ result.torch_image.sha256 }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="large" @click="closeDialog" class="cancel-btn">
          ❌ 取消
        </el-button>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
          class="submit-btn"
        >
          {{ result ? '🔄 重新生成' : '🚀 生成脚本' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useServerSetupStore } from '../stores/serverSetup'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const store = useServerSetupStore()
const formRef = ref(null)

// 短链接相关状态
const shortUrlLoading = ref(false)
const shortUrl = ref('')
const shortUrlError = ref('')

const DEFAULT_SSH_KEY = ''
const DEFAULT_TORCH_URL = 'http://10.160.109.128:5000/share.cgi?ssid=c9066b12c89947a88c0fb639632d5b5e&ep=&path=%2F&filename=torch2.tar&openfolder=normal&fid=torch2.tar'
const DEFAULT_TORCH_SHA = '52af54f32508874de8b1a28373e33aa37ef9e27f71c047c86cf1d155f80d304a'
const DEFAULT_IP_ENDPOINT = 'https://ip.myzr.site/get-ip'
const DEFAULT_ENTRY_NAME = 'ip.dns.com'
const DEFAULT_BARK_URL = ''
const DEFAULT_BARK_GROUP = ''
const DEFAULT_BARK_ICON = ''

// 短链接服务配置 - 通过后端代理调用
const SHORTURL_CONFIG = {
  apiUrl: '/api/shorturl/generate', // 使用后端代理接口
}

const baseModules = [
  {
    label: '系统初始化',
    type: 'info',
    description: '创建 Apps 目录、调整权限，保证后续脚本写入位置一致。'
  },
  {
    label: '禁用自动更新',
    type: 'warning',
    description: '锁定内核版本，关闭 unattended-upgrades 与自动更新计划任务。'
  },
  {
    label: '更换 apt 源',
    type: 'info',
    description: '将 apt 源替换为清华镜像，加速软件包下载。'
  },
  {
    label: '基础软件安装',
    type: 'success',
    description: '安装 vim、curl、git、net-tools、build-essential 等常用工具。'
  },
  {
    label: 'NVIDIA 显卡驱动',
    type: 'warning',
    description: '自动检测并安装最新的 NVIDIA 显卡驱动，为 GPU 计算提供基础支持。'
  },
  {
    label: 'Docker 与 GPU 支持',
    type: 'success',
    description: '自动安装 Docker、配置 GPU runtime（nvidia-container-toolkit）并启用服务。'
  },
  {
    label: 'Miniconda 基础环境',
    type: 'success',
    description: '下载并安装最新 Miniconda，初始化环境以便后续 Python/GPU 依赖管理。'
  },
  {
    label: 'SSH 公钥配置',
    type: 'info',
    description: '将填写的公钥写入 ~/.ssh/authorized_keys，保障远程免密登录。'
  },
  {
    label: 'sudo 免密命令',
    type: 'info',
    description: '为常用运维命令生成 sudoers 免密规则。'
  },
  {
    label: '系统日志提醒',
    type: 'success',
    description: '在脚本结尾输出完成提示及运维注意事项。'
  }
]

const defaultForm = () => ({
  sshPublicKey: DEFAULT_SSH_KEY,
  installOhMyZsh: true,
  installMiniconda: true,
  installRustdesk: false,
  installWireguard: false,
  loadTorchImage: false,
  wireguardConfig: '',
  updateIp: {
    enabled: true,
    entryName: DEFAULT_ENTRY_NAME,
    ipEndpoint: DEFAULT_IP_ENDPOINT,
    authUser: '',
    authPassword: '',
    wgInterface: 'wg-dns',
    cron: '* * * * *',
    barkEnabled: false,
    barkUrl: DEFAULT_BARK_URL,
    barkGroup: DEFAULT_BARK_GROUP,
    barkIcon: DEFAULT_BARK_ICON
  },
  torchImage: {
    url: DEFAULT_TORCH_URL,
    sha256: DEFAULT_TORCH_SHA
  }
})

const form = reactive(defaultForm())

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = computed(() => store.loading)
const result = computed(() => store.result)
const errorMessage = computed(() => store.error)

const resourceList = computed(() => result.value?.resources || [])

const enabledModules = computed(() => {
  const opts = result.value?.options || {}
  const mapping = [
    { key: 'install_ohmyzsh', label: 'oh-my-zsh' },
    { key: 'install_miniconda', label: 'Miniconda' },
    { key: 'install_rustdesk', label: 'RustDesk' },
    { key: 'install_wireguard', label: 'WireGuard' },
    { key: 'update_ip_enabled', label: 'Update-IP' },
    { key: 'load_torch_image', label: 'torch2 镜像' }
  ]
  return mapping.filter(item => opts[item.key]).map(item => ({ label: item.label }))
})

const expiresAt = computed(() => {
  if (!result.value?.expires_at) return '未知'
  const date = new Date(result.value.expires_at)
  if (Number.isNaN(date.getTime())) return result.value.expires_at
  return date.toLocaleString()
})

const wgetCommand = computed(() => {
  if (!result.value?.install_command) return ''

  const curlCommand = result.value.install_command.trim()

  // 尝试多种curl命令格式的匹配
  const patterns = [
    // 匹配: curl -fsSL URL | bash
    /^curl\s+(-[fsSL]+)\s+([^\s|]+)(\s*\|\s*.+)?$/,
    // 匹配: curl [其他参数] URL | bash
    /^curl\s+((?:-[a-zA-Z]+\s*)*)\s*([^\s|]+)(\s*\|\s*.+)?$/
  ]

  for (const pattern of patterns) {
    const match = curlCommand.match(pattern)
    if (match) {
      const url = match[2]
      const pipeline = match[3] || ''

      // curl参数说明:
      // -f: 失败时静默退出
      // -s: 静默模式，不显示进度条
      // -S: 显示错误信息（与-s配合使用）
      // -L: 跟随重定向
      //
      // wget对应参数:
      // -q: 静默模式
      // -O-: 输出到标准输出（而不是文件）
      return `wget -qO- ${url}${pipeline}`
    }
  }

  // 如果都无法匹配，进行简单替换
  return curlCommand
    .replace(/curl\s+-[fsSL]+/g, 'wget -qO-')
    .replace(/curl\s+/g, 'wget -qO- ')
})

// 短链接版本的命令
const shortCurlCommand = computed(() => {
  if (!shortUrl.value || !result.value?.install_command) return ''
  return result.value.install_command.replace(/https?:\/\/[^\s|]+/, shortUrl.value)
})

const shortWgetCommand = computed(() => {
  if (!shortUrl.value || !shortCurlCommand.value) return ''
  return wgetCommand.value.replace(/https?:\/\/[^\s|]+/, shortUrl.value)
})

// 调用短链接API
const generateShortUrl = async () => {
  if (!result.value?.script_url) {
    ElMessage.error('请先生成脚本')
    return
  }

  shortUrlLoading.value = true
  shortUrlError.value = ''

  try {
    // 获取用户token
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录，请重新登录')
    }

    const response = await fetch(SHORTURL_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: result.value.script_url,
        title: '服务器一键配置脚本'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code === 'success' && data.data?.shorturl) {
      shortUrl.value = data.data.shorturl
      // 根据后端返回的信息显示不同的提示
      const isExisting = data.data.is_existing
      if (isExisting) {
        ElMessage.success('获取已存在的短链接')
      } else {
        ElMessage.success('短链接生成成功')
      }
    } else {
      throw new Error(data.msg || '短链接生成失败')
    }
  } catch (error) {
    console.error('短链接生成失败:', error)
    shortUrlError.value = error.message
    ElMessage.error(`短链接生成失败: ${error.message}`)
  } finally {
    shortUrlLoading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, defaultForm())
  store.reset()
  // 重置短链接状态
  shortUrl.value = ''
  shortUrlError.value = ''
  shortUrlLoading.value = false
}

const closeDialog = () => {
  visible.value = false
}

const handleClosed = () => {
  resetForm()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      store.reset()
    }
  }
)

const validate = () => {
  if (!form.sshPublicKey.trim()) {
    ElMessage.error('请填写 SSH 公钥')
    return false
  }
  if (form.installWireguard && !form.wireguardConfig.trim()) {
    ElMessage.error('请粘贴完整的 WireGuard 配置')
    return false
  }

  if (form.installWireguard && form.updateIp.enabled) {
    if (!form.updateIp.entryName.trim()) {
      ElMessage.error('请填写 Update-IP 的域名条目')
      return false
    }
    if (!form.updateIp.ipEndpoint.trim()) {
      ElMessage.error('请填写 Update-IP 的获取接口')
      return false
    }
    if (form.updateIp.barkEnabled && !form.updateIp.barkUrl.trim()) {
      ElMessage.error('启用 Bark 推送时需要提供 Bark URL')
      return false
    }
  }

  if (form.loadTorchImage && !form.torchImage.url.trim()) {
    ElMessage.error('请提供 torch2 镜像的下载地址')
    return false
  }

  return true
}

const buildPayload = () => {
  const payload = {
    sshPublicKey: form.sshPublicKey.trim(),
    installOhMyZsh: form.installOhMyZsh,
    installMiniconda: form.installMiniconda,
    installRustdesk: form.installRustdesk,
    installWireguard: form.installWireguard,
    loadTorchImage: form.loadTorchImage,
    wireguardConfig: form.wireguardConfig.trim()
  }

  if (form.installWireguard) {
    payload.updateIp = {
      enabled: form.updateIp.enabled,
      entryName: form.updateIp.entryName.trim(),
      ipEndpoint: form.updateIp.ipEndpoint.trim(),
      authUser: form.updateIp.authUser.trim(),
      authPassword: form.updateIp.authPassword,
      wgInterface: form.updateIp.wgInterface.trim() || 'wg-dns',
      cron: form.updateIp.cron.trim() || '* * * * *',
      barkEnabled: form.updateIp.barkEnabled,
      barkUrl: form.updateIp.barkUrl.trim(),
      barkGroup: form.updateIp.barkGroup.trim() || 'WG服务',
      barkIcon: form.updateIp.barkIcon.trim()
    }
  }

  if (form.loadTorchImage) {
    payload.torchImage = {
      url: form.torchImage.url.trim(),
      sha256: form.torchImage.sha256.trim()
    }
  }

  return payload
}

const handleSubmit = async () => {
  if (!validate()) return

  try {
    await store.generate(buildPayload())
    ElMessage.success('脚本生成成功，可复制指令或下载脚本')
  } catch (error) {
    if (!store.error) {
      ElMessage.error(error.response?.data?.msg || '生成失败，请稍后再试')
    }
  }
}

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.configure-dialog {
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 4px;
}

.config-form {
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 16px;
}

.sub-card {
  margin-top: 12px;
}

.section-intro {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-12 {
  margin-bottom: 12px;
}

.ml-8 {
  margin-left: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-card {
  margin-top: 16px;
}

.result-block {
  margin-bottom: 16px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: -8px;
}

.result-label {
  font-weight: 600;
  margin-bottom: 4px;
}

.torch-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wireguard-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.update-ip-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.copy-btn {
  color: #ffffff !important;
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
  font-weight: 500;
  min-width: 60px;
}

.copy-btn:hover {
  background-color: var(--el-color-primary-light-3) !important;
  border-color: var(--el-color-primary-light-3) !important;
}

/* 对话框整体样式 */
.server-config-dialog {
  border-radius: 12px;
}

.server-config-dialog .el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
}

.server-config-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 600;
}

.server-config-dialog .el-dialog__body {
  padding: 24px;
  background-color: #fafbfc;
}

/* 警告和信息提示样式 */
.warning-alert {
  border-radius: 8px;
  border-left: 4px solid #e6a23c;
  background-color: #fdf6ec;
}

.info-alert {
  border-radius: 8px;
  border-left: 4px solid #409eff;
  background-color: #ecf5ff;
}

/* Section卡片样式 */
.section-card {
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  background: white;
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.base-section {
  border-left: 4px solid #67c23a;
}

.enhance-section {
  border-left: 4px solid #e6a23c;
}

.network-section {
  border-left: 4px solid #409eff;
}

/* Section标题样式 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 表单项优化 */
.config-form .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

.config-form .el-switch {
  --el-switch-on-color: #67c23a;
}

/* 结果卡片样式 */
.result-card {
  border-radius: 12px;
  border: 2px solid #67c23a;
  background: linear-gradient(145deg, #f0f9ff, #ffffff);
}

.result-card .el-card__header {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
  border-radius: 10px 10px 0 0;
}

.result-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-label::before {
  content: "📋";
  font-size: 14px;
}

/* 标签优化 */
.el-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 输入框优化 */
.el-input__inner {
  border-radius: 8px;
}

.el-textarea__inner {
  border-radius: 8px;
}

/* 子卡片样式 */
.sub-card {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

/* 开关表单项样式 */
.switch-item .el-form-item__label {
  font-weight: 600;
  color: #303133;
}

/* 子标题样式 */
.sub-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #606266;
}

.sub-icon {
  font-size: 16px;
}

/* 表单标签图标优化 */
.config-form .el-form-item__label {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 卡片间距优化 */
.configure-dialog .section-card + .section-card {
  margin-top: 20px;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .server-config-dialog {
    width: 95% !important;
    margin: 10px;
  }

  .configure-dialog {
    max-height: 80vh;
  }

  .section-card:hover {
    transform: none;
  }
}

/* 底部按钮样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background-color: #fafbfc;
  border-top: 1px solid #e4e7ed;
  border-radius: 0 0 12px 12px;
}

.cancel-btn {
  border-radius: 8px;
  font-weight: 500;
  min-width: 100px;
}

.submit-btn {
  border-radius: 8px;
  font-weight: 600;
  min-width: 120px;
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

/* 命令提示样式 */
.command-tip {
  font-size: 12px;
  color: var(--el-color-info);
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #f4f4f5;
  border-radius: 4px;
  border-left: 3px solid var(--el-color-info);
}

.success-tip {
  color: var(--el-color-success);
  background-color: #f0f9e8;
  border-left-color: var(--el-color-success);
}

/* 脚本URL行样式 */
.script-url-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.script-url-link {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 短链接相关样式 */
.short-url-display {
  margin-top: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px dashed var(--el-color-success);
}

.short-url-label {
  color: var(--el-color-success);
  font-weight: 600;
}

.short-url-input .el-input__inner {
  background-color: #f0f9e8;
  border-color: var(--el-color-success);
}

.short-url-error {
  margin-top: 8px;
}

.short-url-btn {
  font-weight: 500;
}

/* 命令区域样式 */
.command-section {
  border-radius: 8px;
  padding: 12px 0;
}

.short-command-section {
  background: linear-gradient(145deg, #f0f9e8, #ffffff);
  border: 2px solid var(--el-color-success);
  padding: 16px;
  margin: 16px 0;
  border-radius: 12px;
}

.short-command-section .result-label {
  color: var(--el-color-success);
}

.show-original-btn {
  color: var(--el-color-info);
  font-size: 13px;
}

.show-original-btn:hover {
  color: var(--el-color-primary);
}
</style>
