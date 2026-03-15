import './assets/markdown.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { ElMessage } from 'element-plus'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 设置Element Plus消息组件的默认配置
ElMessage.closeAll = ElMessage.closeAll || (() => {})
// 重写ElMessage方法以设置默认offset
const originalMessage = ElMessage
const customMessage = (options) => {
  if (typeof options === 'string') {
    options = { message: options }
  }
  return originalMessage({
    offset: 120, // 头部70px + 50px安全距离
    ...options
  })
}
// 复制所有静态方法
Object.keys(originalMessage).forEach(key => {
  if (typeof originalMessage[key] === 'function') {
    customMessage[key] = (options) => {
      if (typeof options === 'string') {
        options = { message: options }
      }
      return originalMessage[key]({
        offset: 120,
        ...options
      })
    }
  } else {
    customMessage[key] = originalMessage[key]
  }
})
// 替换全局ElMessage
app.config.globalProperties.$message = customMessage

// 初始化认证状态
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')
