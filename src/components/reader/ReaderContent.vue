<template>
  <main
    ref="scrollContainer"
    class="reader-content flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300"
    :style="{ fontSize: `${fontSize}px` }"
    @scroll="handleContentScroll"
  >
    <!-- Chapter content rendered here -->
    <div
      ref="contentEl"
      class="chapter-content-wrapper max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md dark:shadow-none min-h-full transition-colors duration-300"
      id="chapter-content-container"
    >
      <div v-if="chapterContent" v-html="chapterContent"></div>
      <div v-else class="p-8 text-center text-gray-600 dark:text-gray-400">
        No content to display
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  chapterContent: {
    type: String,
    default: ""
  },
  fontSize: {
    type: Number,
    default: 18
  },
  scrollPosition: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['scroll']);

// Refs for DOM elements
const contentEl = ref(null);
const scrollContainer = ref(null);

// Handle scroll events
const handleContentScroll = (event) => {
  emit('scroll', event);
};

// Apply scroll position when it changes
watch(() => props.scrollPosition, (newPosition) => {
  if (newPosition > 0 && scrollContainer.value) {
    scrollContainer.value.scrollTop = newPosition;
  }
});

// Expose DOM elements and methods to parent
defineExpose({
  contentEl,
  scrollContainer
});
</script>

<style scoped>
.reader-content {
  scroll-behavior: smooth;
}

.chapter-content-wrapper {
  min-height: 95vh;
  line-height: 1.6;
}

/* Add responsive adjustments */
@media (max-width: 640px) {
  .chapter-content-wrapper {
    padding: 1rem;
  }
}

/* Custom scrollbar */
.reader-content::-webkit-scrollbar {
  width: 8px;
}

.reader-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.reader-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.dark-mode .reader-content::-webkit-scrollbar-track {
  background: #2d3748;
}

.dark-mode .reader-content::-webkit-scrollbar-thumb {
  background: #4a5568;
}
</style>
