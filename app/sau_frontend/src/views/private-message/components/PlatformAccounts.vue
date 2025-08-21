<template>
  <div class="platform-accounts">
    <!-- 顶部统计区域 -->
    <div class="stats-section" v-show="!isCollapsed"></div>

    <!-- 折叠状态下的简化统计 -->
    <div class="collapsed-stats" v-show="isCollapsed">
      <div
        class="mini-stat unread"
        :title="`${messageStore.totalUnreadCount} 条未读消息`"
      >
        <el-icon><Bell /></el-icon>
        <span class="mini-count" v-if="messageStore.totalUnreadCount > 0">
          {{
            messageStore.totalUnreadCount > 99
              ? "99+"
              : messageStore.totalUnreadCount
          }}
        </span>
      </div>
    </div>

    <!-- 账号列表区域 -->
    <div class="accounts-section">
      <!-- 展开状态 - 卡片式布局 -->
      <div v-if="!isCollapsed" class="accounts-expanded">
        <div class="section-header">
          <h3 class="section-title">账号列表</h3>
          <span class="accounts-count">{{ totalAccountsCount }}</span>
        </div>

        <div class="accounts-grid">
          <div
            v-for="account in accountStore.accounts"
            :key="`${account.platform}_${account.id}`"
            :class="[
              'account-card',
              {
                active: isAccountSelected(
                  account.platform,
                  account.id,
                  account.userName
                ),
                monitoring: isAccountMonitoring(account.platform, account.id),
                'has-unread':
                  getAccountUnreadCount(account.platform, account.id) > 0,
              },
            ]"
            @click="handleSelectAccount(account)"
          >
            <!-- 账号头像区域 -->
            <div class="account-avatar-section">
              <div class="avatar-container">
                <el-avatar
                  :size="48"
                  :src="getAvatarUrl(account)"
                  @error="handleAvatarError"
                  class="account-avatar"
                />

                <!-- 平台Logo -->
                <div class="platform-badge">
                  <img
                    :src="getPlatformLogo(account.platform)"
                    :alt="account.platform"
                    @error="handleLogoError"
                  />
                </div>

                <!-- 状态指示器 -->
                <div
                  :class="['status-indicator', getAccountStatus(account)]"
                ></div>

                <!-- 未读消息红点 -->
                <div
                  v-if="getAccountUnreadCount(account.platform, account.id) > 0"
                  class="unread-badge"
                >
                  {{
                    getAccountUnreadCount(account.platform, account.id) > 99
                      ? "99+"
                      : getAccountUnreadCount(account.platform, account.id)
                  }}
                </div>
              </div>
            </div>

            <!-- 账号信息区域 -->
            <div class="account-info-section">
              <div class="account-name">{{ account.userName }}</div>
              <div class="account-platform">{{ account.platform }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 折叠状态 - 圆形头像列表 -->
      <div v-else class="accounts-collapsed">
        <div
          v-for="account in accountStore.accounts"
          :key="`${account.platform}_${account.id}`"
          :class="[
            'account-circle',
            {
              active: isAccountSelected(
                account.platform,
                account.id,
                account.userName
              ),
              monitoring: isAccountMonitoring(account.platform, account.id),
              'has-unread':
                getAccountUnreadCount(account.platform, account.id) > 0,
            },
          ]"
          @click="handleSelectAccount(account)"
          :title="`${account.userName} (${account.platform})`"
        >
          <div class="circle-avatar-container">
            <el-avatar
              :size="40"
              :src="getAvatarUrl(account)"
              @error="handleAvatarError"
              class="circle-avatar"
            />

            <!-- 平台Logo小标识 -->
            <div class="mini-platform-badge">
              <img
                :src="getPlatformLogo(account.platform)"
                :alt="account.platform"
                @error="handleLogoError"
              />
            </div>

            <!-- 状态点 -->
            <div :class="['mini-status-dot', getAccountStatus(account)]"></div>

            <!-- 未读红点 -->
            <div
              v-if="getAccountUnreadCount(account.platform, account.id) > 0"
              class="mini-unread-dot"
            >
              {{
                getAccountUnreadCount(account.platform, account.id) > 9
                  ? "9+"
                  : getAccountUnreadCount(account.platform, account.id)
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Bell, Connection } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useAccountStore } from "@/stores/account";
import { useMessageStore } from "@/stores/message";
import {
  getPlatformKey,
  getAccountKey,
  getPlatformLogo,
} from "@/utils/platform";

// Props
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

// 状态管理
const accountStore = useAccountStore();
const messageStore = useMessageStore();

