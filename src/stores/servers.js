import { defineStore } from 'pinia'
import axios from '../utils/axios'

export const useServersStore = defineStore('servers', {
  state: () => ({
    servers: [],
    routes: [],
    currentServer: null,
    loading: false,
    routesLoading: false,
    error: null
  }),
  
  actions: {
    // 获取所有服务器
    async fetchServers() {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/servers', {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.servers = response.data.servers
      } catch (error) {
        this.error = error.response?.data?.msg || '获取服务器列表失败'
        console.error('获取服务器列表失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 获取所有路由配置
    async fetchRoutes() {
      this.routesLoading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/routes', {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.routes = response.data.routes || []
      } catch (error) {
        this.error = error.response?.data?.msg || '获取路由配置失败'
        console.error('获取路由配置失败:', error)
      } finally {
        this.routesLoading = false
      }
    },
    
    // 获取单个服务器详情
    async fetchServerDetails(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.currentServer = response.data.server
        return response.data.server
      } catch (error) {
        this.error = error.response?.data?.msg || '获取服务器详情失败'
        console.error('获取服务器详情失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 添加新服务器
    async addServer(serverData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post('/api/servers', serverData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // 添加成功后刷新服务器列表
        await this.fetchServers()
        // 返回完整响应数据，包括服务器ID、认证令牌和安装命令
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '添加服务器失败'
        console.error('添加服务器失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 创建路由
    async createRoute(routeData) {
      this.routesLoading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        await axios.post('/api/routes', routeData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await this.fetchRoutes()
        return true
      } catch (error) {
        this.error = error.response?.data?.msg || '创建路由失败'
        console.error('创建路由失败:', error)
        throw error
      } finally {
        this.routesLoading = false
      }
    },

    // 更新路由
    async updateRoute(routeId, routeData) {
      this.routesLoading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        await axios.put(`/api/routes/${routeId}`, routeData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await this.fetchRoutes()
        return true
      } catch (error) {
        this.error = error.response?.data?.msg || '更新路由失败'
        console.error('更新路由失败:', error)
        throw error
      } finally {
        this.routesLoading = false
      }
    },

    // 删除路由
    async deleteRoute(routeId) {
      this.routesLoading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`/api/routes/${routeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await this.fetchRoutes()
        return true
      } catch (error) {
        this.error = error.response?.data?.msg || '删除路由失败'
        console.error('删除路由失败:', error)
        throw error
      } finally {
        this.routesLoading = false
      }
    },
    
    // 更新服务器信息
    async updateServer(serverId, serverData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.put(`/api/servers/${serverId}`, serverData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // 更新成功后刷新服务器列表
        await this.fetchServers()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '更新服务器失败'
        console.error('更新服务器失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 删除服务器
    async deleteServer(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.delete(`/api/servers/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // 删除成功后刷新服务器列表
        await this.fetchServers()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '删除服务器失败'
        console.error('删除服务器失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 测试服务器连接
    async testServerConnection(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/test`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '测试服务器连接失败'
        console.error('测试服务器连接失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 获取服务器的认证令牌
    async getServerToken(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/token`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.auth_token
      } catch (error) {
        this.error = error.response?.data?.msg || '获取认证令牌失败'
        console.error('获取认证令牌失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 重新生成服务器的认证令牌
    async regenerateServerToken(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/token/regenerate`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '重新生成认证令牌失败'
        console.error('重新生成认证令牌失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 获取服务器系统监控数据
    async fetchServerSystemData(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/system_data`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '获取服务器系统数据失败'
        console.error('获取服务器系统数据失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 清除当前服务器
    clearCurrentServer() {
      this.currentServer = null
    },
    
    // 存储路径管理API
    
    // 获取服务器的存储路径
    async fetchServerStoragePaths(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/storage_paths`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.storage_paths
      } catch (error) {
        this.error = error.response?.data?.msg || '获取存储路径失败'
        console.error('获取存储路径失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 添加服务器存储路径
    async addServerStoragePath(serverId, pathData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/storage_paths`, pathData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '添加存储路径失败'
        console.error('添加存储路径失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新服务器存储路径
    async updateServerStoragePath(serverId, pathId, pathData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.put(`/api/servers/${serverId}/storage_paths/${pathId}`, pathData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '更新存储路径失败'
        console.error('更新存储路径失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 删除服务器存储路径
    async deleteServerStoragePath(serverId, pathId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.delete(`/api/servers/${serverId}/storage_paths/${pathId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '删除存储路径失败'
        console.error('删除存储路径失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 远程检测服务器存储路径
    async detectServerStoragePaths(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/detect_storage_paths`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.storage_paths
      } catch (error) {
        this.error = error.response?.data?.msg || '检测存储路径失败'
        console.error('检测存储路径失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取服务器磁盘分区信息
    async fetchServerDiskPartitions(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/disk_partitions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.partitions
      } catch (error) {
        this.error = error.response?.data?.msg || '获取分区信息失败'
        console.error('获取分区信息失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 挂载分区
    async mountPartition(serverId, mountData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/mount_partition`, mountData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '挂载分区失败'
        console.error('挂载分区失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 卸载分区
    async unmountPartition(serverId, unmountData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/unmount_partition`, unmountData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '卸载分区失败'
        console.error('卸载分区失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 创建分区并格式化
    async createPartition(serverId, partitionData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/create_partition`, partitionData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '创建分区失败'
        console.error('创建分区失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 端口范围管理API
    
    // 获取服务器的端口范围
    async fetchServerPortRanges(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/port_ranges`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.port_ranges
      } catch (error) {
        this.error = error.response?.data?.msg || '获取端口范围失败'
        console.error('获取端口范围失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 添加服务器端口范围
    async addServerPortRange(serverId, rangeData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/port_ranges`, rangeData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '添加端口范围失败'
        console.error('添加端口范围失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新服务器端口范围
    async updateServerPortRange(serverId, rangeId, rangeData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.put(`/api/servers/${serverId}/port_ranges/${rangeId}`, rangeData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '更新端口范围失败'
        console.error('更新端口范围失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 删除服务器端口范围
    async deleteServerPortRange(serverId, rangeId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.delete(`/api/servers/${serverId}/port_ranges/${rangeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '删除端口范围失败'
        console.error('删除端口范围失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 远程检测服务器端口范围
    async detectServerPortRanges(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/detect_port_ranges`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.port_ranges
      } catch (error) {
        this.error = error.response?.data?.msg || '检测端口范围失败'
        console.error('检测端口范围失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Docker镜像管理API
    
    // 获取服务器的Docker镜像列表
    async fetchServerDockerImages(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/docker_images`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.docker_images
      } catch (error) {
        this.error = error.response?.data?.msg || '获取Docker镜像列表失败'
        console.error('获取Docker镜像列表失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 检测服务器上的Docker镜像
    async detectServerDockerImages(serverId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/detect_docker_images`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data.docker_images
      } catch (error) {
        this.error = error.response?.data?.msg || '检测Docker镜像失败'
        console.error('检测Docker镜像失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 添加服务器Docker镜像
    async addServerDockerImage(serverId, imageData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/docker_images`, imageData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '添加Docker镜像失败'
        console.error('添加Docker镜像失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 删除服务器Docker镜像
    async deleteServerDockerImage(serverId, imageId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.delete(`/api/servers/${serverId}/docker_images/${imageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '删除Docker镜像失败'
        console.error('删除Docker镜像失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 拉取Docker镜像
    async pullDockerImage(serverId, imageData) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/servers/${serverId}/pull_docker_image`, imageData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '拉取Docker镜像失败'
        console.error('拉取Docker镜像失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 获取Docker任务状态
    async getDockerTaskStatus(serverId, taskId) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/servers/${serverId}/docker_tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.msg || '获取Docker任务状态失败'
        console.error('获取Docker任务状态失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
