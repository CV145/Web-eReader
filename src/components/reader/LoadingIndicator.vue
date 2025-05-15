<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 flex justify-center items-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-50"
  >
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-gray-300 mb-2"></div>
      <p class="text-gray-700 dark:text-gray-300">Loading...</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isVisible: {
    type: Boolean,
    required: true
  }
});
</script>
