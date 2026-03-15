<template>
  <div class="terminal-wrapper">
    <div class="terminal-toolbar">
      <div class="terminal-settings">
        <el-select v-model="fontSize" size="small" @change="applyTerminalSettings" style="width: 120px">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
        <el-select v-model="fontFamily" size="small" @change="applyTerminalSettings" style="width: 140px">
          <el-option v-for="font in fontFamilies" :key="font" :label="font" :value="font" />
        </el-select>
      </div>
      <div class="font-size-controls">
        <el-button size="small" @click="decreaseFontSize" :disabled="fontSize <= 10">A-</el-button>
        <el-button size="small" @click="increaseFontSize" :disabled="fontSize >= 24">A+</el-button>
        <el-button v-if="isMobile" size="small" @click="toggleMobileToolbar" :type="showMobileToolbar ? 'primary' : 'default'">
          <el-icon><Operation /></el-icon>
        </el-button>
        <el-button v-if="!isMobile" size="small" @click="toggleDesktopToolbar" :type="showDesktopToolbar ? 'primary' : 'default'">
          <el-icon><Operation /></el-icon>
          <span style="margin-left: 4px;">命令</span>
        </el-button>
      </div>
    </div>
    
    <!-- 移动端快捷键工具栏 -->
    <div v-if="isMobile && showMobileToolbar" class="mobile-toolbar-compact">
      <!-- 第一行：方向键 + 控制键 -->
      <div class="toolbar-row">
        <div class="direction-compact">
          <el-button @click="sendArrowKey('up')" class="compact-btn direction-btn">↑</el-button>
          <div class="direction-lr">
            <el-button @click="sendArrowKey('left')" class="compact-btn direction-btn">←</el-button>
            <el-button @click="sendArrowKey('right')" class="compact-btn direction-btn">→</el-button>
          </div>
          <el-button @click="sendArrowKey('down')" class="compact-btn direction-btn">↓</el-button>
        </div>
        <div class="control-compact">
          <el-button @click="sendEscape" class="compact-btn escape-btn">ESC</el-button>
          <el-button @click="sendCtrlC" class="compact-btn ctrl-btn">Ctrl+C</el-button>
          <el-button @click="sendTab" class="compact-btn">Tab</el-button>
          <el-button @click="sendEnter" class="compact-btn">Enter</el-button>
        </div>
      </div>
      
      <!-- 第二行：常用命令 -->
      <div class="toolbar-row">
        <div class="commands-compact">
          <el-button @click="sendCommand('ls -la')" class="compact-btn cmd-btn">ls -la</el-button>
          <el-button @click="sendCommand('pwd')" class="compact-btn cmd-btn">pwd</el-button>
          <el-button @click="sendCommand('clear')" class="compact-btn cmd-btn">clear</el-button>
          <el-button @click="sendCommand('cd ..')" class="compact-btn cmd-btn">cd ..</el-button>
          <el-button @click="sendCommand('cd ~')" class="compact-btn cmd-btn">cd ~</el-button>
          <el-button @click="sendCommand('nvidia-smi')" class="compact-btn cmd-btn">nvidia-smi</el-button>
        </div>
      </div>
    </div>
    
    <!-- 桌面端命令工具栏 -->
    <div v-if="!isMobile && showDesktopToolbar" class="desktop-toolbar">
      <div class="command-sections">
        <!-- 基础命令 -->
        <div class="command-section">
          <span class="section-title">基础操作</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('ls -la')" class="cmd-btn">ls -la</el-button>
            <el-button size="small" @click="sendCommand('ll')" class="cmd-btn">ll</el-button>
            <el-button size="small" @click="sendCommand('pwd')" class="cmd-btn">pwd</el-button>
            <el-button size="small" @click="sendCommand('clear')" class="cmd-btn">clear</el-button>
            <el-button size="small" @click="sendCommand('cd ..')" class="cmd-btn">cd ..</el-button>
            <el-button size="small" @click="sendCommand('cd ~')" class="cmd-btn">cd ~</el-button>
          </div>
        </div>
        
        <!-- 文件操作 -->
        <div class="command-section">
          <span class="section-title">文件操作</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('mkdir ')" class="cmd-btn">mkdir</el-button>
            <el-button size="small" @click="sendCommand('touch ')" class="cmd-btn">touch</el-button>
            <el-button size="small" @click="sendCommand('cp ')" class="cmd-btn">cp</el-button>
            <el-button size="small" @click="sendCommand('mv ')" class="cmd-btn">mv</el-button>
            <el-button size="small" @click="sendCommand('rm ')" class="cmd-btn">rm</el-button>
            <el-button size="small" @click="sendCommand('chmod ')" class="cmd-btn">chmod</el-button>
          </div>
        </div>
        
        <!-- 系统信息 -->
        <div class="command-section">
          <span class="section-title">系统信息</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('ps aux')" class="cmd-btn">ps aux</el-button>
            <el-button size="small" @click="sendCommand('top')" class="cmd-btn">top</el-button>
            <el-button size="small" @click="sendCommand('htop')" class="cmd-btn">htop</el-button>
            <el-button size="small" @click="sendCommand('df -h')" class="cmd-btn">df -h</el-button>
            <el-button size="small" @click="sendCommand('free -h')" class="cmd-btn">free -h</el-button>
            <el-button size="small" @click="sendCommand('uptime')" class="cmd-btn">uptime</el-button>
          </div>
        </div>
        
        <!-- 网络工具 -->
        <div class="command-section">
          <span class="section-title">网络工具</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('ping ')" class="cmd-btn">ping</el-button>
            <el-button size="small" @click="sendCommand('wget ')" class="cmd-btn">wget</el-button>
            <el-button size="small" @click="sendCommand('curl ')" class="cmd-btn">curl</el-button>
            <el-button size="small" @click="sendCommand('netstat -tulpn')" class="cmd-btn">netstat</el-button>
            <el-button size="small" @click="sendCommand('ss -tulpn')" class="cmd-btn">ss -tulpn</el-button>
            <el-button size="small" @click="sendCommand('ifconfig')" class="cmd-btn">ifconfig</el-button>
          </div>
        </div>
        
        <!-- 开发工具 -->
        <div class="command-section">
          <span class="section-title">开发工具</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('git status')" class="cmd-btn">git status</el-button>
            <el-button size="small" @click="sendCommand('git log --oneline')" class="cmd-btn">git log</el-button>
            <el-button size="small" @click="sendCommand('docker ps')" class="cmd-btn">docker ps</el-button>
            <el-button size="small" @click="sendCommand('docker images')" class="cmd-btn">docker images</el-button>
            <el-button size="small" @click="sendCommand('npm -v')" class="cmd-btn">npm -v</el-button>
            <el-button size="small" @click="sendCommand('python3 --version')" class="cmd-btn">python3 -v</el-button>
          </div>
        </div>
        
        <!-- GPU相关 -->
        <div class="command-section">
          <span class="section-title">GPU监控</span>
          <div class="command-buttons">
            <el-button size="small" @click="sendCommand('nvidia-smi')" class="cmd-btn">nvidia-smi</el-button>
            <el-button size="small" @click="sendCommand('nvitop')" class="cmd-btn">nvitop</el-button>
            <el-button size="small" @click="sendCommand('gpustat')" class="cmd-btn">gpustat</el-button>
            <el-button size="small" @click="sendCommand('watch -n 1 nvidia-smi')" class="cmd-btn">watch nvidia-smi</el-button>
          </div>
        </div>
      </div>
    </div>
    
    <div ref="terminalContainer" class="terminal-container"></div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, reactive, computed } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import { Operation } from '@element-plus/icons-vue';
