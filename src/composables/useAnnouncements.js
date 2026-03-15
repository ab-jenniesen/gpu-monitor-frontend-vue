import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from '../utils/axios'

const GENERAL_READ_KEY = 'announcementLastReadAt'
const MANDATORY_ACK_KEY = 'mandatoryAnnouncementAck'
const GENERAL_READ_MAP_KEY = 'announcementReadMap'
const DEFAULT_POLL_INTERVAL = 60000

const toTimestamp = (value) => {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

// Read per-announcement read map from localStorage
const readGeneralReadMap = () => {
  try {
    const stored = localStorage.getItem(GENERAL_READ_MAP_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    return {}
  }
}

const writeGeneralReadMap = (map) => {
  try {
    localStorage.setItem(GENERAL_READ_MAP_KEY, JSON.stringify(map || {}))
  } catch (e) {
    // ignore quota or serialization errors
  }
}

const readGeneralLastRead = () => {
  const stored = localStorage.getItem(GENERAL_READ_KEY)
  const parsed = stored ? parseInt(stored, 10) : 0
  return Number.isNaN(parsed) ? 0 : parsed
}

const readMandatoryAck = () => {
  try {
    const stored = localStorage.getItem(MANDATORY_ACK_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    return null
  }
}

export function useAnnouncements({ pollInterval = DEFAULT_POLL_INTERVAL } = {}) {
  const announcements = ref([])
  const loading = ref(false)
  const error = ref(null)
  const generalLastRead = ref(readGeneralLastRead())
  const mandatoryAck = ref(readMandatoryAck())
  const generalReadMap = ref(readGeneralReadMap())

  let pollingTimer = null

  const sortedAnnouncements = computed(() => {
    return [...announcements.value].sort((a, b) => {
      const timeA = toTimestamp(a.updated_at)
      const timeB = toTimestamp(b.updated_at)
      return timeB - timeA
    })
  })

  const mandatoryAnnouncement = computed(() => {
    return announcements.value
      .filter(item => item.is_active !== false && item.is_mandatory)
      .sort((a, b) => toTimestamp(b.updated_at) - toTimestamp(a.updated_at))[0] || null
  })

  const generalAnnouncements = computed(() => {
    return announcements.value.filter(item => !item.is_mandatory)
  })

  const latestGeneralUpdate = computed(() => {
    if (!generalAnnouncements.value.length) return 0
    return generalAnnouncements.value.reduce((latest, item) => {
      const ts = toTimestamp(item.updated_at)
      return ts > latest ? ts : latest
    }, 0)
  })

  const hasNewMandatory = computed(() => {
    const current = mandatoryAnnouncement.value
    if (!current) return false
    if (!mandatoryAck.value) return true
    return (
      mandatoryAck.value.id !== current.id ||
      mandatoryAck.value.updatedAt !== current.updated_at
    )
  })

  const hasNewGeneral = computed(() => {
    if (!generalAnnouncements.value.length) return false
    return generalAnnouncements.value.some(item => {
      const id = item.id
      const updated = item.updated_at
      const sig = generalReadMap.value?.[id]
      return sig !== updated
    })
  })

  const unreadGeneralCount = computed(() => {
    if (!generalAnnouncements.value.length) return 0
    return generalAnnouncements.value.reduce((count, item) => {
      const id = item.id
      const updated = item.updated_at
      const sig = generalReadMap.value?.[id]
      return sig !== updated ? count + 1 : count
    }, 0)
  })

  const unreadMandatoryCount = computed(() => (hasNewMandatory.value ? 1 : 0))

  const totalUnreadCount = computed(() => unreadGeneralCount.value + unreadMandatoryCount.value)

  const fetchAnnouncements = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/announcements', {
        params: { active_only: true }
      })
      const list = Array.isArray(response.data) ? response.data : []
      announcements.value = list

      // One-time migration: if map is empty but we have a legacy timestamp,
      // pre-fill read signatures for all general announcements updated at or before that timestamp.
      const currentMap = generalReadMap.value || {}
      if (Object.keys(currentMap).length === 0 && generalLastRead.value > 0) {
        const next = {}
        list.filter(it => !it.is_mandatory).forEach(it => {
          if (toTimestamp(it.updated_at) <= generalLastRead.value) {
            next[it.id] = it.updated_at
          }
        })
        if (Object.keys(next).length > 0) {
          generalReadMap.value = next
          writeGeneralReadMap(next)
        }
      }
    } catch (err) {
      console.error('获取公告失败:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  const startPolling = () => {
    if (pollInterval <= 0) return
    clearInterval(pollingTimer)
    pollingTimer = setInterval(fetchAnnouncements, pollInterval)
  }

  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  // Mark all general announcements as read (fills the map with current signatures)
  const markGeneralAsRead = () => {
    const next = { ...(generalReadMap.value || {}) }
    generalAnnouncements.value.forEach(item => {
      next[item.id] = item.updated_at
    })
    generalReadMap.value = next
    writeGeneralReadMap(next)
    // Backward compatibility: also bump the old last-read timestamp
    const latest = latestGeneralUpdate.value || Date.now()
    generalLastRead.value = latest
    localStorage.setItem(GENERAL_READ_KEY, String(latest))
  }

  // Mark a single announcement as read
  const markOneAsRead = (announcement) => {
    if (!announcement || announcement.is_mandatory) return
    const next = { ...(generalReadMap.value || {}) }
    next[announcement.id] = announcement.updated_at
    generalReadMap.value = next
    writeGeneralReadMap(next)
  }

  // Mark a single announcement as unread
  const markOneAsUnread = (announcement) => {
    if (!announcement || announcement.is_mandatory) return
    const next = { ...(generalReadMap.value || {}) }
    delete next[announcement.id]
    generalReadMap.value = next
    writeGeneralReadMap(next)
  }

  const acknowledgeMandatory = (announcement) => {
    if (!announcement) return
    const payload = {
      id: announcement.id,
      updatedAt: announcement.updated_at
    }
    mandatoryAck.value = payload
    localStorage.setItem(MANDATORY_ACK_KEY, JSON.stringify(payload))
  }

  const clearMandatoryAcknowledgement = () => {
    mandatoryAck.value = null
    localStorage.removeItem(MANDATORY_ACK_KEY)
  }

  onMounted(() => {
    fetchAnnouncements()
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    announcements,
    sortedAnnouncements,
    mandatoryAnnouncement,
    generalAnnouncements,
    loading,
    error,
    hasNewMandatory,
    hasNewGeneral,
    unreadGeneralCount,
    totalUnreadCount,
    fetchAnnouncements,
    markGeneralAsRead,
    markOneAsRead,
    markOneAsUnread,
    acknowledgeMandatory,
    clearMandatoryAcknowledgement,
    generalLastRead,
    generalReadMap,
    mandatoryAck,
    stopPolling,
    startPolling
  }
}
