<template>
  <el-dialog
    class="mandatory-announcement-dialog"
    :model-value="modelValue"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    width="960px"
    align-center
    :destroy-on-close="true"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-title">
          <div class="title-icon">
            <el-icon><BellFilled /></el-icon>
          </div>
          <div class="title-meta">
            <span class="title-label">重点公告</span>
            <h2>{{ announcement?.title || '最新重点公告' }}</h2>
          </div>
        </div>
        <span v-if="announcement" class="dialog-time">{{ formattedTime }}</span>
      </div>
    </template>

    <div v-if="announcement" class="dialog-content">
      <div class="content-scroll">
        <div class="markdown-body" v-html="renderedContent"></div>
      </div>
    </div>
    <div v-else class="empty-placeholder">
      <el-icon><Document /></el-icon>
      <p>暂无需要集中查看的公告</p>
    </div>

    <template #footer>
      <el-button plain @click="handleClose">稍后再看</el-button>
      <el-button type="primary" @click="handleDismiss" :disabled="!announcement">不再提示</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { Document, BellFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  announcement: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'dismiss'])

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

const renderedContent = computed(() => {
  if (!props.announcement?.content) return ''
  return md.render(props.announcement.content)
})

const formattedTime = computed(() => {
  if (!props.announcement?.updated_at) return ''
  const date = new Date(props.announcement.updated_at)
  return date.toLocaleString('zh-CN')
})

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleDismiss = () => {
  if (!props.announcement) return
  emit('update:modelValue', false)
  emit('dismiss')
}
</script>

<style scoped>
.mandatory-announcement-dialog :deep(.el-dialog) {
  border-radius: 26px;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  background: #f5f7fb;
  box-shadow: 0 36px 90px rgba(10, 22, 53, 0.24);
}

.mandatory-announcement-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.mandatory-announcement-dialog :deep(.el-dialog__body) {
  padding: 22px 36px;
  background: #f5f6fc;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mandatory-announcement-dialog :deep(.el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 32px 28px;
  background: #f5f6fc;
}

.mandatory-announcement-dialog :deep(.el-dialog__headerbtn) {
  top: 18px;
  right: 24px;
  color: #ffffff;
  text-shadow: 0 3px 8px rgba(10, 24, 64, 0.35);
  transition: opacity 0.2s ease;
}

.mandatory-announcement-dialog :deep(.el-dialog__headerbtn:hover) {
  opacity: 0.85;
}



.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 30px 30px 14px;
  background: linear-gradient(135deg, #2733a7 0%, #4253f9 45%, #6d86ff 100%);
  color: #ffffff;
  margin: -20px -30px 0px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.2);
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 16px;
}


.title-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}

.title-icon .el-icon {
  font-size: 26px;
  color: #fff;
}

.title-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-label {
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.75;
}


.dialog-header h2 {
  margin: 0;
  font-size: 25px;
  font-weight: 620;
  line-height: 1.25;
}

.dialog-time {
  font-size: 14px;
  opacity: 0.85;
}




.dialog-content {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 16px 40px rgba(17, 35, 79, 0.08);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.dialog-content :deep(.markdown-body) {
  font-size: 16px;
  line-height: 1.95;
  color: #26314c;
}

.dialog-content :deep(h1),
.dialog-content :deep(h2),
.dialog-content :deep(h3) {
  color: #162459;
  margin-top: 18px;
  margin-bottom: 10px;
}

.dialog-content :deep(p) {
  margin-bottom: 16px;
}



.empty-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7b849f;
  gap: 14px;
  min-height: 260px;
}

.empty-placeholder .el-icon {
  font-size: 44px;
  color: #c3c9dd;
}
</style>
