import axios from 'axios'
import { ElMessage } from 'element-plus'
// 在 src/utils/request.js 第一行添加
console.log('🔍 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔍 实际baseURL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3409');
// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3409',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response
    console.log('✅ HTTP响应成功:', response.config.url);
    console.log('✅ 响应数据:', data);

    // 🔥 修复：明确的条件判断
    if (data && data.code === 200) {
      console.log('✅ 业务处理成功，返回数据');
      return data;  // 返回完整的响应数据 {code: 200, msg: "success", data: [...]}
    }

    if (data && data.success === true) {
      console.log('✅ success标识成功，返回数据');
      return data;
    }

    // 业务错误
    console.error('❌ 业务错误:', data);
    const errorMsg = data?.msg || data?.message || '请求失败';
    ElMessage.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
  (error) => {
    console.error('❌ HTTP请求失败:', error);
    console.error('❌ 请求URL:', error.config?.url);
    console.error('❌ 响应状态:', error.response?.status);
    console.error('❌ 响应数据:', error.response?.data);

    // 处理HTTP错误状态码
    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error('网络错误')
      }
    } else {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)
// 封装常用的请求方法
export const http = {
  get(url, params) {
    return request.get(url, { params })
  },

  post(url, data, config = {}) {
    return request.post(url, data, config)
  },

  put(url, data, config = {}) {
    return request.put(url, data, config)
  },

  delete(url, params) {
    return request.delete(url, { params })
  },

  upload(url, formData) {
    return request.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

export default request