<template>
  <div class="video-preview" :class="[`mode-${mode}`, `size-${size}`]">
    <div class="video-container">
      <!-- 多视频切换标签 -->
      <div v-if="videos.length > 1" class="video-tabs">
        <div
          v-for="(video, index) in videos"
          :key="index"
          :class="['video-tab', { active: currentVideoIndex === index }]"
          @click="switchVideo(index)"
        >
          <span>视频 {{ index + 1 }}</span>
        </div>
      </div>

      <!-- 视频播放器 -->
      <div class="video-player" @click="handleVideoClick">
        <video
          ref="videoElement"
          :src="currentVideo?.url"
          :controls="enableControls"
          :muted="!enableControls"
          preload="metadata"
          @loadedmetadata="handleVideoLoaded"
          @error="handleVideoError"
          @click.stop="handleVideoClick"
        >
          您的浏览器不支持视频播放
        </video>

        <!-- 播放按钮覆盖层 (仅在预览模式显示) -->
        <div
          v-if="mode === 'preview' && !isPlaying"
          class="play-overlay"
          @click.stop="handlePlayClick"
        >
          <div class="play-button">
            <el-icon class="play-icon"><VideoPlay /></el-icon>
          </div>
        </div>

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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { Loading, VideoCamera, VideoPlay } from "@element-plus/icons-vue";

// Props
const props = defineProps({
  videos: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: "preview", // preview | record | editor
    validator: (value) => ["preview", "record", "editor"].includes(value),
  },
  size: {
    type: String,
    default: "medium", // small | medium | large
    validator: (value) => ["small", "medium", "large"].includes(value),
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
  clickable: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits([
  "video-loaded",
  "video-error",
  "current-changed",
  "video-click",
]);

// 响应式数据
const videoElement = ref(null);
const currentVideoIndex = ref(props.currentIndex);
const loading = ref(false);
const error = ref("");
const videoDuration = ref(0);
const isPlaying = ref(false);

// 计算属性
const currentVideo = computed(() => {
  return props.videos[currentVideoIndex.value] || null;
});

// 是否启用视频控制栏
const enableControls = computed(() => {
  return props.mode === "editor";
});

// 监听器
watch(
  () => props.currentIndex,
  (newIndex) => {
    if (newIndex !== currentVideoIndex.value) {
      currentVideoIndex.value = newIndex;
    }
  }
);

watch(currentVideo, async (newVideo) => {
  if (newVideo) {
    await loadVideo();
  }
});

// 方法
const switchVideo = (index) => {
  if (index >= 0 && index < props.videos.length) {
    currentVideoIndex.value = index;
    emit("current-changed", index);
  }
};

const loadVideo = async () => {
  if (!currentVideo.value) return;

  // 确保 video 元素存在
  if (!videoElement.value) {
    console.warn("Video element not ready, skipping load");
    return;
  }

  loading.value = true;
  error.value = "";
  isPlaying.value = false;

  try {
    await nextTick();

    // 重置视频元素
    videoElement.value.currentTime = 0;

    // 等待视频加载
    await new Promise((resolve, reject) => {
      const video = videoElement.value;

      const onLoaded = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        reject(new Error("视频加载失败"));
      };

      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);

      // 如果已经加载完成
      if (video.readyState >= 1) {
        onLoaded();
      }
    });
  } catch (err) {
    error.value = err.message || "视频加载失败";
    console.error("视频加载失败:", err);
    emit("video-error", err);
  } finally {
    loading.value = false;
  }
};

const handleVideoLoaded = () => {
  if (videoElement.value) {
    videoDuration.value = videoElement.value.duration;
    emit("video-loaded", {
      duration: videoDuration.value,
      width: videoElement.value.videoWidth,
      height: videoElement.value.videoHeight,
    });
  }
};

