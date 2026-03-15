<template>
  <div class="page-header-container">
    <div class="page-header-content">
      <div class="site-info">
        <div class="logo-container">
          <site-logo />
        </div>
        <div class="page-title-container">
          <h2 class="current-page-title">{{ title }}</h2>
        </div>
      </div>
      <div class="actions-container">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import SiteLogo from './SiteLogo.vue'

defineProps({
  title: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.page-header-container {
  background-color: #f0f2f5;
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-info {
  display: flex;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-right: 24px;
  padding-right: 24px;
  border-right: 1px solid #dcdfe6;
}



.page-title-container {
  display: flex;
  align-items: center;
}

.current-page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.actions-container {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .page-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .actions-container {
    align-self: flex-end;
  }
}

@media (max-width: 576px) {
  .site-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .logo-container {
    border-right: none;
    padding-right: 0;
    margin-right: 0;
  }
}
</style>
