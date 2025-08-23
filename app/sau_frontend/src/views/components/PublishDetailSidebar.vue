<template>
  <!-- 遮罩层 -->
  <div 
    v-if="visible" 
    class="sidebar-overlay" 
    @click="handleOverlayClick"
  >
    <!-- 侧边栏 -->
    <div 
      class="detail-sidebar" 
      @click.stop
      :class="{ 'slide-in': visible }"
    >
      <!-- 侧边栏头部 -->
      <div class="sidebar-header">
        <h2 class="sidebar-title">发布详情</h2>
        <el-button 
          @click="closeSidebar" 
          size="small" 
          type="text"
          class="close-btn"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <!-- 侧边栏内容 -->
      <div class="sidebar-content" ref="sidebarContentRef">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载详情中...</span>
        </div>

        <!-- 详情内容 -->
        <div v-else-if="recordDetail" class="detail-content">
          <!-- 统计数据卡片 -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.stats.total }}</div>
                <div class="stat-label">任务数</div>
              </div>
              <div class="stat-card failed">
                <div class="stat-value">{{ recordDetail.stats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.duration_display }}</div>
                <div class="stat-label">任务耗时</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.stats.duration_per_account }}秒/个</div>
                <div class="stat-label">均耗时</div>
              </div>
            </div>
          </div>

          <!-- 发布流程展示 -->
          <div class="process-section">
            <div class="section-header">
              <h3>全部发布流程</h3>
              <el-tag 
                :type="getOverallStatusType(recordDetail.status)"
                size="small"
              >
                {{ getOverallStatusText(recordDetail.status) }}
              </el-tag>
            </div>

            <div class="process-list">
              <div
                v-for="accountStatus in recordDetail.account_statuses"
                :key="`${accountStatus.record_id}-${accountStatus.account_name}`"
                class="process-item"
              >
                <!-- 账号信息 -->
                <div class="account-header" @click="toggleAccountExpand(`${accountStatus.record_id}-${accountStatus.account_name}`)">
                  <div class="account-info">
                    <div class="account-name">
                      {{ accountStatus.account_name }}
                      <span class="platform-name">({{ accountStatus.platform }})</span>
                      <el-tag 
                        v-if="isAccountInvalid(accountStatus)"
                        type="danger" 
                        size="small"
                        style="margin-left: 8px;"
                      >
                        账号已失效
                      </el-tag>
                    </div>
                  </div>
                  <div class="account-status">
                    <el-tag 
                      :type="getAccountStatusType(accountStatus.status)"
                      size="small"
                    >
                      {{ getAccountStatusText(accountStatus.status) }}
                    </el-tag>
                    <el-icon class="expand-icon" :class="{ expanded: expandedAccounts.has(`${accountStatus.record_id}-${accountStatus.account_name}`) }">
                      <ArrowRight />
                    </el-icon>
                  </div>
                </div>

                <!-- 流程步骤 -->
                <div 
                  v-show="expandedAccounts.has(`${accountStatus.record_id}-${accountStatus.account_name}`)" 
                  class="process-steps"
                >
                  <div 
                    v-for="step in getProcessSteps(accountStatus)"
                    :key="step.key"
                    :class="[
                      'process-step',
                      {
                        'completed': step.status === 'success',
                        'failed': step.status === 'failed',
                        'pending': step.status === 'pending'
                      }
                    ]"
                  >
                    <div class="step-icon">
                      <el-icon v-if="step.status === 'success'"><Check /></el-icon>
                      <el-icon v-else-if="step.status === 'failed'"><Close /></el-icon>
                      <el-icon v-else><Clock /></el-icon>
                    </div>
                    <div class="step-info">
                      <div class="step-label">{{ step.label }}</div>
                      <div class="step-status">{{ step.statusText }}</div>
                    </div>
                  </div>
                </div>

                <!-- 错误信息 -->
                <div v-if="accountStatus.error_message" class="error-message">
                  <el-alert
                    :title="accountStatus.error_message"
                    type="error"
                    size="small"
                    :closable="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <el-result
            icon="error"
            title="加载失败"
            :sub-title="error"
          >
            <template #extra>
              <el-button @click="loadRecordDetail" type="primary">重试</el-button>
            </template>
          </el-result>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted,nextTick } from 'vue';
