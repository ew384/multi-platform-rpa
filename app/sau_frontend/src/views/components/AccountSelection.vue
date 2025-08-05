<template>
  <div class="account-selection">
    <div class="accounts-layout">
      <!-- 左侧分组栏 -->
      <div class="groups-sidebar">
        <div class="sidebar-header">
          <h5>选择分组</h5>
        </div>

        <!-- 平台分组 -->
        <div class="platform-groups">
          <div class="group-category-title">平台分组</div>
          <div
            v-for="platformGroup in platformGroups"
            :key="platformGroup.id"
            :class="[
              'sidebar-group-item',
              {
                active:
                  selectedGroupType === 'platform' &&
                  selectedGroupId === platformGroup.id,
                'has-accounts': platformGroup.accounts.length > 0,
              },
            ]"
            @click="selectPlatformGroup(platformGroup)"
          >
            <div class="group-icon platform-logo-container">
              <img
                v-if="platformGroup.logo"
                :src="platformGroup.logo"
                :alt="platformGroup.name"
                @error="handleLogoError"
              />
              <div v-else class="logo-placeholder">
                {{ platformGroup.name.charAt(0) }}
              </div>
            </div>
            <div class="group-info">
              <span class="group-name">{{ platformGroup.name }}</span>
              <span class="group-count">{{
                platformGroup.accounts.length
              }}</span>
            </div>
          </div>
        </div>

        <!-- 自定义分组 -->
        <div class="custom-groups" v-if="customGroups.length > 0">
          <div class="group-category-title">自定义分组</div>
          <div
            v-for="group in customGroups"
            :key="group.id"
            :class="[
              'sidebar-group-item',
              {
                active:
                  selectedGroupType === 'custom' &&
                  selectedGroupId === group.id,
                'has-accounts': getAccountsInGroup(group.id).length > 0,
              },
            ]"
            @click="selectCustomGroup(group)"
          >
            <div
              class="group-icon"
              :style="{ backgroundColor: group.color || '#5b73de' }"
            >
              <el-icon>
                <component :is="getGroupIcon(group.icon)" />
              </el-icon>
            </div>
            <div class="group-info">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{
                getAccountsInGroup(group.id).length
              }}</span>
            </div>
          </div>
        </div>

        <!-- 全部账号 -->
        <div class="all-accounts-group">
          <div
            :class="[
              'sidebar-group-item',
              {
                active: selectedGroupType === 'all',
              },
            ]"
            @click="selectAllAccounts"
          >
            <div class="group-icon all-accounts">
              <el-icon><User /></el-icon>
            </div>
            <div class="group-info">
              <span class="group-name">全部账号</span>
              <span class="group-count">{{
                availableAccounts.length
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧账号列表 -->
      <div class="accounts-main">
        <!-- 账号选择区域头部 -->
        <div class="accounts-header">
          <div class="header-left">
            <h5>{{ getCurrentGroupTitle() }}</h5>
            <!-- 全选功能 -->
            <div
              class="select-all-control"
              @click="handleSelectAllInCurrentGroup"
            >
              <div
                :class="[
                  'custom-checkbox',
                  {
                    checked: isCurrentGroupAllSelected,
                    indeterminate: isCurrentGroupPartialSelected,
                  },
                ]"
              >
                <el-icon v-if="isCurrentGroupAllSelected">
                  <Check />
                </el-icon>
                <el-icon v-else-if="isCurrentGroupPartialSelected">
                  <Minus />
                </el-icon>
              </div>
              <span class="select-all-text">全选当前分组</span>
            </div>
          </div>
          <div class="header-right">
            <span class="selected-count">
              已选择 {{ localSelectedAccounts.length }} 个账号
            </span>
            <el-button
              v-if="localSelectedAccounts.length > 0"
              size="small"
              @click="clearAccountSelection"
            >
              清空选择
            </el-button>
          </div>
        </div>

        <!-- 账号网格 -->
        <div class="accounts-grid">
          <div
            v-for="account in currentGroupAccounts"
            :key="account.id"
            :class="[
              'account-card',
              {
                selected: localSelectedAccounts.includes(account.id),
                disabled: account.status !== '正常',
              },
            ]"
            @click="toggleAccountSelection(account)"
          >
            <div class="account-avatar">
              <div class="avatar-container">
                <el-avatar
                  :size="40"
                  :src="getAvatarUrl(account)"
                  @error="handleAvatarError"
                >
                  <span>{{ account.userName ? account.userName.charAt(0) : 'U' }}</span>
                </el-avatar>
                <div class="platform-logo">
                  <img
                    v-if="getPlatformLogo(account.platform)"
                    :src="getPlatformLogo(account.platform)"
                    :alt="account.platform"
                    @error="handlePlatformLogoError"
                  />
                  <div v-else class="platform-text">
                    {{ account.platform ? account.platform.charAt(0) : 'P' }}
                  </div>
                </div>
                <div
                  :class="[
                    'status-dot',
                    account.status === '正常' ? 'online' : 'offline',
                  ]"
                ></div>
                <div
                  v-if="localSelectedAccounts.includes(account.id)"
                  class="selected-mark"
                >
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </div>
            <div class="account-info">
              <div class="account-name">{{ account.userName || '未命名账号' }}</div>
              <div v-if="account.group_name" class="account-group">
                <el-tag
                  :color="account.group_color"
                  size="small"
                  effect="dark"
                >
                  {{ account.group_name }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="currentGroupAccounts.length === 0" class="empty-accounts">
          <el-empty description="当前分组暂无账号" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { User, Check, Minus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  selectedAccounts: {
    type: Array,
    default: () => []
  },
  availableAccounts: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['update:selected-accounts']);

// 响应式数据
const selectedGroupType = ref('all'); // 'platform', 'custom', 'all'
const selectedGroupId = ref(null);
const groups = ref([]); // 存储分组信息

// 本地选中状态
const localSelectedAccounts = ref([...props.selectedAccounts]);

// 监听 props 变化
watch(() => props.selectedAccounts, (newValue) => {
  localSelectedAccounts.value = [...newValue];
});

// 监听本地选中状态变化，同步到父组件
watch(localSelectedAccounts, (newValue) => {
  emit('update:selected-accounts', [...newValue]);
}, { deep: true });

// 计算属性
const availableAccounts = computed(() => props.availableAccounts || []);

// 平台分组
const platformGroups = computed(() => {
  const platforms = [
    ...new Set(availableAccounts.value.map((acc) => acc.platform)),
  ];

  return platforms.map((platform) => ({
    id: `platform_${platform}`,
    name: platform,
    type: "platform",
    accounts: availableAccounts.value.filter(
      (acc) => acc.platform === platform
    ),
    logo: getPlatformLogo(platform),
  }));
});

// 自定义分组
const customGroups = computed(() => {
  const platformNames = ["微信视频号", "抖音", "快手", "小红书", "视频号"];
  return groups.value.filter(
    (group) => !platformNames.includes(group.name)
  );
});

// 当前分组的账号
const currentGroupAccounts = computed(() => {
  if (selectedGroupType.value === "all") {
    return availableAccounts.value;
  } else if (selectedGroupType.value === "platform") {
    const group = platformGroups.value.find(
      (g) => g.id === selectedGroupId.value
    );
    return group ? group.accounts : [];
  } else if (selectedGroupType.value === "custom") {
    return getAccountsInGroup(selectedGroupId.value);
  }
  return [];
});

// 当前分组是否全选
const isCurrentGroupAllSelected = computed(() => {
  const currentAccounts = currentGroupAccounts.value.filter(
    (acc) => acc.status === "正常"
  );
  if (currentAccounts.length === 0) return false;

  return currentAccounts.every((acc) =>
    localSelectedAccounts.value.includes(acc.id)
  );
});

// 当前分组是否部分选中
const isCurrentGroupPartialSelected = computed(() => {
  const currentAccounts = currentGroupAccounts.value.filter(
    (acc) => acc.status === "正常"
  );
  if (currentAccounts.length === 0) return false;

  const selectedCount = currentAccounts.filter((acc) =>
    localSelectedAccounts.value.includes(acc.id)
  ).length;

  return selectedCount > 0 && selectedCount < currentAccounts.length;
});

// 方法定义
const selectPlatformGroup = (platformGroup) => {
  selectedGroupType.value = "platform";
  selectedGroupId.value = platformGroup.id;
};

const selectCustomGroup = (group) => {
  selectedGroupType.value = "custom";
  selectedGroupId.value = group.id;
};

const selectAllAccounts = () => {
  selectedGroupType.value = "all";
  selectedGroupId.value = null;
};

const getCurrentGroupTitle = () => {
  if (selectedGroupType.value === "all") {
    return "全部账号";
  } else if (selectedGroupType.value === "platform") {
    const group = platformGroups.value.find(
      (g) => g.id === selectedGroupId.value
    );
    return group ? `${group.name} 平台账号` : "平台账号";
  } else if (selectedGroupType.value === "custom") {
    const group = customGroups.value.find(
      (g) => g.id === selectedGroupId.value
    );
    return group ? `${group.name} 分组` : "自定义分组";
  }
  return "账号列表";
};

const handleSelectAllInCurrentGroup = () => {
  const currentAccounts = currentGroupAccounts.value.filter(
    (acc) => acc.status === "正常"
  );
  const isAllSelected = isCurrentGroupAllSelected.value;

  if (isAllSelected) {
    // 取消选中当前分组的所有账号
    const newSelected = localSelectedAccounts.value.filter(
      accountId => !currentAccounts.some(acc => acc.id === accountId)
    );
    localSelectedAccounts.value = newSelected;
  } else {
    // 选中当前分组的所有账号
    const newSelected = [...localSelectedAccounts.value];
    currentAccounts.forEach((acc) => {
      if (!newSelected.includes(acc.id)) {
        newSelected.push(acc.id);
      }
    });
    localSelectedAccounts.value = newSelected;
  }
};

const toggleAccountSelection = (account) => {
  if (account.status !== "正常") return;

  const newSelected = [...localSelectedAccounts.value];
  const index = newSelected.indexOf(account.id);
  
  if (index > -1) {
    newSelected.splice(index, 1);
  } else {
    newSelected.push(account.id);
  }
  
  localSelectedAccounts.value = newSelected;
};

const clearAccountSelection = () => {
  localSelectedAccounts.value = [];
};

const getAvatarUrl = (account) => {
  if (account.avatar && account.avatar !== "/default-avatar.png") {
    if (account.avatar.startsWith("assets/avatar/")) {
      return `http://localhost:3409/${account.avatar}`;
    }
    return account.avatar;
  }
  return null; // 让 el-avatar 显示默认内容
};

const handleAvatarError = (e) => {
  console.warn("头像加载失败:", e);
  // el-avatar 会自动显示 fallback 内容
};

const handleLogoError = (e) => {
  console.warn("平台logo加载失败:", e);
  e.target.style.display = 'none';
};

const handlePlatformLogoError = (e) => {
  console.warn("平台logo加载失败:", e);
  e.target.style.display = 'none';
};

const getPlatformLogo = (platform) => {
  const logoMap = {
    抖音: "/logos/douyin.png",
    快手: "/logos/kuaishou.png",
    视频号: "/logos/wechat_shipinghao.png",
    微信视频号: "/logos/wechat_shipinghao.png",
    小红书: "/logos/xiaohongshu.jpg",
  };
  return logoMap[platform] || null;
};

const getAccountsInGroup = (groupId) => {
  return availableAccounts.value.filter((acc) => acc.group_id === groupId);
};

const getGroupIcon = (iconName) => {
  // 简化图标映射，使用 Element Plus 内置图标
  const iconMap = {
    Users: "User",
    User: "User", 
    Briefcase: "User",
    Star: "Star",
    Heart: "User",
    Flag: "Flag",
    Trophy: "Star",
    Gift: "User",
    Crown: "Star", 
    Diamond: "Star",
    Fire: "User",
    Lightning: "User"
  };
  return iconMap[iconName] || "User";
};

// API 调用
const loadGroups = async () => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };

    const response = await fetch(`${apiBaseUrl}/getGroups`, {
      headers: authHeaders
    });

    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      groups.value = data.data;
    } else {
      console.warn("获取分组信息失败:", data.msg);
      groups.value = [];
    }
  } catch (error) {
    console.warn("获取分组信息失败:", error);
    groups.value = [];
  }
};

