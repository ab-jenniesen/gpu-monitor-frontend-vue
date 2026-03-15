import { defineStore } from 'pinia'
import axios from '../utils/axios'

export const useServerSetupStore = defineStore('serverSetup', {
  state: () => ({
    loading: false,
    result: null,
    error: null
  }),
  actions: {
    async generate(payload) {
      this.loading = true
      this.error = null
      this.result = null
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post('/api/server-setup/generate', payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.result = response.data
        return this.result
      } catch (error) {
        this.error = error.response?.data?.msg || '生成一键配置脚本失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    reset() {
      this.result = null
      this.error = null
    }
  }
})
