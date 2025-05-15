<template>
  <button
    @click="$emit('toggle')"
    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
    title="Toggle light/dark mode"
  >
    <span v-if="isDarkMode" class="text-lg">☀️</span>
    <span v-else class="text-lg">🌙</span>
  </button>
</template>

<script setup>
defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle']);
</script>
