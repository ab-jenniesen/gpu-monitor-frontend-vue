<template>
  <el-dialog
    class="announcement-center-dialog"
    :model-value="modelValue"
    width="920px"
    align-center
    append-to-body
    :close-on-click-modal="true"
    :destroy-on-close="true"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-heading">
          <span class="icon-wrapper">
            <el-icon><BellFilled /></el-icon>
          </span>
          <div class="heading-text">
            <span class="heading-sub">公告中心</span>
            <h2 class="heading-title">{{ tabTitle }}</h2>
          </div>
        </div>
        <el-tabs v-model="internalTab" class="header-tabs">
          <el-tab-pane name="mandatory">
            <template #label>
              <span class="tab-label">
                <el-badge :is-dot="hasNewMandatory" class="badge-dot">
                  <span>重点公告</span>
                </el-badge>
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="timeline">
            <template #label>
              <span class="tab-label">
                <el-badge :is-dot="hasNewGeneral" class="badge-dot">
                  <span>公告时间线</span>
                </el-badge>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>

    <section class="dialog-body">
      <article v-if="internalTab === 'mandatory'" class="content-card mandatory-card" :class="{ 'content-card--new': hasNewMandatory }">
        <template v-if="mandatoryAnnouncement">
          <div class="card-scroll">
            <header class="card-header">
              <h3>{{ mandatoryAnnouncement.title }}</h3>
              <span class="time">{{ formatTime(mandatoryAnnouncement.updated_at) }}</span>
            </header>
            <div class="markdown-body" v-html="renderMarkdown(mandatoryAnnouncement.content)"></div>
          </div>
        </template>
        <div v-else class="empty-state">
          <el-icon><Document /></el-icon>
          <p>暂无重点公告</p>
        </div>
      </article>

      <article v-else class="content-card timeline-card">
        <template v-if="timeline.length">
          <div class="card-scroll">
            <div class="timeline-toolbar">
              <el-button size="small" type="primary" @click="handleMarkAllRead">
                全部标记为已读
              </el-button>
            </div>
            <el-timeline class="announcement-timeline">
              <el-timeline-item
                v-for="item in timeline"
                :key="item.id"
                :timestamp="formatTime(item.updated_at)"
                placement="top"
                :type="item.is_mandatory ? 'danger' : 'primary'"
              >
                <div class="timeline-item" :class="{ 'timeline-item--new': isNewAnnouncement(item) }">
                  <div class="timeline-header">
                    <div class="tag-group">
                      <el-tag v-if="item.is_mandatory" type="danger" size="small">必读</el-tag>
                    </div>
                    <h4>{{ item.title }}</h4>
                  </div>
                  <template v-if="isTruncatable(item)">
                    <div v-if="isExpanded(item.id)" class="markdown-body" v-html="renderMarkdown(item.content)"></div>
                    <p v-else class="timeline-preview">{{ getPreviewText(item) }}</p>
                    <div class="timeline-actions">
                      <el-button link type="primary" @click="toggleExpand(item.id)">
                        {{ isExpanded(item.id) ? '收起' : '展开' }}
                      </el-button>
                      <el-button
                        v-if="!item.is_mandatory && isNewAnnouncement(item)"
                        link
                        type="success"
                        @click="handleMarkRead(item)"
                      >标记为已读</el-button>
                      <el-button
                        v-else-if="!item.is_mandatory && !isNewAnnouncement(item)"
                        link
                        type="warning"
                        @click="handleMarkUnread(item)"
                      >标记为未读</el-button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="markdown-body" v-html="renderMarkdown(item.content)"></div>
                    <div class="timeline-actions">
                      <el-button
                        v-if="!item.is_mandatory && isNewAnnouncement(item)"
                        link
                        type="success"
                        @click="handleMarkRead(item)"
                      >标记为已读</el-button>
                      <el-button
                        v-else-if="!item.is_mandatory && !isNewAnnouncement(item)"
                        link
                        type="warning"
                        @click="handleMarkUnread(item)"
                      >标记为未读</el-button>
                    </div>
                  </template>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
        <div v-else class="empty-state">
          <el-icon><Document /></el-icon>
          <p>暂无公告</p>
        </div>
      </article>
    </section>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { BellFilled, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  activeTab: {
    type: String,
    default: 'mandatory'
  },
  mandatoryAnnouncement: {
    type: Object,
    default: null
  },
  announcements: {
    type: Array,
    default: () => []
  },
  hasNewMandatory: Boolean,
  hasNewGeneral: Boolean
})

