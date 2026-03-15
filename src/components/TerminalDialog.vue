<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`远程登录: ${displayName}`"
    width="80%"
    :close-on-click-modal="false"
    :fullscreen="isFullscreen"
    :before-close="handleClose"
    class="terminal-dialog"
    :top="dialogTop"
    :show-close="false"
    :append-to-body="true"
  >
    <template #header="{ titleId, titleClass }">
      <div class="custom-header">
        <h4 :id="titleId" :class="titleClass">
          <span class="header-icon">
            <i class="el-icon-monitor"></i>
          </span>
          远程登录: {{ displayName }}
        </h4>
        <div class="window-controls">
          <el-button
            circle
            size="small"
            class="minimize-btn"
            @click="handleMinimize"
          >
            <span class="window-btn-icon">─</span>
          </el-button>
          <el-button
            circle
            size="small"
            class="fullscreen-btn"
            @click="toggleFullscreen"
          >
            <span class="window-btn-icon">□</span>
          </el-button>
          <el-button
            circle
            size="small"
            class="close-btn"
            @click="handleClose"
          >
            <span class="window-btn-icon">×</span>
          </el-button>
        </div>
      </div>
    </template>
    <div class="terminal-toolbar">
      <div class="terminal-info">
        <el-tag type="success" size="small">{{ displayName }}</el-tag>
        <el-tag type="info" size="small" v-if="displayAddress">{{ displayAddress }}</el-tag>
        <el-tag type="warning" size="small">{{ displayUser }}</el-tag>
      </div>
    </div>
    
    <div class="terminal-wrapper">
      <Terminal
        v-if="dialogVisible"
        :server-id="serverId"
        :container-id="containerId"
        :auth-token="authToken"
        :target-host="targetHost"
        :target-port="targetPort"
        :login-username="displayUser"
        @close="handleClose"
        @error="handleError"
      />
    </div>
  </el-dialog>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Terminal from './Terminal.vue';
import { ElNotification } from 'element-plus';

export default {
  name: 'TerminalDialog',
  components: {
    Terminal
  },
  props: {
    serverId: {
      type: [Number, String],
      required: true
    },
    serverName: {
      type: String,
      default: '未知服务器'
    },
    serverAddress: {
      type: String,
      default: ''
    },
    serverUser: {
      type: String,
      default: 'root'
    },
    containerId: {
      type: [Number, String],
      default: null
    },
    targetHost: {
      type: String,
      default: ''
    },
    targetPort: {
      type: [Number, String],
      default: ''
    },
    loginUsername: {
      type: String,
      default: ''
    },
    authToken: {
      type: String,
      required: true
    },
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isFullscreen = ref(false);
    const dialogTop = ref('10vh'); // 默认对话框距顶部的距离
    const resizeObserver = ref(null);
    
    const dialogVisible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    });

    const displayName = computed(() => props.serverName || '未知服务器');
    const displayUser = computed(() => props.loginUsername || props.serverUser || 'root');
    const displayAddress = computed(() => {
      const host = props.targetHost || '';
      const port = props.targetPort || '';
      if (host && port) {
        return `${host}:${port}`;
      }
      if (host) {
        return host;
      }
      return props.serverAddress || '';
    });

    const dispatchResizeEvent = () => {
      const event = new CustomEvent('terminal-container-resize');
      window.dispatchEvent(event);
    };

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value;
      
      // 切换全屏时重新计算对话框位置
      dialogTop.value = isFullscreen.value ? '0vh' : '10vh';

      setTimeout(() => dispatchResizeEvent(), 50);
    };
    
    const handleClose = () => {
      dialogVisible.value = false;
      if (isFullscreen.value) {
        isFullscreen.value = false;
      }
      // 重置对话框位置到默认值
      dialogTop.value = '10vh';

      setTimeout(() => dispatchResizeEvent(), 50);
    };
    
    const handleError = (message) => {
      ElNotification({
        title: '终端错误',
        message,
        type: 'error',
        duration: 5000
      });
    };
    
    const handleMinimize = () => {
      // TODO: 实现最小化功能
    };
    
    const handleResize = () => {
      if (isFullscreen.value) {
        dialogTop.value = '0vh';
      } else {
        // 根据窗口高度动态调整对话框位置
        dialogTop.value = window.innerHeight > 900 ? '15vh' : '10vh';
      }

      dispatchResizeEvent();
    };
    
    onMounted(() => {
      // 监听窗口大小变化，自动调整终端大小
      window.addEventListener('resize', handleResize);
      handleResize(); // 初始化时调用一次
      
      // 初始化ResizeObserver以观察对话框大小变化
      if (window.ResizeObserver) {
        resizeObserver.value = new ResizeObserver(() => {
          dispatchResizeEvent();
        });
        
        // 延迟一下再观察，确保对话框已完全渲染
        setTimeout(() => {
          const dialog = document.querySelector('.terminal-dialog .el-dialog');
          if (dialog) {
            resizeObserver.value.observe(dialog);
          }
          dispatchResizeEvent();
        }, 100);
      }

      setTimeout(() => dispatchResizeEvent(), 100);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      
      if (resizeObserver.value) {
        resizeObserver.value.disconnect();
      }
    });
    
    return {
      dialogVisible,
      isFullscreen,
      toggleFullscreen,
      handleClose,
      handleError,
      dialogTop,
      handleMinimize,
      handleResize,
      displayName,
      displayUser,
      displayAddress
    };
  }
};
</script>

