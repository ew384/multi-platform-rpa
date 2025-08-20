<template>
  <div class="chat-window">
    <!-- 未选择会话时的空状态 -->
    <div v-if="!messageStore.selectedThread" class="empty-chat-state">
      <div class="empty-content">
        <div class="empty-icon">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <h3 class="empty-title">选择一个会话开始聊天</h3>
        <p class="empty-description">
          在左侧会话列表中选择一个用户开始私信对话
        </p>
      </div>
    </div>

    <!-- 聊天界面 -->
    <div v-else class="chat-content">
      <!-- 聊天头部栏 -->
      <div class="chat-header">
        <div class="user-info">
          <el-avatar
            :size="40"
            :src="messageStore.selectedThread.avatar || '/default-avatar.png'"
            @error="handleAvatarError"
          />
          <div class="user-details">
            <h3 class="user-name">
              {{ messageStore.selectedThread.userName }}
            </h3>
            <span class="platform-info">{{
              messageStore.selectedAccount?.platform
            }}</span>
          </div>
        </div>

        <div class="chat-actions">
          <el-dropdown @command="handleChatAction" trigger="click">
            <el-button circle>
              <el-icon><More /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="refresh">
                  <el-icon><Refresh /></el-icon>
                  刷新消息
                </el-dropdown-item>
                <el-dropdown-item command="mark-read">
                  <el-icon><Check /></el-icon>
                  标记已读
                </el-dropdown-item>
                <el-dropdown-item command="clear" divided>
                  <el-icon><Delete /></el-icon>
                  清空会话
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 消息流区域 -->
      <div class="messages-container" ref="messagesContainer">
        <!-- 历史消息加载提示 -->
        <div v-if="messageStore.hasMoreMessages" class="load-more-messages">
          <el-button
            text
            @click="loadMoreMessages"
            :loading="messageStore.isLoadingMessages"
            class="load-more-btn"
          >
            <el-icon><ArrowUp /></el-icon>
            查看更多历史消息
          </el-button>
        </div>

        <!-- 消息列表 -->
        <div class="messages-list">
          <!-- 日期分割线 -->
          <div
            v-for="(group, date) in groupedMessages"
            :key="date"
            class="message-group"
          >
            <div class="date-divider">
              <span class="date-text">{{ formatDate(date) }}</span>
            </div>

            <!-- 该日期下的消息 -->
            <div class="date-messages">
              <MessageBubble
                v-for="message in group"
                :key="message.id"
                :message="message"
                :platform="messageStore.selectedAccount?.platform"
                @image-preview="handleImagePreview"
              />
            </div>
          </div>
        </div>

        <!-- 加载中状态 -->
        <div
          v-if="
            messageStore.isLoadingMessages &&
            messageStore.currentMessages.length === 0
          "
          class="loading-messages"
        >
          <el-icon class="loading-spinner"><Loading /></el-icon>
          <span>加载消息中...</span>
        </div>
      </div>

      <!-- 输入框区域 -->
      <div class="input-area">
        <!-- 消息状态提示 -->
        <div v-if="sendStatus" class="status-indicator">
          <span :class="['status-text', sendStatus.type]">
            <el-icon v-if="sendStatus.type === 'success'"><Check /></el-icon>
            <el-icon v-if="sendStatus.type === 'error'"><Close /></el-icon>
            {{ sendStatus.message }}
          </span>
        </div>

        <!-- 输入框 -->
        <div class="input-container">
          <el-input
            v-model="messageInput"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="请输入回复内容，shift键+回车换行，回车键发送"
            @keydown="handleKeyDown"
            :disabled="messageStore.isSending"
            class="message-input"
          />

          <!-- 工具栏 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 图片上传 -->
              <el-button
                circle
                size="small"
                :disabled="true"
                title="图片发送功能开发中"
              >
                <el-icon><Picture /></el-icon>
              </el-button>

              <!-- 表情 -->
              <el-button
                circle
                size="small"
                :disabled="true"
                title="表情功能开发中"
              >
                <el-icon><ChatRound /></el-icon>
              </el-button>

              <!-- 附件 -->
              <el-button
                circle
                size="small"
                :disabled="true"
                title="附件功能开发中"
              >
                <el-icon><Paperclip /></el-icon>
              </el-button>
            </div>

            <div class="toolbar-right">
              <!-- 发送按钮 -->
              <el-button
                type="primary"
                @click="sendMessage"
                :loading="messageStore.isSending"
                :disabled="!messageInput.trim()"
                class="send-btn"
              >
                <el-icon><Promotion /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <ImagePreview
      v-model="showImagePreview"
      :image-url="previewImageUrl"
      :images="previewImages"
      :current-index="previewIndex"
      @close="handleCloseImagePreview"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from "vue";
