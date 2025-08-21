<template>
  <div class="chat-window">
    <!-- 未选择会话时的空状态 -->
    <div v-if="!messageStore.selectedThread" class="empty-chat-state">
      <div class="empty-content">
        <div class="empty-illustration">
          <div class="chat-bubbles">
            <div class="bubble bubble-1"></div>
            <div class="bubble bubble-2"></div>
            <div class="bubble bubble-3"></div>
          </div>
        </div>
        <h3 class="empty-title">开始新的对话</h3>
        <p class="empty-description">
          从左侧会话列表中选择一个用户，开始私信对话
        </p>
        <div class="empty-features">
          <div class="feature-item">
            <el-icon><ChatDotRound /></el-icon>
            <span>实时消息同步</span>
          </div>
          <div class="feature-item">
            <el-icon><Picture /></el-icon>
            <span>支持图片发送</span>
          </div>
          <div class="feature-item">
            <el-icon><Notification /></el-icon>
            <span>智能消息提醒</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天界面 -->
    <div v-else class="chat-content">
      <!-- 聊天头部栏 -->
      <div class="chat-header">
        <div class="header-left">
          <div class="user-avatar-section">
            <el-avatar
              :size="40"
              :src="messageStore.selectedThread.avatar || '/default-avatar.png'"
              @error="handleAvatarError"
              class="user-avatar"
            />
            <div class="online-status"></div>
          </div>

          <div class="user-details">
            <h3 class="user-name">
              {{ messageStore.selectedThread.userName }}
            </h3>
            <div class="user-meta">
              <span class="platform-tag">{{
                messageStore.selectedAccount?.platform
              }}</span>
              <span class="user-status">在线</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <el-button circle class="action-btn" title="搜索聊天记录">
            <el-icon><Search /></el-icon>
          </el-button>

          <el-button circle class="action-btn" title="消息设置">
            <el-icon><Setting /></el-icon>
          </el-button>

          <el-dropdown @command="handleChatAction" trigger="click">
            <el-button circle class="action-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu class="chat-dropdown">
                <el-dropdown-item command="refresh">
                  <el-icon><Refresh /></el-icon>
                  刷新消息
                </el-dropdown-item>
                <el-dropdown-item command="mark-read">
                  <el-icon><Check /></el-icon>
                  标记已读
                </el-dropdown-item>
                <el-dropdown-item command="export" divided>
                  <el-icon><Download /></el-icon>
                  导出聊天记录
                </el-dropdown-item>
                <el-dropdown-item command="clear" class="danger-item">
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
              <div class="date-line"></div>
              <span class="date-text">{{ formatDate(date) }}</span>
              <div class="date-line"></div>
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
          <div class="loading-content">
            <el-icon class="loading-spinner"><Loading /></el-icon>
            <span class="loading-text">加载消息中...</span>
          </div>
        </div>

        <!-- 滚动到底部按钮 -->
        <div
          v-if="showScrollToBottom"
          class="scroll-to-bottom"
          @click="scrollToBottom"
        >
          <el-icon><ArrowDown /></el-icon>
        </div>
      </div>

      <!-- 输入框区域 -->
      <div class="input-area">
        <!-- 消息状态提示 -->
        <div v-if="sendStatus" class="status-indicator">
          <div :class="['status-content', sendStatus.type]">
            <el-icon v-if="sendStatus.type === 'success'"
              ><CircleCheck
            /></el-icon>
            <el-icon v-if="sendStatus.type === 'error'"
              ><CircleClose
            /></el-icon>
            <el-icon v-if="sendStatus.type === 'sending'" class="loading-icon"
              ><Loading
            /></el-icon>
            <span class="status-text">{{ sendStatus.message }}</span>
          </div>
        </div>

        <!-- 输入框容器 -->
        <div class="input-container">
          <!-- 工具栏 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 表情按钮 -->
              <el-button
                circle
                size="small"
                class="tool-btn emoji-btn"
                :disabled="true"
                title="表情功能开发中"
              >
                <el-icon><ChatRound /></el-icon>
              </el-button>

              <!-- 图片上传 -->
              <el-button
                circle
                size="small"
                class="tool-btn image-btn"
                :disabled="true"
                title="图片发送功能开发中"
              >
                <el-icon><Picture /></el-icon>
              </el-button>

              <!-- 附件上传 -->
              <el-button
                circle
                size="small"
                class="tool-btn file-btn"
                :disabled="true"
                title="附件功能开发中"
              >
                <el-icon><Paperclip /></el-icon>
              </el-button>
            </div>

            <div class="toolbar-right">
              <!-- 快捷回复 -->
              <el-button
                size="small"
                class="quick-reply-btn"
                :disabled="true"
                title="快捷回复功能开发中"
              >
                快捷回复
              </el-button>
            </div>
          </div>

          <!-- 输入框 -->
          <div class="input-wrapper">
            <el-input
              v-model="messageInput"
              type="textarea"
              :rows="3"
              resize="none"
              placeholder="输入消息内容... (Shift + Enter 换行，Enter 发送)"
              @keydown="handleKeyDown"
              :disabled="messageStore.isSending"
              class="message-input"
              ref="messageInputRef"
            />

            <!-- 发送按钮 -->
            <div class="send-button-container">
              <el-button
                type="primary"
                @click="sendMessage"
                :loading="messageStore.isSending"
                :disabled="!messageInput.trim()"
                class="send-btn"
                size="large"
              >
                <el-icon v-if="!messageStore.isSending"><Promotion /></el-icon>
                {{ messageStore.isSending ? "发送中" : "发送" }}
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
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import {
  ChatDotRound,
  Picture,
  Notification,
  Search,
  Setting,
  MoreFilled,
  Refresh,
  Check,
  Download,
  Delete,
  ArrowUp,
  ArrowDown,
  Loading,
  CircleCheck,
  CircleClose,
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
const messageInputRef = ref(null);
const showImagePreview = ref(false);
const previewImageUrl = ref("");
const previewImages = ref([]);
const previewIndex = ref(0);
const showScrollToBottom = ref(false);

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
    sendStatus.value = {
      type: "sending",
      message: "发送中...",
    };

    const result = await messageStore.sendMessage(content);

    if (result.success) {
      messageInput.value = "";
      sendStatus.value = {
        type: "success",
        message: "发送成功",
      };

      // 滚动到底部
      await nextTick();
      scrollToBottom(true);

      // 3秒后清除状态
      setTimeout(() => {
        sendStatus.value = null;
      }, 3000);

      // 聚焦输入框
      messageInputRef.value?.focus();
    } else {
      sendStatus.value = {
        type: "error",
        message: result.error || "发送失败",
      };

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
    case "export":
      await exportChatHistory();
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

const exportChatHistory = async () => {
  ElMessage.info("导出聊天记录功能开发中");
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
        buttonSize: "default",
      }
    );

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

// 检查是否需要显示滚动到底部按钮
const checkScrollPosition = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    showScrollToBottom.value =
      !isNearBottom && messageStore.currentMessages.length > 0;
  }
};

