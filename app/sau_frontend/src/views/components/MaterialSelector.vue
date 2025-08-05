<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择视频"
    width="80%"
    class="material-selector-dialog"
    :close-on-click-modal="false"
  >
    <div class="material-selector">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载视频中...</span>
      </div>

      <!-- 视频内容 -->
      <div v-else class="videos-content">
        <!-- 标签页切换 -->
        <el-tabs v-model="activeTab" class="video-tabs">
          <!-- 最近上传 -->
          <el-tab-pane label="最近上传" name="recent">
            <div class="tab-content">
              <div v-if="recentVideos.length > 0">
                <div class="videos-header">
                  <h5>最近上传的视频 ({{ recentVideos.length }} 个)</h5>
                  <div class="selection-info">
                    <span v-if="selectedRecentIds.length > 0">
                      已选择 {{ selectedRecentIds.length }} 个视频
                    </span>
                    <el-button
                      v-if="selectedRecentIds.length > 0"
                      size="small"
                      @click="clearRecentSelection"
                    >
                      清空选择
                    </el-button>
                  </div>
                </div>

                <div class="videos-grid">
                  <div
                    v-for="video in recentVideos"
                    :key="`recent_${video.id}`"
                    :class="[
                      'video-item',
                      {
                        selected: selectedRecentIds.includes(video.id),
                      },
                    ]"
                    @click="toggleRecentSelection(video.id)"
                  >
                    <!-- 视频预览 -->
                    <div class="video-preview">
                      <el-icon class="video-icon"><VideoPlay /></el-icon>
                      <div class="video-overlay">
                        <div class="overlay-content">
                          <el-button
                            size="small"
                            @click.stop="previewRecentVideo(video)"
                          >
                            <el-icon><View /></el-icon>
                            预览
                          </el-button>
                        </div>
                      </div>
                      <!-- 选中标记 -->
                      <div
                        v-if="selectedRecentIds.includes(video.id)"
                        class="selected-mark"
                      >
                        <el-icon><Check /></el-icon>
                      </div>
                      <!-- 来源标记 -->
                      <div class="source-badge recent">最近</div>
                    </div>

                    <!-- 视频信息 -->
                    <div class="video-info">
                      <div class="video-name" :title="video.filename">
                        {{ video.filename }}
                      </div>
                      <div class="video-meta">
                        <span class="video-size">{{ video.filesize }} MB</span>
                        <span class="video-date">{{
                          formatDate(video.upload_time)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-videos">
                <el-empty description="暂无最近上传的视频" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 素材库 -->
          <el-tab-pane label="素材库" name="library">
            <div class="tab-content">
              <div v-if="libraryMaterials.length > 0">
                <div class="videos-header">
                  <h5>素材库视频 ({{ libraryMaterials.length }} 个)</h5>
                  <div class="selection-info">
                    <span v-if="selectedLibraryIds.length > 0">
                      已选择 {{ selectedLibraryIds.length }} 个素材
                    </span>
                    <el-button
                      v-if="selectedLibraryIds.length > 0"
                      size="small"
                      @click="clearLibrarySelection"
                    >
                      清空选择
                    </el-button>
                  </div>
                </div>

                <div class="videos-grid">
                  <div
                    v-for="material in libraryMaterials"
                    :key="`library_${material.id}`"
                    :class="[
                      'video-item',
                      {
                        selected: selectedLibraryIds.includes(material.id),
                      },
                    ]"
                    @click="toggleLibrarySelection(material.id)"
                  >
                    <!-- 视频预览 -->
                    <div class="video-preview">
                      <el-icon class="video-icon"><VideoPlay /></el-icon>
                      <div class="video-overlay">
                        <div class="overlay-content">
                          <el-button
                            size="small"
                            @click.stop="previewLibraryMaterial(material)"
                          >
                            <el-icon><View /></el-icon>
                            预览
                          </el-button>
                        </div>
                      </div>
                      <!-- 选中标记 -->
                      <div
                        v-if="selectedLibraryIds.includes(material.id)"
                        class="selected-mark"
                      >
                        <el-icon><Check /></el-icon>
                      </div>
                      <!-- 来源标记 -->
                      <div class="source-badge library">素材库</div>
                    </div>

                    <!-- 视频信息 -->
                    <div class="video-info">
                      <div class="video-name" :title="material.filename">
                        {{ material.filename }}
                      </div>
                      <div class="video-meta">
                        <span class="video-size">{{ material.filesize }} MB</span>
                        <span class="video-date">{{
                          formatDate(material.upload_time)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-videos">
                <el-empty description="暂无素材库视频" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :disabled="getTotalSelectedCount() === 0"
        >
          确认选择 ({{ getTotalSelectedCount() }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  Loading,
  VideoPlay,
  View,
  Check
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:visible', 'selected']);

// API配置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
const authHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

// 响应式数据
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const loading = ref(false);
const activeTab = ref('recent');
const recentVideos = ref([]);
const libraryMaterials = ref([]);
const selectedRecentIds = ref([]);
const selectedLibraryIds = ref([]);

// 计算属性
const getTotalSelectedCount = () => {
  return selectedRecentIds.value.length + selectedLibraryIds.value.length;
};

// 方法定义
const loadAllVideoSources = async () => {
  loading.value = true;
  try {
    // 并行加载两种数据源
    const [recentResponse, libraryResponse] = await Promise.all([
      // 最近上传的视频
      fetch(`${apiBaseUrl}/getRecentUploads`, {
        headers: authHeaders.value
      }).then(res => res.json()),
      // 素材库视频
      fetch(`${apiBaseUrl}/getFiles`, {
        headers: authHeaders.value
      }).then(res => res.json())
    ]);

    // 处理最近上传的视频
    if (recentResponse.code === 200) {
      recentVideos.value = recentResponse.data || [];
      console.log('最近上传的视频:', recentVideos.value);
    } else {
      console.error('获取最近上传视频失败:', recentResponse.msg);
      recentVideos.value = [];
    }

    // 处理素材库视频
    if (libraryResponse.code === 200) {
      libraryMaterials.value = (libraryResponse.data || []).filter(material =>
        isVideoFile(material.filename)
      );
      console.log('素材库视频:', libraryMaterials.value);
    } else {
      console.error('获取素材库视频失败:', libraryResponse.msg);
      libraryMaterials.value = [];
    }

  } catch (error) {
    console.error('获取视频列表出错:', error);
    ElMessage.error('获取视频列表失败');
    recentVideos.value = [];
    libraryMaterials.value = [];
  } finally {
    loading.value = false;
  }
};

const isVideoFile = (filename) => {
  const videoExtensions = [
    '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.3gp'
  ];
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const toggleRecentSelection = (videoId) => {
  const index = selectedRecentIds.value.indexOf(videoId);
  if (index > -1) {
    selectedRecentIds.value.splice(index, 1);
  } else {
    selectedRecentIds.value.push(videoId);
  }
};

const toggleLibrarySelection = (materialId) => {
  const index = selectedLibraryIds.value.indexOf(materialId);
  if (index > -1) {
    selectedLibraryIds.value.splice(index, 1);
  } else {
    selectedLibraryIds.value.push(materialId);
  }
};

const clearRecentSelection = () => {
  selectedRecentIds.value = [];
};

const clearLibrarySelection = () => {
  selectedLibraryIds.value = [];
};

const clearAllSelections = () => {
  selectedRecentIds.value = [];
  selectedLibraryIds.value = [];
};

const previewRecentVideo = (video) => {
  const previewUrl = `${apiBaseUrl}/getFile?filename=${video.file_path}`;
  window.open(previewUrl, '_blank');
};

const previewLibraryMaterial = (material) => {
  const filename = material.file_path ? material.file_path.split('/').pop() : material.filename;
  const previewUrl = `${apiBaseUrl}/getFile?filename=${filename}`;
  window.open(previewUrl, '_blank');
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const handleCancel = () => {
  emit('update:visible', false);
  clearAllSelections();
};

const handleConfirm = () => {
  const selectedVideos = [];

  // 处理最近上传的视频
  const selectedRecentVideos = recentVideos.value.filter(video =>
    selectedRecentIds.value.includes(video.id)
  );

  selectedRecentVideos.forEach(video => {
    selectedVideos.push({
      name: video.filename,
      path: video.file_path,
      url: `${apiBaseUrl}/getFile?filename=${video.file_path}`,
      size: (video.filesize || 0) * 1024 * 1024, // 转换为字节
      type: 'video/mp4',
      id: `recent_${video.id}`,
      source: 'recent'
    });
  });

  // 处理素材库视频
  const selectedLibraryMaterials = libraryMaterials.value.filter(material =>
    selectedLibraryIds.value.includes(material.id)
  );

  selectedLibraryMaterials.forEach(material => {
    const filename = material.file_path ? material.file_path.split('/').pop() : material.filename;
    selectedVideos.push({
      name: material.filename,
      path: material.file_path || material.filename,
      url: `${apiBaseUrl}/getFile?filename=${filename}`,
      size: (material.filesize || 0) * 1024 * 1024, // 转换为字节
      type: 'video/mp4',
      id: `library_${material.id}`,
      source: 'library'
    });
  });

  if (selectedVideos.length === 0) {
    ElMessage.warning('请选择至少一个视频');
    return;
  }

  emit('selected', selectedVideos);
  emit('update:visible', false);
  clearAllSelections();
};

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    clearAllSelections();
    loadAllVideoSources();
  }
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

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

.material-selector-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-xl;
  }

  .material-selector {
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

    .videos-content {
      .video-tabs {
        :deep(.el-tabs__header) {
          margin-bottom: $space-lg;
        }

        :deep(.el-tabs__nav-wrap) {
          background: $bg-gray;
          border-radius: $radius-md;
          padding: $space-xs;
        }

        :deep(.el-tabs__active-bar) {
          display: none;
        }

        :deep(.el-tabs__item) {
          padding: $space-sm $space-lg;
          border-radius: $radius-sm;
          font-weight: 500;
          transition: all 0.3s ease;

          &.is-active {
            background: white;
            color: $primary;
            box-shadow: $shadow-sm;
          }
        }
      }

      .tab-content {
        .videos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: $space-lg;

          h5 {
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
            margin: 0;
          }

          .selection-info {
            display: flex;
            align-items: center;
            gap: $space-md;
            font-size: 14px;
            color: $text-secondary;
          }
        }

        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: $space-md;
          max-height: 400px;
          overflow-y: auto;

          .video-item {
            background: $bg-gray;
            border: 2px solid transparent;
            border-radius: $radius-lg;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
              transform: translateY(-2px);
              box-shadow: $shadow-md;

              .video-overlay {
                opacity: 1;
              }
            }

            &.selected {
              border-color: $primary;
              box-shadow: 0 0 0 2px rgba(91, 115, 222, 0.2);
            }

            .video-preview {
              height: 120px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;

              .video-icon {
                font-size: 32px;
                color: white;
              }

              .video-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;

                .overlay-content {
                  display: flex;
                  gap: $space-sm;
                }
              }

              .selected-mark {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                background-color: $primary;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                box-shadow: $shadow-md;
              }

              .source-badge {
                position: absolute;
                top: 8px;
                left: 8px;
                padding: 2px 8px;
                border-radius: $radius-sm;
                font-size: 11px;
                font-weight: 500;
                color: white;

                &.recent {
                  background-color: $warning;
                }

                &.library {
                  background-color: $success;
                }
              }
            }

            .video-info {
              padding: $space-md;

              .video-name {
                font-weight: 500;
                color: $text-primary;
                margin-bottom: $space-xs;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 14px;
              }

              .video-meta {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: $text-secondary;

                .video-size {
                  font-weight: 500;
                }
              }
            }
          }
        }

        .empty-videos {
          padding: $space-xl;
          text-align: center;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;
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
  .material-selector-dialog {
    .material-selector {
      .videos-content {
        .tab-content {
          .videos-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            max-height: 300px;
          }
        }
      }
    }
  }
}
</style>