<template>
  <div class="publish-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">发布记录</h1>
          <el-button
            @click="refreshRecords"
            class="refresh-btn"
            :loading="loading"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <div class="header-actions">
          <el-button
            @click="showNewPublishDialog"
            type="primary"
            class="new-publish-btn"
          >
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
          <el-select
            v-model="filters.publisher"
            placeholder="全部发布人"
            @change="applyFilters"
          >
            <el-option label="全部发布人" value="全部发布人" />
            <el-option label="当前账号" value="当前账号" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select
            v-model="filters.contentType"
            placeholder="全部发布类型"
            @change="applyFilters"
          >
            <el-option label="全部发布类型" value="全部发布类型" />
            <el-option label="视频" value="视频" />
            <el-option label="图文" value="图文" />
            <el-option label="文章" value="文章" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select
            v-model="filters.status"
            placeholder="全部推送状态"
            @change="applyFilters"
          >
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
        <div class="custom-empty">
          <div class="empty-text">暂无发布记录</div>
        </div>
      </div>

      <div v-else class="records-grid">
        <div
          v-for="record in records"
          :key="record.id"
          :class="[
            'record-card',
            {
              'batch-delete-mode': batchDeleteMode,
              selected: selectedRecords.includes(record.id),
            },
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
            <!-- 视频预览区域 - 使用封面截图或视频 -->
            <div class="video-preview">
              <VideoPreview
                :videos="record.video_files"
                :cover-screenshots="record.cover_screenshots"
                :mode="isEditing ? 'video' : 'cover'"
                class="record-video-preview"
              />
            </div>

            <!-- 记录信息 -->
            <div class="record-info">
              <div class="record-header">
                <h3 class="record-title">{{ record.title || "未命名任务" }}</h3>
                <el-tag :type="getStatusType(record.status)" size="small">
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
                  <span class="meta-value success">{{
                    record.success_accounts
                  }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">失败:</span>
                  <span class="meta-value failed">{{
                    record.failed_accounts
                  }}</span>
                </div>
              </div>

              <div class="record-footer">
                <div class="time-info">
                  <span class="created-time">{{
                    formatTime(record.created_at)
                  }}</span>
                  <span class="duration"
                    >耗时: {{ record.duration_display }}</span
                  >
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
import { ref, reactive, computed, onMounted } from "vue";
import {
  Plus,
  Refresh,
  Download,
  Delete,
  VideoPlay,
  Loading,
} from "@element-plus/icons-vue";
import { publishApi } from "@/api/publish";
import { ElMessage, ElMessageBox } from "element-plus";
import PublishDetailSidebar from "./components/PublishDetailSidebar.vue";
import NewPublishDialog from "./components/NewPublishDialog.vue";

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
  publisher: "全部发布人",
  contentType: "全部发布类型",
  status: "全部推送状态",
});

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
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

    const data = await publishApi.getPublishRecords({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
      limit: pagination.pageSize,
      offset: (pagination.currentPage - 1) * pagination.pageSize,
    });

    if (data.code === 200) {
      records.value = data.data || [];
      pagination.total = data.total || records.value.length;
    } else {
      console.warn("获取发布记录失败:", data.msg);
      records.value = [];
      pagination.total = 0;
    }
  } catch (error) {
    console.error("获取发布记录失败:", error);
    // 设置空数据
    records.value = [];
    pagination.total = 0;
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

    const result = await publishApi.exportPublishRecords({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
    });

    if (result.code === 200) {
      ElMessage.success("导出成功");
    } else {
      ElMessage.error(result.msg || "导出失败");
    }
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败");
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
    ElMessage.warning("请选择要删除的记录");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条发布记录吗？`,
      "批量删除确认",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    const data = await publishApi.deletePublishRecords(selectedRecords.value);

    if (data.code === 200) {
      ElMessage.success(data.msg || "删除成功");
      cancelBatchDelete();
      await loadRecords();
    } else {
      ElMessage.error(data.msg || "删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("批量删除失败:", error);
      ElMessage.error("删除失败");
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
    pending: "warning",
    success: "success",
    partial: "warning",
    failed: "danger",
  };
  return typeMap[status] || "info";
};

const formatTime = (timeString) => {
  if (!timeString) return "-";
  const date = new Date(timeString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

<!-- PublishRecords.vue 样式部分的修改 -->

<style lang="scss" scoped>
// 🎨 现代化配色方案
$primary: #6366f1; // 深紫色主色调
$primary-dark: #4f46e5; // 深紫色悬停
$primary-light: #a5b4fc; // 浅紫色
$secondary: #64748b; // 次要文字色
$text-primary: #0f172a; // 主文字色
$text-secondary: #475569; // 次要文字色
$text-muted: #94a3b8; // 弱化文字色

$bg-white: #ffffff; // 纯白背景
$border-light: #e2e8f0; // 浅色边框
$border-lighter: #f1f5f9; // 更浅边框

// 🎨 现代化阴影
$shadow-subtle: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-hover: 0 8px 25px -8px rgba(99, 102, 241, 0.25);

// 🎨 现代化圆角
$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

// 基础布局
.publish-records {
  min-height: 100vh;
  background: $bg-white; // 纯白背景
  padding: 32px 40px; // 增加内边距

  // 🎨 页面头部 - 去掉分层设计
  .page-header {
    margin-bottom: 32px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .page-title {
          font-size: 24px; // 🔧 从32px调整为24px，保持字体和谐
          font-weight: 600; // 🔧 调整字重
          color: $text-primary;
          margin: 0;
          letter-spacing: -0.01em; // 🔧 调整字间距
        }

        .refresh-btn {
          background: transparent;
          border: none; // 🔧 去掉边框
          border-radius: $radius-md;
          width: 36px; // 🔧 稍微缩小尺寸
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: rgba(99, 102, 241, 0.08); // 🔧 淡紫色背景
            color: $primary;
            transform: translateY(-1px); // 🔧 轻微上浮
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); // 🔧 3D淡紫色阴影
          }
        }
        &:active {
          transform: translateY(0);
        }
      }

      .header-actions {
        .new-publish-btn {
          background: $primary;
          border: none;
          color: white;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: $radius-lg;
          box-shadow: $shadow-soft;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: $primary-dark;
            transform: translateY(-2px); // 🔧 增加悬浮效果
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3); // 🔧 增强3D阴影
          }

          &:active {
            transform: translateY(-1px);
          }

          .el-icon {
            margin-right: 8px;
          }
        }
      }
    }
  }

  // 🔧 筛选器区域 - 去掉边框和过度效果
  .filters-section {
    background: $bg-white;
    border: none; // 🔧 去掉边框
    border-radius: $radius-lg;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: none; // 🔧 去掉阴影

    .filters-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .filter-group {
        :deep(.el-select) {
          width: 160px;

          .el-input__wrapper {
            background: $bg-white;
            border: 1px solid $border-light;
            border-radius: $radius-md;
            box-shadow: none;
            transition: all 0.2s ease;

            &:hover {
              border-color: $primary;
              box-shadow: none; // 🔧 去掉悬浮阴影
            }

            &.is-focus {
              border-color: $primary;
              box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); // 🔧 只保留focus状态的轻微效果
            }
          }
        }
      }

      .filter-actions {
        margin-left: auto;
        display: flex;
        gap: 12px;

        .el-button {
          border-radius: $radius-md;
          font-weight: 500;
          padding: 8px 16px;
          border: 1px solid $border-light; // 🔧 恢复边框
          background: $bg-white;
          color: $text-secondary;
          box-shadow: none; // 🔧 去掉阴影
          transition: all 0.2s ease;

          &:hover {
            border-color: $primary;
            color: $primary;
            background: rgba(99, 102, 241, 0.05);
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none; // 🔧 去掉按压效果
          }

          &.el-button--danger {
            border-color: #ef4444;
            color: #ef4444;

            &:hover {
              background: rgba(239, 68, 68, 0.05);
              box-shadow: none; // 🔧 去掉红色3D阴影
            }
          }
        }
      }
    }
  }

  // 🔧 页面头部按钮 - 简化效果
  .page-header {
    margin-bottom: 32px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .refresh-btn {
          background: transparent;
          border: none;
          border-radius: $radius-md;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: $text-secondary;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(99, 102, 241, 0.08);
            color: $primary;
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none;
          }
        }
      }

      .header-actions {
        .new-publish-btn {
          background: $primary;
          border: none;
          color: white;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: $radius-lg;
          box-shadow: none; // 🔧 去掉初始阴影
          transition: all 0.2s ease;

          &:hover {
            background: $primary-dark;
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none;
          }

          .el-icon {
            margin-right: 6px;
          }
        }
      }
    }
  }

  // 🎨 记录列表区域
  .records-section {
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 80px 24px;
      color: $text-secondary;

      .is-loading {
        font-size: 32px;
        color: $primary;
        animation: rotate 1s linear infinite;
      }
    }

    .empty-records {
      padding: 80px 24px;
      text-align: center;

      .custom-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;

        .empty-text {
          color: $text-muted;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
      }
    }

    .records-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .record-card {
        background: $bg-white;
        border: 1px solid $border-light;
        border-radius: $radius-lg;
        padding: 24px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;

        &:hover {
          border-color: $primary;
          box-shadow: $shadow-hover;
          transform: translateY(-1px);
        }

        &.batch-delete-mode {
          padding-left: 60px;

          .batch-checkbox {
            position: absolute;
            left: 24px;
            top: 50%;
            transform: translateY(-50%);
          }

          &.selected {
            border-color: #ef4444;
            background: rgba(239, 68, 68, 0.02);
          }
        }

        .record-content {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .video-preview {
          width: 100px;
          height: 60px;
          background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
          border-radius: $radius-md;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;

          .video-icon {
            font-size: 20px;
            margin-bottom: 4px;
          }

          .video-count {
            font-size: 11px;
            font-weight: 500;
            opacity: 0.9;
          }
        }

        .record-info {
          flex: 1;

          .record-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;

            .record-title {
              font-size: 16px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;
              line-height: 1.4;
            }

            :deep(.el-tag) {
              border-radius: $radius-sm;
              font-weight: 500;
              border: none;
            }
          }

          .record-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 12px;

            .meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 14px;

              .meta-label {
                color: $text-secondary;
                font-weight: 500;
              }

              .meta-value {
                color: $text-primary;
                font-weight: 600;

                &.success {
                  color: #10b981;
                }

                &.failed {
                  color: #ef4444;
                }
              }
            }
          }

          .record-footer {
            .time-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              color: $text-muted;

              .created-time {
                font-weight: 500;
              }

              .duration {
                background: $border-lighter;
                padding: 4px 8px;
                border-radius: $radius-sm;
                font-weight: 500;
              }
            }
          }
        }
      }
    }

    // 🎨 分页样式
    .pagination-section {
      margin-top: 32px;
      display: flex;
      justify-content: center;

      :deep(.el-pagination) {
        .el-pager li {
          border-radius: $radius-sm;
          margin: 0 2px;

          &.is-active {
            background: $primary;
            border-color: $primary;
          }
        }

        .btn-prev,
        .btn-next {
          border-radius: $radius-sm;
        }
      }
    }
  }
}

// 🎨 动画效果
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 🎨 响应式设计优化 */
@media (max-width: 768px) {
  .publish-records {
    padding: 16px 20px;

    .page-header .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;

      .header-left {
        justify-content: space-between;

        .page-title {
          font-size: 24px;
        }
      }
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
      padding: 16px;

      .record-content {
        flex-direction: column;
        gap: 12px;
      }

      .video-preview {
        width: 100%;
        height: 80px;
      }
    }
  }
}
</style>
