<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增发布"
    width="720px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="new-publish-dialog"
    @close="handleDialogClose"
  >
    <!-- 步骤指示器 -->
    <div class="steps-indicator-compact">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        :class="[
          'step-item-compact',
          {
            active: currentStep === step.key,
            completed: getStepIndex(currentStep) > index,
          }
        ]"
      >
        <div class="step-circle-compact">
          <el-icon v-if="getStepIndex(currentStep) > index"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label-compact">{{ step.label }}</div>
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content-compact">
      <!-- 步骤1: 选择视频 - 紧凑版 -->
      <div v-show="currentStep === 'video'" class="step-panel-compact">
        <div class="step-header-compact">
          <h4>选择视频文件</h4>
          <p>支持上传本地视频或从素材库选择</p>
        </div>

        <div class="upload-section-compact">
          <div v-if="selectedVideos.length === 0" class="upload-area-compact">
            <el-upload
              class="video-uploader-compact"
              drag
              multiple
              :auto-upload="true"
              :action="`${apiBaseUrl}/upload`"
              :on-success="handleVideoUploadSuccess"
              :on-error="handleVideoUploadError"
              accept="video/*"
              :headers="authHeaders"
            >
              <div class="upload-content-compact">
                <el-icon class="upload-icon-compact"><VideoCamera /></el-icon>
                <div class="upload-text-compact">
                  <div>将视频文件拖拽到此处</div>
                  <div class="upload-hint-compact">或 <em>点击上传</em></div>
                </div>
              </div>
            </el-upload>

            <div class="upload-options-compact">
              <el-button @click="selectFromLibrary" class="library-btn-compact">
                <el-icon><Folder /></el-icon>
                从素材库选择
              </el-button>
            </div>
          </div>

          <!-- 已选择的视频列表 -->
          <div v-else class="selected-videos-compact">
            <div class="videos-header-compact">
              <h5>已选择视频 ({{ selectedVideos.length }})</h5>
              <el-button size="small" @click="addMoreVideos">
                <el-icon><Plus /></el-icon>
                添加更多
              </el-button>
            </div>
            <div class="videos-grid-compact">
              <div
                v-for="(video, index) in selectedVideos"
                :key="index"
                class="video-item-compact"
              >
                <div class="video-preview-compact">
                  <el-icon class="video-icon-compact"><VideoPlay /></el-icon>
                  <div class="video-overlay-compact">
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
                <div class="video-info-compact">
                  <div class="video-name-compact">{{ video.name }}</div>
                  <div class="video-size-compact">{{ formatFileSize(video.size) }}</div>
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
// 🎨 变量定义
$primary: #6366f1;
$primary-dark: #4f46e5;
$primary-light: #a5b4fc;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

