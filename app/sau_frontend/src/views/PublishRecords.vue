<template>
  <div class="publish-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">发布记录</h1>
          <el-button @click="refreshRecords" class="refresh-btn" :loading="loading">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <div class="header-actions">
          <el-button @click="showNewPublishDialog" type="primary" class="new-publish-btn">
            <el-icon><Plus /></el-icon>
            新增发布
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="filter-group">
          <el-select v-model="filters.publisher" placeholder="全部发布人" @change="applyFilters">
            <el-option label="全部发布人" value="全部发布人" />
            <el-option label="当前账号" value="当前账号" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select v-model="filters.contentType" placeholder="全部发布类型" @change="applyFilters">
            <el-option label="全部发布类型" value="全部发布类型" />
            <el-option label="视频" value="视频" />
            <el-option label="图文" value="图文" />
            <el-option label="文章" value="文章" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select v-model="filters.status" placeholder="全部推送状态" @change="applyFilters">
            <el-option label="全部推送状态" value="全部推送状态" />
            <el-option label="发布中" value="发布中" />
            <el-option label="全部发布成功" value="全部发布成功" />
            <el-option label="部分发布成功" value="部分发布成功" />
            <el-option label="全部发布失败" value="全部发布失败" />
          </el-select>
        </div>

        <div class="filter-actions">
          <el-button @click="exportRecords" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出
          </el-button>

          <el-button 
            v-if="!batchDeleteMode" 
            @click="enterBatchDeleteMode"
            :disabled="records.length === 0"
          >
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>

          <template v-else>
            <el-button @click="cancelBatchDelete">取消</el-button>
            <el-button 
              type="danger" 
              @click="confirmBatchDelete"
              :disabled="selectedRecords.length === 0"
            >
              删除 ({{ selectedRecords.length }})
            </el-button>
          </template>
        </div>
      </div>
    </div>

    <!-- 发布记录列表 -->
    <div class="records-section">
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="records.length === 0" class="empty-records">
        <el-empty description="暂无发布记录">
          <el-button type="primary" @click="showNewPublishDialog">
            <el-icon><Plus /></el-icon>
            创建第一个发布任务
          </el-button>
        </el-empty>
      </div>

      <div v-else class="records-grid">
        <div
          v-for="record in records"
          :key="record.id"
          :class="[
            'record-card',
            {
              'batch-delete-mode': batchDeleteMode,
              'selected': selectedRecords.includes(record.id)
            }
          ]"
        >
          <!-- 批量删除复选框 -->
          <div v-if="batchDeleteMode" class="batch-checkbox">
            <el-checkbox 
              :model-value="selectedRecords.includes(record.id)"
              @change="toggleRecordSelection(record.id)"
            />
          </div>

          <!-- 记录卡片内容 -->
          <div class="record-content" @click="showRecordDetail(record)">
            <!-- 视频预览 -->
            <div class="video-preview">
              <el-icon class="video-icon"><VideoPlay /></el-icon>
              <div class="video-count">{{ record.video_files.length }} 个视频</div>
            </div>

            <!-- 记录信息 -->
            <div class="record-info">
              <div class="record-header">
                <h3 class="record-title">{{ record.title || '未命名任务' }}</h3>
                <el-tag 
                  :type="getStatusType(record.status)" 
                  size="small"
                >
                  {{ record.status_display }}
                </el-tag>
              </div>

              <div class="record-meta">
                <div class="meta-item">
                  <span class="meta-label">平台:</span>
                  <span class="meta-value">{{ record.platform_display }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">账号:</span>
                  <span class="meta-value">{{ record.total_accounts }} 个</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">成功:</span>
                  <span class="meta-value success">{{ record.success_accounts }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">失败:</span>
                  <span class="meta-value failed">{{ record.failed_accounts }}</span>
                </div>
              </div>

              <div class="record-footer">
                <div class="time-info">
                  <span class="created-time">{{ formatTime(record.created_at) }}</span>
                  <span class="duration">耗时: {{ record.duration_display }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="records.length > 0" class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 发布详情侧边栏 -->
    <PublishDetailSidebar
      v-model:visible="detailSidebarVisible"
      :record-id="selectedRecordId"
      @close="detailSidebarVisible = false"
    />

    <!-- 新增发布对话框 -->
    <NewPublishDialog
      v-model:visible="newPublishDialogVisible"
      @published="handlePublishSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  Plus, 
  Refresh, 
  Download, 
  Delete, 
  VideoPlay, 
  Loading 
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import PublishDetailSidebar from './components/PublishDetailSidebar.vue';
import NewPublishDialog from './components/NewPublishDialog.vue';

// API配置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
const authHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

// 响应式数据
const loading = ref(false);
const exporting = ref(false);
const records = ref([]);
const batchDeleteMode = ref(false);
const selectedRecords = ref([]);
const detailSidebarVisible = ref(false);
const selectedRecordId = ref(null);
const newPublishDialogVisible = ref(false);

// 筛选器
const filters = reactive({
  publisher: '全部发布人',
  contentType: '全部发布类型',
  status: '全部推送状态'
});

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
});

// 计算属性
const filteredRecords = computed(() => {
  return records.value; // 筛选逻辑在后端处理
});

// 方法定义
const refreshRecords = async () => {
  await loadRecords();
};

const loadRecords = async () => {
  try {
    loading.value = true;
    
    const params = new URLSearchParams({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
      limit: pagination.pageSize.toString(),
      offset: ((pagination.currentPage - 1) * pagination.pageSize).toString()
    });

    const response = await fetch(`${apiBaseUrl}/getPublishRecords?${params}`, {
      headers: authHeaders.value
    });

    const data = await response.json();

    if (data.code === 200) {
      records.value = data.data || [];
      // 这里可以根据实际API返回调整总数计算
      pagination.total = data.total || records.value.length;
    } else {
      ElMessage.error(data.msg || '获取发布记录失败');
    }

  } catch (error) {
    console.error('获取发布记录失败:', error);
    ElMessage.error('获取发布记录失败');
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  pagination.currentPage = 1; // 重置到第一页
  loadRecords();
};

const exportRecords = async () => {
  try {
    exporting.value = true;

    const params = new URLSearchParams({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status
    });

    const response = await fetch(`${apiBaseUrl}/exportPublishRecords?${params}`, {
      headers: authHeaders.value
    });

    if (response.ok) {
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `publish_records_${new Date().getTime()}.csv`;

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      ElMessage.success('导出成功');
    } else {
      const data = await response.json();
      ElMessage.error(data.msg || '导出失败');
    }

  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const enterBatchDeleteMode = () => {
  batchDeleteMode.value = true;
  selectedRecords.value = [];
};

const cancelBatchDelete = () => {
  batchDeleteMode.value = false;
  selectedRecords.value = [];
};

const toggleRecordSelection = (recordId) => {
  const index = selectedRecords.value.indexOf(recordId);
  if (index > -1) {
    selectedRecords.value.splice(index, 1);
  } else {
    selectedRecords.value.push(recordId);
  }
};

const confirmBatchDelete = async () => {
  if (selectedRecords.value.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条发布记录吗？`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await fetch(`${apiBaseUrl}/deletePublishRecords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders.value
      },
      body: JSON.stringify({
        recordIds: selectedRecords.value
      })
    });

    const data = await response.json();

    if (data.code === 200) {
      ElMessage.success(data.msg || '删除成功');
      cancelBatchDelete();
      await loadRecords();
    } else {
      ElMessage.error(data.msg || '删除失败');
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

const showRecordDetail = (record) => {
  if (batchDeleteMode.value) return; // 批量删除模式下不显示详情
  
  selectedRecordId.value = record.id;
  detailSidebarVisible.value = true;
};

const showNewPublishDialog = () => {
  newPublishDialogVisible.value = true;
};

const handlePublishSuccess = () => {
  newPublishDialogVisible.value = false;
  loadRecords(); // 刷新列表
};

const getStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'success': 'success', 
    'partial': 'warning',
    'failed': 'danger'
  };
  return typeMap[status] || 'info';
};

const formatTime = (timeString) => {
  if (!timeString) return '-';
  const date = new Date(timeString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize;
  pagination.currentPage = 1;
  loadRecords();
};

const handleCurrentChange = (newPage) => {
  pagination.currentPage = newPage;
  loadRecords();
};

// 生命周期
onMounted(() => {
  loadRecords();
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

.publish-records {
  max-width: 1200px;
  margin: 0 auto;
  padding: $space-lg;

  // 页面头部
  .page-header {
    margin-bottom: $space-lg;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: $space-md;

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: $text-primary;
          margin: 0;
        }

        .refresh-btn {
          border-radius: $radius-md;
        }
      }

      .header-actions {
        .new-publish-btn {
          padding: 12px 24px;
          font-weight: 600;
          border-radius: $radius-lg;
          box-shadow: $shadow-md;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: $shadow-lg;
          }
        }
      }
    }
  }

  // 筛选器区域
  .filters-section {
    background: $bg-white;
    border-radius: $radius-xl;
    padding: $space-lg;
    margin-bottom: $space-lg;
    box-shadow: $shadow-sm;
    border: 1px solid $border-light;

    .filters-row {
      display: flex;
      align-items: center;
      gap: $space-md;
      flex-wrap: wrap;

      .filter-group {
        :deep(.el-select) {
          width: 180px;
        }
      }

      .filter-actions {
        margin-left: auto;
        display: flex;
        gap: $space-sm;
      }
    }
  }

  // 记录列表区域
  .records-section {
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

    .empty-records {
      padding: $space-xl;
      text-align: center;
    }

    .records-grid {
      display: grid;
      gap: $space-lg;

      .record-card {
        background: $bg-white;
        border-radius: $radius-xl;
        padding: $space-lg;
        box-shadow: $shadow-sm;
        border: 2px solid transparent;
        transition: all 0.3s ease;
        position: relative;
        cursor: pointer;

        &:hover {
          transform: translateY(-2px);
          box-shadow: $shadow-lg;
          border-color: $primary;
        }

        &.batch-delete-mode {
          padding-left: 60px;

          .batch-checkbox {
            position: absolute;
            left: $space-lg;
            top: 50%;
            transform: translateY(-50%);
          }

          &.selected {
            border-color: $danger;
            background-color: rgba(239, 68, 68, 0.05);
          }
        }

        .record-content {
          display: flex;
          gap: $space-lg;
        }

        .video-preview {
          width: 120px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: $radius-lg;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;

          .video-icon {
            font-size: 24px;
            margin-bottom: $space-xs;
          }

          .video-count {
            font-size: 12px;
            font-weight: 500;
          }
        }

        .record-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: $space-sm;

          .record-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

            .record-title {
              font-size: 16px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;
              flex: 1;
              margin-right: $space-md;
            }
          }

          .record-meta {
            display: flex;
            flex-wrap: wrap;
            gap: $space-md;

            .meta-item {
              display: flex;
              align-items: center;
              gap: $space-xs;
              font-size: 14px;

              .meta-label {
                color: $text-secondary;
                font-weight: 500;
              }

              .meta-value {
                color: $text-primary;

                &.success {
                  color: $success;
                  font-weight: 600;
                }

                &.failed {
                  color: $danger;
                  font-weight: 600;
                }
              }
            }
          }

          .record-footer {
            .time-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: $text-muted;

              .created-time {
                font-weight: 500;
              }

              .duration {
                background: $bg-gray;
                padding: 2px 8px;
                border-radius: $radius-sm;
              }
            }
          }
        }
      }
    }

    .pagination-section {
      margin-top: $space-xl;
      display: flex;
      justify-content: center;
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
  .publish-records {
    padding: $space-md;

    .page-header .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: $space-md;
    }

    .filters-section .filters-row {
      flex-direction: column;
      align-items: stretch;

      .filter-group {
        :deep(.el-select) {
          width: 100%;
        }
      }

      .filter-actions {
        margin-left: 0;
        justify-content: stretch;

        > * {
          flex: 1;
        }
      }
    }

    .records-grid .record-card {
      .record-content {
        flex-direction: column;
      }

      .video-preview {
        width: 100%;
        height: 120px;
      }

      .record-meta {
        flex-direction: column;
        gap: $space-xs;
      }

      .record-footer .time-info {
        flex-direction: column;
        align-items: flex-start;
        gap: $space-xs;
      }
    }
  }
}
</style>