<template>
  <header
    class="reader-header flex justify-between items-center p-3 border-b shadow-sm"
    :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'"
    style="background-color: var(--background-primary); color: var(--text-primary);"
  >
    <div class="flex items-center space-x-2">
      <router-link
        to="/library"
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <span class="text-lg">🔙</span> Back to Library
      </router-link>
      <h1 class="font-semibold text-gray-800 dark:text-gray-200">
        {{ title }}
      </h1>
    </div>

    <div class="flex items-center space-x-4">
      <!-- Font size controls -->
      <FontSizeControls 
        @increase="$emit('increase-font')" 
        @decrease="$emit('decrease-font')" 
      />

      <!-- Theme toggle -->
      <ThemeToggle 
        :is-dark-mode="isDarkMode" 
        @toggle="$emit('toggle-theme')" 
      />

      <!-- Chapter navigation buttons -->
      <ChapterNavigation
        :current-index="currentChapterIndex"
        :total="totalChapters"
        @previous="$emit('previous-chapter')"
        @next="$emit('next-chapter')"
      />
    </div>
  </header>
</template>

<script setup>
import FontSizeControls from '../ui/FontSizeControls.vue';
import ThemeToggle from '../ui/ThemeToggle.vue';
import ChapterNavigation from '../ui/ChapterNavigation.vue';

defineProps({
  title: {
    type: String,
    default: ""
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  currentChapterIndex: {
    type: Number,
    required: true
  },
  totalChapters: {
    type: Number,
    required: true
  }
});

defineEmits([
  'increase-font', 
  'decrease-font', 
  'toggle-theme', 
  'previous-chapter', 
  'next-chapter'
]);
</script>