const handleVideoError = (event) => {
  const errorMsg = "视频播放出错";
  error.value = errorMsg;
  console.error("视频播放错误:", event);
  emit("video-error", new Error(errorMsg));
};

const handleVideoClick = () => {
  if (props.clickable) {
    emit("video-click", currentVideo.value);
  }
};

const handlePlayClick = () => {
  if (props.mode === "preview" && videoElement.value) {
    if (isPlaying.value) {
      videoElement.value.pause();
      isPlaying.value = false;
    } else {
      videoElement.value.play();
      isPlaying.value = true;
    }
  }
};

// 监听视频播放状态
watch(
  () => videoElement.value,
  (video) => {
    if (video) {
      video.addEventListener("play", () => (isPlaying.value = true));
      video.addEventListener("pause", () => (isPlaying.value = false));
      video.addEventListener("ended", () => (isPlaying.value = false));
    }
  }
);

// 暴露方法给父组件
defineExpose({
  getCurrentTime: () => videoElement.value?.currentTime || 0,
  setCurrentTime: (time) => {
    if (videoElement.value) {
      videoElement.value.currentTime = time;
    }
  },
  captureFrame: () => {
    if (!videoElement.value) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = videoElement.value.videoWidth;
    canvas.height = videoElement.value.videoHeight;

    ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.8);
  },
});
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$bg-light: #ffffff;
$bg-gray: #f1f5f9;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #e2e8f0;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;

.video-preview {
  &.mode-record {
    // 发布记录模式：小尺寸，紧凑显示
    .video-container {
      width: 90px;
      height: 120px;
    }
  }

  &.mode-preview {
    // 预览模式：手机模拟器效果，25% 宽度居中
    display: flex;
    justify-content: center;

    .video-container {
      width: 25%;
      max-width: 200px;
      min-width: 150px;

      .video-player {
        aspect-ratio: 9 / 16; // 手机竖屏比例
      }
    }
  }

  &.mode-editor {
    // 编辑器模式：大尺寸，完整控制
    .video-container {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;

      .video-player {
        aspect-ratio: 16 / 9; // 横屏比例
      }
    }
  }

  .video-container {
    background: $bg-light;
    border-radius: $radius-lg;
    overflow: hidden;
    border: 1px solid $border-light;
  }

  .video-tabs {
    display: flex;
    background: $bg-gray;
    border-bottom: 1px solid $border-light;

    .video-tab {
      flex: 1;
      padding: $space-sm $space-md;
      text-align: center;
      cursor: pointer;
      font-size: 13px;
      color: $text-secondary;
      border-right: 1px solid $border-light;
      transition: all 0.2s ease;

      &:last-child {
        border-right: none;
      }

      &:hover {
        background: rgba(99, 102, 241, 0.1);
        color: $primary;
      }

      &.active {
        background: $primary;
        color: white;
        font-weight: 500;
      }
    }
  }

  .video-player {
    position: relative;
    width: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-md;
    overflow: hidden;

    video {
      width: 100%;
      height: 100%;
      object-fit: contain; // 保持视频原始比例
      background: transparent;
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.2s ease;
      cursor: pointer;

      .play-button {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        .play-icon {
          color: $primary;
          font-size: 24px;
          margin-left: 2px;
        }
      }

      &:hover {
        .play-button {
          background: white;
          transform: scale(1.1);
        }
      }
    }

    &:hover .play-overlay {
      opacity: 1;
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
      text-align: center;
      z-index: 10;

      .el-icon {
        font-size: 32px;

        &.rotating {
          animation: rotate 2s linear infinite;
        }
      }

      span {
        font-size: 14px;
        opacity: 0.8;
      }
    }

    .video-error {
      color: #ef4444;
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
  .video-preview {
    &.mode-preview .video-container {
      width: 40%; // 移动端稍大一些
    }

    &.mode-editor .video-container {
      max-width: 100%;

      .video-player {
        aspect-ratio: 16 / 9;
      }
    }
  }
}
</style>
