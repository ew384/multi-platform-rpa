// src/api/message.js
import { http } from '@/utils/request'

export const messageApi = {
  // 获取未读消息统计
  getUnreadCount(platform = '', accountId = '') {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/unread-count?${params.toString()}`)
  },

  // 获取监听状态
  getMonitoringStatus() {
    return http.get('/api/message-automation/monitoring/status')
  },

  // 获取私信会话列表
  getMessageThreads(platform, accountId) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/threads?${params.toString()}`)
  },

  // 获取会话消息（分页）
  getThreadMessages(threadId, limit = 50, offset = 0) {
    return http.get(`/api/message-automation/threads/${threadId}/messages?limit=${limit}&offset=${offset}`)
  },

  // 发送消息
  sendMessage(data) {
    return http.post('/api/message-automation/send', data)
  },

  // 标记消息已读
  markMessagesAsRead(data) {
    return http.post('/api/message-automation/messages/mark-read', data)
  },

  // 搜索消息
  searchMessages(platform, accountId, keyword, limit = 20) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    if (keyword) params.append('keyword', keyword)
    if (limit) params.append('limit', limit.toString())
    
    return http.get(`/api/message-automation/search?${params.toString()}`)
  },

  // 获取消息统计
  getMessageStatistics() {
    return http.get('/api/message-automation/statistics')
  },

  // 获取引擎状态
  getEngineStatus() {
    return http.get('/api/message-automation/engine/status')
  },

  // 获取支持的平台
  getSupportedPlatforms() {
    return http.get('/api/message-automation/platforms')
  },

  // 启动监听
  startMonitoring(data) {
    return http.post('/api/message-automation/monitoring/start', data)
  },

  // 停止监听
  stopMonitoring(data) {
    return http.post('/api/message-automation/monitoring/stop', data)
  },

  // 批量启动监听
  startBatchMonitoring(data) {
    return http.post('/api/message-automation/monitoring/batch-start', data)
  },

  // 停止所有监听
  stopAllMonitoring() {
    return http.post('/api/message-automation/monitoring/stop-all')
  },
  // 🔥 新增：自动启动监听
  autoStartMonitoring() {
    return http.post('/api/message-automation/monitoring/auto-start')
  }
}