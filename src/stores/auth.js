import { defineStore } from 'pinia'
import axios from '../utils/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user && state.user.role === 'admin',
    currentUser: (state) => state.user
  },
  
  actions: {
    async login(username, password) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.post('/api/login', {
          username,
          password
        })
        
        const { access_token, user } = response.data
        
        this.token = access_token
        this.user = user
        
        // 保存到本地存储
        localStorage.setItem('token', access_token)
        localStorage.setItem('userId', user.id)
        localStorage.setItem('username', user.username)
        localStorage.setItem('userRole', user.role)
        localStorage.setItem('isFirstLogin', user.is_first_login || false)
        localStorage.setItem('requiresPasswordChange', user.requires_password_change || false)

        this.setAvatarUrl(user.avatar_url || '')

        return { success: true, user }
      } catch (error) {
        this.error = error.response?.data?.msg || '登录失败，请稍后再试'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    logout() {
      this.setAvatarUrl('')
      this.token = null
      this.user = null
      
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('userRole')
      localStorage.removeItem('isFirstLogin')
      localStorage.removeItem('requiresPasswordChange')
      localStorage.removeItem('avatarUrl')
    },
    
    async fetchCurrentUser() {
      if (!this.token) return
      
      this.loading = true
      
      try {
        const response = await axios.get('/api/me', {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        })
        
        this.user = response.data.user
        localStorage.setItem('username', this.user.username)
        localStorage.setItem('userRole', this.user.role)
        this.setAvatarUrl(this.user.avatar_url || '')
      } catch (error) {
        // 如果令牌无效，则注销用户
        if (error.response && error.response.status === 401) {
          this.logout()
        }
      } finally {
        this.loading = false
      }
    },

    setAvatarUrl(url) {
      const value = (url || '').trim()
      if (this.user) {
        this.user = { ...this.user, avatar_url: value }
      }
      localStorage.setItem('avatarUrl', value)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: value }))
    },
    
    initAuth() {
      // 从本地存储恢复用户状态
      const token = localStorage.getItem('token')
      
      if (token) {
        this.token = token
        this.user = {
          id: localStorage.getItem('userId'),
          username: localStorage.getItem('username'),
          role: localStorage.getItem('userRole'),
          is_first_login: localStorage.getItem('isFirstLogin') === 'true',
          requires_password_change: localStorage.getItem('requiresPasswordChange') === 'true',
          avatar_url: localStorage.getItem('avatarUrl') || ''
        }
        
        // 设置axios默认头部
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
    }
  }
})
