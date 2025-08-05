<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增发布"
    width="90%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="new-publish-dialog"
    @close="handleDialogClose"
  >
    <!-- 步骤指示器 -->
    <div class="steps-indicator">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        :class="[
          'step-item',
          {
            active: currentStep === step.key,
            completed: getStepIndex(currentStep) > index,
          }
        ]"
      >
        <div class="step-circle">
          <el-icon v-if="getStepIndex(currentStep) > index"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤1: 选择视频 -->
      <div v-show="currentStep === 'video'" class="step-panel">
        <div class="step-header">
          <h4>选择视频文件</h4>
          <p>支持上传本地视频或从素材库选择</p>
        </div>

        <div class="upload-section">
          <div v-if="selectedVideos.length === 0" class="upload-area">
            <el-upload
              class="video-uploader"
              drag
              multiple
              :auto-upload="true"
              :action="`${apiBaseUrl}/upload`"
              :on-success="handleVideoUploadSuccess"
              :on-error="handleVideoUploadError"
              accept="video/*"
              :headers="authHeaders"
            >
              <div class="upload-content">
                <el-icon class="upload-icon"><VideoCamera /></el-icon>
                <div class="upload-text">
                  <div>将视频文件拖拽到此处</div>
                  <div class="upload-hint">或 <em>点击上传</em></div>
                </div>
              </div>
            </el-upload>

            <div class="upload-options">
              <el-button @click="selectFromLibrary" class="library-btn">
                <el-icon><Folder /></el-icon>
                从素材库选择
              </el-button>
            </div>
          </div>

          <!-- 已选择的视频列表 -->
          <div v-else class="selected-videos">
            <div class="videos-header">
              <h5>已选择视频 ({{ selectedVideos.length }})</h5>
              <el-button size="small" @click="addMoreVideos">
                <el-icon><Plus /></el-icon>
                添加更多
              </el-button>
            </div>
            <div class="videos-grid">
              <div
                v-for="(video, index) in selectedVideos"
                :key="index"
                class="video-item"
              >
                <div class="video-preview">
                  <el-icon class="video-icon"><VideoPlay /></el-icon>
                  <div class="video-overlay">
                    <el-button size="small" @click="previewVideo(video)">
                      <el-icon><View /></el-icon>
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click="removeVideo(index)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="video-info">
                  <div class="video-name">{{ video.name }}</div>
                  <div class="video-size">{{ formatFileSize(video.size) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 选择账号 -->
      <div v-show="currentStep === 'accounts'" class="step-panel">
        <div class="step-header">
          <h4>选择发布账号</h4>
          <p>选择要发布内容的账号</p>
        </div>

        <!-- 复用现有的账号选择组件 -->
        <AccountSelection
          v-model:selected-accounts="selectedAccounts"
          :available-accounts="availableAccounts"
        />
      </div>

      <!-- 步骤3: 编辑内容 -->
      <div v-show="currentStep === 'content'" class="step-panel">
        <div class="step-header">
          <h4>内容编辑</h4>
          <p>编辑发布内容的标题、描述等信息</p>
        </div>

        <div class="content-form">
          <!-- 视频预览 -->
          <div class="form-section">
            <div class="video-display">
              <div class="video-thumbnail">
                <el-icon class="video-icon"><VideoPlay /></el-icon>
              </div>
              <div class="video-info">
                <div class="video-count">{{ selectedVideos.length }} 个视频</div>
                <div class="video-names">
                  {{ selectedVideos.map(v => v.name).join(', ') }}
                </div>
              </div>
            </div>
          </div>

          <!-- 选中的账号 -->
          <div class="form-section">
            <h5>发布账号</h5>
            <div class="selected-accounts-display">
              <el-tag
                v-for="accountId in selectedAccounts"
                :key="accountId"
                class="account-tag"
              >
                {{ getAccountName(accountId) }}
              </el-tag>
            </div>
          </div>

          <!-- 表单内容 -->
          <div class="form-section">
            <el-form :model="publishForm" label-width="80px" class="publish-form">
              <!-- 标题 -->
              <el-form-item label="标题" required>
                <el-input
                  v-model="publishForm.title"
                  placeholder="请输入发布标题"
                  maxlength="100"
                  show-word-limit
                  class="title-input"
                />
              </el-form-item>

              <!-- 描述 -->
              <el-form-item label="描述">
                <el-input
                  v-model="publishForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入描述内容，支持添加 #话题标签"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>

              <!-- 抖音表单 -->
              <template v-if="hasDouyinAccounts">
                <div class="platform-form-section">
                  <h6>抖音发布设置</h6>
                  
                  <el-form-item label="声明">
                    <el-select v-model="publishForm.douyin.statement" placeholder="选择声明">
                      <el-option label="无需声明" value="无需声明" />
                      <el-option label="内容由AI生成" value="内容由AI生成" />
                      <el-option label="可能引人不适" value="可能引人不适" />
                      <el-option label="虚构演绎仅供娱乐" value="虚构演绎仅供娱乐" />
                      <el-option label="危险行为，请勿模仿" value="危险行为，请勿模仿" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="位置">
                    <el-input v-model="publishForm.douyin.location" placeholder="输入发布地点" />
                  </el-form-item>
                </div>
              </template>

              <!-- 视频号表单 -->
              <template v-if="hasWechatAccounts">
                <div class="platform-form-section">
                  <h6>视频号发布设置</h6>
                  
                  <el-form-item label="原创">
                    <el-switch
                      v-model="publishForm.wechat.original"
                      active-text="原创"
                      inactive-text="非原创"
                    />
                  </el-form-item>

                  <el-form-item label="位置">
                    <el-input v-model="publishForm.wechat.location" placeholder="输入发布地点" />
                  </el-form-item>
                </div>
              </template>

              <!-- 定时发布 -->
              <el-form-item label="发布设置">
                <div class="publish-settings">
                  <el-switch
                    v-model="publishForm.scheduleEnabled"
                    active-text="定时发布"
                    inactive-text="立即发布"
                  />

                  <div v-if="publishForm.scheduleEnabled" class="schedule-options">
                    <div class="schedule-row">
                      <span class="label">发布时间:</span>
                      <el-date-picker
                        v-model="publishForm.scheduleTime"
                        type="datetime"
                        placeholder="选择发布时间"
                        format="YYYY-MM-DD HH:mm"
                        value-format="YYYY-MM-DD HH:mm:ss"
                      />
                    </div>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </div>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <el-button v-if="currentStep !== 'video'" @click="previousStep">
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
        </div>
        
        <div class="footer-right">
          <el-button @click="handleDialogClose">取消</el-button>
          
          <el-button
            v-if="currentStep !== 'content'"
            type="primary"
            @click="nextStep"
            :disabled="!canProceedToNextStep"
          >
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>

          <!-- 一键发布按钮 -->
          <el-dropdown
            v-else
            split-button
            type="primary"
            @click="publishContent('browser')"
            :disabled="!canPublish"
            :loading="publishing"
          >
            {{ publishing ? '发布中...' : '一键发布' }}
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="publishContent('background')">
                  后台发布
                </el-dropdown-item>
                <el-dropdown-item @click="publishContent('browser')">
                  浏览器发布
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <!-- 素材选择对话框 -->
    <MaterialSelector
      v-model:visible="materialSelectorVisible"
      @selected="handleMaterialSelected"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import {
  Plus,
  Check,
  VideoCamera,
  Folder,
  VideoPlay,
  View,
  Delete,
  ArrowLeft,
  ArrowRight
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAccountStore } from '@/stores/account';
import AccountSelection from './AccountSelection.vue';
import MaterialSelector from './MaterialSelector.vue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:visible', 'published']);