// 计算属性
const totalAccountsCount = computed(() => {
  return accountStore.accounts.length;
});

// 获取头像URL
const getAvatarUrl = (account) => {
  if (account.local_avatar && account.local_avatar !== "/default-avatar.png") {
    return account.local_avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${account.local_avatar}`
      : account.local_avatar;
  }

  if (account.avatar_url && account.avatar_url !== "/default-avatar.png") {
    return account.avatar_url;
  }

  if (account.avatar && account.avatar !== "/default-avatar.png") {
    return account.avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${account.avatar}`
      : account.avatar;
  }

  if (account.userName && account.platform) {
    const platformKey = getPlatformKey(account.platform);
    if (platformKey !== account.platform.toLowerCase()) {
      return `http://localhost:3409/assets/avatar/${platformKey}/${account.userName}/avatar.jpg`;
    }
  }

  return "/default-avatar.png";
};

// 账号状态相关方法
const getAccountStatus = (account) => {
  const accountKey = getAccountKey(account.platform, account.userName);
  const isMonitoring = messageStore.monitoringStatus[accountKey];

  if (account.status === "异常") return "error";
  if (isMonitoring) return "monitoring";
  return "normal";
};

const isAccountMonitoring = (platform, accountId) => {
  const accountKey = getAccountKey(platform, accountId);
  return messageStore.monitoringStatus[accountKey] || false;
};

const isAccountSelected = (platform, accountId, userName) => {
  const platformKey = getPlatformKey(platform);
  return (
    messageStore.selectedAccount &&
    messageStore.selectedAccount.platform === platformKey &&
    messageStore.selectedAccount.accountId === userName
  );
};

const getAccountUnreadCount = (platform, accountId) => {
  const accountKey = getAccountKey(platform, accountId);
  return messageStore.unreadCounts[accountKey] || 0;
};