import {
  ChatDotRound,
  More,
  Refresh,
  Check,
  Delete,
  ArrowUp,
  Loading,
  Close,
  Picture,
  ChatRound,
  Paperclip,
  Promotion,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useMessageStore } from "@/stores/message";
import MessageBubble from "./MessageBubble.vue";
import ImagePreview from "./ImagePreview.vue";

// 状态管理
const messageStore = useMessageStore();

// 本地状态
const messageInput = ref("");
const sendStatus = ref(null);
const messagesContainer = ref(null);
const showImagePreview = ref(false);
const previewImageUrl = ref("");
const previewImages = ref([]);
const previewIndex = ref(0);

// 计算属性 - 按日期分组消息
const groupedMessages = computed(() => {
  const groups = {};

  messageStore.currentMessages.forEach((message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });

  return groups;
});

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "昨天";
  } else {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

// 事件处理
const handleKeyDown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const sendMessage = async () => {
  const content = messageInput.value.trim();
  if (!content || messageStore.isSending) return;

  try {
    sendStatus.value = null;

    const result = await messageStore.sendMessage(content);

    if (result.success) {
      messageInput.value = "";
      sendStatus.value = {
        type: "success",
        message: "发送成功",
      };

      // 滚动到底部
      await nextTick();
      scrollToBottom();

      // 3秒后清除状态
      setTimeout(() => {
        sendStatus.value = null;
      }, 3000);
    } else {
      sendStatus.value = {
        type: "error",
        message: result.error || "发送失败",
      };

      // 5秒后清除错误状态
      setTimeout(() => {
        sendStatus.value = null;
      }, 5000);
    }
  } catch (error) {
    console.error("发送消息失败:", error);
    sendStatus.value = {
      type: "error",
      message: "发送失败，请重试",
    };

    setTimeout(() => {
      sendStatus.value = null;
    }, 5000);
  }
};

const loadMoreMessages = async () => {
  try {
    await messageStore.loadMessages(
      messageStore.selectedThread.threadId,
      false
    );
  } catch (error) {
    console.error("加载历史消息失败:", error);
    ElMessage.error("加载历史消息失败");
  }
};

const handleChatAction = async (command) => {
  switch (command) {
    case "refresh":
      await refreshMessages();
      break;
    case "mark-read":
      await markAllAsRead();
      break;
    case "clear":
      await clearChat();
      break;
  }
};

const refreshMessages = async () => {
  try {
    if (messageStore.selectedThread) {
      await messageStore.loadMessages(
        messageStore.selectedThread.threadId,
        true
      );
      ElMessage.success("消息已刷新");
    }
  } catch (error) {
    console.error("刷新消息失败:", error);
    ElMessage.error("刷新消息失败");
  }
};

const markAllAsRead = async () => {
  try {
    if (messageStore.selectedThread) {
      await messageStore.markAsRead(messageStore.selectedThread.threadId);
      ElMessage.success("已标记为已读");
    }
  } catch (error) {
    console.error("标记已读失败:", error);
    ElMessage.error("标记已读失败");
  }
};

const clearChat = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要清空当前会话的所有消息吗？此操作不可撤销。",
      "清空会话",
      {
        confirmButtonText: "确定清空",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    // TODO: 实现清空会话功能
    ElMessage.info("清空会话功能开发中");
  } catch {
    // 用户取消
  }
};

const handleImagePreview = (imageUrl, images = [], index = 0) => {
  previewImageUrl.value = imageUrl;
  previewImages.value = images;
  previewIndex.value = index;
  showImagePreview.value = true;
};

const handleCloseImagePreview = () => {
  showImagePreview.value = false;
  previewImageUrl.value = "";
  previewImages.value = [];
  previewIndex.value = 0;
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

const scrollToBottom = (smooth = true) => {
  if (messagesContainer.value) {
    const container = messagesContainer.value;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }
};

// 监听选中会话变化，滚动到底部
watch(
  () => messageStore.selectedThread,
  async () => {
    if (messageStore.selectedThread) {
      await nextTick();
      scrollToBottom(false);
    }
  },
  { immediate: true }
);

// 监听新消息，滚动到底部
watch(
  () => messageStore.currentMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);
</script>

<style lang="scss" scoped>
$primary: #5b73de;
$success: #10b981;
$danger: #ef4444;

$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-gray: #f1f5f9;
$bg-blue-light: #e6f7ff;

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-white;
}

