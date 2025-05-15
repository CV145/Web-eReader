<template>
  <div class="flex items-center space-x-2">
    <button
      @click="$emit('previous')"
      :disabled="currentIndex === 0"
      class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
      title="Previous chapter"
    >
      <span class="text-lg">◀</span>
    </button>
    <div class="text-sm text-gray-600 dark:text-gray-300">
      {{ currentIndex + 1 }}/{{ total }}
    </div>
    <button
      @click="$emit('next')"
      :disabled="currentIndex === total - 1"
      class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
      title="Next chapter"
    >
      <span class="text-lg">▶</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentIndex: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

defineEmits(['previous', 'next']);
</script>