const emit = defineEmits(['update:modelValue', 'update:activeTab', 'view-general', 'mark-read-one', 'mark-unread-one'])

const md = new MarkdownIt({ html: true, linkify: true, breaks: true, typographer: true })

const internalTab = computed({
  get: () => (props.activeTab === 'timeline' ? 'timeline' : 'mandatory'),
  set: value => emit('update:activeTab', value)
})

const GENERAL_READ_MAP_KEY = 'announcementReadMap'
const getReadMap = () => {
  try {
    const stored = localStorage.getItem(GENERAL_READ_MAP_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    return {}
  }
}
const setReadMap = (map) => {
  try {
    localStorage.setItem(GENERAL_READ_MAP_KEY, JSON.stringify(map || {}))
  } catch (e) {
    // ignore
  }
}

const PREVIEW_LIMIT = 120
const readMapVersion = ref(0)

const expandedIds = ref(new Set())

const isExpanded = id => expandedIds.value.has(id)

const toggleExpand = id => {
  const updated = new Set(expandedIds.value)
  if (updated.has(id)) {
    updated.delete(id)
  } else {
    updated.add(id)
  }
  expandedIds.value = updated
}

const timeline = computed(() => {
  const list = Array.isArray(props.announcements) ? [...props.announcements] : []
  return list
    .filter(item => item && item.content)
    .sort((a, b) => {
      // 获取时间戳用于排序
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
      
      // 所有公告都按时间倒序排序（最新的在前面）
      return timeB - timeA
    })
})

const tabTitle = computed(() => (internalTab.value === 'timeline' ? '公告时间线' : '重点公告'))

const formatTime = value => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('zh-CN')
}

const renderMarkdown = content => (content ? md.render(content) : '')