// Store
const accountStore = useAccountStore();

// API配置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
const authHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

// 响应式数据
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const currentStep = ref('video');
const publishing = ref(false);
const materialSelectorVisible = ref(false);

// 步骤配置
const steps = [
  { key: 'video', label: '选择视频' },
  { key: 'accounts', label: '选择账号' },
  { key: 'content', label: '编辑内容' }
];

// 表单数据
const selectedVideos = ref([]);
const selectedAccounts = ref([]);
const publishForm = reactive({
  title: '',
  description: '',
  scheduleEnabled: false,
  scheduleTime: '',
  douyin: {
    statement: '无需声明',
    location: ''
  },
  wechat: {
    original: false,
    location: ''
  }
});

// 计算属性
const availableAccounts = computed(() => accountStore.accounts);

const hasDouyinAccounts = computed(() => {
  return selectedAccounts.value.some(accountId => {
    const account = availableAccounts.value.find(acc => acc.id === accountId);
    return account?.platform === '抖音';
  });
});

const hasWechatAccounts = computed(() => {
  return selectedAccounts.value.some(accountId => {
    const account = availableAccounts.value.find(acc => acc.id === accountId);
    return account?.platform === '视频号' || account?.platform === '微信视频号';
  });
});

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 'video':
      return selectedVideos.value.length > 0;
    case 'accounts':
      return selectedAccounts.value.length > 0;
    case 'content':
      return publishForm.title.trim().length > 0;
    default:
      return true;
  }
});

