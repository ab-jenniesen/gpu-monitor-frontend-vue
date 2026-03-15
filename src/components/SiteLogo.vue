<template>
  <div class="site-logo" @click="goHome">
    <div class="logo-icon">
      <el-icon class="gpu-icon"><Monitor /></el-icon>
    </div>
    <h1 class="site-name">GPU共享监控平台</h1>
  </div>
</template>

<script setup>
import { Monitor } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  const userRole = localStorage.getItem('userRole')
  if (userRole === 'admin') {
    router.push('/admin')
  } else {
    router.push('/user')
  }
}
</script>

<style scoped>
.site-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
}

.site-logo:hover {
  opacity: 0.8;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background-color: #409EFF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.gpu-icon {
  font-size: 22px;
  color: white;
}

.site-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.5px;
}

@media (max-width: 576px) {
  .site-name {
    font-size: 16px;
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
  }
  
  .gpu-icon {
    font-size: 18px;
  }
}
</style>