// 事件处理
const handleSelectAccount = async (account) => {
  try {
    console.log("🔄 选择账号:", account.userName);
    const platformKey = getPlatformKey(account.platform);

    await messageStore.selectAccount(
      platformKey,
      account.userName,
      account.userName
    );

    await messageStore.refreshUnreadCount(platformKey, account.userName);
  } catch (error) {
    console.error("选择账号失败:", error);
    ElMessage.error("加载账号会话失败");
  }
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

const handleLogoError = (e) => {
  console.error("❌ 平台logo加载失败:", e.target.src);
};

// 生命周期
onMounted(async () => {
  console.log("🚀 平台账号组件已挂载");

  if (accountStore.accounts.length === 0) {
    try {
      await accountStore.loadAccounts();
    } catch (error) {
      console.error("加载账号数据失败:", error);
    }
  }

  await messageStore.refreshMonitoringStatus();
  await messageStore.refreshUnreadCounts();
});
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$primary-light: #a5b4fc;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$bg-accent: rgba(99, 102, 241, 0.05);

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
$radius-full: 9999px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 12px;
$space-lg: 16px;
$space-xl: 20px;
$space-2xl: 24px;

.platform-accounts {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
  padding: $space-lg;
  overflow: hidden;
}

// 顶部统计区域
.stats-section {
  margin-bottom: $space-xl;
  display: flex;
  flex-direction: column;
  gap: $space-md;

  .stat-card {
    background: linear-gradient(135deg, $bg-secondary 0%, $bg-tertiary 100%);
    border-radius: $radius-lg;
    padding: $space-lg;
    display: flex;
    align-items: center;
    gap: $space-md;
    border: 1px solid $border-lighter;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: $radius-md;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .el-icon {
        font-size: 18px;
        color: $text-white;
      }
    }

    &.unread .stat-icon {
      background: linear-gradient(135deg, $danger 0%, #f87171 100%);
    }

    &.monitoring .stat-icon {
      background: linear-gradient(135deg, $success 0%, #34d399 100%);
    }

    .stat-content {
      .stat-number {
        font-size: 20px;
        font-weight: 700;
        color: $text-primary;
        line-height: 1.2;
        margin-bottom: 2px;
      }

      .stat-label {
        font-size: 12px;
        color: $text-secondary;
        line-height: 1.2;
        font-weight: 500;
      }
    }
  }
}

// 折叠状态统计
.collapsed-stats {
  margin-bottom: $space-xl;
  display: flex;
  justify-content: center;

  .mini-stat {
    position: relative;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, $danger 0%, #f87171 100%);
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: $shadow-lg;
    }

    .el-icon {
      font-size: 16px;
      color: $text-white;
    }

    .mini-count {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      background: $text-white;
      color: $danger;
      font-size: 10px;
      font-weight: 700;
      border-radius: $radius-full;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: $shadow-sm;
      border: 2px solid $danger;
    }
  }
}

// 账号列表区域
.accounts-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// 展开状态
.accounts-expanded {
  height: 100%;
  display: flex;
  flex-direction: column;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-lg;
    padding-bottom: $space-md;
    border-bottom: 1px solid $border-light;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin: 0;
    }

    .accounts-count {
      background: $bg-accent;
      color: $primary;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: $radius-sm;
    }
  }

  .accounts-grid {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $space-md;

    .account-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: $bg-secondary;
      border: 1px solid $border-light;
      border-radius: $radius-lg;
      padding: 12px 16px; // 调整内边距
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: transparent;
        transition: all 0.3s ease;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-lg;
        border-color: $primary-light;

        &::before {
          background: linear-gradient(90deg, $primary 0%, $primary-light 100%);
        }
      }

      &.active {
        background: $bg-accent;
        border-color: $primary;
        box-shadow: $shadow-md;

        &::before {
          background: linear-gradient(90deg, $primary 0%, $primary-light 100%);
        }
      }

      &.monitoring {
        border-left: 3px solid $success;
      }

      &.has-unread {
        background: rgba(239, 68, 68, 0.02);
        border-color: rgba(239, 68, 68, 0.2);
      }

      .account-avatar-section {
        display: flex;
        margin-bottom: 0;

        .avatar-container {
          position: relative;

          .account-avatar {
            width: 40px !important;
            height: 40px !important;
            border: 2px solid $text-white;
            box-shadow: $shadow-sm;
          }

          .platform-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 20px;
            height: 20px;
            background: $text-white;
            border-radius: $radius-full;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: $shadow-sm;
            border: 2px solid $text-white;

            img {
              width: 14px;
              height: 14px;
              border-radius: $radius-full;
              object-fit: cover;
            }
          }

          .status-indicator {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            border-radius: $radius-full;
            border: 2px solid $text-white;
            box-shadow: $shadow-xs;

            &.monitoring {
              background: $success;
            }

            &.normal {
              background: $info;
            }

            &.error {
              background: $danger;
            }
          }

          .unread-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            min-width: 20px;
            height: 20px;
            background: $danger;
            color: $text-white;
            font-size: 10px;
            font-weight: 700;
            border-radius: $radius-full;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 6px;
            box-shadow: $shadow-sm;
            border: 2px solid $text-white;
          }
        }
      }

      .account-info-section {
        text-align: center;

        .account-name {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .account-platform {
          font-size: 11px;
          color: $text-muted;
          margin-bottom: 4px;
          background: $bg-tertiary;
          padding: 2px 6px;
          border-radius: $radius-sm;
          display: inline-block;
        }

        .account-status-text {
          font-size: 10px;
          font-weight: 500;

          &:has(.monitoring) {
            color: $success;
          }

          &:has(.normal) {
            color: $text-muted;
          }

          &:has(.error) {
            color: $danger;
          }
        }
      }
    }

    // 滚动条样式
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
}

// 折叠状态
.accounts-collapsed {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-lg;
  padding-top: $space-md;

  .account-circle {
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      transform: scale(1.1);
    }

    &.active {
      .circle-avatar-container .circle-avatar {
        border-color: $primary;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      }
    }

    &.monitoring {
      &::before {
        content: "";
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border: 2px solid $success;
        border-radius: $radius-full;
        opacity: 0.6;
      }
    }

    &.has-unread {
      .circle-avatar-container .circle-avatar {
        border-color: $danger;
      }
    }

    .circle-avatar-container {
      position: relative;

      .circle-avatar {
        border: 2px solid $border-light;
        box-shadow: $shadow-sm;
        transition: all 0.3s ease;
      }

      .mini-platform-badge {
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 14px;
        height: 14px;
        background: $text-white;
        border-radius: $radius-full;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: $shadow-xs;
        border: 1px solid $border-light;

        img {
          width: 10px;
          height: 10px;
          border-radius: $radius-full;
          object-fit: cover;
        }
      }

      .mini-status-dot {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        border-radius: $radius-full;
        border: 1px solid $text-white;

        &.monitoring {
          background: $success;
        }

        &.normal {
          background: $info;
        }

        &.error {
          background: $danger;
        }
      }

      .mini-unread-dot {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 16px;
        height: 16px;
        background: $danger;
        color: $text-white;
        font-size: 9px;
        font-weight: 700;
        border-radius: $radius-full;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: $shadow-sm;
        border: 2px solid $text-white;
      }
    }
  }

  // 滚动条样式
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
</style>
