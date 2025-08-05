<template>
  <el-dialog
    v-model="dialogVisible"
    title="剪裁封面"
    width="720px"
    :close-on-click-modal="false"
    class="cover-cropper-dialog"
  >
    <div class="cropper-content">
      <!-- 图片预览区域 -->
      <div class="image-section">
        <div class="image-container">
          <img
            ref="imageElement"
            :src="imageUrl"
            @load="handleImageLoad"
            @error="handleImageError"
          />
          
          <!-- 裁剪框覆盖层 -->
          <div
            v-if="showCropBox"
            class="crop-overlay"
            :style="cropOverlayStyle"
          >
            <div class="crop-box" :style="cropBoxStyle">
              <!-- 裁剪框边框 -->
              <div class="crop-border"></div>
              <!-- 网格线 -->
              <div class="crop-grid">
                <div class="grid-line grid-line-v"></div>
                <div class="grid-line grid-line-v"></div>
                <div class="grid-line grid-line-h"></div>
                <div class="grid-line grid-line-h"></div>
              </div>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="image-loading">
            <el-icon class="rotating"><Loading /></el-icon>
            <span>图片加载中...</span>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="image-error">
            <el-icon><Picture /></el-icon>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="controls-section">
        <div class="aspect-ratios">
          <div class="section-title">裁剪比例</div>
          <div class="ratio-buttons">
            <el-button
              v-for="ratio in aspectRatios"
              :key="ratio.key"
              :type="selectedRatio === ratio.key ? 'primary' : 'default'"
              size="small"
              @click="selectRatio(ratio.key)"
            >
              {{ ratio.label }}
            </el-button>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="preview-section">
          <div class="section-title">裁剪预览</div>
          <div class="preview-container">
            <canvas
              ref="previewCanvas"
              class="preview-canvas"
              :width="previewSize.width"
              :height="previewSize.height"
            ></canvas>
          </div>
          
          <div class="preview-info">
            <div class="info-row">
              <span class="label">尺寸:</span>
              <span class="value">{{ previewSize.width }} × {{ previewSize.height }}</span>
            </div>
            <div class="info-row">
              <span class="label">比例:</span>
              <span class="value">{{ getCurrentRatioLabel() }}</span>
            </div>
          </div>
        </div>

        <!-- 调整控制 -->
        <div class="adjustment-section">
          <div class="section-title">位置调整</div>
          <div class="adjustment-controls">
            <div class="control-group">
              <label class="control-label">X 位置</label>
              <el-slider
                v-model="cropPosition.x"
                :min="0"
                :max="maxPosition.x"
                :step="1"
                size="small"
                @input="updateCropPreview"
              />
            </div>
            <div class="control-group">
              <label class="control-label">Y 位置</label>
              <el-slider
                v-model="cropPosition.y"
                :min="0"
                :max="maxPosition.y"
                :step="1"
                size="small"
                @input="updateCropPreview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleCrop" :disabled="!canCrop">
          确认裁剪
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, reactive, nextTick } from 'vue';
import { Loading, Picture } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:visible', 'cropped']);

// 响应式数据
const imageElement = ref(null);
const previewCanvas = ref(null);
const loading = ref(false);
const error = ref('');
const showCropBox = ref(false);
const selectedRatio = ref('original');

// 图片信息
const imageInfo = reactive({
  naturalWidth: 0,
  naturalHeight: 0,
  displayWidth: 0,
  displayHeight: 0,
  scale: 1
});

// 裁剪位置
const cropPosition = reactive({
  x: 0,
  y: 0
});

// 长宽比选项
const aspectRatios = [
  { key: 'original', label: '原始比例', ratio: null },
  { key: '3:2', label: '3:2', ratio: 3/2 },
  { key: '16:9', label: '16:9', ratio: 16/9 },
  { key: '4:3', label: '4:3', ratio: 4/3 },
  { key: '1:1', label: '1:1', ratio: 1 }
];

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const canCrop = computed(() => {
  return !loading.value && !error.value && showCropBox.value;
});

const currentRatio = computed(() => {
  const ratio = aspectRatios.find(r => r.key === selectedRatio.value);
  return ratio?.ratio;
});