import 'xterm/css/xterm.css';

export default {
  name: 'TerminalComponent',
  components: {
    Operation
  },
  props: {
    serverId: {
      type: [Number, String],
      required: true
    },
    containerId: {
      type: [Number, String],
      default: null
    },
    authToken: {
      type: String,
      required: true
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
    }
  },
  emits: ['close', 'error'],
  setup(props, { emit }) {
    const terminalContainer = ref(null);
    const terminal = ref(null);
    const fitAddon = ref(null);
    const socket = ref(null);
    const isConnected = ref(false);
    const isAuthenticated = ref(false);
    const reconnectAttempts = ref(0);
    const maxReconnectAttempts = 3;
    
    // 终端设置
    const fontSize = ref(16);
    const fontFamily = ref('Monaco');
    const fontSizes = [12, 14, 16, 18, 20];
    const fontFamilies = ['Monaco', 'Consolas', 'Menlo', 'Courier New', 'monospace'];
    
    // 移动端相关
    const isMobile = ref(false);
    const showMobileToolbar = ref(false);
    
    // 桌面端相关
    const showDesktopToolbar = ref(false);
    
    // 检测是否为移动设备
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      isMobile.value = isMobileDevice || (isTouchDevice && isSmallScreen);
    };

    // 初始化终端
    const initTerminal = () => {
      terminal.value = new Terminal({
        cursorBlink: true,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
        theme: {
          background: '#1a1b26',
          foreground: '#c0caf5',
          cursor: '#c0caf5',
          cursorAccent: '#1a1b26',
          selectionBackground: '#3d59a1',
          black: '#414868',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#c0caf5',
          brightBlack: '#414868',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c0caf5'
        },
        allowTransparency: true,
        scrollback: 1500,
        cols: 100,
        rows: 30,
        smoothScrollDuration: 300,
        rendererType: 'canvas'
      });

      // 添加自适应插件
      fitAddon.value = new FitAddon();
      terminal.value.loadAddon(fitAddon.value);

      // 渲染到容器
      terminal.value.open(terminalContainer.value);
      fitAddon.value.fit();

      // 初始化Socket.io连接
      
      // 使用相对路径连接WebSocket，避免跨域问题
      socket.value = io('/ssh-terminal', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 30000, // 增加超时时间到30秒
        withCredentials: true
      });

      // 设置事件监听
      setupSocketListeners();
      
      // 窗口大小调整时自适应终端大小
      window.addEventListener('resize', handleResize);
    };

    // 应用终端设置
    const applyTerminalSettings = () => {
      if (!terminal.value) return;
      
      terminal.value.options.fontSize = fontSize.value;
      terminal.value.options.fontFamily = fontFamily.value;
      
      // 需要调用fitAddon来适应新的字体大小，并通知服务器新的终端尺寸
      if (fitAddon.value) {
        setTimeout(() => {
          fitAddon.value.fit();
          
          // 字体大小改变后，终端的行列数会发生变化，需要通知服务器
          if (isConnected.value && socket.value && socket.value.connected) {
            const { cols, rows } = terminal.value;
            socket.value.emit('resize', { cols, rows });
          }
        }, 100); // 稍微延长等待时间，确保字体变更完成
      }
    };

    // 字体大小调节
    const increaseFontSize = () => {
      if (fontSize.value < 24) {
        fontSize.value += 2;
        applyTerminalSettings();
      }
    };

    const decreaseFontSize = () => {
      if (fontSize.value > 10) {
        fontSize.value -= 2;
        applyTerminalSettings();
      }
    };

    // 切换移动端工具栏
    const toggleMobileToolbar = () => {
      showMobileToolbar.value = !showMobileToolbar.value;
      
      // 等待DOM更新后重新计算终端高度
      setTimeout(() => {
        calculateTerminalHeight();
        if (fitAddon.value) {
          fitAddon.value.fit();
          
          // 通知服务器新的终端尺寸
          if (isConnected.value && socket.value && socket.value.connected) {
            const { cols, rows } = terminal.value;
            socket.value.emit('resize', { cols, rows });
          }
        }
      }, 100);
    };

    // 切换桌面端工具栏
    const toggleDesktopToolbar = () => {
      showDesktopToolbar.value = !showDesktopToolbar.value;
      
      // 等待DOM更新后重新计算终端高度
      setTimeout(() => {
        calculateTerminalHeight();
        if (fitAddon.value) {
          fitAddon.value.fit();
          
          // 通知服务器新的终端尺寸
          if (isConnected.value && socket.value && socket.value.connected) {
            const { cols, rows } = terminal.value;
            socket.value.emit('resize', { cols, rows });
          }
        }
      }, 100);
    };

    // 发送方向键
    const sendArrowKey = (direction) => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      
      const keyMap = {
        'up': '\x1b[A',
        'down': '\x1b[B',
        'right': '\x1b[C',
        'left': '\x1b[D'
      };
      
      const key = keyMap[direction];
      if (key) {
        socket.value.emit('input', key);
      }
    };

    // 发送ESC键
    const sendEscape = () => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', '\x1b');
    };

    // 发送Ctrl+C
    const sendCtrlC = () => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', '\x03');
    };

    // 发送Tab键
    const sendTab = () => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', '\t');
    };

    // 发送Enter键
    const sendEnter = () => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', '\r');
    };

    // 发送命令
    const sendCommand = (command) => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', command + '\r');
    };

    // 发送文本（不自动添加回车，用于快速输入）
    const sendText = (text) => {
      if (!isConnected.value || !socket.value || !socket.value.connected) return;
      socket.value.emit('input', text);
    };

    // 设置Socket.io事件监听
    const setupSocketListeners = () => {
      // 连接事件
      socket.value.on('connect', () => {
        reconnectAttempts.value = 0;
        
        // 连接成功后立即发送认证请求
        authenticateConnection();
      });
      
      // 终端服务就绪
      socket.value.on('terminal_ready', () => {
      });

      // 连接错误
      socket.value.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        
        // 重试连接
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++;
        } else {
          emit('error', '无法连接到终端服务器');
        }
      });

      // 断开连接事件
      socket.value.on('disconnect', () => {
        isConnected.value = false;
        isAuthenticated.value = false;
      });

      // 认证成功事件
      socket.value.on('authenticated', data => {
        isAuthenticated.value = true;
      });
      
      // 连接中
      socket.value.on('connecting', data => {
      });

      // SSH连接成功事件
      socket.value.on('connected', data => {
        isConnected.value = true;
        
        // 连接成功后，将用户输入直接发送到服务器
        terminal.value.onData(input => {
          if (isConnected.value && socket.value && socket.value.connected) {
            socket.value.emit('input', input);
          }
        });
        
        // 调整终端大小
        setTimeout(() => {
          calculateTerminalHeight();
          handleResize();
        }, 200);
      });

      // 接收服务器输出
      socket.value.on('output', data => {
        if (data && data.data) {
          terminal.value.write(data.data);
        }
      });

      // 服务器断开事件
      socket.value.on('disconnected', data => {
        isConnected.value = false;
      });

      // 错误事件
      socket.value.on('error', data => {
        console.error('终端错误:', data);
        terminal.value.writeln(`\r\n❌ 错误: ${data.message}`);
        emit('error', data.message);
      });
    };

    // 认证连接
    const authenticateConnection = () => {
      if (!socket.value || !socket.value.connected) {
        console.error('Socket未连接，无法发送认证请求');
        return;
      }
      
      const payload = {
        token: props.authToken,
        server_id: props.serverId
      }

      if (props.containerId) {
        payload.container_id = props.containerId
      }
      if (props.targetHost) {
        payload.target_host = props.targetHost
      }
      if (props.targetPort) {
        payload.target_port = props.targetPort
      }
      if (props.loginUsername) {
        payload.login_username = props.loginUsername
      }

      socket.value.emit('authenticate', payload)
    };

    // 计算终端容器的正确高度
    const calculateTerminalHeight = () => {
      if (!terminalContainer.value) return;
      terminalContainer.value.style.height = '100%';
    };

    // 处理窗口大小调整
    const handleResize = () => {
      if (!terminal.value || !fitAddon.value) return;
      
      try {
        // 重新计算终端高度
        calculateTerminalHeight();
        
        // 等待DOM更新后再调整终端尺寸
        setTimeout(() => {
          fitAddon.value.fit();
          
          if (isConnected.value && socket.value && socket.value.connected) {
            const { cols, rows } = terminal.value;
            socket.value.emit('resize', { cols, rows });
          }
        }, 50);
      } catch (error) {
      }
    };

    // 关闭连接
    const closeConnection = () => {
      // 先处理socket连接
      if (socket.value) {
        try {
          if (socket.value.connected) {
            socket.value.disconnect();
          }
          socket.value = null;
        } catch (error) {
        }
      }
      
      // 处理终端实例
      if (terminal.value) {
        try {
          // 先移除onData事件处理器
          terminal.value.onData(() => {});
        } catch (error) {
        }
        
        // 安全地释放fitAddon - 先检查是否已加载
        if (fitAddon.value) {
          try {
            // 检查fitAddon是否已加载
            const disposable = fitAddon.value._disposables && 
                              Array.isArray(fitAddon.value._disposables) && 
                              fitAddon.value._disposables.length > 0;
            
            if (disposable) {
              fitAddon.value.dispose();
            }
          } catch (error) {
          } finally {
            fitAddon.value = null;
          }
        }
        
        // 释放终端 - 确保终端已完全初始化
        try {
          if (terminal.value._core && terminal.value._initialized) {
            terminal.value.dispose();
          }
        } catch (error) {
        } finally {
          terminal.value = null;
        }
      }
      
      // 移除事件监听
      window.removeEventListener('resize', handleResize);
      isConnected.value = false;
      isAuthenticated.value = false;
    };
    
    // 生命周期钩子
    onMounted(() => {
      
      // 检测移动设备
      detectMobile();
      
      initTerminal();
      
      // 监听自定义resize事件以适应对话框大小变化
      window.addEventListener('terminal-container-resize', handleResize);
      
      // 创建窗口resize处理函数的引用，以便后续移除
      const handleWindowResize = () => {
        detectMobile();
        handleResize();
      };
      
      // 将引用保存到实例属性中
      if (!window.terminalResizeHandlers) {
        window.terminalResizeHandlers = new Set();
      }
      window.terminalResizeHandlers.add(handleWindowResize);
      
      window.addEventListener('resize', handleWindowResize);
      
      // 初始化后稍等一下再计算高度，确保DOM完全渲染
      setTimeout(() => {
        calculateTerminalHeight();
        if (fitAddon.value) {
          fitAddon.value.fit();
        }
      }, 300);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener('terminal-container-resize', handleResize);
      
      // 清理所有resize事件监听器
      if (window.terminalResizeHandlers) {
        window.terminalResizeHandlers.forEach(handler => {
          window.removeEventListener('resize', handler);
        });
        window.terminalResizeHandlers.clear();
      }
      
      closeConnection();
    });

    return {
      terminalContainer,
      closeConnection,
      fontSize,
      fontFamily,
      fontSizes,
      fontFamilies,
      applyTerminalSettings,
      // 移动端相关
      isMobile,
      showMobileToolbar,
      toggleMobileToolbar,
      // 桌面端相关
      showDesktopToolbar,
      toggleDesktopToolbar,
      // 字体大小调节
      increaseFontSize,
      decreaseFontSize,
      // 快捷键功能
      sendArrowKey,
      sendEscape,
      sendCtrlC,
      sendTab,
      sendEnter,
      sendCommand,
      sendText
    };
  }
};
</script>

