import { defineStore } from 'pinia'
import axios from '../utils/axios'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    loading: false,
    error: null,
    currentUser: JSON.parse(localStorage.getItem('user') || '{}')
  }),
  
  actions: {
    async fetchUsers() {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.get('/api/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        this.users = response.data.users
        return { success: true, users: this.users }
      } catch (error) {
        this.error = error.response?.data?.msg || '获取用户列表失败'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    async addUser(userData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.post('/api/users', userData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        // 添加成功后重新获取用户列表
        await this.fetchUsers()
        
        return { success: true, message: response.data.msg }
      } catch (error) {
        // 处理冲突错误的特殊格式
        const errorData = error.response?.data
        if (errorData?.conflicts && Array.isArray(errorData.conflicts)) {
          this.error = `${errorData.msg || '用户名存在冲突'}: ${errorData.conflicts.join('; ')}`
        } else {
          this.error = errorData?.msg || '添加用户失败'
        }
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    async updateUser(userId, userData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.put(`/api/users/${userId}`, userData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        // 更新成功后重新获取用户列表
        await this.fetchUsers()
        
        return { success: true, message: response.data.msg }
      } catch (error) {
        this.error = error.response?.data?.msg || '更新用户失败'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    async deleteUser(userId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.delete(`/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        // 删除成功后重新获取用户列表
        await this.fetchUsers()
        
        return { success: true, message: response.data.msg }
      } catch (error) {
        this.error = error.response?.data?.msg || '删除用户失败'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    async addUsers(usersData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.post('/api/users/batch', { users: usersData }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        // 添加成功后重新获取用户列表
        await this.fetchUsers()
        
        return { success: true, message: response.data.msg }
      } catch (error) {
        // 处理冲突错误的特殊格式
        const errorData = error.response?.data
        if (errorData?.conflicts && Array.isArray(errorData.conflicts)) {
          this.error = `${errorData.msg || '用户名存在冲突'}: ${errorData.conflicts.join('; ')}`
        } else {
          this.error = errorData?.msg || '批量添加用户失败'
        }
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
  },
  
  getters: {
  }
})
