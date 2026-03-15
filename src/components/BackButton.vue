<template>
  <el-button @click="handleClick" type="primary" :loading="loading" class="back-button">
    <el-icon><Back /></el-icon>
    <span>{{ text }}</span>
  </el-button>
</template>

<script setup>
import { Back } from '@element-plus/icons-vue'

const props = defineProps({
  text: {
    type: String,
    default: '返回'
  },
  to: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.back-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.back-button span {
  display: inline-block;
}
</style>