const canPublish = computed(() => {
  return selectedVideos.value.length > 0 &&
         selectedAccounts.value.length > 0 &&
         publishForm.title.trim().length > 0;
});

// 方法定义
const getStepIndex = (stepKey) => {
  return steps.findIndex((step) => step.key === stepKey);
};

const nextStep = () => {
  const currentIndex = getStepIndex(currentStep.value);
  if (currentIndex < steps.length - 1) {
    currentStep.value = steps[currentIndex + 1].key;
  }
};

const previousStep = () => {
  const currentIndex = getStepIndex(currentStep.value);
  if (currentIndex > 0) {
    currentStep.value = steps[currentIndex - 1].key;
  }
};

const handleVideoUploadSuccess = (response, file) => {
  if (response.code === 200) {
    const filePath = response.data.path || response.data;
    const filename = filePath.split("/").pop();

    const videoInfo = {
      name: file.name,
      path: filePath,
      url: `${apiBaseUrl}/getFile?filename=${filename}`,
      size: file.size,
      type: file.type,
    };

    selectedVideos.value.push(videoInfo);
    ElMessage.success("视频上传成功");
  } else {
    ElMessage.error(response.msg || "上传失败");
  }
};

const handleVideoUploadError = (error) => {
  ElMessage.error("视频上传失败");
  console.error("上传错误:", error);
};

const selectFromLibrary = () => {
  materialSelectorVisible.value = true;
};

const addMoreVideos = () => {
  materialSelectorVisible.value = true;
};

const handleMaterialSelected = (materials) => {
  materials.forEach(material => {
    // 避免重复添加
    const exists = selectedVideos.value.find(v => v.path === material.path);
    if (!exists) {
      selectedVideos.value.push(material);
    }
  });
  materialSelectorVisible.value = false;
  ElMessage.success(`已添加 ${materials.length} 个视频`);
};

const removeVideo = (index) => {
  selectedVideos.value.splice(index, 1);
};

const previewVideo = (video) => {
  window.open(video.url, '_blank');
};

const getAccountName = (accountId) => {
  const account = availableAccounts.value.find(acc => acc.id === accountId);
  return account ? account.userName : accountId;
};

const formatFileSize = (size) => {
  const mb = size / (1024 * 1024);
  return mb.toFixed(1) + "MB";
};

