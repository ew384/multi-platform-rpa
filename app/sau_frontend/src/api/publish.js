import { http } from '@/utils/request'

// 发布记录管理API
export const publishApi = {
  // 获取发布记录列表
  getPublishRecords(params = {}) {
    return http.get('/getPublishRecords', { params })
  },

  // 获取发布记录详情
  getPublishRecordDetail(id) {
    return http.get('/getPublishRecordDetail', { params: { id } })
  },

  // 批量删除发布记录
  deletePublishRecords(recordIds) {
    return http.post('/deletePublishRecords', { recordIds })
  },

  // 导出发布记录
  exportPublishRecords(params = {}) {
    // 使用新的download方法，自动处理文件下载
    return http.download('/exportPublishRecords', params, 'publish_records.csv')
  },

  // 获取发布记录统计信息
  getPublishRecordStats() {
    return http.get('/getPublishRecordStats')
  },

  // 发布视频（新增发布）
  publishVideo(data) {
    return http.post('/postVideo', data)
  },

  // 批量发布视频
  publishVideoBatch(dataList) {
    return http.post('/postVideoBatch', dataList)
  },

  // 获取最近上传的视频文件
  getRecentUploads() {
    return http.get('/getRecentUploads')
  }
}