<template>
  <div v-if="visible" class="emoji-picker-overlay" @click="handleOverlayClick">
    <div class="emoji-picker" @click.stop>
      <!-- 头部 -->
      <div class="emoji-picker-header">
        <div class="emoji-picker-title">选择表情</div>
        <button class="emoji-picker-close" @click="$emit('close')">✕</button>
      </div>

      <!-- 搜索框 -->
      <div class="emoji-picker-search">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="搜索表情..."
          class="search-input"
        />
      </div>

      <!-- 分类标签 -->
      <div v-if="!searchTerm" class="emoji-picker-categories">
        <button
          v-for="(emojis, category) in EMOJI_CATEGORIES"
          :key="category"
          :class="['category-tab', { active: activeCategory === category }]"
          @click="activeCategory = category"
        >
          {{ emojis[0] }}
        </button>
      </div>

      <!-- emoji内容区 -->
      <div class="emoji-picker-content">
        <div class="emoji-grid">
          <button
            v-for="emoji in displayEmojis"
            :key="emoji"
            class="emoji-item"
            @click="handleEmojiClick(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { EMOJI_CATEGORIES, WECHAT_EMOJI_MAP } from "@/utils/emoji"; // 🔥 需要导入 WECHAT_EMOJI_MAP

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "select"]);
const activeCategory = ref("常用");
const searchTerm = ref("");

const displayEmojis = computed(() => {
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
    return allEmojis.filter(
      (emoji) =>
        emoji.includes(term) ||
        Object.entries(WECHAT_EMOJI_MAP).some(
          ([text, e]) => e === emoji && text.toLowerCase().includes(term)
        )
    );
  }

  return EMOJI_CATEGORIES[activeCategory.value] || [];
});

const handleEmojiClick = (emoji) => {
  emit("select", emoji); // 🔥 使用 emit 函数
};

const handleOverlayClick = () => {
  emit("close"); // 🔥 使用 emit 函数
};
</script>

<style scoped>
/* 样式与React版本相同，省略具体CSS */
</style>