// 监听选中会话变化，滚动到底部
watch(
  () => messageStore.selectedThread,
  async () => {
    if (messageStore.selectedThread) {
      await nextTick();
      scrollToBottom(false);
      messageInputRef.value?.focus();
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

// 生命周期
onMounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener("scroll", checkScrollPosition);
  }
});

onUnmounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener("scroll", checkScrollPosition);
  }
});
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$primary-light: #a5b4fc;
$primary-dark: #4f46e5;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$bg-accent: rgba(99, 102, 241, 0.05);
$bg-hover: rgba(99, 102, 241, 0.08);

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;
$text-white: #ffffff;

$border-light: #e2e8f0;
$border-lighter: #f1f5f9;

$shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);

$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-2xl: 20px;
$radius-full: 9999px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 12px;
$space-lg: 16px;
$space-xl: 20px;
$space-2xl: 24px;

.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
}

// 空状态
.empty-chat-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $bg-secondary 0%, $bg-tertiary 100%);

  .empty-content {
    text-align: center;
    max-width: 400px;
    padding: $space-2xl;

    .empty-illustration {
      margin-bottom: $space-2xl;
      display: flex;
      justify-content: center;

      .chat-bubbles {
        position: relative;
        width: 120px;
        height: 80px;

        .bubble {
          position: absolute;
          border-radius: $radius-2xl;

          &.bubble-1 {
            width: 60px;
            height: 36px;
            background: linear-gradient(
              135deg,
              $primary 0%,
              $primary-light 100%
            );
            top: 0;
            left: 0;
            animation: float 3s ease-in-out infinite;
          }

          &.bubble-2 {
            width: 50px;
            height: 30px;
            background: linear-gradient(135deg, $success 0%, #34d399 100%);
            top: 20px;
            right: 10px;
            animation: float 3s ease-in-out infinite 1s;
          }

          &.bubble-3 {
            width: 40px;
            height: 24px;
            background: linear-gradient(135deg, $warning 0%, #fbbf24 100%);
            bottom: 0;
            left: 20px;
            animation: float 3s ease-in-out infinite 2s;
          }
        }
      }
    }

    .empty-title {
      font-size: 24px;
      font-weight: 700;
      color: $text-primary;
      margin: 0 0 $space-md 0;
    }

    .empty-description {
      font-size: 16px;
      color: $text-secondary;
      line-height: 1.6;
      margin: 0 0 $space-2xl 0;
    }

    .empty-features {
      display: flex;
      flex-direction: column;
      gap: $space-lg;

      .feature-item {
        display: flex;
        align-items: center;
        gap: $space-md;
        padding: $space-lg;
        background: $bg-primary;
        border-radius: $radius-xl;
        box-shadow: $shadow-sm;
        border: 1px solid $border-lighter;

        .el-icon {
          font-size: 20px;
          color: $primary;
          flex-shrink: 0;
        }

        span {
          font-size: 14px;
          font-weight: 500;
          color: $text-primary;
        }
      }
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
    padding: $space-lg $space-xl;
    background: $bg-primary;
    border-bottom: 1px solid $border-lighter;
    flex-shrink: 0;
    box-shadow: $shadow-xs;

    .header-left {
      display: flex;
      align-items: center;
      gap: $space-lg;

      .user-avatar-section {
        position: relative;

        .user-avatar {
          border: 3px solid $border-lighter;
          box-shadow: $shadow-sm;
        }

        .online-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: $success;
          border: 3px solid $bg-primary;
          border-radius: $radius-full;
          box-shadow: $shadow-xs;
        }
      }

      .user-details {
        .user-name {
          font-size: 18px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 4px 0;
          line-height: 1.2;
        }

        .user-meta {
          display: flex;
          align-items: center;
          gap: $space-md;

          .platform-tag {
            background: $bg-accent;
            color: $primary;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: $radius-sm;
          }

          .user-status {
            font-size: 12px;
            color: $success;
            font-weight: 500;
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: $space-sm;

      .action-btn {
        width: 36px;
        height: 36px;
        background: $bg-tertiary;
        border: 1px solid $border-light;
        color: $text-secondary;
        transition: all 0.3s ease;

        &:hover {
          background: $bg-hover;
          border-color: $primary-light;
          color: $primary;
          transform: translateY(-1px);
        }
      }
    }
  }

  // 消息流区域
  .messages-container {
    flex: 1;
    overflow-y: auto;
    background: linear-gradient(135deg, $bg-secondary 0%, $bg-tertiary 100%);
    position: relative;
    padding: $space-lg 0;

    .load-more-messages {
      text-align: center;
      padding: $space-lg;
      margin-bottom: $space-lg;

      .load-more-btn {
        background: $bg-primary;
        border: 1px solid $border-light;
        border-radius: $radius-xl;
        padding: $space-md $space-xl;
        font-size: 13px;
        color: $text-secondary;
        font-weight: 500;
        box-shadow: $shadow-sm;
        transition: all 0.3s ease;

        &:hover {
          background: $bg-hover;
          border-color: $primary-light;
          color: $primary;
          transform: translateY(-1px);
        }

        .el-icon {
          margin-right: $space-xs;
        }
      }
    }

    .messages-list {
      .message-group {
        margin-bottom: $space-2xl;

        .date-divider {
          display: flex;
          align-items: center;
          margin: $space-2xl 0;
          padding: 0 $space-xl;

          .date-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              $border-light 50%,
              transparent 100%
            );
          }

          .date-text {
            background: $bg-primary;
            padding: 6px 16px;
            font-size: 12px;
            color: $text-muted;
            font-weight: 500;
            border-radius: $radius-xl;
            margin: 0 $space-lg;
            box-shadow: $shadow-xs;
            border: 1px solid $border-lighter;
          }
        }

        .date-messages {
          padding: 0 $space-xl;
        }
      }
    }

    .loading-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-lg;
        background: $bg-primary;
        padding: $space-2xl;
        border-radius: $radius-xl;
        box-shadow: $shadow-md;
        border: 1px solid $border-lighter;

        .loading-spinner {
          font-size: 32px;
          color: $primary;
          animation: rotate 1s linear infinite;
        }

        .loading-text {
          font-size: 14px;
          color: $text-secondary;
          font-weight: 500;
        }
      }
    }

    .scroll-to-bottom {
      position: absolute;
      bottom: $space-xl;
      right: $space-xl;
      width: 44px;
      height: 44px;
      background: $primary;
      border-radius: $radius-full;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: $shadow-lg;
      transition: all 0.3s ease;
      z-index: 10;

      &:hover {
        background: $primary-dark;
        transform: translateY(-2px);
        box-shadow: 0 12px 20px -8px rgba(99, 102, 241, 0.4);
      }

      .el-icon {
        font-size: 18px;
        color: $text-white;
      }
    }

    // 滚动条样式
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    }
  }

  // 输入框区域
  .input-area {
    background: $bg-primary;
    border-top: 1px solid $border-lighter;
    flex-shrink: 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);

    .status-indicator {
      padding: $space-sm $space-xl;
      border-bottom: 1px solid $border-lighter;

      .status-content {
        display: flex;
        align-items: center;
        gap: $space-sm;
        font-size: 12px;
        font-weight: 500;

        &.success {
          color: $success;
        }

        &.error {
          color: $danger;
        }

        &.sending {
          color: $primary;
        }

        .loading-icon {
          animation: rotate 1s linear infinite;
        }
      }
    }

    .input-container {
      padding: $space-lg $space-xl;

      .input-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-lg;

        .toolbar-left {
          display: flex;
          gap: $space-sm;

          .tool-btn {
            width: 32px;
            height: 32px;
            background: $bg-tertiary;
            border: 1px solid $border-light;
            color: $text-muted;
            transition: all 0.3s ease;

            &:not(:disabled):hover {
              background: $bg-hover;
              border-color: $primary-light;
              color: $primary;
              transform: translateY(-1px);
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }

            &.emoji-btn:hover {
              color: $warning;
            }

            &.image-btn:hover {
              color: $success;
            }

            &.file-btn:hover {
              color: $info;
            }
          }
        }

        .toolbar-right {
          .quick-reply-btn {
            background: $bg-tertiary;
            border: 1px solid $border-light;
            color: $text-secondary;
            font-size: 12px;
            font-weight: 500;
            border-radius: $radius-lg;
            transition: all 0.3s ease;

            &:not(:disabled):hover {
              background: $bg-hover;
              border-color: $primary-light;
              color: $primary;
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }
          }
        }
      }

      .input-wrapper {
        display: flex;
        gap: $space-lg;
        align-items: flex-end;

        .message-input {
          flex: 1;

          :deep(.el-textarea) {
            .el-textarea__inner {
              border-radius: $radius-xl;
              border: 2px solid $border-light;
              padding: $space-lg;
              font-size: 14px;
              line-height: 1.5;
              resize: none;
              transition: all 0.3s ease;
              background: $bg-secondary;

              &:focus {
                border-color: $primary;
                background: $bg-primary;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
              }

              &::placeholder {
                color: $text-muted;
                font-size: 13px;
              }

              &:disabled {
                background: $bg-tertiary;
                color: $text-muted;
                cursor: not-allowed;
              }
            }
          }
        }

        .send-button-container {
          .send-btn {
            min-width: 100px;
            height: 48px;
            border-radius: $radius-xl;
            font-size: 14px;
            font-weight: 600;
            background: linear-gradient(
              135deg,
              $primary 0%,
              $primary-light 100%
            );
            border: none;
            box-shadow: $shadow-md;
            transition: all 0.3s ease;

            &:hover:not(:disabled) {
              background: linear-gradient(
                135deg,
                $primary-dark 0%,
                $primary 100%
              );
              transform: translateY(-1px);
              box-shadow: $shadow-lg;
            }

            &:disabled {
              background: $bg-tertiary;
              color: $text-muted;
              cursor: not-allowed;
              transform: none;
              box-shadow: $shadow-xs;
            }

            .el-icon {
              margin-right: $space-xs;
              font-size: 16px;
            }
          }
        }
      }
    }
  }
}