<style scoped>
.terminal-dialog :deep(.el-dialog__header) {
  padding: 15px 20px;
  margin-bottom: 0;
  background-color: #16171e;
  color: #c0caf5;
  border-bottom: 1px solid #2c2e3b;
}

.terminal-dialog :deep(.el-dialog__title) {
  color: #c0caf5;
  font-weight: 500;
  font-size: 16px;
}

.terminal-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #7aa2f7;
}

.terminal-dialog :deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #bb9af7;
}

.terminal-dialog :deep(.el-dialog) {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 1px solid #2c2e3b;
  background-color: #1a1b26;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.terminal-dialog :deep(.el-dialog.is-fullscreen) {
  max-height: 100vh;
  height: 100vh;
}

.terminal-dialog :deep(.el-dialog__body) {
  padding: 0;
  background-color: #1a1b26;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.terminal-dialog :deep(.terminal-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.terminal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #16171e;
  border-bottom: 1px solid #2c2e3b;
}

.terminal-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.terminal-info :deep(.el-tag) {
  background-color: #24283b;
  border-color: #414868;
  color: #c0caf5;
}

.terminal-info :deep(.el-tag--success) {
  background-color: rgba(158, 206, 106, 0.2);
  border-color: #9ece6a;
  color: #9ece6a;
}

.terminal-info :deep(.el-tag--info) {
  background-color: rgba(122, 162, 247, 0.2);
  border-color: #7aa2f7;
  color: #7aa2f7;
}

.terminal-info :deep(.el-tag--warning) {
  background-color: rgba(224, 175, 104, 0.2);
  border-color: #e0af68;
  color: #e0af68;
}

.terminal-actions {
  display: flex;
  gap: 10px;
}

.terminal-actions :deep(.el-button) {
  background-color: #24283b;
  border-color: #414868;
  color: #c0caf5;
}

.terminal-actions :deep(.el-button:hover) {
  background-color: #3d59a1;
  border-color: #7aa2f7;
}

.terminal-actions :deep(.el-button--danger) {
  background-color: rgba(247, 118, 142, 0.2);
  border-color: #f7768e;
  color: #f7768e;
}

.terminal-actions :deep(.el-button--danger:hover) {
  background-color: rgba(247, 118, 142, 0.4);
  border-color: #f7768e;
}

.terminal-wrapper {
  height: calc(70vh - 160px);
  background-color: #1a1b26;
}

/* 全屏模式下的高度 */
.terminal-dialog.is-fullscreen .terminal-wrapper {
  height: calc(100vh - 135px);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .terminal-wrapper {
    height: calc(100vh - 180px);
  }
  
  .terminal-dialog.is-fullscreen .terminal-wrapper {
    height: calc(100vh - 140px);
  }
}

/* 添加过渡动画 */
.terminal-dialog :deep(.el-dialog) {
  transition: all 0.3s ease;
}

.terminal-dialog.is-fullscreen :deep(.el-dialog) {
  animation: expand 0.3s ease forwards;
}

@keyframes expand {
  from { transform: scale(0.95); opacity: 0.8; }
  to { transform: scale(1); opacity: 1; }
}

.custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #16171e;
  border-bottom: 1px solid #2c2e3b;
}

.custom-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #c0caf5;
  font-size: 16px;
  font-weight: 500;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #7aa2f7;
  font-size: 18px;
}

.window-controls {
  display: flex;
  gap: 10px;
}

.window-btn-icon, .action-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  width: 100%;
  height: 100%;
}

.minimize-btn, .fullscreen-btn, .close-btn, .action-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #24283b;
  border-color: #414868;
  color: #c0caf5;
}

.minimize-btn:hover, .fullscreen-btn:hover, .action-btn:hover {
  background-color: #3d59a1;
  border-color: #7aa2f7;
}

.close-btn, .el-button--danger.action-btn {
  background-color: rgba(247, 118, 142, 0.2);
  border-color: #f7768e;
  color: #f7768e;
}

.close-btn:hover, .el-button--danger.action-btn:hover {
  background-color: rgba(247, 118, 142, 0.4);
  border-color: #f7768e;
}
</style>
