<template>
  <div v-if="!props.disabled" class="danmaku-chat">
    <!-- 弹幕显示区域 -->
    <div 
      ref="danmakuContainer" 
      class="danmaku-container"
      :class="{ 'show': isVisible }"
    >
      <div
        v-for="message in displayMessages"
        :key="message.id"
        :data-id="message.id"
        class="danmaku-message"
        :class="`danmaku-${message.id}`"
        :style="{
          top: `${message.track * 50}px`,
          color: message.color,
          transform: `translateX(${message.position}px)`,
          transition: `transform ${message.duration}s linear`
        }"
      >
        <strong>{{ message.username }}:</strong> {{ message.content }}
      </div>
    </div>

    <!-- 聊天控制面板 -->
    <div class="chat-controls" v-if="showControls">
      <div class="chat-panel">
        <div class="chat-header">
          <h4>弹幕聊天</h4>
          <div class="online-count">
            <span>👥 {{ onlineCount }} 人在线</span>
          </div>
          <el-button
            link
            @click="closeChat"
            :icon="Close"
          />
        </div>

        <div class="message-input-area">
          <div class="input-row">
            <el-input
              v-model="messageInput"
              placeholder="输入弹幕内容..."
              maxlength="100"
              show-word-limit
              @keyup.enter="sendMessage"
              :disabled="!isConnected"
            />
            <el-button 
              type="primary" 
              @click="sendMessage"
              :disabled="!isConnected || !messageInput.trim()"
            >
              发送
            </el-button>
          </div>

          <div class="color-row">
            <span>颜色:</span>
            <div class="color-picker">
              <div
                v-for="color in colorOptions"
                :key="color"
                class="color-option"
                :class="{ active: selectedColor === color }"
                :style="{ backgroundColor: color }"
                @click="selectedColor = color"
              />
            </div>
          </div>
        </div>

        <div class="connection-status">
          <el-tag :type="isConnected ? 'success' : 'danger'">
            {{ isConnected ? '已连接' : '连接中...' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 弹幕控制按钮组 -->
    <div v-if="!showControls" class="danmaku-controls">
      <!-- 主弹幕按钮 -->
      <el-button
        class="danmaku-main-btn"
        type="primary"
        size="default"
        @click="toggleChat"
        :icon="ChatDotRound"
      >
        弹幕聊天
      </el-button>
      
      <!-- 显示切换按钮 -->
      <el-button
        class="danmaku-visibility-btn"
        size="default"
        circle
        @click="toggleVisibility"
        :title="isVisible ? '隐藏弹幕' : '显示弹幕'"
        :type="isVisible ? 'warning' : 'success'"
      >
        <span class="visibility-icon">{{ isVisible ? '⏸' : '▶' }}</span>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import { ElMessage } from 'element-plus'
import { Hide, View, Close, ChatDotRound, VideoPlay, VideoPause } from '@element-plus/icons-vue'

// 定义props
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

// 路由和响应式数据
const route = useRoute()
const socket = ref(null)
const isConnected = ref(false)
const showControls = ref(false)
const isVisible = ref(true)
const messageInput = ref('')
// 颜色选项
const colorOptions = [
  '#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84'
]

// 随机初始颜色
const getRandomColor = () => {
  return colorOptions[Math.floor(Math.random() * colorOptions.length)]
}

const selectedColor = ref(getRandomColor())
const onlineCount = ref(0)
const username = ref('')

// 弹幕相关
const danmakuContainer = ref(null)
const displayMessages = ref([])
const tracks = ref(Array(15).fill(false)) // 15条轨道
const nextTrack = ref(0)


// 获取当前用户名
const getCurrentUsername = () => {
  return localStorage.getItem('username') || '游客'
}

// 全局标记防止重复初始化
let isInitializing = false
let isUnmounting = false
let initTimeout = null

// 初始化WebSocket连接
const initSocket = () => {
  // 防止重复初始化和组件卸载时初始化
  if (socket.value || isInitializing || isUnmounting) {
    return
  }
  
  isInitializing = true
  
  try {
    socket.value = io('/danmaku-chat', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })
  } catch (error) {
    console.error('创建WebSocket连接失败:', error)
    isInitializing = false
    return
  }

  // 连接事件
  socket.value.on('connect', () => {
    isConnected.value = true
    isInitializing = false
    // 用户加入聊天
    socket.value.emit('join_chat', {
      username: getCurrentUsername()
    })
    // 启动心跳发送
    startHeartbeat()
  })

  socket.value.on('disconnect', (reason) => {
    isConnected.value = false
    isInitializing = false
    stopHeartbeat()
  })

  // 聊天事件
  socket.value.on('chat_ready', (data) => {
  })

  socket.value.on('welcome', (data) => {
    // 更新在线人数
    onlineCount.value = data.online_count
  })

  // 处理用户加入事件
  socket.value.on('user_joined', (data) => {
    // 更新在线人数
    onlineCount.value = data.online_count
  })

  // 处理用户离开事件
  socket.value.on('user_left', (data) => {
    // 更新在线人数
    onlineCount.value = data.online_count
  })

  // 处理在线人数更新事件
  socket.value.on('online_count_update', (data) => {
    onlineCount.value = data.online_count
  })

  socket.value.on('new_message', (message) => {
    showDanmaku(message)
  })

  socket.value.on('error', (data) => {
    ElMessage.error(data.message)
  })
}

// 显示系统消息
const showSystemMessage = (content) => {
  const systemMessage = {
    id: `system_${Date.now()}`,
    username: '系统',
    content: content,
    color: '#909399',
    type: 'system'
  }
  showDanmaku(systemMessage)
}

// 显示弹幕
const showDanmaku = (message) => {
  if (!isVisible.value) {
    return
  }

  // 分配轨道
  const trackIndex = findAvailableTrack()
  tracks.value[trackIndex] = true

  // 计算动画参数
  const containerWidth = danmakuContainer.value?.clientWidth || window.innerWidth
  const messageWidth = (message.content.length + message.username.length + 2) * 20 // 按新字体大小计算
  const startX = containerWidth
  const endX = -messageWidth
  
  // 固定滚动速度：100像素/秒
  const scrollSpeed = 100 // 像素/秒
  const totalDistance = startX - endX // 总滚动距离
  const duration = totalDistance / scrollSpeed // 根据距离和固定速度计算时间
  

  // 创建弹幕对象
  const danmakuMessage = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random()}`,
    track: trackIndex,
    position: startX,
    duration: duration
  }


  // 添加到显示列表
  displayMessages.value.push(danmakuMessage)

  // 开始动画
  nextTick(() => {
    setTimeout(() => {
      // 找到对应的消息并更新位置
      const msgIndex = displayMessages.value.findIndex(m => m.id === danmakuMessage.id)
      if (msgIndex > -1) {
        displayMessages.value[msgIndex].position = endX
      }
    }, 100)
  })

  // 动画结束后清理
  setTimeout(() => {
    tracks.value[trackIndex] = false
    const index = displayMessages.value.findIndex(m => m.id === danmakuMessage.id)
    if (index > -1) {
      displayMessages.value.splice(index, 1)
    }
  }, duration * 1000 + 500)
}

// 寻找可用轨道
const findAvailableTrack = () => {
  for (let i = 0; i < tracks.value.length; i++) {
    if (!tracks.value[i]) {
      return i
    }
  }
  // 如果所有轨道都被占用，使用循环分配
  const track = nextTrack.value
  nextTrack.value = (nextTrack.value + 1) % tracks.value.length
  return track
}

// 发送消息
const sendMessage = () => {
  if (!isConnected.value || !messageInput.value.trim()) return

  socket.value.emit('send_message', {
    message: messageInput.value.trim(),
    color: selectedColor.value
  })

  messageInput.value = ''
}

// 切换聊天面板
const toggleChat = () => {
  showControls.value = !showControls.value
}

// 切换弹幕显示
const toggleVisibility = () => {
  isVisible.value = !isVisible.value
  if (!isVisible.value) {
    displayMessages.value = []
  }
}

// 心跳相关
let heartbeatInterval = null

const startHeartbeat = () => {
  stopHeartbeat() // 先停止之前的心跳
  heartbeatInterval = setInterval(() => {
    if (socket.value && isConnected.value) {
      socket.value.emit('heartbeat', {
        timestamp: Date.now()
      })
    }
  }, 20000) // 每20秒发送一次心跳
}

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

// 断开连接
const disconnect = () => {
  // 防止重复调用
  if (!socket.value) {
    return
  }
  
  // console.trace('disconnect调用堆栈') // 添加堆栈跟踪
  
  stopHeartbeat()
  
  try {
    if (socket.value.connected) {
      socket.value.disconnect()
    }
  } catch (error) {
  } finally {
    socket.value = null
    isConnected.value = false
    isInitializing = false
  }
}

// 关闭聊天面板（手动关闭时调用）
const closeChat = () => {
  showControls.value = false
  // 不断开WebSocket连接，保持弹幕接收功能
}

// 检查是否应该激活弹幕聊天
const shouldActivateChat = () => {
  // 如果被禁用，不激活
  if (props.disabled) {
    return false
  }
  // 只在服务器页面激活
  return route.path === '/servers' || route.path.startsWith('/servers/')
}

// 监听路由变化 - 只处理路由切换，不处理初始化
watch(() => route.path, (newPath, oldPath) => {
  // 跳过初始化时的调用
  if (oldPath === undefined) {
    return
  }
  
  
  if (shouldActivateChat()) {
    // 切换到服务器页面且未被禁用
    if (!socket.value) {
      initSocket()
    }
  } else {
    // 离开服务器页面或被禁用
    disconnect()
    showControls.value = false
  }
})

// 生命周期 - 处理初始化
onMounted(() => {
  isUnmounting = false
  
  // 如果挂载时应该激活且没有连接，则初始化
  if (shouldActivateChat() && !socket.value && !isInitializing) {
    // 使用setTimeout代替nextTick，这样可以取消
    initTimeout = setTimeout(() => {
      // 检查组件是否还存在且未卸载
      if (!socket.value && !isInitializing && !isUnmounting) {
        initSocket()
      } else {
      }
      initTimeout = null
    }, 10) // 很短的延迟
  }
})

// 组件卸载时断开连接
onBeforeUnmount(() => {
  isUnmounting = true
  
  // 取消待执行的初始化
  if (initTimeout) {
    clearTimeout(initTimeout)
    initTimeout = null
  }
  
  disconnect()
})

// 页面可见性变化时的处理
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面隐藏时停止心跳
    stopHeartbeat()
  } else {
    // 页面显示时重启心跳
    if (socket.value && isConnected.value) {
      startHeartbeat()
    }
  }
}

// 监听页面可见性变化
document.addEventListener('visibilitychange', handleVisibilityChange)

// 组件卸载时移除所有事件监听
onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  disconnect()
})
</script>

<style scoped>
.danmaku-chat {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.danmaku-container {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 100px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.danmaku-container.show {
  opacity: 1;
}

.danmaku-message {
  position: absolute;
  white-space: nowrap;
  font-size: 22px;
  font-weight: 600;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 1001;
  will-change: transform;
  line-height: 1.2;
}

.chat-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  pointer-events: auto;
}

.chat-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  width: 350px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: rgba(255, 255, 255, 0.98);
  gap: 12px;
}

.chat-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.online-count {
  font-size: 12px;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.message-input-area {
  margin-bottom: 12px;
}

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row .el-input {
  flex: 1;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.color-picker {
  display: flex;
  gap: 4px;
}

.color-option {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.color-option:hover {
  border-color: #409eff;
}

.color-option.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.connection-status {
  text-align: center;
}

.danmaku-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  pointer-events: auto;
  z-index: 1002;
  display: flex;
  align-items: center;
  gap: 8px;
}

.danmaku-main-btn {
  font-size: 16px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.danmaku-main-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

.danmaku-visibility-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.danmaku-visibility-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.visibility-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .chat-panel {
    width: 300px;
  }
  
  .danmaku-container {
    top: 60px;
    bottom: 80px;
  }
}
</style>