// 下拉菜单样式
:deep(.chat-dropdown) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: $space-sm;
    font-size: 13px;
    padding: $space-md $space-lg;
    transition: all 0.3s ease;

    .el-icon {
      font-size: 14px;
    }

    &:hover {
      background: $bg-hover;
      color: $primary;
    }

    &.danger-item {
      color: $danger;

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: $danger;
      }
    }
  }
}

// 动画效果
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .chat-content {
    .chat-header {
      padding: $space-md $space-lg;

      .header-left {
        gap: $space-md;

        .user-avatar-section {
          .user-avatar {
            width: 36px !important;
            height: 36px !important;
          }
        }

        .user-details {
          .user-name {
            font-size: 16px;
          }

          .user-meta {
            gap: $space-sm;

            .platform-tag,
            .user-status {
              font-size: 11px;
            }
          }
        }
      }

      .header-actions {
        gap: $space-xs;

        .action-btn {
          width: 32px;
          height: 32px;
        }
      }
    }

    .messages-container {
      padding: $space-md 0;

      .messages-list {
        .message-group {
          .date-divider {
            padding: 0 $space-lg;
          }

          .date-messages {
            padding: 0 $space-lg;
          }
        }
      }

      .scroll-to-bottom {
        width: 40px;
        height: 40px;
        bottom: $space-lg;
        right: $space-lg;
      }
    }

    .input-area {
      .input-container {
        padding: $space-md $space-lg;

        .input-toolbar {
          margin-bottom: $space-md;

          .toolbar-left {
            gap: $space-xs;

            .tool-btn {
              width: 28px;
              height: 28px;
            }
          }

          .toolbar-right {
            .quick-reply-btn {
              font-size: 11px;
              padding: $space-xs $space-sm;
            }
          }
        }

        .input-wrapper {
          gap: $space-md;
          flex-direction: column;
          align-items: stretch;

          .send-button-container {
            .send-btn {
              width: 100%;
              height: 44px;
              font-size: 13px;
            }
          }
        }
      }
    }
  }
}
</style>
