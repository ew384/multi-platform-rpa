import { http } from '@/utils/request'

// 账号管理相关API
export const accountApi = {
  // 🔥 恢复使用http封装
  getValidAccounts(forceCheck = false) {
    const params = forceCheck ? '?force=true' : '';
    console.log('🔍 发起请求:', `/getValidAccounts${params}`);
    return http.get(`/getValidAccounts${params}`);
  },

  // 其他方法保持不变
  getAccountsWithGroups(forceCheck = false) {
    const params = forceCheck ? '?force=true' : '';
    return http.get(`/getAccountsWithGroups${params}`)
  },

  getGroups() {
    return http.get('/getGroups')
  },

  createGroup(data) {
    return http.post('/createGroup', data)
  },

  updateGroup(data) {
    return http.post('/updateGroup', data)
  },

  deleteGroup(id) {
    return http.get(`/deleteGroup?id=${id}`)
  },

  updateAccountGroup(data) {
    return http.post('/updateAccountGroup', data)
  },

  addAccount(data) {
    return http.post('/account', data)
  },

  updateAccount(data) {
    return http.post('/updateUserinfo', data)
  },

  deleteAccount(id) {
    return http.get(`/deleteAccount?id=${id}`)
  }
}