import { 
  Close, 
  Loading, 
  Check, 
  Clock,
  ArrowRight
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { publishApi } from '@/api/publish';

const expandedAccounts = ref(new Set()); // 在响应式数据中添加

const toggleAccountExpand = (accountKey) => {
  if (expandedAccounts.value.has(accountKey)) {
    expandedAccounts.value.delete(accountKey);
  } else {
    expandedAccounts.value.add(accountKey);
  }
};


// 🔥 判断账号是否失效（基于错误信息）
const isAccountInvalid = (accountStatus) => {
  return accountStatus.error_message && 
         (accountStatus.error_message.includes('账号已失效') || 
          accountStatus.error_message.includes('请重新登录'));
};
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  recordId: {
    type: Number,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:visible', 'close']);
// 新增：SSE连接管理
const sseConnection = ref(null);
//const refreshInterval = ref(null);
// 响应式数据
const loading = ref(false);
const recordDetail = ref(null);
const error = ref(null);

// 方法定义
const closeSidebar = () => {
  emit('update:visible', false);
  emit('close');
};

const handleOverlayClick = () => {
  closeSidebar();
};
// 保存滚动位置
const scrollPosition = ref(0);
const sidebarContentRef = ref(null);

// 智能更新数据的方法
const updateRecordDetailSmartly = (newData) => {
  if (!recordDetail.value) {
    recordDetail.value = newData;
    return;
  }

  // 保存当前滚动位置
  if (sidebarContentRef.value) {
    scrollPosition.value = sidebarContentRef.value.scrollTop;
  }

  // 只更新变化的字段
  recordDetail.value.status = newData.status;
  recordDetail.value.stats = newData.stats;
  
  // 智能更新账号状态：只更新变化的账号
  newData.account_statuses.forEach(newStatus => {
    const existingIndex = recordDetail.value.account_statuses.findIndex(
      item => item.account_name === newStatus.account_name && 
              item.record_id === newStatus.record_id
    );
    
    if (existingIndex !== -1) {
      // 检查是否真的有变化
      const existing = recordDetail.value.account_statuses[existingIndex];
      if (JSON.stringify(existing) !== JSON.stringify(newStatus)) {
        // 只有真正变化时才更新
        Object.assign(existing, newStatus);
      }
    }
  });

  // 在下一帧恢复滚动位置
  nextTick(() => {
    if (sidebarContentRef.value) {
      sidebarContentRef.value.scrollTop = scrollPosition.value;
    }
  });
};
const loadRecordDetail = async () => {
  if (!props.recordId) return;

  try {
    // 🔥 如果是首次加载，显示loading
    if (!recordDetail.value) {
      loading.value = true;
    }
    
    error.value = null;

    const data = await publishApi.getPublishRecordDetail(props.recordId);

    if (data.code === 200) {
      // 🔥 直接设置详情数据（已包含实时进度）
      recordDetail.value = data.data;
      
      // 🔥 关键：根据状态决定是否需要SSE
      if (data.data.status === 'pending') {
        connectToProgressSSE();
      } else {
        // 完成的任务不需要SSE
        disconnectSSE();
      }
    } else {
      error.value = data.msg || '获取发布详情失败';
      ElMessage.error(error.value);
    }

  } catch (err) {
    console.error('获取发布详情失败:', err);
    error.value = '网络请求失败';
    ElMessage.error('获取发布详情失败');
  } finally {
    loading.value = false;
  }
};

// 🔥 新增：建立SSE连接
const connectToProgressSSE = () => {
  // 先断开现有连接
  disconnectSSE();

  console.log(`📡 建立SSE连接: recordId=${props.recordId}`);

  const eventSource = new EventSource(
    `${import.meta.env.VITE_API_BASE_URL}/api/upload-progress/${props.recordId}`
  );

  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 收到SSE消息:', message.type);
      
      if (message.type === 'initial') {
        // 初始状态（通常不需要处理，因为loadRecordDetail已经获取了最新数据）
        console.log('📨 收到初始进度数据:', message.data.length, '条记录');
      } else if (message.type === 'progress') {
        // 🔥 实时进度更新
        updateSingleProgress(message.data);
      } else if (message.type === 'heartbeat') {
        // 心跳消息，保持连接
        console.log('💓 SSE心跳');
      } else if (message.type === 'server_shutdown') {
        // 服务器关闭
        console.log('🛑 服务器关闭，断开SSE连接');
        disconnectSSE();
      }
    } catch (error) {
      console.error('❌ 解析SSE消息失败:', error, '原始数据:', event.data);
    }
  };

  eventSource.onopen = () => {
    console.log('✅ SSE连接已建立');
  };

  eventSource.onerror = (error) => {
    console.warn('❌ SSE连接错误:', error);
    
    // 🔥 智能重连：只有在任务还在进行中时才重连
    if (recordDetail.value?.status === 'pending') {
      console.log('🔄 3秒后尝试重连SSE...');
      setTimeout(() => {
        if (props.visible && recordDetail.value?.status === 'pending') {
          connectToProgressSSE();
        }
      }, 3000);
    }
  };

  sseConnection.value = eventSource;
};

