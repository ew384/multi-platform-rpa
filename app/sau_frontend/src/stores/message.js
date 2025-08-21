// src/stores/message.js - 极简化版本

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api/message'
import { ElMessage } from 'element-plus'
import { io } from 'socket.io-client'
export const useMessageStore = defineStore('message', () => {
  // ==================== 🔥 核心数据状态 ====================
  
  // 当前选中状态
  const selectedAccount = ref(null)      // { platform, accountId, userName }
  const selectedThread = ref(null)       // { threadId, userName, avatar }
  
  // 数据缓存
  const threadsList = ref([])           // 当前账号的会话列表
  const currentMessages = ref([])       // 当前会话的消息列表
  
  // 系统状态（简化）
  const connectionStatus = ref('connected')  // connected | reconnecting | error
  const unreadCounts = ref({})          // { platform_accountId: count }
  const monitoringStatus = ref({})      // { platform_accountId: boolean }
  
  // 加载状态
  const isLoadingThreads = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  
  // 分页状态
  const messagesOffset = ref(0)
  const hasMoreMessages = ref(true)

  // ==================== 🔥 计算属性 ====================
  
  const totalUnreadCount = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0)
  })
  
  const activeMonitoringCount = computed(() => {
    return Object.values(monitoringStatus.value).filter(Boolean).length
  })

  const isSystemReady = computed(() => {
    return connectionStatus.value === 'connected' && activeMonitoringCount.value > 0
  })

  // ==================== 🔥 系统初始化（极简） ====================
  
  /**
   * 🔥 初始化 - 只加载历史数据，不管监听服务
   */
  const initialize = async () => {
    try {
      console.log('🔄 初始化消息store...')
      
      // 🔥 步骤1: 恢复上次选中的账号
      const lastAccount = getLastSelectedAccount()
      if (lastAccount) {
        console.log(`📋 恢复上次选中账号: ${lastAccount.userName}`)
        await selectAccount(lastAccount.platform, lastAccount.accountId, lastAccount.userName)
      }
      
      // 🔥 步骤2: 加载基础状态（快速操作）
      refreshMonitoringStatus().catch(err => console.warn('监听状态刷新失败:', err))
      refreshUnreadCounts().catch(err => console.warn('未读统计刷新失败:', err))
      
      // 🔥 新增：设置WebSocket监听
      setupWebSocket()
      
      // 🔥 新增：延迟刷新状态（给后台服务启动时间）
      setTimeout(() => {
        refreshMonitoringStatus()
        refreshUnreadCounts()
      }, 2000)
      
      console.log('✅ 消息store初始化完成')
      
    } catch (error) {
      console.error('❌ 消息store初始化失败:', error)
      // 不抛出错误，避免阻塞页面
    }
  }

  // ==================== 🔥 账号和会话管理 ====================
  
  /**
   * 选择账号并加载会话列表
   */
  const selectAccount = async (platform, accountId, userName) => {
    try {
      console.log(`🔄 选择账号: ${platform} - ${userName}`)
      
      const accountInfo = { platform, accountId, userName }
      selectedAccount.value = accountInfo
      selectedThread.value = null
      currentMessages.value = []
      
      // 🔥 保存选中状态到本地存储
      saveLastSelectedAccount(accountInfo)
      console.log(`📞 调用loadThreads参数:`, { platform, accountId })
      // 🔥 加载该账号的会话列表
      await loadThreads(platform, accountId)
      
      console.log(`✅ 账号选择完成，会话数量: ${threadsList.value.length}`)
      
    } catch (error) {
      console.error('选择账号失败:', error)
      ElMessage.error('加载账号数据失败')
    }
  }

  /**
   * 选择会话并加载消息
   */
  const selectThread = async (threadId, userName, avatar) => {
    try {
      console.log(`💬 选择会话: ${userName}`)
      
      selectedThread.value = { threadId, userName, avatar }
      messagesOffset.value = 0
      hasMoreMessages.value = true
      
      await loadMessages(threadId, true)
      
      // 标记会话为已读
      await markAsRead(threadId)
      
    } catch (error) {
      console.error('选择会话失败:', error)
      ElMessage.error('加载消息失败')
    }
  }

  /**
   * 加载会话列表
   */
  const loadThreads = async (platform, accountId) => {
    if (isLoadingThreads.value) return
    
    isLoadingThreads.value = true
    
    try {
      console.log(`📋 加载会话列表: ${platform} - ${accountId}`)
      
      const response = await messageApi.getMessageThreads(platform, accountId)
      
      if (response?.success && response.data) {
        threadsList.value = response.data.threads || []
        console.log(`✅ 会话列表加载成功: ${threadsList.value.length} 个会话`)
      } else {
        console.warn('获取会话列表响应异常:', response)
        threadsList.value = []
      }
      
    } catch (error) {
      console.error('加载会话列表失败:', error)
      threadsList.value = []
      
      // 🔥 友好的错误提示
      if (error.message?.includes('timeout')) {
        ElMessage.warning('加载超时，请检查网络连接')
      } else {
        ElMessage.error('加载会话失败，请稍后重试')
      }
    } finally {
      isLoadingThreads.value = false
    }
  }

  /**
   * 加载消息
   */
  const loadMessages = async (threadId, reset = false) => {
    if (isLoadingMessages.value || (!hasMoreMessages.value && !reset)) return
    
    isLoadingMessages.value = true
    
    try {
      const offset = reset ? 0 : messagesOffset.value
      const response = await messageApi.getThreadMessages(threadId, 50, offset)
      
      if (response?.success && response.data) {
        const newMessages = response.data.messages || []
        
        if (reset) {
          currentMessages.value = newMessages
          messagesOffset.value = newMessages.length
        } else {
          currentMessages.value = [...currentMessages.value, ...newMessages]
          messagesOffset.value += newMessages.length
        }
        
        hasMoreMessages.value = newMessages.length === 50
        
        console.log(`✅ 加载消息成功: ${newMessages.length} 条新消息`)
      } else {
        console.warn('获取消息响应异常:', response)
        if (reset) currentMessages.value = []
      }
      
    } catch (error) {
      console.error('加载消息失败:', error)
      if (reset) currentMessages.value = []
      ElMessage.error('加载消息失败')
    } finally {
      isLoadingMessages.value = false
    }
  }

  // ==================== 🔥 消息操作 ====================
  
  /**
   * 发送消息
   */
  const sendMessage = async (content) => {
    if (isSending.value || !selectedAccount.value || !selectedThread.value) {
      return { success: false, error: '发送条件不满足' }
    }
    
    isSending.value = true
    
    try {
      const response = await messageApi.sendMessage({
        platform: selectedAccount.value.platform,
        tabId: 'current', // 需要根据实际情况获取
        userName: selectedThread.value.userName,
        content: content,
        type: 'text',
        accountId: selectedAccount.value.accountId
      })
      
      if (response?.success) {
        // 重新加载消息以显示发送的消息
        await loadMessages(selectedThread.value.threadId, true)
        console.log('✅ 消息发送成功')
        return { success: true }
      } else {
        const error = response?.data?.error || '发送失败'
        console.error('发送消息失败:', error)
        return { success: false, error }
      }
      
    } catch (error) {
      console.error('发送消息失败:', error)
      return { success: false, error: error.message || '网络错误' }
    } finally {
      isSending.value = false
    }
  }

  /**
   * 标记已读
   */
  const markAsRead = async (threadId, messageIds = null) => {
    try {
      const response = await messageApi.markMessagesAsRead({
        threadId: threadId,
        messageIds: messageIds
      })
      
      if (response?.success) {
        // 更新本地未读数
        if (selectedAccount.value) {
          const accountKey = `${selectedAccount.value.platform}_${selectedAccount.value.accountId}`
          await refreshUnreadCount(selectedAccount.value.platform, selectedAccount.value.accountId)
        }
        
        // 更新会话列表中的未读数
        const thread = threadsList.value.find(t => t.id === threadId)
        if (thread) {
          thread.unread_count = 0
        }
        
        console.log('✅ 消息已标记为已读')
        return true
      }
      
      return false
    } catch (error) {
      console.error('标记已读失败:', error)
      return false
    }
  }

  /**
   * 搜索消息
   */
  const searchMessages = async (keyword) => {
    if (!selectedAccount.value || !keyword.trim()) {
      return []
    }
    
    try {
      const response = await messageApi.searchMessages(
        selectedAccount.value.platform,
        selectedAccount.value.accountId,
        keyword.trim()
      )
      
      if (response?.success && response.data) {
        console.log(`🔍 搜索完成: 找到 ${response.data.results.length} 条结果`)
        return response.data.results || []
      }
      
      return []
    } catch (error) {
      console.error('搜索消息失败:', error)
      ElMessage.error('搜索失败')
      return []
    }
  }

  // ==================== 🔥 系统状态管理（简化） ====================
  
  /**
   * 刷新监听状态
   */
  const refreshMonitoringStatus = async () => {
    try {
      const response = await messageApi.getMonitoringStatus()
      
      if (response?.success && response.data) {
        const statusMap = {}
        
        if (response.data.monitoring) {
          response.data.monitoring.forEach(status => {
            const accountKey = `${status.platform}_${status.accountId}`
            statusMap[accountKey] = status.isMonitoring
          })
        }
        
        monitoringStatus.value = statusMap
        
        // 🔥 根据监听状态更新连接状态
        const hasActiveMonitoring = Object.values(statusMap).some(Boolean)
        if (hasActiveMonitoring && connectionStatus.value !== 'connected') {
          connectionStatus.value = 'connected'
        }
        
        console.log('✅ 监听状态已刷新')
      }
      
    } catch (error) {
      console.error('刷新监听状态失败:', error)
      // 🔥 网络错误时更新连接状态
      if (connectionStatus.value === 'connected') {
        connectionStatus.value = 'error'
      }
    }
  }

  /**
   * 刷新未读统计
   */
  const refreshUnreadCounts = async () => {
    try {
      const response = await messageApi.getUnreadCount()
      
      if (response?.success && response.data) {
        // 这里需要根据实际API响应格式调整
        console.log('✅ 未读统计已刷新')
      }
      
    } catch (error) {
      console.error('刷新未读统计失败:', error)
    }
  }

  /**
   * 刷新指定账号的未读统计
   */
  const refreshUnreadCount = async (platform, accountId) => {
    try {
      const response = await messageApi.getUnreadCount(platform, accountId)
      
      if (response?.success && response.data) {
        const accountKey = `${platform}_${accountId}`
        unreadCounts.value[accountKey] = response.data.unreadCount || 0
      }
      
    } catch (error) {
      console.error('刷新账号未读数失败:', error)
    }
  }

  /**
   * 🔥 设置连接状态
   */
  const setConnectionStatus = (status) => {
    connectionStatus.value = status
  }

  /**
   * 🔥 实时刷新当前会话数据（用于WebSocket推送）
   */
  const refreshCurrentThreads = async () => {
    if (!selectedAccount.value) return
    
    try {
      console.log('🔄 实时刷新当前会话列表...')
      await loadThreads(selectedAccount.value.platform, selectedAccount.value.accountId)
    } catch (error) {
      console.warn('实时刷新会话失败:', error)
    }
  }

  // ==================== 🔥 本地存储辅助方法 ====================
  
  /**
   * 获取上次选中的账号
   */
  const getLastSelectedAccount = () => {
    try {
      const saved = localStorage.getItem('messageStore_lastSelectedAccount')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  /**
   * 保存当前选中的账号
   */
  const saveLastSelectedAccount = (account) => {
    try {
      localStorage.setItem('messageStore_lastSelectedAccount', JSON.stringify(account))
    } catch (error) {
      console.warn('保存选中账号失败:', error)
    }
  }

  /**
   * 清理状态
   */
  const cleanup = () => {
    selectedAccount.value = null
    selectedThread.value = null
    threadsList.value = []
    currentMessages.value = []
    messagesOffset.value = 0
    hasMoreMessages.value = true
    connectionStatus.value = 'connected'
  }
  const setupWebSocket = () => {
    try {
      const socket = io('http://localhost:3409')
      
      socket.on('message-updated', (data) => {
        console.log('🔄 收到消息更新推送:', data)
        refreshCurrentThreads()
      })
      
      socket.on('message-processing', (data) => {
        console.log('📡 消息处理中:', data)
        setConnectionStatus('processing')
      })
      
      socket.on('message-error', (data) => {
        console.log('❌ 消息处理错误:', data)
        setConnectionStatus('error')
      })
      
      socket.on('connect', () => {
        console.log('✅ WebSocket连接成功')
        setConnectionStatus('connected')
      })
      
      socket.on('disconnect', () => {
        console.log('🔌 WebSocket连接断开')
        setConnectionStatus('reconnecting')
      })
      
    } catch (error) {
      console.warn('⚠️ WebSocket设置失败:', error)
    }
  }
  return {
    // 🔥 核心状态
    selectedAccount,
    selectedThread,
    threadsList,
    currentMessages,
    connectionStatus,
    unreadCounts,
    monitoringStatus,
    
    // 🔥 UI状态
    isLoadingThreads,
    isLoadingMessages,
    isSending,
    messagesOffset,
    hasMoreMessages,
    
    // 🔥 计算属性
    totalUnreadCount,
    activeMonitoringCount,
    isSystemReady,
    
    // 🔥 核心方法
    initialize,
    selectAccount,
    selectThread,
    loadThreads,
    loadMessages,
    sendMessage,
    markAsRead,
    searchMessages,
    
    // 🔥 状态管理
    refreshMonitoringStatus,
    refreshUnreadCounts,
    refreshUnreadCount,
    setConnectionStatus,
    refreshCurrentThreads,
    cleanup
  }
})