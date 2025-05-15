<template>
  <div
    v-if="errorMessage"
    class="fixed inset-0 flex justify-center items-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-50"
  >
    <div class="bg-red-50 dark:bg-red-900 p-6 rounded-lg shadow-lg max-w-md">
      <h3 class="text-red-700 dark:text-red-300 font-bold mb-2">Error</h3>
      <p class="text-gray-800 dark:text-gray-200">{{ errorMessage }}</p>
      <button
        @click="$emit('dismiss')"
        class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  errorMessage: {
    type: String,
    default: null
  }
});

defineEmits(['dismiss']);
</script>
