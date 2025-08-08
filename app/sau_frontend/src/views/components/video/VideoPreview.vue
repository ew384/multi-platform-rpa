<template>
  <div class="video-preview">
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

      <!-- 封面模式 -->
      <div v-if="!isPlaying && hasCover" class="cover-mode">
        <img :src="coverUrl" class="cover-image" />
        <div class="play-overlay">
          <el-icon class="play-icon"><VideoPlay /></el-icon>
        </div>
      </div>

      <!-- 视频模式 -->
      <div v-else class="video-player">
        <video
          ref="videoElement"
          :src="currentVideo?.url"
          :poster="currentVideo?.cover"
          controls
          preload="metadata"
          @loadedmetadata="handleVideoLoaded"
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
  coverScreenshots: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: "cover", // cover | video
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
});

// Emits
const emit = defineEmits(["video-loaded", "video-error", "current-changed"]);

// 响应式数据
const videoElement = ref(null);
const isPlaying = ref(false);
const currentVideoIndex = ref(props.currentIndex);
const loading = ref(false);
const error = ref("");
const videoDuration = ref(0);

// 计算属性
const currentVideo = computed(() => {
  return props.videos[currentVideoIndex.value] || null;
});
const hasCover = computed(() => {
  return currentVideo.value && currentVideo.value.url;
});

const coverUrl = computed(() => {
  return currentVideo.value?.url || null;
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
  if (!currentVideo.value || !videoElement.value) return;

  loading.value = true;
  error.value = "";

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

const formatFileSize = (size) => {
  if (!size) return "0 MB";
  const mb = size / (1024 * 1024);
  return mb.toFixed(1) + " MB";
};

const formatDuration = (duration) => {
  if (!duration) return "00:00";
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};
const startPlay = () => {
  isPlaying.value = true;
  nextTick(() => {
    if (videoElement.value) {
      videoElement.value.play();
    }
  });
};
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
$bg-gray: #ffffff;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #ffffff;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;

.video-preview {
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
    width: 70%;
    max-width: 180px; // 增大容器尺寸
    aspect-ratio: 9 / 16; // iPhone风格纵横比
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    padding: 2px; // 添加内边距作为边框
    border-radius: 8px; // 可选：圆角

    video {
      width: 100%; // 改为100%，让视频填满容器
      height: 100%; // 改为100%，让视频填满容器
      object-fit: contain;
      background: transparent; // 移除视频背景色
      border-radius: 4px; // 可选：视频圆角
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

  .video-info {
    padding: $space-md;
    background: white;

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;

      &:not(:last-child) {
        border-bottom: 1px solid $border-light;
        margin-bottom: 4px;
        padding-bottom: 8px;
      }

      .label {
        font-size: 13px;
        color: $text-secondary;
        font-weight: 500;
      }

      .value {
        font-size: 13px;
        color: $text-primary;
        font-weight: 500;
      }
    }
  }
}
.cover-mode {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 3 / 4; // 宽3高4的比例
  cursor: default; // 改为默认光标，不显示pointer
  border-radius: 8px;
  overflow: hidden;

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    // 移除transition和hover效果，保持静态

    .play-icon {
      color: white;
      font-size: 24px;
    }
  }

  &:hover .play-overlay {
    background: rgba(0, 0, 0, 0.9);
    transform: translate(-50%, -50%) scale(1.1);
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
    .video-player {
      aspect-ratio: 16 / 9; // 移动端使用横屏比例
    }
  }
}
</style>
