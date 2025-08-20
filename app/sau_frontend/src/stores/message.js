// src/stores/message.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api/message'
import { ElMessage } from 'element-plus'

export const useMessageStore = defineStore('message', () => {
  // 当前选中状态
  const selectedAccount = ref(null)      // { platform, accountId, userName }
  const selectedThread = ref(null)       // { threadId, userName, avatar }
  
  // 数据缓存
  const platformAccounts = ref({})       // 按平台分组的账号列表
  const threadsList = ref([])           // 当前账号的会话列表
  const currentMessages = ref([])       // 当前会话的消息列表
  
  // 统计数据
  const unreadCounts = ref({})          // { platform_accountId: count }
  const monitoringStatus = ref({})      // { platform_accountId: boolean }
  
  // UI状态
  const isLoadingThreads = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  
  // 分页状态
  const messagesOffset = ref(0)
  const hasMoreMessages = ref(true)
  
  // 计算属性
  const totalUnreadCount = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0)
  })
  
  const activeMonitoringCount = computed(() => {
    return Object.values(monitoringStatus.value).filter(Boolean).length
  })

  // 选择账号并加载会话列表
  const selectAccount = async (platform, accountId, userName) => {
    try {
      console.log(`🔄 选择账号: ${platform} - ${userName}`)
      
      selectedAccount.value = { platform, accountId, userName }
      selectedThread.value = null
      currentMessages.value = []
      
      await loadThreads(platform, accountId)
      
    } catch (error) {
      console.error('选择账号失败:', error)
      ElMessage.error('加载会话列表失败')
    }
  }

  // 选择会话并加载消息
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

  // 加载会话列表
  const loadThreads = async (platform, accountId) => {
    if (isLoadingThreads.value) return
    
    isLoadingThreads.value = true
    
    try {
      const response = await messageApi.getMessageThreads(platform, accountId)
      
      if (response && response.success && response.data) {
        threadsList.value = response.data.threads || []
        console.log(`✅ 加载会话列表成功: ${threadsList.value.length} 个会话`)
      } else {
        console.warn('获取会话列表响应异常:', response)
        threadsList.value = []
      }
      
    } catch (error) {
      console.error('加载会话列表失败:', error)
      threadsList.value = []
      throw error
    } finally {
      isLoadingThreads.value = false
    }
  }

  // 加载消息
  const loadMessages = async (threadId, reset = false) => {
    if (isLoadingMessages.value || (!hasMoreMessages.value && !reset)) return
    
    isLoadingMessages.value = true
    
    try {
      const offset = reset ? 0 : messagesOffset.value
      const response = await messageApi.getThreadMessages(threadId, 50, offset)
      
      if (response && response.success && response.data) {
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
      throw error
    } finally {
      isLoadingMessages.value = false
    }
  }

  // 发送消息
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
      
      if (response && response.success) {
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

  // 标记已读
  const markAsRead = async (threadId, messageIds = null) => {
    try {
      const response = await messageApi.markMessagesAsRead({
        threadId: threadId,
        messageIds: messageIds
      })
      
      if (response && response.success) {
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

  // 刷新未读统计
  const refreshUnreadCounts = async () => {
    try {
      const response = await messageApi.getUnreadCount()
      
      if (response && response.success && response.data) {
        // 这里需要根据实际API响应格式调整
        console.log('✅ 未读统计已刷新')
      }
      
    } catch (error) {
      console.error('刷新未读统计失败:', error)
    }
  }

  // 刷新指定账号的未读统计
  const refreshUnreadCount = async (platform, accountId) => {
    try {
      const response = await messageApi.getUnreadCount(platform, accountId)
      
      if (response && response.success && response.data) {
        const accountKey = `${platform}_${accountId}`
        unreadCounts.value[accountKey] = response.data.unreadCount || 0
      }
      
    } catch (error) {
      console.error('刷新账号未读数失败:', error)
    }
  }

  // 刷新监听状态
  const refreshMonitoringStatus = async () => {
    try {
      const response = await messageApi.getMonitoringStatus()
      
      if (response && response.success && response.data) {
        const statusMap = {}
        
        if (response.data.monitoring) {
          response.data.monitoring.forEach(status => {
            const accountKey = `${status.platform}_${status.accountId}`
            statusMap[accountKey] = status.isMonitoring
          })
        }
        
        monitoringStatus.value = statusMap
        console.log('✅ 监听状态已刷新')
      }
      
    } catch (error) {
      console.error('刷新监听状态失败:', error)
    }
  }

  // 搜索私信
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
      
      if (response && response.success && response.data) {
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

  // 初始化数据
  const initialize = async () => {
    try {
      await Promise.all([
        refreshUnreadCounts(),
        refreshMonitoringStatus()
      ])
      console.log('✅ 消息模块初始化完成')
    } catch (error) {
      console.error('消息模块初始化失败:', error)
    }
  }

  // 清理状态
  const cleanup = () => {
    selectedAccount.value = null
    selectedThread.value = null
    threadsList.value = []
    currentMessages.value = []
    messagesOffset.value = 0
    hasMoreMessages.value = true
  }

  return {
    // 状态
    selectedAccount,
    selectedThread,
    platformAccounts,
    threadsList,
    currentMessages,
    unreadCounts,
    monitoringStatus,
    isLoadingThreads,
    isLoadingMessages,
    isSending,
    messagesOffset,
    hasMoreMessages,
    
    // 计算属性
    totalUnreadCount,
    activeMonitoringCount,
    
    // 方法
    selectAccount,
    selectThread,
    loadThreads,
    loadMessages,
    sendMessage,
    markAsRead,
    refreshUnreadCounts,
    refreshUnreadCount,
    refreshMonitoringStatus,
    searchMessages,
    initialize,
    cleanup
  }
})