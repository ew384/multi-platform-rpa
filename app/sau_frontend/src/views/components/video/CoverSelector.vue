<template>
  <div class="cover-selector">
    <!-- 当前封面展示 -->
    <div class="cover-display">
      <div class="cover-image" @click="openCoverMenu">
        <img v-if="currentCover" :src="currentCover" alt="视频封面" />
        <div v-else class="cover-placeholder">
          <el-icon><Picture /></el-icon>
          <span>点击选择封面</span>
        </div>
        <div class="cover-overlay">
          <el-icon><Edit /></el-icon>
          <span>更换封面</span>
        </div>
      </div>
      
      <div class="cover-info">
        <div class="cover-title">视频封面</div>
        <div class="cover-desc">
          {{ currentCover ? '已设置封面' : '建议尺寸: 16:9 或 9:16' }}
        </div>
      </div>
    </div>

    <!-- 封面选择菜单 -->
    <el-dropdown
      ref="coverDropdown"
      :visible="menuVisible"
      placement="bottom-start"
      :hide-on-click="false"
      @visible-change="handleMenuVisibleChange"
    >
      <div></div>
      <template #dropdown>
        <el-dropdown-menu class="cover-menu">
          <el-dropdown-item @click="handleVideoCapture">
            <el-icon><VideoCamera /></el-icon>
            <span>视频截取</span>
          </el-dropdown-item>
          <el-dropdown-item @click="handleCropCover" :disabled="!currentCover">
            <el-icon><Crop /></el-icon>
            <span>剪裁封面</span>
          </el-dropdown-item>
          <el-dropdown-item @click="handleLocalUpload">
            <el-icon><Upload /></el-icon>
            <span>本地选择</span>
          </el-dropdown-item>
          <el-dropdown-item @click="handleMaterialSelect">
            <el-icon><Folder /></el-icon>
            <span>素材库选择</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 视频截取对话框 -->
    <VideoFrameCapture
      v-model:visible="videoCaptureVisible"
      :video-url="videoUrl"
      @captured="handleFrameCaptured"
    />

    <!-- 封面裁剪对话框 -->
    <CoverCropper
      v-model:visible="cropperVisible"
      :image-url="currentCover"
      @cropped="handleCoverCropped"
    />

    <!-- 素材库选择对话框 -->
    <ImageMaterialSelector
      v-model:visible="materialSelectorVisible"
      @selected="handleMaterialSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Picture,
  Edit,
  VideoCamera,
  Crop,
  Upload,
  Folder
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import VideoFrameCapture from './VideoFrameCapture.vue';
import CoverCropper from '../cover/CoverCropper.vue';
import ImageMaterialSelector from '../cover/ImageMaterialSelector.vue';

// Props
const props = defineProps({
  cover: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:cover', 'cover-changed']);

// 响应式数据
const coverDropdown = ref(null);
const fileInput = ref(null);
const menuVisible = ref(false);
const videoCaptureVisible = ref(false);
const cropperVisible = ref(false);
const materialSelectorVisible = ref(false);

// 计算属性
const currentCover = computed({
  get: () => props.cover,
  set: (value) => {
    emit('update:cover', value);
    emit('cover-changed', value);
  }
});

// 方法
const openCoverMenu = () => {
  menuVisible.value = true;
};

const handleMenuVisibleChange = (visible) => {
  menuVisible.value = visible;
};

const handleVideoCapture = () => {
  console.log('🎬 点击视频截取，videoUrl:', props.videoUrl); // 调试信息
  
  if (!props.videoUrl) {
    ElMessage.warning('请先选择视频文件');
    return;
  }
  
  console.log('✅ 准备打开视频截取对话框');
  menuVisible.value = false;
  videoCaptureVisible.value = true;
  
  console.log('📊 videoCaptureVisible状态:', videoCaptureVisible.value);
};

const handleCropCover = () => {
  if (!currentCover.value) {
    ElMessage.warning('请先选择封面图片');
    return;
  }
  menuVisible.value = false;
  cropperVisible.value = true;
};

const handleLocalUpload = () => {
  menuVisible.value = false;
  fileInput.value?.click();
};

const handleMaterialSelect = () => {
  menuVisible.value = false;
  materialSelectorVisible.value = true;
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }

  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB');
    return;
  }

  // 创建文件URL
  const reader = new FileReader();
  reader.onload = (e) => {
    currentCover.value = e.target.result;
    ElMessage.success('封面已更新');
  };
  reader.readAsDataURL(file);

  // 清空input值，允许重复选择同一文件
  event.target.value = '';
};

const handleFrameCaptured = (frameData) => {
  currentCover.value = frameData;
  ElMessage.success('封面截取成功');
};

const handleCoverCropped = (croppedData) => {
  currentCover.value = croppedData;
  ElMessage.success('封面裁剪完成');
};

const handleMaterialSelected = (imageUrl) => {
  currentCover.value = imageUrl;
  ElMessage.success('封面已选择');
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #e2e8f0;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;

.cover-selector {
  .cover-display {
    display: flex;
    align-items: center;
    gap: $space-md;
    padding: $space-md;
    background: $bg-gray;
    border-radius: $radius-lg;
    border: 1px solid $border-light;

    .cover-image {
      position: relative;
      width: 120px;
      height: 68px; // 16:9 比例
      border-radius: $radius-md;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        .cover-overlay {
          opacity: 1;
        }
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cover-placeholder {
        width: 100%;
        height: 100%;
        background: $bg-white;
        border: 2px dashed $border-light;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: $text-muted;

        .el-icon {
          font-size: 24px;
        }

        span {
          font-size: 12px;
        }
      }

      .cover-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: white;
        opacity: 0;
        transition: opacity 0.2s ease;

        .el-icon {
          font-size: 16px;
        }

        span {
          font-size: 12px;
        }
      }
    }

    .cover-info {
      flex: 1;

      .cover-title {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .cover-desc {
        font-size: 12px;
        color: $text-secondary;
      }
    }
  }

  :deep(.cover-menu) {
    min-width: 160px;

    .el-dropdown-menu__item {
      display: flex;
      align-items: center;
      gap: $space-sm;
      font-size: 14px;
      padding: $space-sm $space-md;

      .el-icon {
        font-size: 16px;
        color: $text-secondary;
      }

      &:hover .el-icon {
        color: $primary;
      }

      &.is-disabled {
        .el-icon {
          color: $text-muted;
        }
      }
    }
  }
}
</style>