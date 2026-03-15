<template>
  <div class="announcement-manager">
    <!-- 公告列表 -->
    <div v-if="!currentAnnouncement" class="announcement-list">
      <el-table
        v-loading="loading"
        :data="announcements"
        style="width: 100%"
        border
      >
        <el-table-column prop="id" label="ID" min-width="60" />
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column prop="content" label="内容" min-width="250">
          <template #default="scope">
            <div class="content-preview" v-html="renderMarkdown(scope.row.content)"></div>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" min-width="80">
          <template #default="scope">
            <el-tag :type="scope.row.is_active ? 'success' : 'info'">
              {{ scope.row.is_active ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_mandatory" label="重点" min-width="80">
          <template #default="scope">
            <el-tag v-if="scope.row.is_mandatory" type="danger">必读</el-tag>
            <span v-else>普通</span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" min-width="160" />
        <el-table-column label="操作" min-width="180" fixed="right">
          <template #default="scope">
            <div class="announcement-actions">
              <el-button
                size="small"
                type="primary"
                @click="editAnnouncement(scope.row)"
              >
                <el-icon><Edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="confirmDeleteAnnouncement(scope.row)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 编辑公告 -->
    <div v-else class="announcement-edit">
      <el-form
        ref="announcementForm"
        :model="currentAnnouncement"
        :rules="formRules"
        label-width="100px"
        class="announcement-form"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="currentAnnouncement.title" placeholder="请输入公告标题" />
        </el-form-item>
        
        <el-form-item label="内容" prop="content">
          <div class="editor-container">
            <div class="editor-tabs">
              <el-radio-group v-model="editorMode" size="small">
                <el-radio-button value="edit">编辑</el-radio-button>
                <el-radio-button value="preview">预览</el-radio-button>
              </el-radio-group>
            </div>
            
            <div v-if="editorMode === 'edit'" class="editor-wrapper">
              <quill-editor
                v-model:content="currentAnnouncement.content"
                contentType="text"
                theme="snow"
                style="min-height: 250px;"
                :options="{
                  scrollingContainer: '.editor-wrapper',
                  modules: {
                    clipboard: {
                      matchers: []
                    }
                  }
                }"
                :toolbar="[
                  ['bold', 'italic', 'underline', 'strike'],
                  ['blockquote', 'code-block'],
                  [{ 'header': 1 }, { 'header': 2 }],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'script': 'sub'}, { 'script': 'super' }],
                  [{ 'indent': '-1'}, { 'indent': '+1' }],
                  [{ 'size': ['small', false, 'large', 'huge'] }],
                  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                  [{ 'color': [] }, { 'background': [] }],
                  ['link', 'image'],
                  ['clean']
                ]"
              />
              <div class="markdown-tips">
                <p>支持 Markdown 语法，可以使用 <code>**粗体**</code>, <code>*斜体*</code>, <code>[链接](URL)</code> 等格式</p>
              </div>
            </div>
            
            <div v-else class="preview-wrapper">
              <div class="markdown-preview" v-html="renderMarkdown(currentAnnouncement.content)"></div>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch
            v-model="currentAnnouncement.is_active"
            active-text="已发布"
            inactive-text="草稿"
          />
        </el-form-item>
        

        <el-form-item label="重点公告">
          <el-switch
            v-model="currentAnnouncement.is_mandatory"
            active-text="必读"
            inactive-text="普通"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveAnnouncement" :loading="saving">
            保存
          </el-button>
          <el-button @click="backToList">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
      :z-index="3000"
      append-to-body
    >
      <span>确定要删除这条公告吗？此操作不可恢复。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteAnnouncement" :loading="deleting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Back } from '@element-plus/icons-vue'
import axios from '../utils/axios'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import MarkdownIt from 'markdown-it'

// 公告列表
const announcements = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editorMode = ref('edit')

// 初始化Markdown解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

// 渲染Markdown内容
const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

// 当前编辑的公告
const currentAnnouncement = ref(null)
const isNewAnnouncement = ref(false)
const announcementToDelete = ref(null)
const deleteDialogVisible = ref(false)

// 表单规则
const formRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 2, max: 50, message: '标题长度应在2到50个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' }
  ]
}

// 获取公告列表
const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/announcements', {
      params: { active_only: false },
      headers: { Authorization: `Bearer ${token}` }
    })
    announcements.value = response.data
  } catch (error) {
    console.error('获取公告列表失败:', error)
    ElMessage.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

// 添加新公告
const openAddAnnouncementDialog = () => {
  currentAnnouncement.value = {
    title: '',
    content: '',
    is_active: true,
    is_mandatory: false
  }
  isNewAnnouncement.value = true
}

// 编辑公告
const editAnnouncement = (announcement) => {
  currentAnnouncement.value = { is_mandatory: false, ...announcement }
  isNewAnnouncement.value = false
}

// 返回公告列表
const backToList = () => {
  currentAnnouncement.value = null
}

// 保存公告
const saveAnnouncement = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    
    if (isNewAnnouncement.value) {
      // 创建新公告
      await axios.post('/api/announcements', currentAnnouncement.value, { headers })
      ElMessage.success('公告添加成功')
    } else {
      // 更新现有公告
      const { id } = currentAnnouncement.value
      await axios.put(`/api/announcements/${id}`, currentAnnouncement.value, { headers })
      ElMessage.success('公告更新成功')
    }
    
    // 刷新公告列表并返回列表视图
    await fetchAnnouncements()
    backToList()
  } catch (error) {
    console.error('保存公告失败:', error)
    ElMessage.error('保存公告失败: ' + (error.response?.data?.msg || error.message))
  } finally {
    saving.value = false
  }
}

// 确认删除公告
const confirmDeleteAnnouncement = (announcement) => {
  announcementToDelete.value = announcement
  deleteDialogVisible.value = true
}

// 删除公告
const deleteAnnouncement = async () => {
  if (!announcementToDelete.value) return
  
  deleting.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`/api/announcements/${announcementToDelete.value.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    ElMessage.success('公告删除成功')
    deleteDialogVisible.value = false
    await fetchAnnouncements()
  } catch (error) {
    console.error('删除公告失败:', error)
    ElMessage.error('删除公告失败: ' + (error.response?.data?.msg || error.message))
  } finally {
    deleting.value = false
  }
}

// 组件挂载时获取公告列表
onMounted(fetchAnnouncements)

// 暴露方法给父组件
defineExpose({
  openAddAnnouncementDialog
})
</script>

<style scoped>
.announcement-manager {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h2 {
  margin: 0;
  background: linear-gradient(90deg, #409EFF, #36D1DC);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 24px;
}

.tab-actions {
  display: flex;
  gap: 10px;
}

.content-preview {
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-bottom: 10px;
}

.editor-tabs {
  padding: 8px 15px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.editor-wrapper, .preview-wrapper {
  min-height: 400px;
}

.markdown-preview {
  padding: 15px;
  min-height: 400px;
}

.markdown-tips {
  padding: 8px 15px;
  background-color: #f5f7fa;
  border-top: 1px solid #dcdfe6;
  font-size: 12px;
  color: #909399;
}

.markdown-tips code {
  background-color: #e6e6e6;
  padding: 2px 4px;
  border-radius: 3px;
  margin: 0 2px;
}

.announcement-actions {
  display: flex;
  gap: 8px;
}



.announcement-form {
  max-width: 800px;
  margin-top: 20px;
}
</style>