// 空状态
.empty-chat-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-light;

  .empty-content {
    text-align: center;
    max-width: 300px;

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: $bg-gray;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto $space-lg;

      .el-icon {
        font-size: 32px;
        color: $text-muted;
      }
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: $text-primary;
      margin: 0 0 $space-sm 0;
    }

    .empty-description {
      font-size: 14px;
      color: $text-secondary;
      line-height: 1.5;
      margin: 0;
    }
  }
}

// 聊天内容
.chat-content {
  height: 100%;
  display: flex;
  flex-direction: column;

  // 聊天头部栏
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-md $space-lg;
    border-bottom: 1px solid $border-light;
    background: $bg-white;
    flex-shrink: 0;

    .user-info {
      display: flex;
      align-items: center;
      gap: $space-sm;

      :deep(.el-avatar) {
        border: 2px solid $bg-light;
        box-shadow: $shadow-sm;
      }

      .user-details {
        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 2px 0;
          line-height: 1.2;
        }

        .platform-info {
          font-size: 12px;
          color: $text-muted;
          background: $bg-gray;
          padding: 2px 6px;
          border-radius: $radius-sm;
        }
      }
    }

    .chat-actions {
      .el-button {
        width: 36px;
        height: 36px;
      }
    }
  }

  // 消息流区域
  .messages-container {
    flex: 1;
    overflow-y: auto;
    background: $bg-light;
    position: relative;

    .load-more-messages {
      text-align: center;
      padding: $space-md;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);

      .load-more-btn {
        font-size: 12px;
        color: $text-secondary;

        .el-icon {
          margin-right: $space-xs;
        }
      }
    }

    .messages-list {
      padding: $space-md 0;

      .message-group {
        .date-divider {
          text-align: center;
          margin: $space-lg 0;
          position: relative;

          &::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: $border-light;
            z-index: 1;
          }

          .date-text {
            background: $bg-light;
            padding: 0 $space-md;
            font-size: 12px;
            color: $text-muted;
            position: relative;
            z-index: 2;
          }
        }

        .date-messages {
          padding: 0 $space-md;
        }
      }
    }

    .loading-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      gap: $space-sm;
      color: $text-secondary;

      .loading-spinner {
        font-size: 24px;
        animation: rotate 1s linear infinite;
      }
    }
  }

  // 输入框区域
  .input-area {
    background: $bg-white;
    border-top: 1px solid $border-light;
    flex-shrink: 0;

    .status-indicator {
      padding: $space-xs $space-lg;
      border-bottom: 1px solid $border-light;

      .status-text {
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: $space-xs;

        &.success {
          color: $success;
        }

        &.error {
          color: $danger;
        }
      }
    }

    .input-container {
      padding: $space-md $space-lg;

      .message-input {
        margin-bottom: $space-sm;

        :deep(.el-textarea__inner) {
          border-radius: $radius-lg;
          border: 1px solid $border-light;
          padding: $space-sm $space-md;
          font-size: 14px;
          line-height: 1.4;
          resize: none;

          &:focus {
            border-color: $primary;
            box-shadow: 0 0 0 2px rgba(91, 115, 222, 0.1);
          }

          &::placeholder {
            color: $text-muted;
            font-size: 13px;
          }
        }
      }

      .input-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .toolbar-left {
          display: flex;
          gap: $space-xs;

          .el-button {
            width: 32px;
            height: 32px;
            color: $text-muted;

            &:not(:disabled):hover {
              color: $primary;
              background-color: rgba(91, 115, 222, 0.1);
            }

            &:disabled {
              opacity: 0.4;
            }
          }
        }

        .toolbar-right {
          .send-btn {
            padding: 8px 16px;
            font-size: 14px;
            border-radius: $radius-lg;

            .el-icon {
              margin-right: $space-xs;
            }
          }
        }
      }
    }
  }
}

// 滚动条样式
.messages-container {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: $bg-light;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }
}

// 下拉菜单样式
:deep(.el-dropdown-menu) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: $space-sm;
    font-size: 13px;

    .el-icon {
      font-size: 14px;
    }
  }
}

// 旋转动画
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
