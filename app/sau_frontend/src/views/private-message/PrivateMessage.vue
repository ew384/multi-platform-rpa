<template>
  <div class="private-message">
    <!-- 4栏布局容器 -->
    <div class="message-layout">
      <!-- 栏2 - 平台账号列表 -->
      <div class="platform-accounts-column">
        <PlatformAccounts />
      </div>

      <!-- 栏3 - 会话列表 -->
      <div class="conversation-list-column">
        <ConversationList />
      </div>

      <!-- 栏4 - 聊天窗口 -->
      <div class="chat-window-column">
        <ChatWindow />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import { useMessageStore } from "@/stores/message";
import PlatformAccounts from "./components/PlatformAccounts.vue";
import ConversationList from "./components/ConversationList.vue";
import ChatWindow from "./components/ChatWindow.vue";

// 状态管理
const messageStore = useMessageStore();

// 生命周期
onMounted(async () => {
  console.log("🚀 私信管理页面已挂载");
  // 1. 初始化消息模块
  await messageStore.initialize();
  // 🔥 2. 直接调用自动启动监听（会自动过滤已监听账号）
  try {
    console.log("🔄 检查并启动新账号监听...");
    const { messageApi } = await import("@/api/message");
    const result = await messageApi.autoStartMonitoring();

    if (result && result.success && result.data) {
      const { started, failed, skipped } = result.data;
      console.log(
        `✅ 监听检查完成: 新启动${started}个, 跳过${skipped}个, 失败${failed}个`
      );

      // 如果有变化，刷新监听状态
      if (started > 0) {
        await messageStore.refreshMonitoringStatus();
      }
    }
  } catch (error) {
    console.warn("⚠️ 自动启动监听失败:", error);
    // 不阻断页面正常使用
  }
});

onUnmounted(() => {
  console.log("🔄 私信管理页面已卸载");
  messageStore.cleanup();
});
</script>

<style lang="scss" scoped>
.private-message {
  height: 100vh;
  background-color: #f8fafc;
  overflow: hidden;
}

.message-layout {
  display: flex;
  height: 100%;

  .platform-accounts-column {
    width: 200px;
    flex-shrink: 0;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
  }

  .conversation-list-column {
    width: 320px;
    flex-shrink: 0;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
  }

  .chat-window-column {
    flex: 1;
    background: #ffffff;
    min-width: 0; // 防止flex项目溢出
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .message-layout {
    .platform-accounts-column {
      width: 160px;
    }

    .conversation-list-column {
      width: 280px;
    }
  }
}

@media (max-width: 768px) {
  .message-layout {
    .platform-accounts-column {
      display: none; // 移动端隐藏账号列表
    }

    .conversation-list-column {
      width: 100%;
    }

    .chat-window-column {
      display: none; // 移动端默认隐藏聊天窗口，通过路由切换
    }
  }
}
</style>
