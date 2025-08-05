<template>
  <div id="app">
    <div class="app-layout">
      <!-- 侧边栏 -->
      <div :class="['sidebar', { collapsed: isCollapsed }]">
        <!-- Logo区域 -->
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">
              <el-icon><VideoCamera /></el-icon>
            </div>
            <transition name="fade">
              <span v-show="!isCollapsed" class="logo-text">自动化发布系统</span>
            </transition>
          </div>
        </div>

        <!-- 导航菜单 -->
        <div class="sidebar-menu">
          <nav class="nav-menu">
            <router-link 
              v-for="item in menuItems" 
              :key="item.path"
              :to="item.path"
              :class="['nav-item', { active: isActiveRoute(item.path) }]"
            >
              <div class="nav-icon">
                <component :is="item.icon" />
              </div>
              <transition name="fade">
                <span v-show="!isCollapsed" class="nav-text">{{ item.name }}</span>
              </transition>
              <div v-show="!isCollapsed && item.badge" class="nav-badge">{{ item.badge }}</div>
            </router-link>
          </nav>
        </div>

        <!-- 折叠按钮 -->
        <div class="sidebar-footer">
          <button @click="toggleSidebar" class="collapse-btn">
            <el-icon>
              <component :is="isCollapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </button>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 顶部栏 -->
        <header class="top-header">
          <div class="header-left">
            <div class="page-title">{{ currentPageTitle }}</div>
          </div>
          <div class="header-right">
            <div class="header-actions">
              <el-button type="text" class="action-btn">
                <el-icon><Bell /></el-icon>
              </el-button>
              <el-button type="text" class="action-btn">
                <el-icon><Setting /></el-icon>
              </el-button>
              <div class="user-avatar">
                <el-avatar :size="32" src="/vite.svg" />
              </div>
            </div>
          </div>
        </header>

        <!-- 页面内容 -->
        <main class="page-content">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  VideoCamera, HomeFilled, Upload, User, 
  Monitor, DataAnalysis, Fold, Expand,
  Bell, Setting
} from '@element-plus/icons-vue'

const route = useRoute()
const isCollapsed = ref(false)

// 菜单项配置
const menuItems = [
  { path: '/', name: '首页', icon: 'HomeFilled' },
  { path: '/publish-records', name: '发布', icon: 'Upload' },
  { path: '/account-management', name: '账号', icon: 'User' },
  { path: '/material-management', name: '素材', icon: 'VideoCamera' },
  { path: '/website', name: '网站', icon: 'Monitor' },
  { path: '/data', name: '数据', icon: 'DataAnalysis' }
]

// 当前页面标题
const currentPageTitle = computed(() => {
  const currentItem = menuItems.find(item => item.path === route.path)
  return currentItem ? currentItem.name : '自媒体运营系统'
})

// 判断路由是否激活
const isActiveRoute = (path) => {
  return route.path === path
}

// 切换侧边栏
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style lang="scss" scoped>
$primary: #6366f1;       // 现代化深紫色
$bg-dark: #1F2937;       // 深色侧边栏
$bg-light: #FFFFFF;      // 纯白背景
$bg-white: #FFFFFF;      // 白色
$text-primary: #0f172a;  // 深色文字
$text-secondary: #475569; // 次要文字
$text-muted: #94A3B8;    // 弱化文字
$text-white: #FFFFFF;    // 白色文字
$border-light: #E2E8F0;  // 浅色边框
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-hover: 0 8px 25px -8px rgba(99, 102, 241, 0.25);
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

#app {
  min-height: 100vh;
  background-color: $bg-white; // 确保是纯白背景
}

.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: $bg-white; // 纯白背景
}

// 侧边栏样式
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  color: $text-primary;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 100;
  box-shadow: none;        // 🔧 去掉阴影
  border-right: none;      // 🔧 去掉右边框

  &.collapsed {
    width: 64px;
  }

  .sidebar-header {
    padding: $space-lg $space-md;
    border-bottom: 1px solid rgba(226, 232, 240, 0.3); // 🔧 使用更淡的边框

    .logo {
      display: flex;
      align-items: center;
      gap: $space-sm;

      .logo-icon {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, $primary 0%, #8B9EE8 100%);
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s ease;  // 🔧 添加过渡效果

        .el-icon {
          font-size: 18px;
          color: white;
        }
      }

      .logo-text {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        white-space: nowrap;
      }
    }
  }

  .sidebar-menu {
    flex: 1;
    padding: $space-md 0;

    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px $space-md;
        color: $text-secondary;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 🔧 改进过渡效果
        position: relative;
        margin: 0 $space-sm;
        border-radius: $radius-md;

        &:hover {
          background-color: rgba(99, 102, 241, 0.08); // 🔧 使用新的紫色
          color: $primary;
          transform: translateX(2px) translateY(-1px);   // 🔧 添加Y轴悬浮
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); // 🔧 3D淡紫色阴影
        }

        &.active {
          background: linear-gradient(135deg, $primary 0%, #8B9EE8 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); // 🔧 增强激活状态阴影

          &::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 20px;
            background-color: $primary;
            border-radius: 2px;
          }
        }

        .nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .el-icon {
            font-size: 18px;
          }
        }

        .nav-text {
          margin-left: $space-sm;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }

        .nav-badge {
          margin-left: auto;
          background-color: #EF4444;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
      }
    }
  }

  .sidebar-footer {
    padding: $space-md;
    border-top: 1px solid rgba(226, 232, 240, 0.3); // 🔧 使用更淡的边框

    .collapse-btn {
      width: 100%;
      height: 40px;
      background: rgba(99, 102, 241, 0.08); // 🔧 使用新的紫色
      border: none;
      border-radius: $radius-md;
      color: $text-secondary;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background-color: rgba(99, 102, 241, 0.15);
        color: $primary;
        transform: translateY(-1px);                    // 🔧 悬浮效果
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); // 🔧 3D淡紫色阴影
      }

      &:active {
        transform: translateY(0);
      }

      .el-icon {
        font-size: 16px;
      }
    }
  }
}

// 主内容区样式
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-header {
  height: 64px;
  background-color: $bg-white;
  border-bottom: 1px solid $border-light;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-lg;
  box-shadow: $shadow-md;
  position: sticky;
  top: 0;
  z-index: 50;

  .header-left {
    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .header-right {
    .header-actions {
      display: flex;
      align-items: center;
      gap: $space-sm;

      .action-btn {
        width: 36px;
        height: 36px;
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $text-secondary;
        transition: all 0.3s ease;

        &:hover {
          background-color: $bg-light;
          color: $primary;
        }

        .el-icon {
          font-size: 18px;
        }
      }

      .user-avatar {
        margin-left: $space-sm;
      }
    }
  }
}

.page-content {
  flex: 1;
  padding: $space-lg;
  background-color: $bg-light;
}

// 动画效果
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 1000;

    &.collapsed {
      transform: translateX(-100%);
    }
  }

  .main-content {
    margin-left: 0;
  }

  .top-header {
    padding: 0 $space-md;

    .page-title {
      font-size: 18px;
    }
  }

  .page-content {
    padding: $space-md;
  }
}
</style>