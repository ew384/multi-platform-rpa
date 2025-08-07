<template>
  <el-dialog
    v-model="dialogVisible"
    title="剪切封面"
    width="680px"
    :close-on-click-modal="false"
    class="video-frame-capture-dialog"
  >
    <div class="capture-content">
      <!-- 视频播放器 -->
      <div class="video-player-section">
        <div class="video-container">
          <video
            ref="videoElement"
            :src="videoUrl"
            @loadedmetadata="handleVideoLoaded"
            @timeupdate="handleTimeUpdate"
            @error="handleVideoError"
          >
            您的浏览器不支持视频播放
          </video>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="video-loading">
            <el-icon class="rotating"><Loading /></el-icon>
            <span>视频加载中...</span>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="video-error">
            <el-icon><VideoCamera /></el-icon>
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- 进度控制 -->
        <div class="progress-controls">
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>
          
          <div class="progress-bar-container">
            <el-slider
              v-model="currentTime"
              :max="duration"
              :step="0.1"
              :show-tooltip="false"
              @input="handleSeek"
              class="progress-slider"
            />
          </div>

          <div class="playback-controls">
            <el-button size="small" @click="seekBackward">
              <el-icon><DArrowLeft /></el-icon>
              -1s
            </el-button>
            <el-button size="small" @click="togglePlay">
              <el-icon v-if="playing"><VideoPause /></el-icon>
              <el-icon v-else><VideoPlay /></el-icon>
            </el-button>
            <el-button size="small" @click="seekForward">
              +1s
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-section">
        <div class="preview-title">封面预览</div>
        <div class="preview-container">
          <canvas
            ref="previewCanvas"
            class="preview-canvas"
            :width="previewWidth"
            :height="previewHeight"
          ></canvas>
        </div>
        
        <div class="preview-info">
          <div class="info-item">
            <span class="label">时间点:</span>
            <span class="value">{{ formatTime(currentTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">尺寸:</span>
            <span class="value">{{ previewWidth }} × {{ previewHeight }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleCapture" :disabled="!canCapture">
          确认选择
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import {
  Loading,
  VideoCamera,
  DArrowLeft,
  DArrowRight,
  VideoPause,
  VideoPlay
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  videoUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:visible', 'captured']);

// 响应式数据
const videoElement = ref(null);
const previewCanvas = ref(null);
const loading = ref(false);
const error = ref('');
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const previewWidth = ref(640);
const previewHeight = ref(360);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const canCapture = computed(() => {
  return !loading.value && !error.value && duration.value > 0;
});

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.videoUrl) {
    await loadVideo();
  }
});

watch(() => props.videoUrl, async (newUrl) => {
  if (newUrl && props.visible) {
    await loadVideo();
  }
});

// 方法
const loadVideo = async () => {
  if (!props.videoUrl || !videoElement.value) return;

  loading.value = true;
  error.value = '';
  currentTime.value = 0;
  duration.value = 0;
  playing.value = false;

  try {
    await nextTick();
    
    const video = videoElement.value;
    video.currentTime = 0;
    
    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('视频加载失败'));
      };
      
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      
      if (video.readyState >= 1) {
        onLoaded();
      }
    });

  } catch (err) {
    error.value = err.message || '视频加载失败';
    console.error('视频加载失败:', err);
  } finally {
    loading.value = false;
  }
};

const handleVideoLoaded = () => {
  const video = videoElement.value;
  if (!video) return;

  duration.value = video.duration;
  currentTime.value = 0;
  
  // 设置预览尺寸
  const aspectRatio = video.videoWidth / video.videoHeight;
  if (aspectRatio > 1) {
    // 横向视频
    previewWidth.value = 320;
    previewHeight.value = Math.round(320 / aspectRatio);
  } else {
    // 纵向视频
    previewHeight.value = 320;
    previewWidth.value = Math.round(320 * aspectRatio);
  }

  // 初始预览
  updatePreview();
};

const handleTimeUpdate = () => {
  if (videoElement.value && playing.value) {
    currentTime.value = videoElement.value.currentTime;
    updatePreview();
  }
};

