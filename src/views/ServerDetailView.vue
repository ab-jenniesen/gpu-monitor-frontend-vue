<template>
  <div class="server-detail-view">
    <page-header title="服务器详情">
      <template #actions>
        <back-button text="返回列表" @click="goBack" :loading="loading" />
      </template>
    </page-header>
    
    <server-detail :server-id="serverId" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServerDetail from '../components/ServerDetail.vue'
import BackButton from '../components/BackButton.vue'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const serverId = route.params.id
const loading = ref(false)

// 返回服务器列表
const goBack = () => {
  loading.value = true
  router.push('/servers')
}
</script>

<style scoped>
.server-detail-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecf3 100%);
  padding: 30px;
  animation: containerFadeIn 0.8s ease-out;
}

@keyframes containerFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 移动端优化样式 */
@media (max-width: 768px) {
  .server-detail-view {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .server-detail-view {
    padding: 10px;
  }
}
</style>