<style scoped>
.terminal-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%; /* 填充父容器的全部高度 */
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.terminal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #16171e;
  border-bottom: 1px solid #2c2e3b;
  min-height: 50px; /* 确保工具栏有固定最小高度 */
}

.terminal-settings {
  display: flex;
  gap: 10px;
}

.font-size-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.terminal-settings :deep(.el-select) {
  --el-select-input-focus-border-color: #7aa2f7;
}

.terminal-settings :deep(.el-input__wrapper) {
  background-color: #24283b;
  border-color: #414868;
  box-shadow: none;
}

.terminal-settings :deep(.el-input__wrapper:hover) {
  border-color: #7aa2f7;
}

.terminal-settings :deep(.el-input__inner) {
  color: #c0caf5;
}

.terminal-container {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding: 12px;
  background-color: #1a1b26;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.terminal-container :deep(.xterm) {
  height: 100% !important;
  width: 100% !important;
}

/* 添加终端窗口装饰 */
.terminal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, #7aa2f7, #bb9af7);
  opacity: 0.5;
  z-index: 1;
}

/* 完全隐藏滚动条 */
.terminal-container :deep(.xterm-viewport) {
  /* 隐藏滚动条但保留功能 */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* 隐藏Webkit浏览器的滚动条 */
.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  display: none;  /* Chrome, Safari, Opera */
}