// 生命周期
onMounted(() => {
  loadGroups();
});
</script>

<style lang="scss" scoped>
// 变量定义
$primary: #5b73de;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.account-selection {
  .accounts-layout {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: $space-lg;
    min-height: 400px;

    // 左侧分组栏
    .groups-sidebar {
      background: $bg-gray;
      border-radius: $radius-lg;
      padding: $space-md;
      border: 1px solid $border-light;

      .sidebar-header {
        margin-bottom: $space-md;
        padding-bottom: $space-sm;
        border-bottom: 1px solid $border-light;

        h5 {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
        }
      }

      .group-category-title {
        font-size: 12px;
        font-weight: 500;
        color: $text-secondary;
        margin: $space-md 0 $space-sm 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sidebar-group-item {
        display: flex;
        align-items: center;
        gap: $space-sm;
        padding: $space-sm;
        border-radius: $radius-md;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: $space-xs;

        &:hover {
          background-color: rgba(91, 115, 222, 0.1);
        }

        &.active {
          background-color: rgba(91, 115, 222, 0.1);
          border: 2px solid $primary;
          color: $text-primary;

          .group-name,
          .group-count {
            color: $text-primary;
          }

          .group-icon {
            &.all-accounts {
              background-color: $primary;
            }
          }
        }

        .group-icon {
          width: 32px;
          height: 32px;
          border-radius: $radius-md;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .el-icon {
            font-size: 16px;
            color: white;
          }

          &.platform-logo-container {
            background: $bg-white;
            border: 1px solid $border-light;

            img {
              width: 28px;
              height: 28px;
              border-radius: $radius-sm;
              object-fit: cover;
            }

            .logo-placeholder {
              font-size: 14px;
              font-weight: 600;
              color: $text-primary;
            }
          }

          &.all-accounts {
            background-color: $info;
          }
        }

        .group-info {
          flex: 1;
          min-width: 0;

          .group-name {
            display: block;
            font-weight: 500;
            color: $text-primary;
            font-size: 13px;
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .group-count {
            font-size: 11px;
            color: $text-secondary;
          }
        }
      }
    }

    // 右侧账号区域
    .accounts-main {
      .accounts-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: $space-md;
        padding-bottom: $space-sm;
        border-bottom: 1px solid $border-light;

        .header-left {
          display: flex;
          flex-direction: column;
          gap: $space-sm;

          h5 {
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
            margin: 0;
          }

          .select-all-control {
            display: flex;
            align-items: center;
            gap: $space-sm;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
              .select-all-text {
                color: $primary;
              }

              .custom-checkbox {
                border-color: $primary;
              }
            }

            .custom-checkbox {
              width: 18px;
              height: 18px;
              border: 2px solid $border-light;
              border-radius: $radius-sm;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              background: white;

              &.checked {
                background-color: $primary;
                border-color: $primary;
                color: white;

                .el-icon {
                  font-size: 12px;
                }
              }

              &.indeterminate {
                background-color: $warning;
                border-color: $warning;
                color: white;

                .el-icon {
                  font-size: 12px;
                }
              }
            }

            .select-all-text {
              font-size: 13px;
              font-weight: 500;
              color: $text-secondary;
              user-select: none;
              transition: color 0.3s ease;
            }
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: $space-md;

          .selected-count {
            font-size: 14px;
            color: $text-secondary;
            font-weight: 500;
          }
        }
      }

      .accounts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: $space-md;
        max-height: 350px;
        overflow-y: auto;
        padding-right: $space-xs;

        .account-card {
          background: $bg-gray;
          border: 2px solid transparent;
          border-radius: $radius-lg;
          padding: $space-sm $space-md;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          align-items: center;
          gap: $space-md;
          height: 70px;
          width: 100%;

          &:hover {
            transform: translateY(-2px);
            box-shadow: $shadow-md;
          }

          &.selected {
            border-color: $primary;
            background-color: rgba(91, 115, 222, 0.05);
          }

          &.disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .account-avatar {
            flex-shrink: 0;
            position: relative;

            .avatar-container {
              position: relative;

              :deep(.el-avatar) {
                border: 2px solid #f1f5f9;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              }

              .platform-logo {
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
                border: 1px solid white;

                img {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  object-fit: cover;
                }

                .platform-text {
                  font-size: 10px;
                  font-weight: 600;
                  color: $text-primary;
                }
              }

              .status-dot {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;

                &.online {
                  background-color: $success;
                }

                &.offline {  
                  background-color: $danger;
                }
              }

              .selected-mark {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background-color: $primary;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
              }
            }
          }

          .account-info {
            flex: 1;
            min-width: 0;
            text-align: left;

            .account-name {
              font-weight: 500;
              color: $text-primary;
              font-size: 14px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              margin: 0;
            }

            .account-group {
              margin-top: 4px;

              :deep(.el-tag) {
                border: none !important;
              }
            }
          }
        }
      }

      .empty-accounts {
        padding: $space-lg;
        text-align: center;
      }
    }

    // 响应式设计
    @media (max-width: 768px) {
      grid-template-columns: 1fr;

      .groups-sidebar {
        order: 2;
        margin-top: $space-lg;
      }

      .accounts-main {
        order: 1;

        .accounts-header {
          flex-direction: column;
          align-items: stretch;
          gap: $space-sm;

          .header-right {
            justify-content: space-between;
          }
        }
      }
    }
  }
}
</style>