// 🎨 紧凑版对话框
.new-publish-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-xl;
    margin: 5vh auto;

    .el-dialog__header {
      background: $bg-light;
      border-bottom: 1px solid $border-light;
      border-radius: $radius-xl $radius-xl 0 0;
      padding: 16px 24px;
    }
    
    .el-dialog__body {
      padding: 20px 24px;
    }
    
    .el-dialog__footer {
      padding: 16px 24px;
    }
  }

  // 🔧 紧凑版步骤指示器
  .steps-indicator-compact {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 16px;
      left: 25%;
      right: 25%;
      height: 2px;
      background-color: $border-light;
      z-index: 1;
    }

    .step-item-compact {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 120px;
      z-index: 2;

      .step-circle-compact {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: $bg-white;
        border: 2px solid $border-light;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: $text-muted;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .step-label-compact {
        font-size: 13px;
        color: $text-muted;
        font-weight: 500;
        text-align: center;
      }

      &.active {
        .step-circle-compact {
          background-color: $primary;
          border-color: $primary;
          color: white;
        }

        .step-label-compact {
          color: $primary;
          font-weight: 600;
        }
      }

      &.completed {
        .step-circle-compact {
          background-color: $success;
          border-color: $success;
          color: white;
        }

        .step-label-compact {
          color: $success;
        }
      }
    }
  }

  // 🔧 紧凑版步骤内容
  .step-content-compact {
    min-height: 320px;

    .step-panel-compact {
      .step-header-compact {
        text-align: center;
        margin-bottom: 20px;

        h4 {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 4px 0;
        }

        p {
          color: $text-secondary;
          margin: 0;
          font-size: 13px;
        }
      }
    }
  }

  // 🔧 紧凑版上传区域
  .upload-section-compact {
    .upload-area-compact {
      .video-uploader-compact {
        width: 100%;

        :deep(.el-upload-dragger) {
          width: 100%;
          height: 140px;
          border: 2px dashed $border-light;
          border-radius: $radius-lg;
          background-color: $bg-gray;
          transition: all 0.2s ease;

          &:hover {
            border-color: $primary;
            background-color: rgba(99, 102, 241, 0.05);
          }
        }

        .upload-content-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;

          .upload-icon-compact {
            font-size: 32px;
            color: $primary;
          }

          .upload-text-compact {
            text-align: center;

            .upload-hint-compact {
              color: $text-secondary;
              font-size: 13px;

              em {
                color: $primary;
                font-style: normal;
              }
            }
          }
        }
      }

      .upload-options-compact {
        margin-top: 16px;
        text-align: center;

        .library-btn-compact {
          padding: 8px 16px;
          border-radius: $radius-lg;
        }
      }
    }

    .selected-videos-compact {
      .videos-header-compact {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h5 {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
        }
      }

      .videos-grid-compact {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;

        .video-item-compact {
          background: $bg-gray;
          border-radius: $radius-lg;
          overflow: hidden;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: $shadow-soft;

            .video-overlay-compact {
              opacity: 1;
            }
          }

          .video-preview-compact {
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;

            .video-icon-compact {
              font-size: 24px;
              color: white;
            }

            .video-overlay-compact {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              opacity: 0;
              transition: opacity 0.2s ease;
            }
          }

          .video-info-compact {
            padding: 8px;

            .video-name-compact {
              font-weight: 500;
              color: $text-primary;
              margin-bottom: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 12px;
            }

            .video-size-compact {
              font-size: 11px;
              color: $text-secondary;
            }
          }
        }
      }
    }
  }

  // 🔧 账号选择区域样式
  .step-panel-compact {
    .accounts-section {
      .accounts-layout {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 20px;
        min-height: 280px;

        .groups-sidebar {
          background: $bg-gray;
          border-radius: $radius-lg;
          padding: 16px;
          border: 1px solid $border-light;

          .sidebar-header {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid $border-light;

            h5 {
              font-size: 14px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;
            }
          }

          .group-category-title {
            font-size: 11px;
            font-weight: 500;
            color: $text-secondary;
            margin: 12px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .sidebar-group-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border-radius: $radius-md;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 4px;

            &:hover {
              background-color: rgba(99, 102, 241, 0.1);
            }

            &.active {
              background-color: rgba(99, 102, 241, 0.1);
              border: 2px solid $primary;
              color: $text-primary;
            }

            .group-icon {
              width: 24px;
              height: 24px;
              border-radius: $radius-sm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;

              .el-icon {
                font-size: 14px;
                color: white;
              }

              &.platform-logo-container {
                background: $bg-white;
                border: 1px solid $border-light;

                img {
                  width: 20px;
                  height: 20px;
                  border-radius: $radius-sm;
                  object-fit: cover;
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
                font-size: 12px;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .group-count {
                font-size: 10px;
                color: $text-secondary;
              }
            }
          }
        }

        .accounts-main {
          .accounts-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid $border-light;

            .header-left {
              display: flex;
              flex-direction: column;
              gap: 8px;

              h5 {
                font-size: 14px;
                font-weight: 600;
                color: $text-primary;
                margin: 0;
              }

              .select-all-control {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;

                .custom-checkbox {
                  width: 16px;
                  height: 16px;
                  border: 2px solid $border-light;
                  border-radius: $radius-sm;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: white;

                  &.checked {
                    background-color: $primary;
                    border-color: $primary;
                    color: white;
                  }

                  &.indeterminate {
                    background-color: $warning;
                    border-color: $warning;
                    color: white;
                  }

                  .el-icon {
                    font-size: 10px;
                  }
                }

                .select-all-text {
                  font-size: 12px;
                  font-weight: 500;
                  color: $text-secondary;
                }
              }
            }

            .header-right {
              display: flex;
              align-items: center;
              gap: 12px;

              .selected-count {
                font-size: 12px;
                color: $text-secondary;
                font-weight: 500;
              }
            }
          }

          .accounts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            max-height: 220px;
            overflow-y: auto;

            .account-card {
              background: $bg-gray;
              border: 2px solid transparent;
              border-radius: $radius-lg;
              padding: 8px 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              position: relative;
              display: flex;
              align-items: center;
              gap: 12px;
              height: 60px;

              &:hover {
                transform: translateY(-1px);
                box-shadow: $shadow-md;
              }

              &.selected {
                border-color: $primary;
                background-color: rgba(99, 102, 241, 0.05);
              }

              &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .account-avatar {
                flex-shrink: 0;

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
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

                    img {
                      width: 14px;
                      height: 14px;
                      border-radius: 50%;
                      object-fit: cover;
                    }
                  }

                  .status-dot {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 10px;
                    height: 10px;
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
                    top: -4px;
                    right: -4px;
                    width: 16px;
                    height: 16px;
                    background-color: $primary;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                  }
                }
              }

              .account-info {
                flex: 1;
                min-width: 0;

                .account-name {
                  font-weight: 500;
                  color: $text-primary;
                  font-size: 12px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  margin: 0;
                }

                .account-group {
                  margin-top: 2px;

                  :deep(.el-tag) {
                    font-size: 10px;
                    height: 16px;
                    padding: 0 4px;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 🔧 内容表单区域
  .content-form {
    .form-section {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      h5 {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 8px 0;
      }
    }

    .video-display {
      display: flex;
      align-items: center;
      gap: 12px;
      background: $bg-gray;
      padding: 12px;
      border-radius: $radius-lg;

      .video-thumbnail {
        width: 50px;
        height: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        .video-icon {
          font-size: 14px;
        }
      }

      .video-info {
        .video-count {
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 2px;
          font-size: 12px;
        }

        .video-names {
          font-size: 10px;
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
      gap: 6px;

      .account-tag {
        border-radius: $radius-md;
        font-size: 11px;
        height: 20px;
        padding: 0 6px;
      }
    }

    .publish-form {
      :deep(.el-form-item) {
        margin-bottom: 16px;

        .el-form-item__label {
          font-size: 13px;
          font-weight: 500;
        }
      }

      .title-input {
        :deep(.el-input__inner) {
          height: 36px;
          border-radius: $radius-md;
        }
      }

      .platform-form-section {
        background: $bg-light;
        padding: 12px;
        border-radius: $radius-lg;
        margin-bottom: 12px;

        h6 {
          font-size: 13px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 8px 0;
        }
      }

      .publish-settings {
        .schedule-options {
          margin-top: 12px;
          padding: 12px;
          background: $bg-gray;
          border-radius: $radius-md;

          .schedule-row {
            display: flex;
            align-items: center;
            gap: 12px;

            .label {
              min-width: 70px;
              font-weight: 500;
              color: $text-primary;
              font-size: 13px;
            }
          }
        }
      }
    }
  }

  // 🔧 紧凑版对话框底部
  .dialog-footer-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-left-compact {
      flex: 1;
    }

    .footer-right-compact {
      display: flex;
      gap: 8px;
    }
  }
}

// 🔧 响应式设计优化
@media (max-width: 768px) {
  .new-publish-dialog {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 2vh auto;
    }

    .steps-indicator-compact {
      .step-item-compact {
        .step-label-compact {
          font-size: 11px;
        }
      }
    }

    .videos-grid-compact {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
    }

    .accounts-layout {
      grid-template-columns: 1fr !important;

      .groups-sidebar {
        order: 2;
        margin-top: 16px;
      }

      .accounts-main {
        order: 1;
      }
    }
  }
}
</style>