const cropDimensions = computed(() => {
  if (!imageInfo.displayWidth || !imageInfo.displayHeight) {
    return { width: 0, height: 0 };
  }

  const ratio = currentRatio.value;
  
  if (!ratio) {
    // 原始比例
    return {
      width: imageInfo.displayWidth,
      height: imageInfo.displayHeight
    };
  }

  // 计算适合的尺寸
  const containerRatio = imageInfo.displayWidth / imageInfo.displayHeight;
  
  if (ratio > containerRatio) {
    // 宽度受限
    return {
      width: imageInfo.displayWidth,
      height: Math.round(imageInfo.displayWidth / ratio)
    };
  } else {
    // 高度受限
    return {
      width: Math.round(imageInfo.displayHeight * ratio),
      height: imageInfo.displayHeight
    };
  }
});

const maxPosition = computed(() => ({
  x: Math.max(0, imageInfo.displayWidth - cropDimensions.value.width),
  y: Math.max(0, imageInfo.displayHeight - cropDimensions.value.height)
}));

const cropOverlayStyle = computed(() => ({
  width: `${imageInfo.displayWidth}px`,
  height: `${imageInfo.displayHeight}px`
}));

const cropBoxStyle = computed(() => ({
  left: `${cropPosition.x}px`,
  top: `${cropPosition.y}px`,
  width: `${cropDimensions.value.width}px`,
  height: `${cropDimensions.value.height}px`
}));

const previewSize = computed(() => {
  const maxSize = 200;
  const { width, height } = cropDimensions.value;
  
  if (!width || !height) return { width: 0, height: 0 };
  
  const ratio = width / height;
  
  if (width > height) {
    return {
      width: maxSize,
      height: Math.round(maxSize / ratio)
    };
  } else {
    return {
      width: Math.round(maxSize * ratio),
      height: maxSize
    };
  }
});

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.imageUrl) {
    await loadImage();
  }
});

watch(() => props.imageUrl, async (newUrl) => {
  if (newUrl && props.visible) {
    await loadImage();
  }
});

watch(selectedRatio, () => {
  resetCropPosition();
  updateCropPreview();
});

// 方法
const loadImage = async () => {
  if (!props.imageUrl) return;

  loading.value = true;
  error.value = '';
  showCropBox.value = false;

  try {
    await nextTick();
    
    const img = imageElement.value;
    if (!img) return;

    await new Promise((resolve, reject) => {
      const onLoad = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        reject(new Error('图片加载失败'));
      };
      
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      
      if (img.complete) {
        onLoad();
      }
    });

  } catch (err) {
    error.value = err.message || '图片加载失败';
    console.error('图片加载失败:', err);
  } finally {
    loading.value = false;
  }
};

const handleImageLoad = () => {
  const img = imageElement.value;
  if (!img) return;

  // 获取图片信息
  imageInfo.naturalWidth = img.naturalWidth;
  imageInfo.naturalHeight = img.naturalHeight;
  imageInfo.displayWidth = img.offsetWidth;
  imageInfo.displayHeight = img.offsetHeight;
  imageInfo.scale = imageInfo.naturalWidth / imageInfo.displayWidth;

  // 重置裁剪设置
  selectedRatio.value = 'original';
  resetCropPosition();
  showCropBox.value = true;
  
  // 更新预览
  nextTick(() => {
    updateCropPreview();
  });
};

const handleImageError = () => {
  error.value = '图片加载失败';
};

const selectRatio = (ratioKey) => {
  selectedRatio.value = ratioKey;
};

const resetCropPosition = () => {
  cropPosition.x = Math.round(maxPosition.value.x / 2);
  cropPosition.y = Math.round(maxPosition.value.y / 2);
};

const updateCropPreview = async () => {
  await nextTick();
  
  const canvas = previewCanvas.value;
  const img = imageElement.value;
  
  if (!canvas || !img || !showCropBox.value) return;

  const ctx = canvas.getContext('2d');
  
  // 计算实际裁剪区域（相对于原始图片）
  const scale = imageInfo.scale;
  const sourceX = cropPosition.x * scale;
  const sourceY = cropPosition.y * scale;
  const sourceWidth = cropDimensions.value.width * scale;
  const sourceHeight = cropDimensions.value.height * scale;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制裁剪后的图片
  ctx.drawImage(
    img,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, canvas.width, canvas.height
  );
};

