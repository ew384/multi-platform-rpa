<template>
  <div class="conversation-list">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索私信..."
          clearable
          @input="handleSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 筛选按钮 -->
      <div class="filter-buttons">
        <el-button-group>
          <el-button
            :type="filterType === 'all' ? 'primary' : ''"
            size="small"
            @click="setFilter('all')"
          >
            全部
          </el-button>
          <el-button
            :type="filterType === 'unread' ? 'primary' : ''"
            size="small"
            @click="setFilter('unread')"
          >
            未读
          </el-button>
          <el-button
            :type="filterType === 'recent' ? 'primary' : ''"
            size="small"
            @click="setFilter('recent')"
          >
            最近
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 会话列表区域 -->
    <div class="conversations-container">
      <!-- 加载状态 -->
      <div v-if="messageStore.isLoadingThreads" class="loading-state">
        <el-icon class="loading-spinner"><Loading /></el-icon>
        <span>加载会话中...</span>
      </div>

      <!-- 会话列表 -->
      <div
        v-else-if="filteredConversations.length > 0"
        class="conversations-list"
      >
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          :class="[
            'conversation-item',
            {
              active: isConversationSelected(conversation),
              unread: conversation.unread_count > 0,
            },
          ]"
          @click="handleSelectConversation(conversation)"
        >
          <!-- 用户头像 -->
          <div class="user-avatar-container">
            <el-avatar
              :size="40"
              :src="conversation.avatar || '/default-avatar.png'"
              @error="handleAvatarError"
            />
            <!-- 平台标识 -->
            <div class="platform-badge">
              <img
                :src="getPlatformLogo(conversation.platform)"
                :alt="conversation.platform"
              />
            </div>
            <!-- 未读消息红点 -->
            <div v-if="conversation.unread_count > 0" class="unread-dot">
              {{
                conversation.unread_count > 99
                  ? "99+"
                  : conversation.unread_count
              }}
            </div>
          </div>

          <!-- 会话信息 -->
          <div class="conversation-info">
            <div class="conversation-header">
              <span class="user-name">{{ conversation.user_name }}</span>
              <span class="message-time">{{
                formatMessageTime(conversation.last_message_time)
              }}</span>
            </div>

            <div class="last-message">
              <span class="message-preview">{{
                getMessagePreview(conversation)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <h3 class="empty-title">
            {{ messageStore.selectedAccount ? "暂无会话" : "请选择账号" }}
          </h3>
          <p class="empty-description">
            {{ getEmptyDescription() }}
          </p>
        </div>
      </div>
    </div>

    <!-- 底部加载更多 -->
    <div v-if="showLoadMore" class="load-more">
      <el-button
        text
        @click="loadMoreConversations"
        :loading="isLoadingMore"
        class="load-more-btn"
      >
        加载更多会话
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Search, Loading, ChatDotRound } from "@element-plus/icons-vue";
import { useMessageStore } from "@/stores/message";

// 状态管理
const messageStore = useMessageStore();

// 本地状态
const searchKeyword = ref("");
const filterType = ref("all"); // all, unread, recent
const isLoadingMore = ref(false);
const searchResults = ref([]);
const isSearching = ref(false);

// 计算属性
const filteredConversations = computed(() => {
  let conversations = [];

  // 如果有搜索关键词，显示搜索结果
  if (searchKeyword.value.trim()) {
    return searchResults.value;
  }

  // 否则显示普通会话列表
  conversations = messageStore.threadsList || [];

  // 根据筛选类型过滤
  switch (filterType.value) {
    case "unread":
      conversations = conversations.filter((conv) => conv.unread_count > 0);
      break;
    case "recent":
      // 过滤最近24小时的会话
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      conversations = conversations.filter(
        (conv) => conv.last_message_time && conv.last_message_time > oneDayAgo
      );
      break;
    case "all":
    default:
      // 显示全部
      break;
  }

  // 按最后消息时间排序
  return conversations.sort((a, b) => {
    const timeA = a.last_message_time
      ? new Date(a.last_message_time)
      : new Date(0);
    const timeB = b.last_message_time
      ? new Date(b.last_message_time)
      : new Date(0);
    return timeB - timeA;
  });
});

const showLoadMore = computed(() => {
  // TODO: 实现分页逻辑
  return false;
});

// 获取平台Logo
const getPlatformLogo = (platform) => {
  const logoMap = {
    抖音: "/logos/douyin.png",
    快手: "/logos/kuaishou.png",
    视频号: "/logos/wechat_shipinghao.png",
    微信视频号: "/logos/wechat_shipinghao.png",
    小红书: "/logos/xiaohongshu.jpg",
  };
  return logoMap[platform] || "/logos/default.png";
};

// 格式化消息时间
const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";

  const messageTime = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (messageTime >= today) {
    // 今天 - 显示时分
    return messageTime.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else if (messageTime >= yesterday) {
    // 昨天
    return "昨天";
  } else {
    // 更早 - 显示月日
    return messageTime.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  }
};

// 获取消息预览
const getMessagePreview = (conversation) => {
  // 优先使用最后消息文本
  if (conversation.last_message_text) {
    return conversation.last_message_text.length > 20
      ? conversation.last_message_text.substring(0, 20) + "..."
      : conversation.last_message_text;
  }

  // 根据消息类型显示预览
  if (conversation.last_message_type === "image") {
    return "[图片]";
  } else if (conversation.last_message_type === "mixed") {
    return "[图文消息]";
  }

  return "暂无消息";
};

// 获取空状态描述
const getEmptyDescription = () => {
  if (!messageStore.selectedAccount) {
    return "在左侧选择账号查看私信会话";
  }

  if (searchKeyword.value.trim()) {
    return "没有找到匹配的会话";
  }

  switch (filterType.value) {
    case "unread":
      return "暂无未读会话";
    case "recent":
      return "暂无最近会话";
    default:
      return "该账号暂无私信会话";
  }
};

// 判断会话是否选中
const isConversationSelected = (conversation) => {
  return (
    messageStore.selectedThread &&
    messageStore.selectedThread.threadId === conversation.id
  );
};

// 事件处理
const handleSearch = async () => {
  const keyword = searchKeyword.value.trim();

  if (!keyword) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  if (!messageStore.selectedAccount) {
    return;
  }

  isSearching.value = true;

  try {
    const results = await messageStore.searchMessages(keyword);

    // 转换搜索结果为会话格式
    searchResults.value = results.map((result) => ({
      id: result.thread_id,
      user_name: result.user_name,
      avatar: result.user_avatar,
      platform: messageStore.selectedAccount.platform,
      last_message_text: result.message.text,
      last_message_type: result.message.type,
      last_message_time: result.message.timestamp,
      unread_count: 0, // 搜索结果中不显示未读数
    }));
  } catch (error) {
    console.error("搜索失败:", error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

const setFilter = (type) => {
  filterType.value = type;
};

const handleSelectConversation = async (conversation) => {
  try {
    await messageStore.selectThread(
      conversation.id,
      conversation.user_name,
      conversation.avatar
    );
  } catch (error) {
    console.error("选择会话失败:", error);
  }
};

const loadMoreConversations = async () => {
  // TODO: 实现分页加载
  isLoadingMore.value = true;

  try {
    // 加载更多会话逻辑
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    isLoadingMore.value = false;
  }
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

// 监听选中账号变化，清空搜索
watch(
  () => messageStore.selectedAccount,
  () => {
    searchKeyword.value = "";
    searchResults.value = [];
    filterType.value = "all";
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

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.conversation-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-light;
}

// 顶部工具栏
.toolbar {
  padding: $space-md;
  background: $bg-white;
  border-bottom: 1px solid $border-light;
  flex-shrink: 0;

  .search-box {
    margin-bottom: $space-sm;

    .search-input {
      :deep(.el-input__wrapper) {
        border-radius: $radius-lg;
        box-shadow: $shadow-sm;
      }
    }
  }

  .filter-buttons {
    display: flex;
    justify-content: center;

    :deep(.el-button-group) {
      .el-button {
        font-size: 12px;
        padding: 6px 12px;
        border-radius: $radius-md;

        &:first-child {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        &:last-child {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }

        &:not(:first-child):not(:last-child) {
          border-radius: 0;
        }
      }
    }
  }
}

// 会话列表容器
.conversations-container {
  flex: 1;
  overflow-y: auto;
  position: relative;

  .loading-state {
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

  .conversations-list {
    .conversation-item {
      display: flex;
      align-items: center;
      gap: $space-sm;
      padding: $space-sm $space-md;
      cursor: pointer;
      transition: background-color 0.3s ease;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);

      &:hover {
        background-color: rgba(255, 255, 255, 0.8);
      }

      &.active {
        background-color: $bg-white;
        border-left: 3px solid $primary;
        box-shadow: $shadow-sm;
      }

      &.unread {
        background-color: rgba(91, 115, 222, 0.05);

        .user-name {
          font-weight: 600;
        }

        .message-preview {
          font-weight: 500;
          color: $text-primary;
        }
      }

      .user-avatar-container {
        position: relative;
        flex-shrink: 0;

        :deep(.el-avatar) {
          border: 2px solid white;
          box-shadow: $shadow-sm;
        }

        .platform-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

          img {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            object-fit: cover;
          }
        }

        .unread-dot {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          background: $danger;
          color: white;
          font-size: 10px;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid white;
          box-shadow: $shadow-sm;
        }
      }

      .conversation-info {
        flex: 1;
        min-width: 0;

        .conversation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;

          .user-name {
            font-size: 14px;
            font-weight: 500;
            color: $text-primary;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            margin-right: $space-xs;
          }

          .message-time {
            font-size: 11px;
            color: $text-muted;
            flex-shrink: 0;
          }
        }

        .last-message {
          .message-preview {
            font-size: 13px;
            color: $text-secondary;
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: block;
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: $space-lg;

    .empty-content {
      text-align: center;
      max-width: 240px;

      .empty-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: $bg-gray;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto $space-md;

        .el-icon {
          font-size: 24px;
          color: $text-muted;
        }
      }

      .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 $space-xs 0;
      }

      .empty-description {
        font-size: 12px;
        color: $text-secondary;
        line-height: 1.4;
        margin: 0;
      }
    }
  }
}

// 底部加载更多
.load-more {
  padding: $space-sm;
  text-align: center;
  border-top: 1px solid $border-light;
  background: $bg-white;

  .load-more-btn {
    font-size: 12px;
    color: $text-secondary;
  }
}

// 滚动条样式
.conversations-container {
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
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