const publishContent = async (mode = 'browser') => {
  if (!canPublish.value) {
    ElMessage.warning('请完善发布信息');
    return;
  }

  try {
    publishing.value = true;

    // 按平台分组账号
    const accountsByPlatform = {};
    selectedAccounts.value.forEach(accountId => {
      const account = availableAccounts.value.find(acc => acc.id === accountId);
      if (account) {
        const platformType = getPlatformType(account.platform);
        if (!accountsByPlatform[platformType]) {
          accountsByPlatform[platformType] = [];
        }
        accountsByPlatform[platformType].push(account);
      }
    });

    // 为每个平台发送发布请求
    const publishPromises = Object.entries(accountsByPlatform).map(async ([platformType, accounts]) => {
      const publishData = {
        type: parseInt(platformType),
        title: publishForm.title,
        tags: extractTags(publishForm.description),
        fileList: selectedVideos.value.map(video => video.path || video.name),
        accountList: accounts.map(account => ({
          filePath: account.filePath,
          accountName: account.userName,
          accountId: account.accountId,
          platform: account.platform,
          type: account.type,
          avatar: account.avatar,
          bio: account.bio,
          followersCount: account.followersCount,
          videosCount: account.videosCount,
        })),
        enableTimer: publishForm.scheduleEnabled ? 1 : 0,
        videosPerDay: 1,
        dailyTimes: ["10:00"],
        startDays: 0,
        category: 0,
        // 平台特定设置
        ...getPlatformSpecificSettings(parseInt(platformType))
      };

      const response = await fetch(`${apiBaseUrl}/postVideo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.value,
        },
        body: JSON.stringify(publishData),
      });

      return await response.json();
    });

    const results = await Promise.all(publishPromises);
    
    // 处理结果
    const allSuccess = results.every(result => result.code === 200);
    const successCount = results.filter(result => result.code === 200).length;
    
    if (allSuccess) {
      ElMessage.success(`发布成功！共发布到 ${Object.keys(accountsByPlatform).length} 个平台`);
      emit('published');
      handleDialogClose();
    } else if (successCount > 0) {
      ElMessage.warning(`部分发布成功：${successCount}/${results.length} 个平台成功`);
      emit('published');
      handleDialogClose();
    } else {
      ElMessage.error('发布失败，请检查网络连接和账号状态');
    }

  } catch (error) {
    console.error('发布失败:', error);
    ElMessage.error('发布失败：' + error.message);
  } finally {
    publishing.value = false;
  }
};

const getPlatformType = (platformName) => {
  const typeMap = {
    '小红书': 1,
    '视频号': 2,
    '微信视频号': 2,
    '抖音': 3,
    '快手': 4
  };
  return typeMap[platformName] || 2;
};

const getPlatformSpecificSettings = (platformType) => {
  const settings = {};
  
  if (platformType === 3) { // 抖音
    settings.statement = publishForm.douyin.statement;
    settings.location = publishForm.douyin.location;
  } else if (platformType === 2) { // 视频号
    settings.original = publishForm.wechat.original;
    settings.location = publishForm.wechat.location;
  }
  
  return settings;
};

const extractTags = (description) => {
  if (!description) return [];
  const tagRegex = /#([^#\s]+)/g;
  const tags = [];
  let match;
  
  while ((match = tagRegex.exec(description)) !== null) {
    tags.push(match[1]);
  }
  
  return tags;
};

const resetForm = () => {
  currentStep.value = 'video';
  selectedVideos.value = [];
  selectedAccounts.value = [];
  publishForm.title = '';
  publishForm.description = '';
  publishForm.scheduleEnabled = false;
  publishForm.scheduleTime = '';
  publishForm.douyin.statement = '无需声明';
  publishForm.douyin.location = '';
  publishForm.wechat.original = false;
  publishForm.wechat.location = '';
  publishing.value = false;
};

const handleDialogClose = () => {
  if (publishing.value) {
    ElMessage.warning('发布中，请稍候...');
    return;
  }
  
  emit('update:visible', false);
  // 延迟重置表单，避免关闭动画时看到内容重置
  setTimeout(() => {
    resetForm();
  }, 300);
};

// 监听器
watch(dialogVisible, (newValue) => {
  if (newValue) {
    resetForm();
  }
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
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

.new-publish-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-xl;
    
    .el-dialog__header {
      background: $bg-light;
      border-bottom: 1px solid $border-light;
      border-radius: $radius-xl $radius-xl 0 0;
    }
    
    .el-dialog__body {
      padding: $space-lg;
    }
  }

  // 步骤指示器
  .steps-indicator {
    display: flex;
    justify-content: center;
    margin-bottom: $space-xl;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 20px;
      left: 20%;
      right: 20%;
      height: 2px;
      background-color: $border-light;
      z-index: 1;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-sm;
      flex: 1;
      max-width: 200px;
      z-index: 2;

      .step-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: $bg-white;
        border: 2px solid $border-light;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: $text-muted;
        transition: all 0.3s ease;
      }

      .step-label {
        font-size: 14px;
        color: $text-muted;
        font-weight: 500;
        text-align: center;
      }

      &.active {
        .step-circle {
          background-color: $primary;
          border-color: $primary;
          color: white;
        }

        .step-label {
          color: $primary;
          font-weight: 600;
        }
      }

      &.completed {
        .step-circle {
          background-color: $success;
          border-color: $success;
          color: white;
        }

        .step-label {
          color: $success;
        }
      }
    }
  }

  // 步骤内容
  .step-content {
    min-height: 400px;

    .step-panel {
      .step-header {
        text-align: center;
        margin-bottom: $space-xl;

        h4 {
          font-size: 18px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 $space-xs 0;
        }

        p {
          color: $text-secondary;
          margin: 0;
        }
      }
    }
  }

  // 视频上传区域
  .upload-section {
    .upload-area {
      .video-uploader {
        width: 100%;

        :deep(.el-upload-dragger) {
          width: 100%;
          height: 200px;
          border: 2px dashed $border-light;
          border-radius: $radius-xl;
          background-color: $bg-gray;
          transition: all 0.3s ease;

          &:hover {
            border-color: $primary;
            background-color: rgba(91, 115, 222, 0.05);
          }
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: $space-md;

          .upload-icon {
            font-size: 48px;
            color: $primary;
          }

          .upload-text {
            text-align: center;

            .upload-hint {
              color: $text-secondary;
              font-size: 14px;

              em {
                color: $primary;
                font-style: normal;
              }
            }
          }
        }
      }

      .upload-options {
        margin-top: $space-lg;
        text-align: center;

        .library-btn {
          padding: 12px 24px;
          border-radius: $radius-lg;
        }
      }
    }

    .selected-videos {
      .videos-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-md;

        h5 {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
        }
      }

      .videos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: $space-md;

        .video-item {
          background: $bg-gray;
          border-radius: $radius-lg;
          overflow: hidden;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: $shadow-md;

            .video-overlay {
              opacity: 1;
            }
          }

          .video-preview {
            height: 120px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;

            .video-icon {
              font-size: 32px;
              color: white;
            }

            .video-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: $space-sm;
              opacity: 0;
              transition: opacity 0.3s ease;
            }
          }

          .video-info {
            padding: $space-md;

            .video-name {
              font-weight: 500;
              color: $text-primary;
              margin-bottom: $space-xs;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .video-size {
              font-size: 12px;
              color: $text-secondary;
            }
          }
        }
      }
    }
  }

  // 内容表单
  .content-form {
    .form-section {
      margin-bottom: $space-xl;

      &:last-child {
        margin-bottom: 0;
      }

      h5 {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 $space-md 0;
      }
    }

    .video-display {
      display: flex;
      align-items: center;
      gap: $space-md;
      background: $bg-gray;
      padding: $space-md;
      border-radius: $radius-lg;

      .video-thumbnail {
        width: 60px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        .video-icon {
          font-size: 18px;
        }
      }

      .video-info {
        .video-count {
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 2px;
        }

        .video-names {
          font-size: 12px;
          color: $text-secondary;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .selected-accounts-display {
      display: flex;
      flex-wrap: wrap;
      gap: $space-sm;

      .account-tag {
        border-radius: $radius-md;
      }
    }

    .publish-form {
      .title-input {
        :deep(.el-input__inner) {
          height: 40px;
          border-radius: $radius-md;
        }
      }

      .platform-form-section {
        background: $bg-light;
        padding: $space-md;
        border-radius: $radius-lg;
        margin-bottom: $space-md;

        h6 {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 $space-md 0;
        }
      }

      .publish-settings {
        .schedule-options {
          margin-top: $space-md;
          padding: $space-md;
          background: $bg-gray;
          border-radius: $radius-md;

          .schedule-row {
            display: flex;
            align-items: center;
            gap: $space-md;

            .label {
              min-width: 80px;
              font-weight: 500;
              color: $text-primary;
            }
          }
        }
      }
    }
  }

  // 对话框底部
  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-left {
      flex: 1;
    }

    .footer-right {
      display: flex;
      gap: $space-sm;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .new-publish-dialog {
    .steps-indicator {
      .step-item {
        .step-label {
          font-size: 12px;
        }
      }
    }

    .content-form {
      .video-display {
        flex-direction: column;
        text-align: center;
      }

      .publish-form {
        .platform-form-section {
          padding: $space-sm;
        }

        .schedule-options {
          .schedule-row {
            flex-direction: column;
            align-items: stretch;
            gap: $space-sm;
          }
        }
      }
    }

    .dialog-footer {
      flex-direction: column;
      gap: $space-md;

      .footer-left,
      .footer-right {
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style>