const handleCrop = async () => {
  const canvas = previewCanvas.value;
  if (!canvas) {
    ElMessage.error('预览画布未准备好');
    return;
  }

  try {
    // 创建高质量输出画布
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    
    // 计算实际输出尺寸
    const scale = imageInfo.scale;
    const outputWidth = cropDimensions.value.width * scale;
    const outputHeight = cropDimensions.value.height * scale;
    
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    
    // 计算裁剪区域
    const sourceX = cropPosition.x * scale;
    const sourceY = cropPosition.y * scale;
    
    // 绘制高质量裁剪图片
    outputCtx.drawImage(
      imageElement.value,
      sourceX, sourceY, outputWidth, outputHeight,
      0, 0, outputWidth, outputHeight
    );

    // 转换为数据URL
    const dataURL = outputCanvas.toDataURL('image/jpeg', 0.9);
    
    emit('cropped', dataURL);
    dialogVisible.value = false;
    ElMessage.success('封面裁剪完成');
    
  } catch (err) {
    console.error('裁剪失败:', err);
    ElMessage.error('裁剪失败，请重试');
  }
};

const handleReset = () => {
  selectedRatio.value = 'original';
  resetCropPosition();
  updateCropPreview();
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const getCurrentRatioLabel = () => {
  const ratio = aspectRatios.find(r => r.key === selectedRatio.value);
  return ratio?.label || '未知';
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
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.cover-cropper-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.el-dialog__body) {
    padding: $space-lg;
  }

  .cropper-content {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: $space-lg;
    min-height: 400px;

    .image-section {
      .image-container {
        position: relative;
        border: 1px solid $border-light;
        border-radius: $radius-md;
        overflow: hidden;
        background: $bg-light;
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          max-width: 100%;
          max-height: 400px;
          object-fit: contain;
        }

        .crop-overlay {
          position: absolute;
          top: 0;
          left: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .crop-box {
          position: absolute;
          border: 2px solid $primary;
          box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5);

          .crop-border {
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border: 2px solid $primary;
            pointer-events: none;
          }

          .crop-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.3;

            .grid-line {
              position: absolute;
              background: white;

              &.grid-line-v {
                width: 1px;
                height: 100%;
                
                &:nth-child(1) { left: 33.33%; }
                &:nth-child(2) { left: 66.66%; }
              }

              &.grid-line-h {
                width: 100%;
                height: 1px;
                
                &:nth-child(3) { top: 33.33%; }
                &:nth-child(4) { top: 66.66%; }
              }
            }
          }
        }

        .image-loading,
        .image-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: $space-sm;
          color: $text-muted;

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

        .image-error {
          color: $danger;
        }
      }
    }

    .controls-section {
      display: flex;
      flex-direction: column;
      gap: $space-lg;

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: $space-sm;
      }

      .aspect-ratios {
        .ratio-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: $space-xs;

          .el-button {
            flex: 1;
            min-width: auto;
            font-size: 12px;
            padding: 6px 8px;
          }
        }
      }

      .preview-section {
        .preview-container {
          border: 1px solid $border-light;
          border-radius: $radius-md;
          padding: $space-md;
          background: $bg-light;
          margin-bottom: $space-sm;
          display: flex;
          justify-content: center;
          min-height: 120px;
          align-items: center;

          .preview-canvas {
            border-radius: $radius-md;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            max-width: 100%;
            max-height: 200px;
          }
        }

        .preview-info {
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            
            &:not(:last-child) {
              border-bottom: 1px solid $border-light;
              margin-bottom: 4px;
              padding-bottom: 8px;
            }

            .label {
              font-size: 12px;
              color: $text-secondary;
            }

            .value {
              font-size: 12px;
              color: $text-primary;
              font-weight: 500;
            }
          }
        }
      }

      .adjustment-section {
        .adjustment-controls {
          .control-group {
            margin-bottom: $space-md;

            &:last-child {
              margin-bottom: 0;
            }

            .control-label {
              display: block;
              font-size: 12px;
              color: $text-secondary;
              margin-bottom: 6px;
            }

            :deep(.el-slider) {
              .el-slider__runway {
                height: 4px;
                background-color: $bg-gray;
              }

              .el-slider__bar {
                background-color: $primary;
              }

              .el-slider__button {
                width: 14px;
                height: 14px;
                border: 2px solid $primary;
              }
            }
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
  .cover-cropper-dialog {
    .cropper-content {
      grid-template-columns: 1fr;
      
      .controls-section {
        order: -1;
        
        .aspect-ratios .ratio-buttons {
          .el-button {
            flex: 0 0 calc(50% - 4px);
          }
        }
      }
    }
  }
}
</style>