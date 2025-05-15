<template>
  <button
    @click="$emit('toggle')"
    class="theme-toggle-btn p-2 rounded-full transition-all"
    :class="{ 'bg-yellow-100': !isDarkMode, 'bg-gray-800': isDarkMode }"
    title="Toggle light/dark mode"
  >
    <span v-if="isDarkMode" class="text-xl">☀️</span>
    <span v-else class="text-xl">🌙</span>
    <span class="sr-only">{{ isDarkMode ? 'Switch to light mode' : 'Switch to dark mode' }}</span>
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