// 🔥 新增：断开SSE连接
const disconnectSSE = () => {
  if (sseConnection.value) {
    console.log('📡 断开SSE连接');
    sseConnection.value.close();
    sseConnection.value = null;
  }
};

// 🔥 新增：更新单个进度
const updateSingleProgress = (progressData) => {
  if (!recordDetail.value?.account_statuses) return;
  console.log(`🔄 前端收到进度更新:`, {
    accountName: progressData.accountName,
    upload_status: progressData.upload_status,
    push_status: progressData.push_status,
    review_status: progressData.review_status,
    status: progressData.status
  });
  const accountStatus = recordDetail.value.account_statuses.find(
    status => status.account_name === progressData.accountName
  );
  
  if (accountStatus) {
    // 🔥 详细日志：更新前后的状态对比
    console.log(`📝 状态更新前:`, {
      upload_status: accountStatus.upload_status,
      push_status: accountStatus.push_status, 
      review_status: accountStatus.review_status
    });
    // 🔥 保存当前滚动位置（防止页面跳动）
    const scrollTop = sidebarContentRef.value?.scrollTop || 0;
    
    // 更新状态
    Object.assign(accountStatus, {
      status: progressData.status || accountStatus.status,
      upload_status: progressData.upload_status || accountStatus.upload_status,
      push_status: progressData.push_status || accountStatus.push_status,
      review_status: progressData.review_status || accountStatus.review_status,
      error_message: progressData.error_message || accountStatus.error_message
    });
    console.log(`📝 状态更新后:`, {
      upload_status: accountStatus.upload_status,
      push_status: accountStatus.push_status,
      review_status: accountStatus.review_status
    });
    // 🔥 恢复滚动位置
    nextTick(() => {
      if (sidebarContentRef.value) {
        sidebarContentRef.value.scrollTop = scrollTop;
      }
    });
  }

  // 🔥 检查是否所有任务都完成了
  const allCompleted = recordDetail.value.account_statuses.every(
    status => status.status === 'success' || status.status === 'failed'
  );
  
  if (allCompleted) {
    console.log('✅ 所有任务已完成，断开SSE连接');
    disconnectSSE();
    recordDetail.value.status = 'completed';
  }
};

const getOverallStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'uploading': 'warning',
    'success': 'success',
    'partial': 'warning', 
    'failed': 'danger'
  };
  return typeMap[status] || 'info';
};

