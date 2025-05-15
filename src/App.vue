<template>
  <div :class="{ 'dark-theme': isDarkMode }">
    <header
      v-if="!isReaderPage"
      class="app-header shadow-lg"
      style="background-color: var(--highlight-color, #4f46e5)"
    >
      <div
        class="container mx-auto px-4 py-3 flex justify-between items-center"
      >
        <h1 class="text-2xl font-bold text-white">Web eReader</h1>
        <ThemeToggle :is-dark-mode="isDarkMode" @toggle="toggleTheme" />
      </div>
    </header>

    <main
      class="container mx-auto px-4 py-8"
      style="min-height: calc(100vh - 4rem)"
    >
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useTheme } from "./composables/useTheme";
import ThemeToggle from "./components/ui/ThemeToggle.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const { isDarkMode, toggleTheme, applyTheme } = useTheme();

const route = useRoute();
const isReaderPage = computed(() => route.path.includes("/reader"));

onMounted(() => {
  // Ensure theme is applied when app mounts
  applyTheme();
});
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
