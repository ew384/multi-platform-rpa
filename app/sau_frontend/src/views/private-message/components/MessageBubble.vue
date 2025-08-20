<template>
  <div :class="['message-bubble', { 'is-mine': message.sender === 'me' }]">
    <!-- 用户头像（对方消息显示） -->
    <div v-if="message.sender === 'user'" class="message-avatar">
      <el-avatar :size="32" :src="getUserAvatar()" @error="handleAvatarError" />
    </div>

    <!-- 消息内容 -->
    <div class="message-content">
      <!-- 消息气泡 -->
      <div :class="['bubble', message.sender]">
        <!-- 文字内容 -->
        <div v-if="message.text" class="text-content">
          {{ message.text }}
        </div>

        <!-- 图片内容 -->
        <div
          v-if="message.images && message.images.length > 0"
          class="images-content"
        >
          <div
            v-for="(image, index) in message.images"
            :key="index"
            class="image-item"
            @click="handleImageClick(image, index)"
          >
            <img
              :src="getImageUrl(image)"
              :alt="`图片 ${index + 1}`"
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div class="image-overlay">
              <el-icon><ZoomIn /></el-icon>
            </div>
          </div>
        </div>

        <!-- 消息时间和状态 -->
        <div class="message-meta">
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          <span v-if="message.sender === 'me'" class="message-status">
            <el-icon v-if="isMessageRead" class="status-read"
              ><Check
            /></el-icon>
            <el-icon v-else class="status-sent"><Clock /></el-icon>
          </span>
        </div>
      </div>
    </div>

    <!-- 我的头像（我的消息显示） -->
    <div v-if="message.sender === 'me'" class="message-avatar">
      <el-avatar :size="32" src="/my-avatar.png" @error="handleAvatarError" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ZoomIn, Check, Clock } from "@element-plus/icons-vue";

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  platform: {
    type: String,
    default: "",
  },
});

// Emits
const emit = defineEmits(["image-preview"]);

// 计算属性
const isMessageRead = computed(() => {
  return props.message.is_read === true || props.message.is_read === 1;
});

// 获取用户头像
const getUserAvatar = () => {
  // 这里可以根据需要获取对方用户的头像
  return "/default-avatar.png";
};

// 获取图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return "/placeholder-image.png";

  // 如果是完整URL，直接返回
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // 如果是相对路径，构造完整URL
  if (imagePath.startsWith("assets/")) {
    return `http://localhost:3409/${imagePath}`;
  }

  // 如果是base64或其他格式
  if (imagePath.startsWith("data:image/")) {
    return imagePath;
  }

  // 默认返回占位图
  return "/placeholder-image.png";
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const messageTime = new Date(timestamp);
  return messageTime.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// 事件处理
const handleImageClick = (image, index) => {
  const imageUrl = getImageUrl(image);
  const allImages = props.message.images.map((img) => getImageUrl(img));
  emit("image-preview", imageUrl, allImages, index);
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

const handleImageError = (e) => {
  e.target.src = "/placeholder-image.png";
};

const handleImageLoad = (e) => {
  // 图片加载完成，可以在这里处理一些逻辑
  console.log("图片加载完成:", e.target.src);
};
</script>

<style lang="scss" scoped>
$primary: #5b73de;
$success: #10b981;
$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;
$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-blue-light: #e6f7ff;
$bg-gray-light: #f6f6f6;
$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$radius-md: 8px;
$radius-lg: 12px;
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;

.message-bubble {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-md;
  align-items: flex-end;

  &.is-mine {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;

      .bubble {
        &.me {
          background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
          color: white;
          border-bottom-right-radius: $space-xs;

          .message-meta {
            .message-time {
              color: rgba(255, 255, 255, 0.8);
            }

            .status-read {
              color: rgba(255, 255, 255, 0.9);
            }

            .status-sent {
              color: rgba(255, 255, 255, 0.7);
            }
          }
        }
      }
    }
  }

  .message-avatar {
    flex-shrink: 0;

    :deep(.el-avatar) {
      border: 2px solid $bg-light;
      box-shadow: $shadow-sm;
    }
  }

  .message-content {
    display: flex;
    flex-direction: column;
    max-width: 70%;
    min-width: 0;

    .bubble {
      padding: $space-sm $space-md;
      border-radius: $radius-lg;
      position: relative;
      word-wrap: break-word;
      word-break: break-word;

      &.user {
        background: $bg-white;
        color: $text-primary;
        border: 1px solid $border-light;
        border-bottom-left-radius: $space-xs;
        box-shadow: $shadow-sm;
      }

      &.me {
        background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
        color: white;
        border-bottom-right-radius: $space-xs;
        box-shadow: 0 2px 8px rgba(91, 115, 222, 0.3);
      }

      .text-content {
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: $space-xs;
        white-space: pre-wrap;
      }

      .images-content {
        margin-bottom: $space-xs;

        .image-item {
          position: relative;
          cursor: pointer;
          border-radius: $radius-md;
          overflow: hidden;
          margin-bottom: $space-xs;
          transition: transform 0.3s ease;

          &:hover {
            transform: scale(1.02);

            .image-overlay {
              opacity: 1;
            }
          }

          &:last-child {
            margin-bottom: 0;
          }

          img {
            width: 100%;
            max-width: 200px;
            height: auto;
            border-radius: $radius-md;
            display: block;
            box-shadow: $shadow-sm;
          }

          .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: $radius-md;

            .el-icon {
              font-size: 24px;
              color: white;
            }
          }
        }
      }

      .message-meta {
        display: flex;
        align-items: center;
        gap: $space-xs;
        font-size: 11px;
        margin-top: $space-xs;

        .message-time {
          color: $text-muted;
        }

        .message-status {
          display: flex;
          align-items: center;

          .el-icon {
            font-size: 12px;
          }

          .status-read {
            color: $success;
          }

          .status-sent {
            color: $text-muted;
          }
        }
      }
    }
  }
}

// 特殊样式处理
.bubble {
  // 连续消息气泡间距
  .message-bubble + .message-bubble {
    margin-top: $space-xs;
  }

  // 图片消息的特殊样式
  &:has(.images-content:only-child) {
    padding: $space-xs;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;

    &.user {
      background: transparent !important;
    }

    &.me {
      background: transparent !important;
    }
  }
}

// 响应式处理
@media (max-width: 768px) {
  .message-bubble {
    .message-content {
      max-width: 85%;
    }

    .bubble {
      .images-content {
        .image-item {
          img {
            max-width: 160px;
          }
        }
      }
    }
  }
}
</style>