const getOverallStatusText = (status) => {
  const textMap = {
    'pending': '发布中',
    'uploading': '发布中',
    'success': '发布成功',
    'partial': '部分成功',
    'failed': '发布失败'
  };
  return textMap[status] || status;
};

const getAccountStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'uploading': 'warning',
    'success': 'success',
    'failed': 'danger'
  };
  return typeMap[status] || 'info';
};

const getAccountStatusText = (status) => {
  const textMap = {
    'pending': '等待中',
    'uploading': '上传中',
    'success': '发布成功',
    'failed': '发布失败'
  };
  return textMap[status] || status;
};

const getProcessSteps = (accountStatus) => {
  const steps = [
    {
      key: 'upload',
      label: '上传状态',
      status: getStepStatus(accountStatus.upload_status),
      statusText: accountStatus.upload_status || '待处理'
    },
    {
      key: 'push',
      label: '推送状态', 
      status: getStepStatus(accountStatus.push_status),
      statusText: accountStatus.push_status || '待处理'
    },
    {
      key: 'review',
      label: '审核状态',
      status: getStepStatus(accountStatus.review_status),
      statusText: accountStatus.review_status || '待处理'
    }
  ];

  return steps;
};

const getStepStatus = (statusText) => {
  if (!statusText || statusText === '待处理' || statusText === '待推送' || statusText === '待审核' || statusText === '待开始') {
    return 'pending';
  }
  
  // 🔥 添加账号失效的特殊处理
  if (statusText.includes('账号已失效') || statusText.includes('Cookie已失效')) {
    return 'failed';
  }
  
  if (statusText.includes('成功') || statusText === '发布成功') {
    return 'success';
  }
  if (statusText.includes('失败')) {
    return 'failed';
  }
  // 🔥 处理进行中的状态
  if (statusText.includes('中') || statusText.includes('验证')) {
    return 'pending';
  }
  return 'pending';
};

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.recordId) {
    loadRecordDetail();
  } else if (!newVisible) {
    // 🔥 关闭SSE连接
    disconnectSSE();
  }
});

watch(() => props.recordId, (newRecordId) => {
  if (props.visible && newRecordId) {
    loadRecordDetail();
  }
});
onUnmounted(() => {
  disconnectSSE();
});
</script>

