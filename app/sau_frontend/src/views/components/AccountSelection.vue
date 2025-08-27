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
              'compact-account-wrapper',
              {
                selected: localSelectedAccounts.includes(account.id),
                disabled: account.status !== '正常',
              },
            ]"
            @click="toggleAccountSelection(account)"
          >
            <CompactAccountCard
              :account="account"
              :removable="false"
            />
            <!-- 选中标记 -->
            <div v-if="localSelectedAccounts.includes(account.id)" class="selected-overlay">
              <el-icon><Check /></el-icon>
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
// 替换 AccountSelection.vue 中 <script setup> 部分的代码

import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { User, Check, Minus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import CompactAccountCard from './common/CompactAccountCard.vue'; 
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

// 🔥 修复：使用标志位防止循环更新
let isInternalUpdate = false;

console.log('🔍 AccountSelection 组件初始化');

// 响应式数据
const selectedGroupType = ref('all');
const selectedGroupId = ref(null);
const groups = ref([]);

// 本地选中状态
const localSelectedAccounts = ref([...props.selectedAccounts]);

// 🔥 修复：使用防抖的方式处理 props 更新
watch(() => props.selectedAccounts, (newValue) => {
  if (isInternalUpdate) {
    console.log('⚠️ AccountSelection 跳过 props 更新，内部更新中');
    return;
  }
  
  console.log('📊 AccountSelection props.selectedAccounts 变化:', {
    new: newValue?.length || 0,
    current: localSelectedAccounts.value?.length || 0
  });
  
  // 只有在真正不同时才更新
  const newValueStr = JSON.stringify([...newValue].sort());
  const currentStr = JSON.stringify([...localSelectedAccounts.value].sort());
  
  if (newValueStr !== currentStr) {
    localSelectedAccounts.value = [...newValue];
  }
});

// 🔥 修复：使用防抖的方式发射更新
const emitUpdate = (newValue) => {
  if (isInternalUpdate) return;
  
  const newValueStr = JSON.stringify([...newValue].sort());
  const propsStr = JSON.stringify([...props.selectedAccounts].sort());
  
  if (newValueStr !== propsStr) {
    console.log('📤 AccountSelection 发射选择更新:', newValue.length);
    isInternalUpdate = true;
    
    emit('update:selected-accounts', [...newValue]);
    
    // 在下个tick重置标志位
    nextTick(() => {
      isInternalUpdate = false;
    });
  }
};

// 🔥 修复：监听本地状态变化，使用防抖发射
watch(localSelectedAccounts, (newValue) => {
  emitUpdate(newValue);
}, { deep: true });

// 计算属性保持不变
const availableAccounts = computed(() => props.availableAccounts || []);

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

const customGroups = computed(() => {
  const platformNames = ["微信视频号", "抖音", "快手", "小红书", "视频号"];
  return groups.value.filter(
    (group) => !platformNames.includes(group.name)
  );
});

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

const isCurrentGroupAllSelected = computed(() => {
  const currentAccounts = currentGroupAccounts.value.filter(
    (acc) => acc.status === "正常"
  );
  if (currentAccounts.length === 0 || localSelectedAccounts.value.length === 0) {
    return false;
  }

  return currentAccounts.every((acc) =>
    localSelectedAccounts.value.includes(acc.id)
  );
});

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

// 🔥 修复：优化方法，减少响应式更新
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
    const accountIdsToRemove = currentAccounts.map(acc => acc.id);
    localSelectedAccounts.value = localSelectedAccounts.value.filter(
      accountId => !accountIdsToRemove.includes(accountId)
    );
  } else {
    // 选中当前分组的所有账号
    const accountIdsToAdd = currentAccounts
      .map(acc => acc.id)
      .filter(id => !localSelectedAccounts.value.includes(id));
    
    localSelectedAccounts.value.push(...accountIdsToAdd);
  }
};

const toggleAccountSelection = (account) => {
  if (account.status !== "正常") return;

  const index = localSelectedAccounts.value.indexOf(account.id);
  
  if (index > -1) {
    localSelectedAccounts.value.splice(index, 1);
  } else {
    localSelectedAccounts.value.push(account.id);
  }
};

const clearAccountSelection = () => {
  localSelectedAccounts.value.length = 0;
};

// 其余辅助方法保持不变
const getAvatarUrl = (account) => {
  if (account.avatar && account.avatar !== "/default-avatar.png") {
    if (account.avatar.startsWith("assets/avatar/")) {
      return `http://localhost:3409/${account.avatar}`;
    }
    return account.avatar;
  }
  return null;
};

const handleAvatarError = (e) => {
  console.warn("头像加载失败:", e);
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
        .compact-account-wrapper {
          position: relative;
          cursor: pointer;
          border-radius: $radius-md;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: $shadow-md;
          }

          &.selected {
            :deep(.compact-account-card) {
              border-color: $primary;
              background-color: rgba(91, 115, 222, 0.05);
            }
          }

          &.disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .selected-overlay {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 18px;
            height: 18px;
            background: $primary;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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