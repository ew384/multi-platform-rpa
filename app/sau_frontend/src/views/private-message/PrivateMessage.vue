<template>
  <div class="private-message">
    <!-- 4栏布局容器 -->
    <div class="message-layout">
      <!-- 栏2 - 平台账号列表 -->
      <div
        :class="[
          'platform-accounts-column',
          { collapsed: isAccountsCollapsed },
        ]"
        :style="{ width: accountsColumnWidth + 'px' }"
      >
        <PlatformAccounts :is-collapsed="isAccountsCollapsed" />

        <!-- 拖拽调整区域 -->
        <div
          class="accounts-resize-handle"
          @mouseenter="showAccountsResize = true"
          @mouseleave="showAccountsResize = false"
          @mousedown="startAccountsResize"
          :class="{ 'show-handle': showAccountsResize || isAccountsDragging }"
        >
          <div class="resize-indicator">
            <div class="resize-dots">
              <span></span>
            </div>
          </div>
        </div>
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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useMessageStore } from "@/stores/message";
import PlatformAccounts from "./components/PlatformAccounts.vue";
import ConversationList from "./components/ConversationList.vue";
import ChatWindow from "./components/ChatWindow.vue";
import messageApi from "@/api/message";
// 状态管理
const messageStore = useMessageStore();

// 账号栏折叠状态
const isAccountsCollapsed = ref(false);
const showAccountsResize = ref(false);
const isAccountsDragging = ref(false);
const dragStartX = ref(0);

// 固定宽度值
const ACCOUNTS_EXPANDED_WIDTH = 240;
const ACCOUNTS_COLLAPSED_WIDTH = 80;

// 计算当前宽度
const accountsColumnWidth = computed(() => {
  return isAccountsCollapsed.value
    ? ACCOUNTS_COLLAPSED_WIDTH
    : ACCOUNTS_EXPANDED_WIDTH;
});

// 拖拽调整账号栏
const startAccountsResize = (e) => {
  isAccountsDragging.value = true;
  dragStartX.value = e.clientX;
  document.addEventListener("mousemove", handleAccountsDrag);
  document.addEventListener("mouseup", stopAccountsDrag);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const handleAccountsDrag = (e) => {
  if (!isAccountsDragging.value) return;

  const deltaX = e.clientX - dragStartX.value;
  const threshold = 30;

  // 向右拖拽且当前是折叠状态 -> 展开
  if (deltaX > threshold && isAccountsCollapsed.value) {
    isAccountsCollapsed.value = false;
    stopAccountsDrag();
  }
  // 向左拖拽且当前是展开状态 -> 折叠
  else if (deltaX < -threshold && !isAccountsCollapsed.value) {
    isAccountsCollapsed.value = true;
    stopAccountsDrag();
  }
};

const stopAccountsDrag = () => {
  isAccountsDragging.value = false;
  document.removeEventListener("mousemove", handleAccountsDrag);
  document.removeEventListener("mouseup", stopAccountsDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};

// 生命周期 - 页面挂载
onMounted(async () => {
  console.log("🚀 私信管理页面已挂载");

  try {
    // 🔥 立即加载历史数据
    await messageStore.initialize();

    // 🔥 后台启动服务（用户无感知）
    initializeBackgroundServices();
  } catch (error) {
    console.warn("⚠️ 页面初始化失败:", error);
    showErrorState("页面加载失败，请刷新页面重试");
  }
});

// 🔥 后台服务初始化（完全自动化）
const initializeBackgroundServices = async () => {
  try {
    console.log("🔄 启动后台监听服务...");

    const result = await messageApi.initializeMonitoring();

    if (result.success) {
      console.log(`✅ 后台服务就绪`);

      // 🔥 无论是新启动还是已存在，都刷新状态
      setTimeout(() => {
        messageStore.refreshMonitoringStatus();
        messageStore.refreshUnreadCounts();
      }, 1000);

      // 🔥 只有在有验证失败的账号时才提示
      if (result.summary && result.summary.validationFailed > 0) {
        ElMessage({
          message: `${result.summary.validationFailed} 个账号需要重新登录`,
          type: "warning",
          duration: 8000,
          showClose: true,
        });
      }
    } else {
      console.warn("⚠️ 后台服务启动失败:", result.error);
      // 🔥 只有真正的错误才提示用户
      ElMessage({
        message: "后台监听服务启动失败，请刷新页面重试",
        type: "error",
        duration: 5000,
        showClose: true,
      });
    }
  } catch (error) {
    console.warn("⚠️ 后台服务启动异常:", error);
    ElMessage({
      message: "服务连接异常，请检查网络后重试",
      type: "error",
      duration: 5000,
      showClose: true,
    });
  }
};
// 🔥 显示错误状态
const showErrorState = (message) => {
  ElMessage({
    message,
    type: "error",
    duration: 0, // 不自动消失
    showClose: true,
  });
};
onUnmounted(() => {
  console.log("🔄 私信管理页面已卸载");
  messageStore.cleanup();

  if (isAccountsDragging.value) {
    stopAccountsDrag();
  }
});
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$border-primary: #e2e8f0;
$border-secondary: #cbd5e1;
$shadow-soft: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-medium: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$radius-lg: 12px;
$radius-xl: 16px;

.private-message {
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 240px; // 默认位置
  right: 0;
  bottom: 0;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 添加过渡动画
}
:global(body.private-message-layout) {
  .private-message {
    left: var(--sidebar-width, 240px); // 使用CSS变量
  }
}

// 添加CSS变量的更新：当侧边栏折叠时
:global(body.private-message-layout.sidebar-collapsed) {
  .private-message {
    left: 64px;
  }
}
.message-layout {
  display: flex;
  height: 100%;

  .platform-accounts-column {
    flex-shrink: 0;
    background: $bg-primary;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: $shadow-soft;

    &.collapsed {
      width: 80px !important;
    }

    // 拖拽调整区域
    .accounts-resize-handle {
      position: absolute;
      top: 0;
      right: -4px;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;

      &:hover,
      &.show-handle {
        .resize-indicator {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .resize-indicator {
        width: 4px;
        height: 60px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 2px;
        position: relative;
        opacity: 0;
        transform: translateX(4px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(99, 102, 241, 0.2);

        &:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
        }

        .resize-dots {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          gap: 2px;

          span {
            width: 2px;
            height: 2px;
            background: rgba(99, 102, 241, 0.6);
            border-radius: 50%;
            display: block;
          }
        }
      }

      &:active .resize-indicator {
        background: rgba(99, 102, 241, 0.3);
        border-color: rgba(99, 102, 241, 0.4);
      }
    }
  }

  .conversation-list-column {
    width: 320px;
    flex-shrink: 0;
    background: $bg-secondary;
    border-radius: $radius-lg $radius-lg 0 0;
    box-shadow: $shadow-soft;
    overflow: hidden;
  }

  .chat-window-column {
    flex: 1;
    background: $bg-primary;
    border-radius: $radius-lg 0 0 0;
    box-shadow: $shadow-medium;
    min-width: 0;
    overflow: hidden;
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .message-layout {
    .platform-accounts-column {
      &:not(.collapsed) {
        width: 200px !important;
      }
    }

    .conversation-list-column {
      width: 280px;
    }
  }
}

@media (max-width: 768px) {
  .message-layout {
    .platform-accounts-column {
      display: none;
    }

    .conversation-list-column {
      width: 100%;
      border-radius: $radius-lg $radius-lg 0 0;
    }

    .chat-window-column {
      display: none;
      border-radius: 0;
    }
  }
}
</style>
