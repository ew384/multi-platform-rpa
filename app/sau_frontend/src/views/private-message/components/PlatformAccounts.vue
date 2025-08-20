<template>
  <div class="platform-accounts">
    <!-- 顶部统计卡片 -->
    <div class="stats-header">
      <div class="stat-item">
        <div class="stat-icon unread">
          <el-icon><Message /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ messageStore.totalUnreadCount }}</div>
          <div class="stat-label">总未读</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon monitoring">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">
            {{ messageStore.activeMonitoringCount }}/{{ totalAccountsCount }}
          </div>
          <div class="stat-label">监听中</div>
        </div>
      </div>
    </div>

    <!-- 平台分组区域 -->
    <div class="platforms-section">
      <div
        v-for="platformGroup in platformGroups"
        :key="platformGroup.platform"
        class="platform-group"
      >
        <!-- 平台分组标题 -->
        <div
          class="platform-header"
          @click="togglePlatform(platformGroup.platform)"
        >
          <div class="platform-info">
            <img
              :src="getPlatformLogo(platformGroup.platform)"
              :alt="platformGroup.platform"
              class="platform-logo"
            />
            <span class="platform-name">{{ platformGroup.platform }}</span>
            <span class="account-count"
              >({{ platformGroup.accounts.length }})</span
            >
          </div>
          <el-icon
            class="expand-icon"
            :class="{
              expanded: expandedPlatforms.includes(platformGroup.platform),
            }"
          >
            <ArrowDown />
          </el-icon>
        </div>

        <!-- 平台账号列表 -->
        <div
          v-show="expandedPlatforms.includes(platformGroup.platform)"
          class="platform-accounts-list"
        >
          <div
            v-for="account in platformGroup.accounts"
            :key="`${account.platform}_${account.id}`"
            :class="[
              'account-item',
              {
                active: isAccountSelected(
                  account.platform,
                  account.id,
                  account.userName
                ),
                monitoring: isAccountMonitoring(account.platform, account.id),
              },
            ]"
            @click="handleSelectAccount(account)"
          >
            <!-- 账号头像 -->
            <div class="account-avatar-container">
              <el-avatar
                :size="32"
                :src="getAvatarUrl(account)"
                @error="handleAvatarError"
              />
              <div
                :class="['status-dot', getAccountStatus(account)]"
                :title="getAccountStatusText(account)"
              ></div>
              <!-- 未读数红点 -->
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

            <!-- 账号信息 -->
            <div class="account-info">
              <div class="account-name">{{ account.userName }}</div>
              <div class="account-status">
                <span :class="['status-text', getAccountStatus(account)]">
                  {{ getAccountStatusText(account) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="actions-footer">
      <el-button
        size="small"
        type="primary"
        @click="handleBatchMonitoring"
        :loading="isBatchOperating"
        class="batch-action-btn"
      >
        <el-icon><Setting /></el-icon>
        批量监听设置
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  Message,
  VideoCamera,
  ArrowDown,
  Setting,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useAccountStore } from "@/stores/account";
import { useMessageStore } from "@/stores/message";

// 状态管理
const accountStore = useAccountStore();
const messageStore = useMessageStore();

// 本地状态
const expandedPlatforms = ref(["抖音", "视频号", "小红书", "快手"]); // 默认全部展开
const isBatchOperating = ref(false);

// 计算属性
const platformGroups = computed(() => {
  // 按平台分组账号
  const groups = {};

  accountStore.accounts.forEach((account) => {
    const platform = account.platform;
    if (!groups[platform]) {
      groups[platform] = {
        platform,
        accounts: [],
      };
    }
    groups[platform].accounts.push(account);
  });

  return Object.values(groups);
});

const totalAccountsCount = computed(() => {
  return accountStore.accounts.length;
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

// 获取头像URL（复用AccountManagement的逻辑）
const getAvatarUrl = (account) => {
  // 优先使用数据库中的头像字段
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

  // 当头像字段为空，构造可能的本地路径
  if (account.userName && account.platform) {
    const platformMap = {
      抖音: "douyin",
      快手: "kuaishou",
      视频号: "wechat",
      微信视频号: "wechat",
      小红书: "xiaohongshu",
    };

    const platformKey = platformMap[account.platform];
    if (platformKey) {
      return `http://localhost:3409/assets/avatar/${platformKey}/${account.userName}/avatar.jpg`;
    }
  }

  return "/default-avatar.png";
};

// 账号状态相关
const getAccountStatus = (account) => {
  // 检查监听状态
  const accountKey = `${account.platform}_${account.id}`;
  const isMonitoring = messageStore.monitoringStatus[accountKey];

  if (account.status === "异常") return "error";
  if (isMonitoring) return "monitoring";
  return "normal";
};

const getAccountStatusText = (account) => {
  const status = getAccountStatus(account);
  const statusMap = {
    monitoring: "监听中",
    normal: "未监听",
    error: "异常",
  };
  return statusMap[status] || "未知";
};

const isAccountMonitoring = (platform, accountId) => {
  const accountKey = `${platform}_${accountId}`;
  return messageStore.monitoringStatus[accountKey] || false;
};

const isAccountSelected = (platform, accountId, userName) => {
  return (
    messageStore.selectedAccount &&
    messageStore.selectedAccount.platform === platform &&
    messageStore.selectedAccount.accountId === accountId &&
    messageStore.selectedAccount.userName === userName
  );
};

const getAccountUnreadCount = (platform, accountId) => {
  const accountKey = `${platform}_${accountId}`;
  return messageStore.unreadCounts[accountKey] || 0;
};

// 事件处理
const togglePlatform = (platform) => {
  const index = expandedPlatforms.value.indexOf(platform);
  if (index > -1) {
    expandedPlatforms.value.splice(index, 1);
  } else {
    expandedPlatforms.value.push(platform);
  }
};

const handleSelectAccount = async (account) => {
  try {
    console.log("🔄 选择账号:", account.userName);
    await messageStore.selectAccount(
      account.platform,
      account.id,
      account.userName
    );

    // 刷新该账号的未读数
    await messageStore.refreshUnreadCount(account.platform, account.id);
  } catch (error) {
    console.error("选择账号失败:", error);
    ElMessage.error("加载账号会话失败");
  }
};

const handleBatchMonitoring = async () => {
  // TODO: 实现批量监听设置对话框
  ElMessage.info("批量监听设置功能开发中");
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

// 生命周期
onMounted(async () => {
  console.log("🚀 平台账号组件已挂载");

  // 确保账号数据已加载
  if (accountStore.accounts.length === 0) {
    try {
      await accountStore.loadAccounts();
    } catch (error) {
      console.error("加载账号数据失败:", error);
    }
  }

  // 刷新监听状态和未读数
  await messageStore.refreshMonitoringStatus();
  await messageStore.refreshUnreadCounts();
});
</script>

<style lang="scss" scoped>
$primary: #5b73de;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-gray: #f1f5f9;

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

.platform-accounts {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-white;
}

// 顶部统计卡片
.stats-header {
  padding: $space-md;
  border-bottom: 1px solid $border-light;
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  flex-shrink: 0;

  .stat-item {
    display: flex;
    align-items: center;
    gap: $space-sm;
    padding: $space-sm;
    background: $bg-light;
    border-radius: $radius-md;

    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .el-icon {
        font-size: 16px;
        color: white;
      }

      &.unread {
        background: linear-gradient(135deg, $danger 0%, #f87171 100%);
      }

      &.monitoring {
        background: linear-gradient(135deg, $success 0%, #34d399 100%);
      }
    }

    .stat-content {
      .stat-number {
        font-size: 16px;
        font-weight: 700;
        color: $text-primary;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 12px;
        color: $text-secondary;
        line-height: 1.2;
      }
    }
  }
}

// 平台分组区域
.platforms-section {
  flex: 1;
  overflow-y: auto;
  padding: $space-sm 0;

  .platform-group {
    margin-bottom: $space-xs;

    .platform-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $space-sm $space-md;
      cursor: pointer;
      transition: background-color 0.3s ease;
      border-radius: $radius-md;
      margin: 0 $space-sm;

      &:hover {
        background-color: $bg-light;
      }

      .platform-info {
        display: flex;
        align-items: center;
        gap: $space-sm;

        .platform-logo {
          width: 20px;
          height: 20px;
          border-radius: $radius-sm;
          object-fit: cover;
        }

        .platform-name {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
        }

        .account-count {
          font-size: 12px;
          color: $text-muted;
        }
      }

      .expand-icon {
        transition: transform 0.3s ease;
        color: $text-muted;

        &.expanded {
          transform: rotate(180deg);
        }
      }
    }

    .platform-accounts-list {
      padding: 0 $space-sm;

      .account-item {
        display: flex;
        align-items: center;
        gap: $space-sm;
        padding: $space-sm;
        margin-bottom: $space-xs;
        border-radius: $radius-md;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;

        &:hover {
          background-color: $bg-light;
        }

        &.active {
          background-color: rgba(91, 115, 222, 0.1);
          border-left: 3px solid $primary;
        }

        &.monitoring {
          &::before {
            content: "";
            position: absolute;
            left: 4px;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            background-color: $success;
            border-radius: 2px;
          }
        }

        .account-avatar-container {
          position: relative;
          flex-shrink: 0;

          :deep(.el-avatar) {
            border: 2px solid #f1f5f9;
            box-shadow: $shadow-sm;
          }

          .status-dot {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: $shadow-sm;

            &.monitoring {
              background-color: $success;
            }

            &.normal {
              background-color: $info;
            }

            &.error {
              background-color: $danger;
            }
          }

          .unread-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 16px;
            height: 16px;
            background: $danger;
            color: white;
            font-size: 10px;
            font-weight: 600;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border: 2px solid white;
            box-shadow: $shadow-sm;
          }
        }

        .account-info {
          flex: 1;
          min-width: 0;

          .account-name {
            font-size: 13px;
            font-weight: 500;
            color: $text-primary;
            line-height: 1.2;
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .account-status {
            .status-text {
              font-size: 11px;
              line-height: 1.2;

              &.monitoring {
                color: $success;
              }

              &.normal {
                color: $text-muted;
              }

              &.error {
                color: $danger;
              }
            }
          }
        }
      }
    }
  }
}

// 底部操作区
.actions-footer {
  padding: $space-md;
  border-top: 1px solid $border-light;
  flex-shrink: 0;

  .batch-action-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-xs;
    font-size: 12px;
    height: 36px;
  }
}

// 滚动条样式
.platforms-section {
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