/* 确保终端内容不被挤压 */
.terminal-container :deep(.xterm-screen) {
  margin-right: 0;
}

/* 优化字体渲染 */
.terminal-container :deep(.xterm) {
  font-feature-settings: "liga" 0;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 添加终端光标动画 */
.terminal-container :deep(.xterm-cursor-layer) {
  animation: blink 1s ease infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 移动端紧凑工具栏样式 */
.mobile-toolbar-compact {
  background-color: #24283b;
  border-bottom: 1px solid #414868;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

/* 方向键紧凑布局 */
.direction-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.direction-lr {
  display: flex;
  gap: 2px;
}

/* 控制键紧凑布局 */
.control-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 1;
  max-width: 200px;
}

/* 命令区域紧凑布局 */
.commands-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

/* 紧凑按钮统一样式 */
.compact-btn {
  height: 32px;
  min-width: 40px;
  font-size: 12px;
  padding: 4px 8px;
  background-color: #414868;
  border-color: #565f89;
  color: #c0caf5;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.compact-btn:hover, .compact-btn:active {
  background-color: #7aa2f7;
  border-color: #7aa2f7;
  color: #1a1b26;
  transform: scale(0.95);
}

/* 方向键特殊样式 */
.direction-btn {
  width: 32px;
  min-width: 32px;
  font-size: 16px;
  font-weight: bold;
}

/* 控制键特殊样式 */
.escape-btn:hover, .escape-btn:active,
.ctrl-btn:hover, .ctrl-btn:active {
  background-color: #f7768e;
  border-color: #f7768e;
  color: #1a1b26;
}

/* 命令按钮样式 */
.cmd-btn {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 10px;
}

.cmd-btn:hover, .cmd-btn:active {
  background-color: #9ece6a;
  border-color: #9ece6a;
  color: #1a1b26;
}

/* 字体调节按钮样式 */
.font-size-controls :deep(.el-button) {
  background-color: #24283b;
  border-color: #414868;
  color: #c0caf5;
  min-width: 40px;
  font-weight: bold;
}

.font-size-controls :deep(.el-button:hover) {
  background-color: #3d59a1;
  border-color: #7aa2f7;
  color: #7aa2f7;
}

.font-size-controls :deep(.el-button:disabled) {
  background-color: #1a1b26;
  border-color: #2c2e3b;
  color: #565f89;
  cursor: not-allowed;
}

/* 桌面端工具栏样式 */
.desktop-toolbar {
  background-color: #24283b;
  border-bottom: 1px solid #414868;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.command-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.command-section {
  background-color: rgba(65, 72, 104, 0.3);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #414868;
}

.section-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #7aa2f7;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #414868;
}

.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.cmd-btn {
  min-width: 60px;
  height: 28px;
  font-size: 11px;
  padding: 4px 8px;
  background-color: #414868;
  border-color: #565f89;
  color: #c0caf5;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
}

.cmd-btn:hover {
  background-color: #565f89;
  border-color: #7aa2f7;
  color: #7aa2f7;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(122, 162, 247, 0.2);
}

.cmd-btn:active {
  transform: translateY(0);
  background-color: #7aa2f7;
  border-color: #7aa2f7;
  color: #1a1b26;
}

/* 滚动条样式 */
.desktop-toolbar::-webkit-scrollbar {
  width: 6px;
}

.desktop-toolbar::-webkit-scrollbar-track {
  background: #1a1b26;
  border-radius: 3px;
}

.desktop-toolbar::-webkit-scrollbar-thumb {
  background: #414868;
  border-radius: 3px;
}

.desktop-toolbar::-webkit-scrollbar-thumb:hover {
  background: #565f89;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-toolbar {
    flex-direction: column;
    padding: 8px 12px;
    gap: 8px;
  }
  
  .terminal-settings {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .font-size-controls {
    justify-content: center;
  }
  
  /* 移动端紧凑工具栏优化 */
  .mobile-toolbar-compact {
    padding: 10px;
    gap: 10px;
  }
  
  .toolbar-row {
    flex-direction: column;
    gap: 10px;
  }
  
  .control-compact {
    max-width: none;
  }
  
  .compact-btn {
    height: 30px;
    font-size: 11px;
  }
  
  .direction-btn {
    width: 30px;
    min-width: 30px;
    font-size: 14px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .command-sections {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1600px) {
  .command-sections {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
