// src/api/message.js - 极简化版本

import { http } from '@/utils/request'

export const messageApi = {
  // ====================  核心API  ====================
  
  /**
   * 系统初始化（页面加载时自动调用）
   * 自动发现账号 + 验证 + 同步 + 启动监听
   */
  async initializeMonitoring() {
    try {
      console.log('🚀 开始初始化消息服务...');
      
      // 调用后端的自动发现模式
      const result = await http.post('/api/message-automation/monitoring/batch-start', {
        // 不传accounts，触发自动发现模式
        withSync: true,
        syncOptions: {
          intelligentSync: true,
          forceSync: false,
          timeout: 30000
        }
      });

      if (result?.success && result.data) {
        const { summary } = result.data;
        console.log(`✅ 初始化完成: 监听${summary.monitoringSuccess}个账号`);
        
        return {
          success: true,
          summary: {
            totalAccounts: summary.totalAccounts,
            monitoringStarted: summary.monitoringSuccess,
            validationFailed: summary.validationFailed,
            syncedMessages: summary.recoveredMessages
          }
        };
      }

      return { success: false, error: '初始化失败' };
      
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      return { 
        success: false, 
        error: error.message || '网络错误' 
      };
    }
  },

  /**
   * 🔥 系统重新连接（仅在异常时自动调用）
   */
  async reconnectMonitoring() {
    try {
      console.log('🔄 开始重新连接...');
      
      // 先停止所有监听
      await http.post('/api/message-automation/monitoring/stop-all');
      
      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新启动（跳过同步，快速重连）
      const result = await http.post('/api/message-automation/monitoring/batch-start', {
        withSync: false  // 重连时跳过同步，更快
      });
      
      console.log('✅ 重新连接完成');
      return result;
      
    } catch (error) {
      console.error('❌ 重新连接失败:', error);
      throw error;
    }
  },

  // ==================== 🔥 数据查询API - 核心功能 ====================

  /**
   * 获取消息会话列表
   */
  getMessageThreads(platform, accountId) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/threads?${params.toString()}`)
  },

  /**
   * 获取会话消息（分页）
   */
  getThreadMessages(threadId, limit = 50, offset = 0) {
    return http.get(`/api/message-automation/threads/${threadId}/messages?limit=${limit}&offset=${offset}`)
  },

  /**
   * 发送消息
   */
  sendMessage(data) {
    return http.post('/api/message-automation/send', data)
  },

  /**
   * 标记消息已读
   */
  markMessagesAsRead(data) {
    return http.post('/api/message-automation/messages/mark-read', data)
  },

  /**
   * 搜索消息
   */
  searchMessages(platform, accountId, keyword, limit = 20) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    if (keyword) params.append('keyword', keyword)
    if (limit) params.append('limit', limit.toString())
    
    return http.get(`/api/message-automation/search?${params.toString()}`)
  },

  // ==================== 🔥 状态查询API - 系统监控用 ====================

  /**
   * 获取监听状态（用于状态指示器）
   */
  getMonitoringStatus() {
    return http.get('/api/message-automation/monitoring/status')
  },

  /**
   * 获取未读消息统计
   */
  getUnreadCount(platform = '', accountId = '') {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/unread-count?${params.toString()}`)
  },

  /**
   * 获取可用账号信息
   */
  getAvailableAccounts() {
    return http.get('/api/message-automation/accounts')
  },

  /**
   * 获取消息统计信息
   */
  getMessageStatistics() {
    return http.get('/api/message-automation/statistics')
  },

  /**
   * 获取系统引擎状态
   */
  getEngineStatus() {
    return http.get('/api/message-automation/engine/status')
  },

  // ==================== 🔥 内部辅助方法（仅供系统使用） ====================

  /**
   * 🔥 内部方法：停止所有监听（仅供reconnect使用）
   */
  async _stopAllMonitoring() {
    return http.post('/api/message-automation/monitoring/stop-all')
  },

  /**
   * 🔥 内部方法：检查连接状态（仅供系统监控使用）
   */
  async _checkSystemHealth() {
    try {
      const [statusResult, engineResult] = await Promise.all([
        this.getMonitoringStatus(),
        this.getEngineStatus()
      ]);
      
      if (statusResult.success && engineResult.success) {
        const monitoring = statusResult.data.monitoring || [];
        const activeCount = monitoring.filter(m => m.isMonitoring).length;
        
        return {
          success: true,
          status: activeCount > 0 ? 'healthy' : 'inactive',
          activeCount,
          totalCount: monitoring.length
        };
      }
      
      return { success: false, status: 'error' };
    } catch (error) {
      return { success: false, status: 'error', error: error.message };
    }
  }
}

// ==================== 🔥 导出 ====================
export default messageApi