const handleSeek = (time) => {
  if (videoElement.value) {
    videoElement.value.currentTime = time;
    currentTime.value = time;
    updatePreview();
  }
};

const togglePlay = () => {
  const video = videoElement.value;
  if (!video) return;

  if (playing.value) {
    video.pause();
    playing.value = false;
  } else {
    video.play();
    playing.value = true;
  }
};

const seekBackward = () => {
  const newTime = Math.max(0, currentTime.value - 1);
  handleSeek(newTime);
};

const seekForward = () => {
  const newTime = Math.min(duration.value, currentTime.value + 1);
  handleSeek(newTime);
};

const updatePreview = async () => {
  await nextTick();
  
  const video = videoElement.value;
  const canvas = previewCanvas.value;
  
  if (!video || !canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, previewWidth.value, previewHeight.value);
};

const handleCapture = () => {
  const canvas = previewCanvas.value;
  if (!canvas) {
    ElMessage.error('预览画布未准备好');
    return;
  }

  try {
    // 获取高质量截图
    const dataURL = canvas.toDataURL('image/jpeg', 1.0);
    emit('captured', dataURL);
    dialogVisible.value = false;
    ElMessage.success('封面截取成功');
  } catch (err) {
    console.error('截取失败:', err);
    ElMessage.error('截取失败，请重试');
  }
};

const handleCancel = () => {
  // 停止播放
  if (videoElement.value && playing.value) {
    videoElement.value.pause();
    playing.value = false;
  }
  
  dialogVisible.value = false;
};

const handleVideoError = (event) => {
  error.value = '视频播放出错';
  console.error('视频播放错误:', event);
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$success: #10b981;
$danger: #ef4444;
$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-gray: #f1f5f9;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #e2e8f0;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.video-frame-capture-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.el-dialog__body) {
    padding: $space-lg;
  }

  .capture-content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: $space-lg;
    min-height: 400px;

    .video-player-section {
      .video-container {
        position: relative;
        background: #000;
        border-radius: $radius-md;
        overflow: hidden;
        aspect-ratio: 16 / 9;
        margin-bottom: $space-md;

        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .video-loading,
        .video-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: $space-sm;
          color: white;

          .el-icon {
            font-size: 32px;
            
            &.rotating {
              animation: rotate 2s linear infinite;
            }
          }

          span {
            font-size: 14px;
          }
        }

        .video-error {
          color: $danger;
        }
      }

      .progress-controls {
        .time-display {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          color: $text-primary;
          margin-bottom: $space-sm;
        }

        .progress-bar-container {
          margin-bottom: $space-md;

          .progress-slider {
            :deep(.el-slider__runway) {
              height: 6px;
              background-color: $bg-gray;
            }

            :deep(.el-slider__bar) {
              background-color: $primary;
            }

            :deep(.el-slider__button) {
              width: 16px;
              height: 16px;
              border: 2px solid $primary;
            }
          }
        }

        .playback-controls {
          display: flex;
          justify-content: center;
          gap: $space-sm;

          .el-button {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      }
    }

    .preview-section {
      .preview-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: $space-md;
      }

      .preview-container {
        border: 1px solid $border-light;
        border-radius: $radius-md;
        padding: $space-md;
        background: $bg-light;
        margin-bottom: $space-md;
        display: flex;
        justify-content: center;

        .preview-canvas {
          border-radius: $radius-md;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }

      .preview-info {
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          
          &:not(:last-child) {
            border-bottom: 1px solid $border-light;
            margin-bottom: 4px;
            padding-bottom: 8px;
          }

          .label {
            font-size: 13px;
            color: $text-secondary;
          }

          .value {
            font-size: 13px;
            color: $text-primary;
            font-weight: 500;
          }
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .video-frame-capture-dialog {
    .capture-content {
      grid-template-columns: 1fr;
      
      .preview-section {
        order: -1;
        
        .preview-container {
          .preview-canvas {
            max-width: 100%;
            height: auto;
          }
        }
      }
    }
  }
}
</style>