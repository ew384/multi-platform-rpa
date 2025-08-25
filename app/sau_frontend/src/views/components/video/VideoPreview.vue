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
          :poster="currentVideo?.poster"
          :controls="enableControls"
          :muted="!enableControls"
          preload="metadata"
          @loadedmetadata="handleVideoLoaded"
          @error="handleVideoError"
          @posterror="handlePosterError"
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
// 🔥 添加视频缓存机制（全局缓存，所有组件实例共享）
const videoCache = new Map();
const posterCache = new Map();

// 🔥 添加缓存相关的辅助函数
const getCachedVideoUrl = (videoPath) => {
  if (!videoPath) return null;

  if (videoCache.has(videoPath)) {
    return videoCache.get(videoPath);
  }

  const url = `${
    import.meta.env.VITE_API_BASE_URL
  }/getFile?filename=${encodeURIComponent(videoPath)}`;
  videoCache.set(videoPath, url);
  return url;
};

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
  const video = props.videos[currentVideoIndex.value] || null;
  if (!video) return null;

  // 🔥 使用缓存的URL
  const result = {
    ...video,
    url: getCachedVideoUrl(video.path || video.name),
  };

  //console.log("✅ currentVideo 结果:", result);
  return result;
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
watch(currentVideo, async (newVideo, oldVideo) => {
  console.log("👀 currentVideo watch 触发:", {
    newVideo: newVideo?.name,
    oldVideo: oldVideo?.name,
    timestamp: Date.now(),
  });

  if (newVideo) {
    console.log("🚀 准备调用 loadVideo");
    await loadVideo();
  }
});
watch(
  () => props.videos,
  (newVideos, oldVideos) => {
  },
  { immediate: true, deep: true }
);
// 方法
const switchVideo = (index) => {
  if (index >= 0 && index < props.videos.length) {
    currentVideoIndex.value = index;
    emit("current-changed", index);
  }
};

const loadVideo = async () => {
  console.log("🎯 loadVideo 开始执行:", {
    currentVideo: currentVideo.value?.name,
    hasVideoElement: !!videoElement.value,
    timestamp: Date.now(),
  });

  if (!currentVideo.value) return;

  // 🔥 检查视频是否已缓存，如果已缓存则快速加载
  const cachedUrl = currentVideo.value.url;
  if (videoCache.has(currentVideo.value.path || currentVideo.value.name)) {
    console.log("🎯 使用缓存视频:", currentVideo.value.name);
  }

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
    if (videoElement.value) {
      videoElement.value.currentTime = 0;
    }

    // 等待视频加载
    await new Promise((resolve, reject) => {
      const video = videoElement.value;
      if (!video) {
        reject(new Error("视频元素已被销毁"));
        return;
      }
      const onLoaded = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        // 🔥 记录成功加载的视频
        console.log("✅ 视频加载成功:", currentVideo.value.name);
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
  console.warn("本地视频加载失败，尝试 API 路径");

  if (
    currentVideo.value?.urlFallback &&
    event.target.src !== currentVideo.value.urlFallback
  ) {
    console.log("🔄 切换到 API 路径:", currentVideo.value.urlFallback);
    event.target.src = currentVideo.value.urlFallback;
  } else {
    const errorMsg = "视频播放出错";
    error.value = errorMsg;
    console.error("视频播放错误:", event);
    emit("video-error", new Error(errorMsg));
  }
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
const handlePosterError = (event) => {
  console.warn("本地封面加载失败，尝试 API 路径");

  if (
    currentVideo.value?.posterFallback &&
    event.target.poster !== currentVideo.value.posterFallback
  ) {
    console.log("🔄 切换到 API 封面路径:", currentVideo.value.posterFallback);
    event.target.poster = currentVideo.value.posterFallback;
  } else {
    console.log("📺 移除封面，使用视频首帧");
    event.target.removeAttribute("poster");
  }
};
// 🔥 在组件最后添加缓存管理
const clearVideoCache = () => {
  videoCache.clear();
  posterCache.clear();
  console.log("🧹 视频缓存已清空");
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
  // 🔥 新增缓存管理方法
  clearCache: clearVideoCache,
  getCacheSize: () => ({
    videos: videoCache.size,
    posters: posterCache.size,
  }),
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
    // 🔥 发布记录模式：使用竖屏比例
    .video-container {
      width: 100%;           // 填满父容器
      height: 100%;          // 填满父容器
      aspect-ratio: 9 / 16;  // 🔥 强制竖屏比例
      border: none;          // 🔥 移除边框
      border-radius: 8px;    // 保持圆角
      overflow: hidden;
    }

    .video-player {
      width: 100%;
      height: 100%;
      aspect-ratio: 9 / 16;  // 🔥 强制竖屏比例
      border-radius: 8px;
      overflow: hidden;
      
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;   // 🔥 填满并裁剪，确保不留黑边
        border-radius: 8px;
      }
    }
  }

  // 🔥 新增：针对 MaterialSelector 中的小尺寸优化
  &.mode-record.size-small {
    .video-container {
      width: 100%;
      height: 100%;
      aspect-ratio: 9 / 16;  // 🔥 确保竖屏
      border: none;
      border-radius: 6px;    // 稍小的圆角适配小尺寸
    }

    .video-player {
      aspect-ratio: 9 / 16;  // 🔥 确保竖屏
      border-radius: 6px;
      
      video {
        object-fit: cover;   // 🔥 重要：填满容器
        border-radius: 6px;
      }
    }
  }

  // 其他模式保持不变
  &.mode-preview {
    display: flex;
    justify-content: center;

    .video-container {
      width: 25%;
      max-width: 200px;
      min-width: 150px;

      .video-player {
        aspect-ratio: 9 / 16;
      }
    }
  }

  &.mode-editor {
    .video-container {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;

      .video-player {
        aspect-ratio: 16 / 9; // 编辑器模式保持横屏
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
  &.size-small {
    .video-container {
      aspect-ratio: 9 / 16; // 强制竖屏比例
    }

    .video-player {
      aspect-ratio: 9 / 16; // 强制竖屏比例
      
      video {
        object-fit: cover; // 填满容器并裁剪多余部分
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
