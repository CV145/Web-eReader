<template>
  <div class="text-controls flex items-center space-x-2">
    <button
      @click="$emit('decrease')"
      class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      title="Decrease font size"
    >
      <span class="text-lg">A-</span>
    </button>
    <button
      @click="$emit('increase')"
      class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      title="Increase font size"
    >
      <span class="text-lg">A+</span>
    </button>
  </div>
</template>

<script setup>
defineEmits(['increase', 'decrease']);
</script>