const getPlainText = content => {
  if (!content) return ''
  const html = renderMarkdown(content)
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const isTruncatable = item => getPlainText(item.content).length > PREVIEW_LIMIT

const getPreviewText = item => {
  const text = getPlainText(item.content)
  return text.length > PREVIEW_LIMIT ? text.slice(0, PREVIEW_LIMIT) + '...' : text
}

// 判断是否为新公告（基于用户已读状态）
const isNewAnnouncement = item => {
  // create reactive dependency so UI updates when read/unread toggled
  void readMapVersion.value
  if (!item) return false
  
  // 获取公告更新时间
  const updateTime = new Date(item.updated_at || item.created_at || 0).getTime()
  
  // 对于重点公告，检查是否已确认
  if (item.is_mandatory) {
    const mandatoryAck = JSON.parse(localStorage.getItem('mandatoryAnnouncementAck') || 'null')
    if (!mandatoryAck) return true
    const isNew = mandatoryAck.id !== item.id || mandatoryAck.updatedAt !== item.updated_at
    return isNew
  }
  
  // 对于一般公告，使用本地read map签名比较（未读：map[id] !== updated_at）
  const map = getReadMap()
  const sig = map?.[item.id]
  return sig !== item.updated_at
}

// 标记单条为已读/未读（仅适用于一般公告）
const markItemAsRead = (item) => {
  if (!item || item.is_mandatory) return
  const map = getReadMap()
  map[item.id] = item.updated_at
  setReadMap(map)
  readMapVersion.value++
}

const markItemAsUnread = (item) => {
  if (!item || item.is_mandatory) return
  const map = getReadMap()
  delete map[item.id]
  setReadMap(map)
  readMapVersion.value++
}

const handleMarkRead = (item) => {
  markItemAsRead(item)
  emit('mark-read-one', item)
}

const handleMarkUnread = (item) => {
  markItemAsUnread(item)
  emit('mark-unread-one', item)
}

const handleMarkAllRead = () => {
  emit('view-general')
  // Defer a tick to allow parent to update localStorage map, then bump version to refresh UI
  setTimeout(() => { readMapVersion.value++ }, 0)
}
</script>

<style scoped>
.announcement-center-dialog :deep(.el-dialog) {
  border-radius: 22px;
  overflow: hidden;
  max-width: 92vw;
  background: #f5f7fb;
  box-shadow: 0 28px 80px rgba(10, 22, 53, 0.2);
}

.announcement-center-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.announcement-center-dialog :deep(.el-dialog__headerbtn) {
  position: absolute !important;
  top: 15px !important;
  right: 15px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.2s ease !important;
  z-index: 9999 !important;
}

.announcement-center-dialog :deep(.el-dialog__headerbtn:hover) {
  color: rgba(255, 255, 255, 0.7) !important;
  transform: scale(1.1) !important;
}

.announcement-center-dialog :deep(.el-dialog__headerbtn .el-icon) {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 18px !important;
}

.announcement-center-dialog :deep(.el-dialog__headerbtn:hover .el-icon) {
  color: rgba(255, 255, 255, 0.7) !important;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 18px 30px 14px;
  background: linear-gradient(120deg, #3245e8 0%, #5a71ff 100%);
  color: #ffffff;
  margin: -18px -60px 16px -30px;
  border-bottom-left-radius: 22px;
  border-bottom-right-radius: 22px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
}

.dialog-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.icon-wrapper .el-icon {
  font-size: 22px;
  color: #fff;
}

.heading-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.heading-sub {
  font-size: 12px;
  letter-spacing: 0.5px;
  opacity: 0.8;
  text-transform: uppercase;
}

.heading-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-tabs {
  background: transparent;
}

.header-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.header-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  padding: 0 18px 10px;
  color: rgba(255, 255, 255, 0.75);
}

.header-tabs :deep(.is-active) {
  font-weight: 600;
  color: #ffffff !important;
}

.header-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(255, 255, 255, 0.25);
}

.header-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffd66b 0%, #fff0b3 100%);
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.badge-dot :deep(.el-badge__content.is-fixed.is-dot) {
  right: -6px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

.content-card {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(17, 35, 79, 0.08);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
}

.content-card--new {
  border-color: #67c23a;
  box-shadow: 0 16px 40px rgba(17, 35, 79, 0.08), 0 0 0 1px rgba(103, 194, 58, 0.2);
}

.mandatory-card {
  height: 800px;
}

.timeline-card {
  height: 800px;
}

.card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  height: 100%;
  padding-right: 12px;
}

.mandatory-card .card-scroll,
.timeline-card .card-scroll {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 18px;
}


.card-header h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
}

.card-header .time {
  font-size: 13px;
  color: #8290a6;
}

.announcement-timeline {
  padding: 4px 4px 12px 16px;
}

.timeline-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.announcement-timeline :deep(.el-timeline-item__tail) {
  border-left: 2px solid rgba(43, 78, 209, 0.15);
}

.announcement-timeline :deep(.el-timeline-item__node--normal) {
  width: 12px;
  height: 12px;
  border-color: #5872f7;
  box-shadow: 0 0 0 5px rgba(88, 114, 247, 0.18);
}

.timeline-item {
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: 0 16px 36px rgba(15, 30, 78, 0.1);
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
}

.timeline-item--new {
  border-color: #67c23a;
  box-shadow: 0 16px 36px rgba(15, 30, 78, 0.1), 0 0 0 1px rgba(103, 194, 58, 0.2);
}

.timeline-item + .timeline-item {
  margin-top: 18px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.timeline-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #16213f;
}

.tag-group {
  display: flex;
  gap: 10px;
}

.markdown-body {
  font-size: 15px;
  line-height: 1.82;
  color: #2f3a58;
}

.timeline-preview {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.8;
  color: #596281;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timeline-actions {
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7b849f;
  gap: 14px;
  min-height: 260px;
}

.empty-state .el-icon {
  font-size: 40px;
  color: #c6cede;
}
</style>
