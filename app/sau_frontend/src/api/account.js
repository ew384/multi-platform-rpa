import { http } from '@/utils/request'

// 账号管理相关API
export const accountApi = {
  // 原有API保持不变
  getValidAccounts(forceCheck = false) {
    const params = forceCheck ? '?force=true' : '';
    const url = `/getValidAccounts${params}`;
    console.log('🔍 发起请求:', url);
    console.log('🔍 baseURL:', import.meta.env.VITE_API_BASE_URL);
  },

  // 新增：获取带分组信息的账号列表
  getAccountsWithGroups(forceCheck = false) {
    const params = forceCheck ? '?force=true' : '';
    return http.get(`/getAccountsWithGroups${params}`)
  },

  // 新增：分组相关API
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

  // 原有API保持不变
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