<style lang="scss" scoped>
// 变量定义
$primary: #5b73de;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;

  .detail-sidebar {
    width: 45%;
    max-width: 600px;
    min-width: 400px;
    background: $bg-white;
    box-shadow: $shadow-lg;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s ease;

    &.slide-in {
      transform: translateX(0);
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $space-lg;
      border-bottom: 1px solid $border-light;
      background: $bg-light;

      .sidebar-title {
        font-size: 18px;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }

      .close-btn {
        padding: $space-sm;
        
        &:hover {
          background-color: rgba(239, 68, 68, 0.1);
          color: $danger;
        }
      }
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: $space-lg;

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-md;
        padding: $space-xl;
        color: $text-secondary;

        .is-loading {
          font-size: 32px;
          animation: rotate 1s linear infinite;
        }
      }

      .error-container {
        padding: $space-lg;
      }

      .detail-content {
        // 1. 统计卡片更扁平
        .stats-section {
          margin-bottom: $space-lg;

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px; // 进一步减小间隙

            .stat-card {
              background: $bg-gray;
              border-radius: $radius-sm; // 减小圆角
              padding: 8px 6px; // 进一步缩小内边距
              text-align: center;
              border: 2px solid transparent;
              transition: all 0.3s ease;

              &:hover {
                border-color: $primary;
                transform: translateY(-1px); // 减小悬浮效果
              }

              &.failed {
                .stat-value {
                  color: $danger;
                }
              }

              .stat-value {
                font-size: 14px; // 从18px进一步减小到14px
                font-weight: 600; // 从700减轻到600
                color: $text-primary;
                margin-bottom: 2px; // 进一步减小
                line-height: 1.2;
              }

              .stat-label {
                font-size: 10px; // 从11px减小到10px
                color: $text-secondary;
                font-weight: 500;
                line-height: 1;
              }
            }
          }
        }

        // 2. 全部字体调小
        .process-section {
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: $space-md;
            padding-bottom: $space-xs;
            border-bottom: 1px solid $border-light;

            h3 {
              font-size: 14px; // 从16px减小到14px
              font-weight: 600;
              color: $text-primary;
              margin: 0;
            }

            :deep(.el-tag) {
              font-size: 10px; // 标签字体调小
            }
          }

          .process-list {
            .process-item {
              padding: $space-xs 0; // 进一步减小内边距
              margin-bottom: 0;
              border-bottom: 1px solid $border-light;
              
              &:last-child {
                margin-bottom: 0;
                border-bottom: none;
              }

              .account-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: $space-xs; // 进一步减小
                cursor: pointer;
                padding: $space-xs $space-sm; // 减小内边距
                border-radius: $radius-sm;
                transition: background-color 0.2s ease;

                &:hover {
                  background-color: rgba(0, 0, 0, 0.02);
                }

                .account-info {
                  .account-name {
                    font-size: 12px; // 从14px减小到12px
                    font-weight: 600;
                    color: $text-primary;
                    line-height: 1.3;

                    .platform-name {
                      font-size: 10px; // 从12px减小到10px
                      font-weight: 400;
                      color: $text-secondary;
                      margin-left: $space-xs;
                    }
                  }
                }

                .account-status {
                  display: flex;
                  align-items: center;
                  gap: $space-xs;

                  :deep(.el-tag) {
                    font-size: 9px; // 状态标签字体调小
                    padding: 1px 4px;
                    height: auto;
                  }

                  .expand-icon {
                    font-size: 12px; // 从14px减小到12px
                    color: $text-muted;
                    transition: transform 0.2s ease;

                    &.expanded {
                      transform: rotate(90deg);
                    }
                  }
                }
              }

              .process-steps {
                .process-step {
                  display: flex;
                  align-items: center;
                  gap: $space-sm;
                  padding: $space-xs 0; // 减小内边距
                  border-left: 2px solid $border-light;
                  padding-left: $space-sm;
                  margin-left: 8px; // 减小缩进
                  position: relative;

                  &:not(:last-child) {
                    margin-bottom: $space-xs; // 减小间距
                  }

                  &.completed {
                    border-left-color: $success;
                    
                    .step-icon {
                      background-color: $success;
                      color: white;
                    }
                  }

                  &.failed {
                    border-left-color: $danger;
                    
                    .step-icon {
                      background-color: $danger;
                      color: white;
                    }
                  }

                  &.pending {
                    border-left-color: $warning;
                    
                    .step-icon {
                      background-color: $warning;
                      color: white;
                    }
                  }

                  .step-icon {
                    width: 16px; // 从20px减小到16px
                    height: 16px;
                    border-radius: 50%;
                    background-color: $bg-gray;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px; // 从12px减小到10px
                    position: absolute;
                    left: -9px; // 调整位置
                    box-shadow: $shadow-sm;
                  }

                  .step-info {
                    .step-label {
                      font-size: 11px; // 从13px减小到11px
                      font-weight: 500;
                      color: $text-primary;
                      margin-bottom: 1px;
                      line-height: 1.2;
                    }

                    .step-status {
                      font-size: 10px; // 从12px减小到10px
                      color: $text-secondary;
                      line-height: 1.2;
                    }
                  }
                }
              }

              .error-message {
                margin-top: $space-xs; // 减小间距
                padding-left: $space-md;
                
                :deep(.el-alert) {
                  .el-alert__title {
                    font-size: 10px; // 从12px减小到10px
                    line-height: 1.3;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .sidebar-overlay {
    .detail-sidebar {
      width: 90%;
      min-width: 300px;

      .sidebar-content {
        padding: $space-md;

        .detail-content {
          .stats-section {
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        }
      }
    }
  }
}
</style>